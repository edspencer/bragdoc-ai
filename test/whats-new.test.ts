// The docs site's What's new page and the release flow (scripts/whats-new-release.mjs, run by `npm run
// changeset:version`): the upcoming section gets the released version's heading, and the page never calls a version that's
// out "coming". Adapted from local-review's test/release.test.ts (it shipped 0.7.0 still headed "Coming in 0.7.0").
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './fixture.ts';

const { WHATS_NEW, SITE, STALE_PROSE, docsPages, releaseWhatsNew, releaseSite, releaseDocsPage } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'whats-new-release.mjs')).href);
const VERSION: string = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const semver = (v: string) => v.split('.').map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! > y[i]!;
  return false;
};

describe("What's new", () => {
  test('releasing heads the "Coming in" section with the version actually released', () => {
    const md = '# x\n\n## Coming in 0.8.0: a title\n\nNot released yet.\n\n- **A thing.**\n\n## 0.7.0: older\n\n- y\n';
    assert.equal(releaseWhatsNew(md, '0.7.1'), '# x\n\n## 0.7.1: a title\n\n- **A thing.**\n\n## 0.7.0: older\n\n- y\n');
    assert.equal(releaseWhatsNew('## Coming in 1.0.0\n\nNot released yet.\n\n- z\n', '1.0.0'), '## 1.0.0\n\n- z\n');
    const released = releaseWhatsNew(md, '0.8.0');
    assert.equal(releaseWhatsNew(released, '0.8.0'), released, 'running it again changes nothing');
    assert.equal(releaseWhatsNew('## 0.7.0\n\n- y\n', '0.7.1'), '## 0.7.0\n\n- y\n', 'no "Coming in" section: unchanged');
  });

  // the bot's version PR can't be hand-edited, so the first release has to flip RELEASED by itself (docs.test checks it)
  test('releasing 0.1.0 or later flips RELEASED in website/src/site.mjs; 0.0.x leaves it, and it never flips back', () => {
    const site: string = fs.readFileSync(SITE, 'utf8');
    assert.match(site, /^export const RELEASED = (true|false);$/m, 'site.mjs has the `export const RELEASED = …;` line this rewrites');
    const before = site.replace(/^export const RELEASED = true;$/m, 'export const RELEASED = false;');
    for (const v of ['0.1.0', '0.1.3', '1.0.0']) assert.match(releaseSite(before, v), /^export const RELEASED = true;$/m, v);
    assert.equal(releaseSite(before, '0.0.1'), before);
    assert.equal(releaseSite(releaseSite(before, '0.1.0'), '0.0.1'), releaseSite(before, '0.1.0'), 'never back to false');
  });

  // the version PR can't be hand-edited: whatever the pages say before the release, the script must leave none of it
  // standing at 0.1.0 (the check test/docs.test.ts runs on that PR)
  test('at 0.1.0 the release leaves no docs page saying it is unreleased; before that it changes nothing', () => {
    const stale = docsPages()
      .filter((f: string) => path.basename(f) !== 'whats-new.md')
      .filter((f: string) => STALE_PROSE.test(releaseDocsPage(fs.readFileSync(f, 'utf8'), '0.1.0')));
    assert.deepEqual(stale.map((f: string) => path.relative(ROOT, f)), []);
    for (const f of docsPages() as string[]) assert.equal(releaseDocsPage(fs.readFileSync(f, 'utf8'), '0.0.1'), fs.readFileSync(f, 'utf8'));
    const md = 'a\n\n:::note[Not on npm yet]\nSoon.\n:::\n\nb\n\n:::note[Tip]\nKeep me.\n:::\n';
    assert.equal(releaseDocsPage(md, '0.1.0'), 'a\n\nb\n\n:::note[Tip]\nKeep me.\n:::\n', 'only the "Not …" asides go');
    // the AI pages' "Coming in 0.2.0" (D83): kept by 0.1.x, gone from 0.2.0 on
    const coming = 'a\n\n:::note[Coming in 0.2.0]\nSoon.\n:::\n\nb\n';
    assert.equal(releaseDocsPage(coming, '0.1.3'), coming);
    assert.equal(releaseDocsPage(coming, '0.2.0'), 'a\n\nb\n');
    assert.equal(releaseDocsPage(coming, '1.0.0'), 'a\n\nb\n');
  });

  test(`no released version (package.json: ${VERSION}) is "coming" or "not released yet"`, () => {
    const md: string = fs.readFileSync(WHATS_NEW, 'utf8');
    const coming = [...md.matchAll(/^## Coming in ([0-9.]+)/gm)].map((m) => m[1]!);
    assert.ok(coming.length <= 1, `one "Coming in" section at most: ${coming}`);
    for (const v of coming) assert.ok(newer(v, VERSION), `"Coming in ${v}", but ${VERSION} is out: give it its release heading`);
    assert.equal((md.match(/^Not released yet\.$/gm) ?? []).length, coming.length, '"Not released yet." only under "Coming in"');
    for (const m of md.matchAll(/^## ([0-9]+\.[0-9]+\.[0-9]+)\b/gm)) assert.ok(!newer(m[1]!, VERSION), `"## ${m[1]}" is newer than ${VERSION}`);
  });
});
