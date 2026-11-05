// From edspencer/cli-contract test/health.test.ts @ 1.0; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchHealth, waitForReady, waitForVersion } from '../server/update/health.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A fake clock, so a timeout is proven without waiting for one. */
function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

/** Answers from a list, one per request; refuses the connection when the list says null. */
function answers(list: (unknown | null)[]): typeof fetch {
  return (async (url: string | URL) => {
    assert.equal(String(url), 'http://127.0.0.1:9/api/health');
    const next = list.length > 1 ? list.shift() : list[0];
    if (next === null) throw new Error('ECONNREFUSED');
    return json(next);
  }) as typeof fetch;
}

test('asks once: the version, or undefined when nothing answers', async () => {
  assert.deepEqual(await fetchHealth({ url: 'http://127.0.0.1:9', fetch: answers([{ ok: true, version: '1.0.0' }]) }), { ok: true, version: '1.0.0' });
  assert.deepEqual(await fetchHealth({ url: 'http://127.0.0.1:9', fetch: answers([{ ok: true }]) }), { ok: true });
  assert.equal(await fetchHealth({ url: 'http://127.0.0.1:9', fetch: answers([null]) }), undefined);
  assert.equal(await fetchHealth({ url: 'http://127.0.0.1:9', fetch: (async () => json({}, 500)) as typeof fetch }), undefined);
});

test('waits until it answers, or says it timed out', async () => {
  assert.equal(await waitForReady({ url: 'http://127.0.0.1:9', fetch: answers([null, null, { ok: true }]), ...clock() }), 'ready');
  assert.equal(await waitForReady({ url: 'http://127.0.0.1:9', fetch: answers([null]), timeoutMs: 1000, ...clock() }), 'timeout');
});

test('waits for the version, telling a wrong version from no answer', async () => {
  assert.deepEqual(
    await waitForVersion({ url: 'http://127.0.0.1:9', version: '2.0.0', fetch: answers([null, { ok: true, version: '1.0.0' }, { ok: true, version: '2.0.0' }]), ...clock() }),
    { state: 'ok', version: '2.0.0' },
  );
  assert.deepEqual(
    await waitForVersion({ url: 'http://127.0.0.1:9', version: '2.0.0', fetch: answers([{ ok: true, version: '1.0.0' }]), timeoutMs: 1000, ...clock() }),
    { state: 'wrong-version', version: '1.0.0' },
  );
  assert.deepEqual(await waitForVersion({ url: 'http://127.0.0.1:9', version: '2.0.0', fetch: answers([null]), timeoutMs: 1000, ...clock() }), { state: 'no-answer' });
});
