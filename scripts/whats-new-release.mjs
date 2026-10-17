// Part of `npm run changeset:version`, which the Release workflow runs to build the version PR (RELEASING.md): after
// `changeset version` has bumped package.json, the docs site's What's new page gets its release heading
// (local-review's scripts/whats-new-release.mjs). The first release (0.1.0) also needs website/src/site.mjs's RELEASED
// flipped and every "Coming in v0.1" note replaced; test/docs.test.ts fails the version PR until both are done.
// Its upcoming section is written by hand as
//
//   ## Coming in 0.2.0: a short title
//
//   Not released yet.
//
// and this turns it into `## <the version actually released>: a short title`, without the "Not released yet." line,
// whatever version the section guessed (a patch release instead of a minor one, say). Without a "Coming in"
// section it changes nothing. test/whats-new.test.ts checks the page never calls a released version "coming".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WHATS_NEW = path.join(ROOT, 'website', 'src', 'content', 'docs', 'whats-new.md');

/** The page with its "Coming in …" section headed as release `version`. */
export function releaseWhatsNew(md, version) {
  return md.replace(/^## Coming in [^\n:]+(:[^\n]*)?\n(\nNot released yet\.\n)?/m, (_, title = '') => `## ${version}${title}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const md = fs.readFileSync(WHATS_NEW, 'utf8');
  const out = releaseWhatsNew(md, version);
  if (out !== md) {
    fs.writeFileSync(WHATS_NEW, out);
    console.log(`whats-new.md: "Coming in …" is now ${version}`);
  }
}
