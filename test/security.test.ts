// server/security.ts with hostile requests: DNS rebinding (foreign Host), cross-site writes and streams (Origin,
// Sec-Fetch-Site), the CORS-safelisted content types, body limits, opt-in uploads, and the headers + CSP. Adapted from
// Local Review's test/hardening.test.ts "localhost guard" cases, extended to every rule SPEC R3 lists.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { createApp } from '../server/index.ts';
import { ConfigStore } from '../server/config.ts';
import {
  BLOB_CSP,
  JSON_LIMIT,
  SPA_CSP,
  UploadRegistry,
  blobHeaders,
  isAllowedHost,
  isSameOrigin,
  security,
} from '../server/security.ts';
import { rmTmp, tmpDir } from './fixture.ts';

let web: string;
let data: string;
before(() => {
  web = tmpDir('bragdoc-web-');
  fs.writeFileSync(path.join(web, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.writeFileSync(path.join(web, 'favicon.svg'), '<svg/>');
  data = tmpDir('bragdoc-data-');
  fs.writeFileSync(path.join(data, 'config.yaml'), 'schemaVersion: 1\nallowedHosts: [bragdoc.example.com]\n');
});
after(() => {
  rmTmp(web);
  rmTmp(data);
});

/** The guard alone, in front of a few routes standing in for later PRs' writes. */
function guarded(extra: string[] = []) {
  const app = new Hono();
  const uploads = new UploadRegistry();
  uploads.accept({ method: 'POST', path: /^\/api\/things\/[^/]+\/evidence$/, types: /^image\/(?:png|jpeg)$/i, maxBytes: 64 });
  app.use('*', security({ allowedHosts: () => extra, uploads }));
  app.post('/api/things', async (c) => c.json({ got: await c.req.json() }));
  app.post('/api/things/:id/evidence', async (c) => c.json({ bytes: (await c.req.arrayBuffer()).byteLength }));
  app.delete('/api/things/:id', (c) => c.json({ ok: true }));
  app.get('/api/things', (c) => c.json({ ok: true }));
  app.get('/page', (c) => c.html('<p>hi</p>'));
  return app;
}

const req = (app: Hono, p: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
  app.request(`http://localhost:2724${p}`, { ...init, headers: { host: 'localhost:2724', ...init.headers } });
const json = (body: unknown, headers: Record<string, string> = {}): RequestInit & { headers: Record<string, string> } => ({
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...headers },
});

describe('the Host allow-list (DNS rebinding)', () => {
  test('pure: loopback in every spelling, ports stripped, extras, nothing else', () => {
    for (const h of ['localhost', 'localhost:2724', 'LOCALHOST:2724', '127.0.0.1', '127.0.0.1:5050', '[::1]', '[::1]:2724'])
      assert.ok(isAllowedHost(h), h);
    for (const h of ['evil.example', 'evil.example:2724', 'localhost.evil.example', '127.0.0.1.nip.io', 'localhost.', '0.0.0.0', '[::]', '', null, undefined, 'localhost@evil.example', '127.0.0.2'])
      assert.ok(!isAllowedHost(h), String(h));
    assert.ok(isAllowedHost('bragdoc.example.com:443', ['bragdoc.example.com']));
    assert.ok(!isAllowedHost('sub.bragdoc.example.com', ['bragdoc.example.com']));
  });

  test('a foreign Host is a 403 for everything: API, static files, the shell, SSE', async () => {
    const app = createApp({ dataDir: data, webDist: web });
    for (const p of ['/api/health', '/favicon.svg', '/', '/deep/route', '/api/events', '/api/meta', '/api/network-log']) {
      const res = await app.request(`http://evil.example${p}`, { headers: { host: 'evil.example' } });
      assert.equal(res.status, 403, p);
      assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'forbidden_host', p);
    }
  });

  test('loopback, [::1] and a configured extra host (config.yaml) pass', async () => {
    const app = createApp({ dataDir: data, webDist: web });
    for (const host of ['localhost:2724', '127.0.0.1:2724', '[::1]:2724', 'bragdoc.example.com', 'BragDoc.Example.com:8443']) {
      const res = await app.request(`http://${host.toLowerCase()}/api/health`, { headers: { host } });
      assert.equal(res.status, 200, host);
    }
  });

  test('BRAGDOC_ALLOWED_HOSTS adds hosts (comma separated, ports and case ignored)', async () => {
    const config = new ConfigStore(data, { env: { BRAGDOC_ALLOWED_HOSTS: ' Proxy.Example.org:443 , other.example ' } });
    const app = createApp({ dataDir: data, webDist: web, config });
    for (const host of ['proxy.example.org', 'other.example:2724', 'bragdoc.example.com'])
      assert.equal((await app.request(`http://${host}/api/health`, { headers: { host } })).status, 200, host);
    assert.equal((await app.request('http://third.example/api/health', { headers: { host: 'third.example' } })).status, 403);
  });

  test('an absolute-form request line naming localhost does not launder a foreign Host', async () => {
    const res = await guarded().request('http://localhost/api/things', { headers: { host: 'evil.example' } });
    assert.equal(res.status, 403);
  });

  test('an edit to allowedHosts in config.yaml applies to the next request, no restart', async () => {
    const dir = tmpDir('bragdoc-live-');
    try {
      const app = createApp({ dataDir: dir, webDist: web });
      const ask = () => app.request('http://late.example/api/health', { headers: { host: 'late.example' } });
      assert.equal((await ask()).status, 403);
      fs.writeFileSync(path.join(dir, 'config.yaml'), 'allowedHosts: [late.example]\n');
      assert.equal((await ask()).status, 200);
    } finally {
      rmTmp(dir);
    }
  });
});

describe('Origin and Fetch Metadata (cross-site requests)', () => {
  test('pure: same origin means scheme http(s) and host:port equal to the Host header', () => {
    assert.ok(isSameOrigin('http://localhost:2724', 'localhost:2724'));
    assert.ok(isSameOrigin('https://bragdoc.example.com', 'bragdoc.example.com'));
    assert.ok(isSameOrigin('https://bragdoc.example.com', 'bragdoc.example.com:443'));
    for (const o of ['http://localhost:3000', 'http://127.0.0.1:2724', 'https://evil.example', 'null', 'file://', 'chrome-extension://abc', 'not a url'])
      assert.ok(!isSameOrigin(o, 'localhost:2724'), o);
  });

  test('a cross-site POST is a 403, even with a JSON body; same-origin passes', async () => {
    const app = guarded();
    for (const origin of ['https://evil.example', 'http://localhost:3000', 'null', 'http://127.0.0.1:2724']) {
      const res = await req(app, '/api/things', json({ a: 1 }, { origin }));
      assert.equal(res.status, 403, origin);
      assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'forbidden_origin');
    }
    const ok = await req(app, '/api/things', json({ a: 1 }, { origin: 'http://localhost:2724' }));
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { got: { a: 1 } });
  });

  test('no Origin at all (curl, an agent, a same-origin GET) is fine: the Host check still applies', async () => {
    assert.equal((await req(guarded(), '/api/things', json({ a: 1 }))).status, 200);
  });

  test('SSE with a foreign Origin is a 403 (an EventSource from another site)', async () => {
    const app = createApp({ dataDir: data, webDist: web });
    for (const origin of ['https://evil.example', 'http://localhost:9999', 'null']) {
      const res = await app.request('http://localhost:2724/api/events', { headers: { host: 'localhost:2724', origin, accept: 'text/event-stream' } });
      assert.equal(res.status, 403, origin);
    }
  });

  test('a WebSocket upgrade or any other GET from a foreign Origin is refused too (paddock#975)', async () => {
    const app = guarded();
    const res = await req(app, '/api/things', { headers: { origin: 'https://evil.example', upgrade: 'websocket', connection: 'Upgrade' } });
    assert.equal(res.status, 403);
  });

  test('Sec-Fetch-Site cross-site or same-site is refused on the API, allowed on pages', async () => {
    const app = guarded();
    for (const site of ['cross-site', 'same-site']) {
      assert.equal((await req(app, '/api/things', { headers: { 'sec-fetch-site': site } })).status, 403, site);
      assert.equal((await req(app, '/page', { headers: { 'sec-fetch-site': site, 'sec-fetch-mode': 'navigate' } })).status, 200, `page ${site}`);
    }
    for (const site of ['same-origin', 'none']) assert.equal((await req(app, '/api/things', { headers: { 'sec-fetch-site': site } })).status, 200, site);
  });
});

describe('content types and body limits', () => {
  test('the three CORS-safelisted types, and none at all, are 415 on writes', async () => {
    const app = guarded();
    for (const ct of ['text/plain', 'text/plain;charset=UTF-8', 'multipart/form-data; boundary=x', 'application/x-www-form-urlencoded', 'TEXT/PLAIN'])
      assert.equal((await req(app, '/api/things', { method: 'POST', body: '{"a":1}', headers: { 'content-type': ct } })).status, 415, ct);
    assert.equal((await req(app, '/api/things', { method: 'POST' })).status, 415, 'a body-less POST without a type is a simple request');
    assert.equal((await req(app, '/api/things', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json-seq' } })).status, 415);
  });

  test('JSON passes, with or without a charset', async () => {
    for (const ct of ['application/json', 'application/json; charset=utf-8'])
      assert.equal((await req(guarded(), '/api/things', { method: 'POST', body: '{"a":1}', headers: { 'content-type': ct } })).status, 200, ct);
  });

  test('a body-less DELETE needs no type; a DELETE with a body must be JSON', async () => {
    const app = guarded();
    assert.equal((await req(app, '/api/things/1', { method: 'DELETE' })).status, 200);
    assert.equal((await req(app, '/api/things/1', { method: 'DELETE', body: 'x', headers: { 'content-type': 'text/plain' } })).status, 415);
  });

  test('typed uploads only where a route opted in, only its types, within its limit', async () => {
    const app = guarded();
    const png = new Uint8Array(32);
    assert.equal((await req(app, '/api/things/1/evidence', { method: 'POST', body: png, headers: { 'content-type': 'image/png' } })).status, 200);
    assert.equal((await req(app, '/api/things/1/evidence', { method: 'POST', body: png, headers: { 'content-type': 'image/gif' } })).status, 415, 'a type the route did not list');
    assert.equal((await req(app, '/api/things', { method: 'POST', body: png, headers: { 'content-type': 'image/png' } })).status, 415, 'a route that did not opt in');
    assert.equal((await req(app, '/api/things/1/evidence', { method: 'POST', body: png, headers: { 'content-type': 'multipart/form-data; boundary=x' } })).status, 415);
    assert.equal((await req(app, '/api/things/1/evidence', { method: 'POST', body: new Uint8Array(65), headers: { 'content-type': 'image/png' } })).status, 413);
  });

  test('an upload rule can never admit a CORS-safelisted type, or go past 25 MB', () => {
    const u = new UploadRegistry();
    assert.throws(() => u.accept({ method: 'POST', path: /x/, types: /.*/ }), /CORS-safelisted/);
    assert.throws(() => u.accept({ method: 'POST', path: /x/, types: /^text\// }), /CORS-safelisted/);
    assert.throws(() => u.accept({ method: 'POST', path: /x/, types: /^image\/png$/, maxBytes: 26 * 1024 * 1024 }), /at most/);
  });

  test('JSON over 1 MB is a 413, by Content-Length or by a streamed body', async () => {
    const big = JSON.stringify({ s: 'x'.repeat(JSON_LIMIT) });
    assert.equal((await req(guarded(), '/api/things', json(JSON.parse(big)))).status, 413);
    const stream = new ReadableStream({
      start(ctl) {
        ctl.enqueue(new TextEncoder().encode(big));
        ctl.close();
      },
    });
    const res = await req(guarded(), '/api/things', { method: 'POST', body: stream, headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' }, duplex: 'half' } as RequestInit & { headers: Record<string, string> });
    assert.equal(res.status, 413);
  });
});

describe('headers and the CSP', () => {
  test('the shell carries the exact CSP from SPEC R3 and the other security headers', async () => {
    const res = await createApp({ dataDir: data, webDist: web }).request('/');
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('content-security-policy'),
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    assert.equal(SPA_CSP, res.headers.get('content-security-policy'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.equal(res.headers.get('access-control-allow-origin'), null, 'never any CORS');
  });

  test('refusals carry the headers too, and API responses are never cached', async () => {
    const app = createApp({ dataDir: data, webDist: web });
    const refused = await app.request('http://evil.example/', { headers: { host: 'evil.example' } });
    assert.equal(refused.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(refused.headers.get('content-security-policy'));
    assert.equal((await app.request('/api/health')).headers.get('cache-control'), 'no-store');
  });

  test('blobHeaders: sandboxed, nosniff, same-origin; non-images download', () => {
    const png = blobHeaders('image/png');
    assert.equal(png['Content-Security-Policy'], BLOB_CSP);
    assert.equal(BLOB_CSP, "default-src 'none'; sandbox");
    assert.equal(png['X-Content-Type-Options'], 'nosniff');
    assert.equal(png['Cross-Origin-Resource-Policy'], 'same-origin');
    assert.equal(png['Content-Disposition'], undefined);
    assert.equal(blobHeaders('image/svg+xml')['Content-Disposition'], undefined);
    assert.equal(blobHeaders('application/pdf', 'review "Q3".pdf')['Content-Disposition'], 'attachment; filename="review_Q3_.pdf"');
    assert.match(blobHeaders('text/html')['Content-Disposition']!, /^attachment/);
  });

  test("a route's own stricter CSP (a blob) is kept", async () => {
    const app = new Hono();
    app.use('*', security({ allowedHosts: () => [], uploads: new UploadRegistry() }));
    app.get('/blob', (c) => c.body('x', 200, blobHeaders('image/png')));
    const res = await app.request('/blob');
    assert.equal(res.headers.get('content-security-policy'), BLOB_CSP);
  });
});
