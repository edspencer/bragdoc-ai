// Part of `npm run changeset:version`, which the Release workflow runs to build the version PR (RELEASING.md): after
// `changeset version` has bumped package.json, the docs site's What's new page gets its release heading
// (local-review's scripts/whats-new-release.mjs). Its upcoming section is written by hand as
//
//   ## Coming in 0.2.0: a short title
//
//   Not released yet.
//
// and this turns it into `## <the version actually released>: a short title`, without the "Not released yet." line,
// whatever version the section guessed (a patch release instead of a minor one, say). Without a "Coming in"
// section it changes nothing. test/whats-new.test.ts checks the page never calls a released version "coming".
//
// From 0.1.0 on it also flips `RELEASED` in website/src/site.mjs to true (the site's banner, landing page and llms.txt
// stop saying "not on npm yet"), and takes every `:::note[Not …]` aside ("Not released yet", "Not on npm yet") out of
// the docs pages: a page that says so before the release writes it as such a note, so it's true on both sides of it.
// The version PR is opened by the bot and mustn't be hand-edited, and test/docs.test.ts fails it while either is left,
// so both happen here (PR17).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WHATS_NEW = path.join(ROOT, 'website', 'src', 'content', 'docs', 'whats-new.md');
export const SITE = path.join(ROOT, 'website', 'src', 'site.mjs');
export const DOCS = path.join(ROOT, 'website', 'src', 'content', 'docs');

/** The page with its "Coming in …" section headed as release `version`. */
export function releaseWhatsNew(md, version) {
  return md.replace(/^## Coming in [^\n:]+(:[^\n]*)?\n(\nNot released yet\.\n)?/m, (_, title = '') => `## ${version}${title}\n`);
}

/** Is `version` a release the site should call out (0.1.0 or later; 0.0.x is the npm placeholder)? */
export const isReleased = (version) => {
  const [major = 0, minor = 0] = String(version).split('.').map(Number);
  return major > 0 || minor >= 1;
};

/** site.mjs with `RELEASED` set for `version`. Never flips it back. */
export function releaseSite(src, version) {
  return isReleased(version) ? src.replace(/^export const RELEASED = false;$/m, 'export const RELEASED = true;') : src;
}

/** What a page, the README or SECURITY.md mustn't still say once a version is out (test/docs.test.ts checks). */
export const STALE_PROSE = /on npm yet|(?:isn['’]t|not) released yet|^:::note\[Not /im;

/** A docs page without its "not released" asides (`:::note[Not …]` … `:::`), from 0.1.0 on. */
export function releaseDocsPage(md, version) {
  return isReleased(version) ? md.replace(/^:::note\[Not [^\]\n]*\]\n[\s\S]*?^:::\n(?:\n)?/gm, '') : md;
}

/** Every docs page, .md and .mdx, under `dir`. */
export const docsPages = (dir = DOCS) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.mdx?$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const md = fs.readFileSync(WHATS_NEW, 'utf8');
  const out = releaseWhatsNew(md, version);
  if (out !== md) {
    fs.writeFileSync(WHATS_NEW, out);
    console.log(`whats-new.md: "Coming in …" is now ${version}`);
  }
  const site = fs.readFileSync(SITE, 'utf8');
  const siteOut = releaseSite(site, version);
  if (siteOut !== site) {
    fs.writeFileSync(SITE, siteOut);
    console.log(`site.mjs: RELEASED is now true (${version})`);
  }
  for (const page of docsPages()) {
    const text = fs.readFileSync(page, 'utf8');
    const released = releaseDocsPage(text, version);
    if (released !== text) {
      fs.writeFileSync(page, released);
      console.log(`${path.relative(ROOT, page)}: the "not released" note is gone`);
    }
  }
}
