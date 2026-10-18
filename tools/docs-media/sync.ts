// Copy the captures the docs site uses out of tools/docs-media/out/ and into website/src/assets/, where they're
// committed. Adapted from Local Review's tools/docs-media/sync.ts (without its video and README steps).
//
//   npm run docs:media:sync      after `npm run docs:media`
//
// What gets copied is read from the site itself, so there's no second list to keep in step: every
// `assets/shots/<shot>.png` or `assets/landing/<shot>.png` referenced under website/src/, and both themes of every
// `<Shot name="<shot>" …>` in a page (<shot>-light and <shot>-dark), is copied from out/.
// Astro optimises them (webp, srcset) at build time, so they're committed as the rig's 2x PNGs. Copies that nothing
// refers to any more are deleted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS } from './shots.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const WEBSITE_SRC = path.join(ROOT, 'website', 'src');

export interface ShotRef {
  dir: 'shots' | 'landing';
  name: string;
  from: string;
}

/** Every `assets/(shots|landing)/<name>.png` referenced by a page, component or copy file under website/src. */
export function referencedShots(): ShotRef[] {
  const found = new Map<string, ShotRef>();
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|mdx|astro|ts|mjs)$/.test(e.name))
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/assets\/(shots|landing)\/([\w-]+)\.png/g))
          found.set(`${m[1]}/${m[2]}`, { dir: m[1] as ShotRef['dir'], name: m[2]!, from: path.relative(ROOT, p) });
      if (/\.mdx$/.test(e.name))
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/<Shot\b[^>]*\bname="([\w-]+)"/g))
          for (const theme of ['light', 'dark']) found.set(`shots/${m[1]}-${theme}`, { dir: 'shots', name: `${m[1]}-${theme}`, from: path.relative(ROOT, p) });
    }
  };
  walk(WEBSITE_SRC);
  return [...found.values()].sort((a, b) => `${a.dir}/${a.name}`.localeCompare(`${b.dir}/${b.name}`));
}

function main() {
  const names = new Set(SHOTS.map((s) => s.name));
  const refs = referencedShots();
  for (const r of refs) {
    if (!names.has(r.name)) throw new Error(`${r.from} uses ${r.dir}/${r.name}.png, but there's no shot named ${r.name} in shots.ts`);
    const src = path.join(OUT, `${r.name}.png`);
    if (!fs.existsSync(src)) throw new Error(`${path.relative(ROOT, src)} is missing: run npm run docs:media first`);
    const dest = path.join(WEBSITE_SRC, 'assets', r.dir, `${r.name}.png`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${path.relative(ROOT, dest)} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
  }
  for (const dir of ['shots', 'landing'] as const) {
    const d = path.join(WEBSITE_SRC, 'assets', dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d))
      if (f.endsWith('.png') && !refs.some((r) => r.dir === dir && `${r.name}.png` === f)) {
        fs.rmSync(path.join(d, f));
        console.log(`  - ${path.relative(ROOT, path.join(d, f))} (no longer used)`);
      }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
