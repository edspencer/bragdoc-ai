// The built web app, as a release builds it (no /dev/kit): built fresh into a temp dir, so it tests the source, not a
// stale dist/. It must make no third-party requests (SPEC R4): no http(s) URL in the bundle except an allow-list of
// strings that are never fetched. And it must be CSP-clean (SPEC R3): no inline script or style in index.html, the
// theme pre-paint as an external file.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, rmTmp, tmpDir } from './fixture.ts';

/**
 * URLs allowed in the bundle, none of which the app fetches: XML namespaces (React DOM), React's error-decoder link
 * in its minified errors, the router's parsing base, the project's own GitHub repository and docs links, and the link
 * a pasted pull request opens (built from its owner/repo#n, opened in a new tab, never fetched: PR7).
 */
const ALLOWED = [
  /^http:\/\/www\.w3\.org\/(?:1998\/Math\/MathML|1999\/xlink|1999\/xhtml|2000\/svg|XML\/1998\/namespace)$/,
  /^https:\/\/react\.dev\/errors\/$/,
  /^http:\/\/localhost$/,
  /^https:\/\/github\.com\/edspencer\/bragdoc-ai(?:[/#?].*)?$/,
  /^https:\/\/github\.com\/\$\{[\w.]+\}\/pull\/\$\{[\w.]+\}$/,
];

let out: string;
const files = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).isFile());

before(() => {
  out = tmpDir('bragdoc-webbuild-');
  const env: NodeJS.ProcessEnv = { ...process.env, BRAGDOC_WEB_OUT: out, BRAGDOC_KIT: '' };
  delete env.NODE_ENV;
  execFileSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'error'], { cwd: ROOT, env, stdio: 'pipe' });
});
after(() => out && rmTmp(out));

test('the bundle names no third-party URL', () => {
  const found = new Set<string>();
  for (const f of files(out).filter((f) => /\.(js|css|html|svg|webmanifest)$/.test(f)))
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s"'`()<>\\]+/g)) found.add(m[0].replace(/[.,;]+$/, ''));
  const bad = [...found].filter((u) => !ALLOWED.some((re) => re.test(u)));
  assert.deepEqual(bad, [], `unexpected URLs in the bundle: ${bad.join(', ')}`);
});

test('fonts are self-hosted, in the bundle', () => {
  const fonts = files(out).filter((f) => f.endsWith('.woff2')).map((f) => path.basename(f));
  for (const family of ['instrument-sans', 'bricolage-grotesque', 'caveat', 'geist-mono']) assert.ok(fonts.some((f) => f.startsWith(family)), `${family} not bundled`);
});

test('index.html has no inline script or style, and loads the theme pre-paint script first', () => {
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert.match(m[1], /\bsrc=/, `inline script: ${m[0].slice(0, 80)}`);
    assert.equal(m[2].trim(), '');
  }
  assert.doesNotMatch(html, /<style\b/);
  assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'inline event handler');
  const theme = html.indexOf('src="/theme-init.js"');
  assert.ok(theme > 0 && theme < html.indexOf('type="module"'), 'theme-init.js must load (blocking) before the app');
  assert.ok(fs.existsSync(path.join(out, 'theme-init.js')));
});

test('a release build leaves out the /dev/kit showcase', () => {
  const js = files(out).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(js, /Every piece of the Scrapbook kit/);
});

test('theme-init.js and the theme provider agree on the storage key and values', () => {
  const init = fs.readFileSync(path.join(ROOT, 'public/theme-init.js'), 'utf8');
  const provider = fs.readFileSync(path.join(ROOT, 'src/theme/theme.tsx'), 'utf8');
  const key = /THEME_STORAGE_KEY = '([^']+)'/.exec(provider)?.[1];
  assert.ok(key);
  assert.ok(init.includes(`localStorage.getItem('${key}')`));
  for (const v of ["'dark'", "'light'", "'system'"]) assert.ok(init.includes(v) && provider.includes(v), v);
});
