// Settings → AI's server side (PR23, SPEC R17–R19, D69–D71): looking for a model runner (only with AI on, only this
// computer, each probe logged), the hardware readings and what they recommend, a download only with the confirm (and
// Cancel stops it, logged twice), the cloud journey the tab drives (internet by host, nothing before consent, Revoke),
// and the Network tab's total to AI providers on the internet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Egress, EgressDenied } from '../server/egress.ts';
import { chipLabel, gb, providerOf, seconds } from '../src/settings/ai/words.ts';
import { CONSENT, aiHome, cannedAnswer, fakeNetwork } from './ai-fixture.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';
import { tmpDir } from './fixture.ts';

const GiB = 1024 ** 3;
const hw = (ramGb: number, appleSilicon = false) => () => ({ ramBytes: ramGb * GiB, cpu: 'Test CPU', cores: 8, arch: appleSilicon ? 'arm64' : 'x64', appleSilicon, freeDiskBytes: 50e9, inDocker: false });

test('hardware: 6 GB has no local recommendation, 8–16 GB gets qwen3.5:4b, 16 GB gemma4:e4b; Apple silicon has no speed note', async () => {
  for (const [ram, want] of [
    [6, null],
    [8, 'qwen3.5:4b'],
    [12, 'qwen3.5:4b'],
    [16, 'gemma4:e4b'],
    [64, 'gemma4:e4b'],
  ] as const) {
    const home = aiHome({ app: { hardware: hw(ram) } });
    try {
      const r = await home.req('GET', '/api/ai/hardware');
      assert.equal(r.status, 200);
      assert.equal(r.body.recommended, want, `${ram} GB`);
      assert.match(r.body.speedNote, /15–20 s per item/);
      assert.equal(r.body.modelsAsOf.length, 10);
    } finally {
      home.close();
    }
  }
  const mac = aiHome({ app: { hardware: hw(16, true) } });
  try {
    assert.equal((await mac.req('GET', '/api/ai/hardware')).body.speedNote, null);
  } finally {
    mac.close();
  }
});

test('hardware: the real readings are numbers, with free space read from the home folder', async () => {
  const home = aiHome({ app: { homedir: tmpDir('bragdoc-hw-') } });
  try {
    const r = (await home.req('GET', '/api/ai/hardware')).body;
    assert.ok(r.ramBytes > 0 && r.cores > 0 && typeof r.cpu === 'string');
    assert.ok(r.freeDiskBytes === null || r.freeDiskBytes > 0);
    assert.equal(r.inDocker, false);
  } finally {
    home.close();
  }
});

test('detect: refused with AI off (409, and nothing logged); with AI on, each probe is a `detect` line to this computer', async () => {
  const fake = await startFakeLlm();
  // a port nothing listens on: the fake's, after it's closed
  const gone = await startFakeLlm();
  const goneUrl = gone.url;
  await gone.close();
  const binDir = tmpDir('bragdoc-path-');
  fs.writeFileSync(path.join(binDir, 'ollama'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const home = aiHome({ app: { detectTargets: [{ kind: 'ollama', baseUrl: fake.url }, { kind: 'lmstudio', baseUrl: `${goneUrl}/v1` }], env: { PATH: binDir } } });
  try {
    const off = await home.req('POST', '/api/ai/detect', {});
    assert.equal(off.status, 409);
    assert.equal(off.body.error.code, 'ai_off');
    assert.equal(home.log().length, 0, 'nothing contacted with AI off');
    assert.equal(fake.requests.length, 0);

    await home.req('PUT', '/api/ai', { enabled: true });
    const r = await home.req('POST', '/api/ai/detect', {});
    assert.equal(r.status, 200);
    assert.equal(r.body.runners.length, 1);
    const [o] = r.body.runners;
    assert.equal(o.kind, 'ollama');
    assert.equal(o.version, '0.0.0-fake');
    assert.deepEqual(o.models.map((m: { name: string }) => m.name), ['qwen3.5:4b', 'gemma4:e4b']);
    assert.equal(o.where, 'this-computer');
    assert.equal(o.connectionId, null);
    assert.equal(r.body.ollamaOnPath, true, 'a look on PATH (nothing ran)');
    const lines = home.log();
    assert.ok(lines.length >= 3);
    for (const l of lines) {
      assert.equal(l.feature, 'detect');
      assert.equal(l.where, 'this-computer');
      assert.equal(l.method, 'GET');
    }
    assert.ok(lines.some((l) => l.outcome === 'error'), 'the closed port is logged too, as a failure');

    // the last result is kept, and says when a connection already points at a runner
    await home.req('POST', '/api/ai/connections', { kind: 'ollama', baseUrl: fake.url });
    const last = await home.req('GET', '/api/ai/detect');
    assert.equal(last.body.runners[0].connectionId, 'ollama');
    assert.ok(fs.existsSync(path.join(home.dir, 'cache', 'ai', 'detect.json')));
  } finally {
    home.close();
    await fake.close();
  }
});

test('detect: a runner with no models is found with none (the page then points at the recommendations)', async () => {
  const fake = await startFakeLlm({ scenario: 'no-models' });
  const home = aiHome({ ai: { enabled: true }, app: { detectTargets: [{ kind: 'ollama', baseUrl: fake.url }], env: { PATH: '' } } });
  try {
    const r = (await home.req('POST', '/api/ai/detect', {})).body;
    assert.equal(r.runners.length, 1);
    assert.deepEqual(r.runners[0].models, []);
    assert.equal(r.ollamaOnPath, false);
  } finally {
    home.close();
    await fake.close();
  }
});

test('egress.probe: only this computer (or the Docker host), only with AI on; anything else is refused and logged', async () => {
  const dir = tmpDir('bragdoc-probe-');
  let ai = { enabled: true, connections: {}, text: null, vision: null, features: {} };
  const net = fakeNetwork();
  const e = new Egress({ dataDir: dir, config: () => ({ sources: { github: { enabled: false } }, ai }) as never, fetchImpl: net.impl });
  await assert.rejects(e.probe({ purpose: 'ai.detect', feature: 'detect' }, 'https://example.com/api/version'), EgressDenied);
  await assert.rejects(e.probe({ purpose: 'ai.detect', feature: 'detect' }, 'http://192.168.1.5:11434/api/version'), EgressDenied);
  await e.probe({ purpose: 'ai.detect', feature: 'detect' }, 'http://host.docker.internal:11434/api/tags');
  ai = { ...ai, enabled: false };
  await assert.rejects(e.probe({ purpose: 'ai.detect', feature: 'detect' }, 'http://127.0.0.1:11434/api/version'), (err: EgressDenied) => err.code === 'ai_off');
  assert.deepEqual(
    net.calls.map((c) => c.url),
    ['http://host.docker.internal:11434/api/tags'],
  );
});

test('pull: nothing without { confirm: true }; only the recommended models; only Ollama; AI off is a 409', async () => {
  const fake = await startFakeLlm({ scenario: 'no-models' });
  const home = aiHome({ ai: { enabled: true, connections: { ollama: { kind: 'ollama', baseUrl: fake.url }, cloud: { kind: 'openrouter' } } } });
  try {
    for (const body of [{ model: 'qwen3.5:4b' }, { confirm: false, model: 'qwen3.5:4b' }, { confirm: 'yes', model: 'qwen3.5:4b' }, {}]) {
      const r = await home.req('POST', '/api/ai/connections/ollama/pull', body);
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, 'confirm_needed');
    }
    assert.equal((await home.req('POST', '/api/ai/connections/ollama/pull', { confirm: true, model: 'llama3:70b' })).body.error.code, 'not_recommended');
    assert.equal((await home.req('POST', '/api/ai/connections/ollama/pull', { confirm: true, model: 'phi-4' })).body.error.code, 'not_recommended', 'no known size, so no confirm can state it');
    assert.equal((await home.req('POST', '/api/ai/connections/cloud/pull', { confirm: true, model: 'qwen3.5:4b' })).body.error.code, 'not_ollama');
    assert.equal((await home.req('POST', '/api/ai/connections/nope/pull', { confirm: true, model: 'qwen3.5:4b' })).status, 404);
    await home.req('PUT', '/api/ai', { enabled: false });
    const off = await home.req('POST', '/api/ai/connections/ollama/pull', { confirm: true, model: 'qwen3.5:4b' });
    assert.equal(off.status, 409);
    assert.equal(off.body.error.code, 'ai_off');
    assert.equal(fake.requests.filter((r) => r.path === '/api/pull').length, 0, 'Ollama was never asked');
    assert.equal(home.log().length, 0);
  } finally {
    home.close();
    await fake.close();
  }
});

test('pull: with the confirm, Ollama’s progress streams back, the model is installed, and it is logged twice', async () => {
  const fake = await startFakeLlm({ scenario: 'no-models', pullStepMs: 5 });
  const home = aiHome({ ai: { enabled: true, connections: { ollama: { kind: 'ollama', baseUrl: fake.url } } } });
  try {
    const res = await home.app.request('/api/ai/connections/ollama/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, model: 'qwen3.5:4b' }) });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /ndjson/);
    const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines[0].status, 'pulling manifest');
    assert.ok(lines.some((l) => l.total && l.completed));
    assert.deepEqual(lines.at(-1), { done: true, ok: true });
    const tags = (await (await fetch(`${fake.url}/api/tags`)).json()) as { models: { name: string }[] };
    assert.ok(tags.models.some((m: { name: string }) => m.name === 'qwen3.5:4b'));
    const log = home.log();
    const local = log.find((l) => l.via === 'fetch' && l.feature === 'pull');
    const via = log.find((l) => l.via === 'ollama');
    assert.equal(local?.where, 'this-computer');
    assert.equal(local?.model, 'qwen3.5:4b');
    assert.equal(via?.host, 'registry (via Ollama)');
    assert.equal(via?.where, 'internet');
    assert.equal(via?.outcome, 'ok');
  } finally {
    home.close();
    await fake.close();
  }
});

test('pull: Cancel (the request closed) stops Ollama’s stream; the registry line says cancelled', async () => {
  const fake = await startFakeLlm({ scenario: 'no-models', pullStepMs: 200 });
  const home = aiHome({ ai: { enabled: true, connections: { ollama: { kind: 'ollama', baseUrl: fake.url } } } });
  try {
    const ac = new AbortController();
    const res = await home.app.request('/api/ai/connections/ollama/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, model: 'gemma4:e4b' }), signal: ac.signal });
    const reader = res.body!.getReader();
    await reader.read(); // the first progress line
    ac.abort();
    await reader.cancel().catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    const tags = (await (await fetch(`${fake.url}/api/tags`)).json()) as { models: { name: string }[] };
    assert.ok(!tags.models.some((m: { name: string }) => m.name === 'gemma4:e4b'), 'not installed');
    const via = home.log().find((l) => l.via === 'ollama');
    assert.equal(via?.outcome, 'error');
    assert.equal(via?.error, 'cancelled');
  } finally {
    home.close();
    await fake.close();
  }
});

test('the cloud journey the tab drives: a custom https URL is internet, nothing is sent before Allow, Revoke takes it off', async () => {
  const net = fakeNetwork((u, b) => cannedAnswer(u, b));
  const home = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
  try {
    const add = await home.req('POST', '/api/ai/connections', { kind: 'ollama', baseUrl: 'https://llm.example.com' });
    assert.equal(add.status, 201);
    assert.equal(add.body.connection.class, 'internet', 'typed into the Ollama preset, but its host is on the internet');
    assert.equal(add.body.connection.cloud, true);
    assert.equal(add.body.connection.blocked.code, 'not_consented');
    const refused = await home.req('POST', '/api/ai/connections/ollama/test', { model: 'm' });
    assert.equal(refused.status, 409);
    assert.equal(net.calls.length, 0);
    assert.equal(home.log().length, 0, 'the network log is empty before Allow');
    assert.ok(!(await home.req('GET', '/api/ai')).body.egressHosts.includes('llm.example.com'));

    await home.req('POST', '/api/ai/connections/ollama/consent', CONSENT);
    assert.ok((await home.req('GET', '/api/ai')).body.egressHosts.includes('llm.example.com'));
    const ok = await home.req('POST', '/api/ai/connections/ollama/test', { model: 'm' });
    assert.equal(ok.body.ok, true);
    assert.equal(ok.body.where, 'internet');
    assert.ok(home.log().every((l) => l.where === 'internet' && l.host === 'llm.example.com'));

    await home.req('DELETE', '/api/ai/connections/ollama/consent');
    assert.ok(!(await home.req('GET', '/api/ai')).body.egressHosts.includes('llm.example.com'));
    const before = net.calls.length;
    assert.equal((await home.req('POST', '/api/ai/connections/ollama/test', { model: 'm' })).status, 409);
    assert.equal(net.calls.length, before, 'refused before sending');
  } finally {
    home.close();
  }
});

test('a wrong key is key_refused, in words; the key is never in the answer', async () => {
  const net = fakeNetwork(() => new Response(JSON.stringify({ error: { message: 'User not found.', code: 401 } }), { status: 401, headers: { 'content-type': 'application/json' } }));
  const home = aiHome({ ai: { enabled: true }, fetchImpl: net.impl });
  try {
    await home.req('POST', '/api/ai/connections', { kind: 'openrouter' });
    await home.req('POST', '/api/ai/connections/openrouter/consent', CONSENT);
    const key = 'sk-or-v1-wrong-wrong-wrong-0000';
    const saved = await home.req('PUT', '/api/ai/connections/openrouter/key', { key });
    assert.equal(saved.body.keyHint, '…0000');
    const r = await home.req('POST', '/api/ai/connections/openrouter/test', { model: 'some/model' });
    assert.equal(r.body.ok, false);
    assert.equal(r.body.error.code, 'key_refused');
    assert.match(r.body.error.message, /refused the key/);
    assert.ok(!JSON.stringify(r.body).includes(key));
    const long = await home.req('PUT', '/api/ai/connections/openrouter/key', { key: 'x'.repeat(600) });
    assert.equal(long.status, 400);
    assert.match(long.body.error.message, /longer than any key/);
  } finally {
    home.close();
  }
});

test('the network log totals the bytes sent to AI providers on the internet (never local ones, never refusals)', async () => {
  const net = fakeNetwork((u, b) => cannedAnswer(u, b));
  const fake = await startFakeLlm();
  const home = aiHome({ ai: { enabled: true, connections: { local: { kind: 'ollama', baseUrl: fake.url } } }, fetchImpl: async (url, init) => (url.hostname === '127.0.0.1' ? fetch(url, init) : net.impl(url, init)) });
  try {
    await home.req('POST', '/api/ai/connections', { kind: 'openai-compatible', id: 'cloud', baseUrl: 'https://llm.example.com/v1' });
    await home.req('POST', '/api/ai/connections/cloud/test', { model: 'm' }); // refused: not consented
    await home.req('POST', '/api/ai/connections/local/test', { model: 'qwen3.5:4b' });
    assert.equal((await home.req('GET', '/api/network-log')).body.toAiInternet, 0);
    await home.req('POST', '/api/ai/connections/cloud/consent', CONSENT);
    await home.req('POST', '/api/ai/connections/cloud/test', { model: 'm' });
    const log = (await home.req('GET', '/api/network-log')).body;
    const sent = log.entries.filter((e: { where?: string }) => e.where === 'internet').reduce((n: number, e: { sent?: number }) => n + (e.sent ?? 0), 0);
    assert.ok(sent > 0);
    assert.equal(log.toAiInternet, sent);
  } finally {
    home.close();
    await fake.close();
  }
});

test('the words: the header chip, providers, durations and sizes', () => {
  const conn = (over: Record<string, unknown>) => ({ id: 'c', kind: 'ollama', class: 'this-computer', host: '127.0.0.1', ...over }) as never;
  assert.equal(chipLabel(undefined), null);
  assert.equal(chipLabel({ enabled: false, text: null, connections: [] }), null);
  assert.equal(chipLabel({ enabled: true, text: null, connections: [] }), 'AI · no model yet');
  assert.equal(chipLabel({ enabled: true, text: { connection: 'c', model: 'm' }, connections: [conn({})] }), 'AI · this computer');
  assert.equal(chipLabel({ enabled: true, text: { connection: 'c', model: 'm' }, connections: [conn({ class: 'your-network' })] }), 'AI · your network');
  assert.equal(chipLabel({ enabled: true, text: { connection: 'c', model: 'm' }, connections: [conn({ kind: 'anthropic', class: 'internet', host: 'api.anthropic.com' })] }), 'AI · Anthropic');
  assert.equal(chipLabel({ enabled: true, text: { connection: 'c', model: 'm' }, connections: [conn({ kind: 'ollama', class: 'internet', host: 'llm.example.com' })] }), 'AI · llm.example.com');
  assert.equal(providerOf({ kind: 'openrouter', host: 'openrouter.ai' }), 'OpenRouter');
  assert.equal(seconds(850), '850 ms');
  assert.equal(seconds(8500), '8.5 s');
  assert.equal(seconds(17_400), '17 s');
  assert.equal(gb(3.3e9), '3.3 GB');
  assert.equal(gb(null), 'unknown');
});
