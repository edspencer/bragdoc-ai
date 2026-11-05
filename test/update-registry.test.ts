// From edspencer/cli-contract test/registry.test.ts @ 1.0; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDistTags, RegistryError, registryUrl, resolveRegistry, resolveTarget } from '../server/update/registry.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A registry that answers from a table, and records what it was asked. */
function fakeRegistry(tags: Record<string, string>, engines: Record<string, string> = {}) {
  const asked: string[] = [];
  const fetch = (async (url: string | URL) => {
    const u = String(url);
    asked.push(u);
    if (u.endsWith('/dist-tags')) return json(tags);
    const version = decodeURIComponent(u.split('/').at(-1)!);
    return json({ name: '@scope/tool', version, ...(engines[version] ? { engines: { node: engines[version] } } : {}) });
  }) as typeof globalThis.fetch;
  return { asked, fetch };
}

test("writes a scoped name's slash as %2f, on both routes", () => {
  assert.equal(registryUrl('http://r.test/', '-', 'package', '@scope/tool', 'dist-tags'), 'http://r.test/-/package/@scope%2ftool/dist-tags');
  assert.equal(registryUrl('http://r.test//', '@scope/tool', '1.0.0'), 'http://r.test/@scope%2ftool/1.0.0');
});

test('asks npm_config_registry, then npm config, then the public registry', () => {
  assert.equal(resolveRegistry({ npm_config_registry: ' http://a.test ' }, () => 'http://b.test'), 'http://a.test');
  assert.equal(resolveRegistry({ NPM_CONFIG_REGISTRY: 'http://c.test' }), 'http://c.test');
  assert.equal(resolveRegistry({}, () => 'http://b.test/'), 'http://b.test/');
  assert.equal(resolveRegistry({}, () => 'undefined'), 'https://registry.npmjs.org');
  assert.equal(resolveRegistry({ npm_config_registry: '' }), 'https://registry.npmjs.org');
});

test('resolves --to as a version or a tag, by its shape', async () => {
  const r = fakeRegistry({ latest: '1.2.0', next: '1.3.0-rc.1' }, { '1.2.0': '>=22', '1.0.0': '>=20' });
  const o = { packageName: '@scope/tool', registry: 'http://r.test', fetch: r.fetch };
  assert.deepEqual(await resolveTarget(o), { version: '1.2.0', tag: 'latest', engines: '>=22' });
  assert.deepEqual(await resolveTarget({ ...o, to: 'next' }), { version: '1.3.0-rc.1', tag: 'next', engines: null });
  r.asked.length = 0;
  assert.deepEqual(await resolveTarget({ ...o, to: 'v1.0.0' }), { version: '1.0.0', tag: null, engines: '>=20' });
  assert.deepEqual(r.asked, ['http://r.test/@scope%2ftool/1.0.0'], 'a version needs no dist-tags');
});

test('names the tags it has when --to misses', async () => {
  const r = fakeRegistry({ latest: '1.2.0', next: '1.3.0' });
  await assert.rejects(resolveTarget({ packageName: '@scope/tool', registry: 'http://r.test', fetch: r.fetch, to: 'nightly' }), (err: RegistryError) => {
    assert.match(err.message, /no dist-tag `nightly` \(the registry has: latest, next\)/);
    assert.match(err.url, /dist-tags$/);
    return true;
  });
});

test('a 404, an error status, a body that isn\'t JSON, no tags and a timeout are each one reportable error', async () => {
  const o = { packageName: 'tool', registry: 'http://r.test' };
  const cases: [typeof globalThis.fetch, RegExp][] = [
    [(async () => json({}, 404)) as typeof fetch, /no such package or version/],
    [(async () => json({}, 503)) as typeof fetch, /answered HTTP 503/],
    [(async () => new Response('<html>', { status: 200 })) as typeof fetch, /isn't JSON/],
    [(async () => json({ latest: 3 })) as typeof fetch, /lists no dist-tags/],
    [(async () => Promise.reject(Object.assign(new Error('x'), { name: 'TimeoutError' }))) as typeof fetch, /no answer within 10 seconds/],
    [(async () => Promise.reject(new Error('ECONNREFUSED'))) as typeof fetch, /couldn't reach the registry: ECONNREFUSED/],
  ];
  for (const [fetch, re] of cases) {
    await assert.rejects(fetchDistTags({ ...o, fetch }), (err: Error) => err instanceof RegistryError && re.test(err.message));
  }
});

test('gives up after the timeout', async () => {
  // AbortSignal.timeout's timer doesn't keep the process alive; this one does, until the abort.
  const alive = setTimeout(() => {}, 5000);
  const hang = ((_: unknown, init?: RequestInit) =>
    new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)))) as typeof fetch;
  await assert.rejects(fetchDistTags({ packageName: 'tool', registry: 'http://r.test', fetch: hang, timeoutMs: 50 }), /no answer within 0.05 seconds/);
  clearTimeout(alive);
});
