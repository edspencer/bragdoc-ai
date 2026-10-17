// `node scripts/strip-maps.mjs [dir]` (part of `npm run build`): no source maps in what we ship (SPEC R14). Deletes every
// `.map` under dist/ and removes the `sourceMappingURL` comments that would point at them. The builds are configured
// not to emit maps (tsconfig.build.json `sourceMap: false`, Vite's default), so normally this finds nothing; it's the
// backstop for a config change or a dependency whose bundled code carries its own comment, and smoke:pack checks the
// result in the tarball. Adapted from Paddock's copyTreeWithoutMaps (scripts/make-npm-package.mjs), in place rather
// than into a copy, because our package is the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The comment forms bundlers and tsc write: `//# sourceMappingURL=…` and `/*# sourceMappingURL=… *\/`. */
export function stripSourceMappingUrl(body) {
  return body.replace(/^[ \t]*\/\/[#@] sourceMappingURL=.*$\n?/gm, '').replace(/^[ \t]*\/\*[#@] sourceMappingURL=.*?\*\/[ \t]*$\n?/gm, '');
}

/** Strips `dir` in place; returns what it did. */
export function stripMaps(dir) {
  let maps = 0;
  let comments = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.map')) {
        fs.rmSync(p);
        maps++;
      } else if (/\.(js|mjs|cjs|css|d\.ts)$/.test(entry.name)) {
        // `.d.ts` matters as much as `.js`: tsc emits a `sourceMappingURL` pointing at a `.d.ts.map` we also drop,
        // leaving a dangling reference.
        const body = fs.readFileSync(p, 'utf8');
        const stripped = stripSourceMappingUrl(body);
        if (stripped !== body) {
          fs.writeFileSync(p, stripped);
          comments++;
        }
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return { maps, comments };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
  const { maps, comments } = stripMaps(dir);
  console.log(`strip-maps: removed ${maps} .map file${maps === 1 ? '' : 's'} and ${comments} sourceMappingURL comment${comments === 1 ? '' : 's'}`);
}
