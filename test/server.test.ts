// The HTTP app, in-process (app.request): the health route, the API's JSON 404, and the SPA fallback's rule that only
// navigations get index.html while missing files 404.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createApp, hasFileExtension, startServer } from '../server/index.ts';
import { rmTmp, tmpDir } from './fixture.ts';

let web: string;
const SHELL = '<!doctype html><html><body><div id="root"></div></body></html>';

before(() => {
  web = tmpDir('bragdoc-web-');
  fs.writeFileSync(path.join(web, 'index.html'), SHELL);
  fs.mkdirSync(path.join(web, 'assets'));
  fs.writeFileSync(path.join(web, 'assets', 'index-Ab3_x-9Z.js'), 'console.log(1)');
  fs.writeFileSync(path.join(web, 'assets', 'unhashed.woff2'), 'font');
  fs.writeFileSync(path.join(web, 'favicon.svg'), '<svg/>');
});
after(() => rmTmp(web));

const app = () => createApp({ dataDir: '/nonexistent/data', webDist: web, version: '9.9.9' });

test('GET /api/health is 200 with the version', async () => {
  const res = await app().request('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, version: '9.9.9' });
});

test('an unknown API path is a JSON 404, never the web app', async () => {
  for (const [method, p] of [
    ['GET', '/api/nope'],
    ['POST', '/api/nope'],
    ['GET', '/api/health/extra'],
  ] as const) {
    const res = await app().request(p, { method, headers: { 'content-type': 'application/json' } });
    assert.equal(res.status, 404, `${method} ${p}`);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'not_found');
  }
});

test('/ and client-side routes get the shell, uncached', async () => {
  for (const p of ['/', '/deep/route', '/settings/data', '/found?source=github']) {
    const res = await app().request(p);
    assert.equal(res.status, 200, p);
    assert.equal(await res.text(), SHELL, p);
    assert.equal(res.headers.get('cache-control'), 'no-cache', p);
  }
});

test('a missing file is a 404, not the shell', async () => {
  for (const p of ['/nope.js', '/assets/index-gone.js', '/assets/no-extension', '/assets', '/deep/route/style.css', '/favicon.ico']) {
    const res = await app().request(p);
    assert.equal(res.status, 404, p);
    assert.notEqual(await res.text(), SHELL, p);
  }
});

test('static files are served; hashed assets are immutable', async () => {
  const js = await app().request('/assets/index-Ab3_x-9Z.js');
  assert.equal(js.status, 200);
  assert.equal(await js.text(), 'console.log(1)');
  assert.match(js.headers.get('cache-control') ?? '', /immutable/);
  const unhashed = await app().request('/assets/unhashed.woff2');
  assert.equal(unhashed.status, 200);
  assert.equal(unhashed.headers.get('cache-control'), 'no-cache');
  const icon = await app().request('/favicon.svg');
  assert.equal(icon.status, 200);
  assert.equal(icon.headers.get('cache-control'), 'no-cache');
});

test('with no build, the fallback says how to build instead of a blank page', async () => {
  const empty = tmpDir('bragdoc-noweb-');
  try {
    const res = await createApp({ dataDir: '/x', webDist: empty }).request('/');
    assert.equal(res.status, 500);
    assert.match(await res.text(), /npm run build/);
  } finally {
    rmTmp(empty);
  }
});

test('a missing build prints nothing (scripts wait for "BragDoc on" as the first line)', async (t) => {
  const log = t.mock.method(console, 'log');
  const warn = t.mock.method(console, 'warn');
  const error = t.mock.method(console, 'error');
  const res = await createApp({ dataDir: '/x', webDist: '/nonexistent/dist/web' }).request('/assets/index-Ab3_x-9Z.js');
  assert.equal(res.status, 404);
  assert.equal(log.mock.callCount() + warn.mock.callCount() + error.mock.callCount(), 0);
});

test('API only (webDist: null, as under npm run dev): no shell', async () => {
  const res = await createApp({ dataDir: '/x', webDist: null }).request('/deep/route');
  assert.equal(res.status, 404);
});

test('hasFileExtension looks at the last segment only', () => {
  assert.equal(hasFileExtension('/assets/a.js'), true);
  assert.equal(hasFileExtension('/favicon.ico'), true);
  assert.equal(hasFileExtension('/v1.2/route'), false);
  assert.equal(hasFileExtension('/deep/route'), false);
  assert.equal(hasFileExtension('/'), false);
});

test('startServer binds 127.0.0.1 by default and closes cleanly', async () => {
  const data = tmpDir('bragdoc-data-');
  const { port, close } = await startServer(0, { dataDir: data, webDist: web });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
  } finally {
    await close();
    rmTmp(data);
  }
});
