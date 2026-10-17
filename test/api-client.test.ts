// The web app's API client (src/api/client.ts) and the live-update dispatch (src/api/events.ts), against a stubbed
// fetch: JSON in and out, the error envelope, network failures, typed uploads.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiRequestError, NETWORK_ERROR, api, getHealth, isApiError, uploadContentType } from '../src/api/client.ts';
import { CHANGE_INVALIDATES, invalidationsFor } from '../src/api/events.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

interface Seen {
  url: string;
  init: RequestInit;
}

function stub(respond: (url: string, init: RequestInit) => Response | Promise<Response>): Seen[] {
  const seen: Seen[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    seen.push({ url: String(url), init });
    return respond(String(url), init);
  }) as typeof fetch;
  return seen;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('GET resolves with the JSON body, same-origin and relative', async () => {
  const seen = stub(() => json({ ok: true, version: '1.2.3' }));
  assert.deepEqual(await getHealth(), { ok: true, version: '1.2.3' });
  assert.equal(seen[0].url, '/api/health');
  assert.equal(seen[0].init.method, 'GET');
  assert.equal(seen[0].init.body, undefined);
});

test('writes send JSON with a JSON content type (never a CORS-safelisted one)', async () => {
  const seen = stub(() => json({ id: 'x' }, 201));
  assert.deepEqual(await api.post('/api/things', { title: 'Hi' }), { id: 'x' });
  assert.equal((seen[0].init.headers as Record<string, string>)['Content-Type'], 'application/json');
  assert.equal(seen[0].init.body, '{"title":"Hi"}');
  await api.patch('/api/things/x', { title: 'Yo' });
  assert.equal(seen[1].init.method, 'PATCH');
});

test('an error envelope becomes an ApiRequestError with its code, message and status', async () => {
  stub(() => json({ error: { code: 'not_found', message: 'No such achievement.' } }, 404));
  await assert.rejects(api.get('/api/achievements/nope'), (e: unknown) => {
    assert.ok(isApiError(e, 'not_found'));
    assert.equal((e as ApiRequestError).status, 404);
    assert.equal((e as ApiRequestError).message, 'No such achievement.');
    return true;
  });
});

test('an error without an envelope still says what failed', async () => {
  stub(() => new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }));
  await assert.rejects(api.get('/api/x'), (e: unknown) => isApiError(e, 'http_502') && /GET \/api\/x failed \(502 Bad Gateway\)/.test((e as Error).message));
});

test('a server that is not running is a network error, status 0', async () => {
  stub(() => {
    throw new TypeError('fetch failed');
  });
  await assert.rejects(api.get('/api/health'), (e: unknown) => isApiError(e, NETWORK_ERROR) && (e as ApiRequestError).status === 0);
});

test('an aborted request rejects with the AbortError, not a network error', async () => {
  stub((_url, init) => {
    init.signal?.throwIfAborted();
    return json({});
  });
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(api.get('/api/health', { signal: ctl.signal }), (e: unknown) => (e as Error).name === 'AbortError');
});

test('an abort with a reason, or a timeout, passes the reason on rather than blaming the server', async () => {
  stub((_url, init) => {
    init.signal?.throwIfAborted();
    return json({});
  });
  const ctl = new AbortController();
  ctl.abort(new Error('user left the page'));
  await assert.rejects(api.get('/api/health', { signal: ctl.signal }), /user left the page/);
});

test('a body that fails to read is a network error, not a raw TypeError', async () => {
  stub(() => ({ ok: true, status: 200, statusText: 'OK', text: () => Promise.reject(new TypeError('terminated')) }) as unknown as Response);
  await assert.rejects(api.get('/api/x'), (e: unknown) => isApiError(e, NETWORK_ERROR));
});

test('204 resolves with undefined; a 200 that is not JSON is an error', async () => {
  stub(() => new Response(null, { status: 204 }));
  assert.equal(await api.delete('/api/things/x'), undefined);
  stub(() => new Response('not json', { status: 200 }));
  await assert.rejects(api.get('/api/x'), (e: unknown) => isApiError(e, 'bad_response'));
});

test('uploads: raw bytes, a non-safelisted type, the file name URI-encoded', async () => {
  const seen = stub(() => json({ sha: 'abc' }, 201));
  const file = Object.assign(new Blob(['hello'], { type: 'image/png' }), { name: 'Résumé shot.png' });
  await api.upload('/api/evidence', file);
  const h = seen[0].init.headers as Record<string, string>;
  assert.equal(h['Content-Type'], 'image/png');
  assert.equal(h['X-Filename'], 'R%C3%A9sum%C3%A9%20shot.png');
  assert.equal(seen[0].init.body, file);
  for (const t of ['text/plain', 'text/plain; charset=utf-8', 'multipart/form-data', 'application/x-www-form-urlencoded', ''])
    assert.equal(uploadContentType(t), 'application/octet-stream', t);
  assert.equal(uploadContentType('application/pdf'), 'application/pdf');
});

test('live updates: hello refreshes everything; change refreshes its kind, or everything if unknown', () => {
  assert.equal(invalidationsFor('hello', ''), 'all');
  assert.equal(invalidationsFor('ping', ''), null);
  assert.equal(invalidationsFor('change', 'not json'), 'all');
  assert.equal(invalidationsFor('change', '{"kind":"something-new"}'), 'all');
  assert.equal(invalidationsFor('change', '{"kind":"constructor"}'), 'all'); // not Object.prototype's
  CHANGE_INVALIDATES.widget = ['widgets', 'search'];
  try {
    assert.deepEqual(invalidationsFor('change', '{"kind":"widget"}'), ['widgets', 'search']);
  } finally {
    delete CHANGE_INVALIDATES.widget;
  }
});
