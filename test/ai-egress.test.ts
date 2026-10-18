// Every model call goes through egress (SPEC R19, R20, principle 4): for each provider kind, with globalThis.fetch
// stubbed to throw, a call reaches egress's fetchImpl with the right host, purpose, feature and model, a fixed
// versionless User-Agent and no attribution headers. A model named by string throws (no hosted gateway). With AI off,
// every call is `ai_off` before egress is touched, and the network log stays empty.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { AI_USER_AGENT, Egress, EgressDenied } from '../server/egress.ts';
import { AiError } from '../server/ai/errors.ts';
import { loadSdk } from '../server/ai/sdk.ts';
import { aiHome, CONSENT, fakeNetwork, withoutGlobalFetch } from './ai-fixture.ts';

const schema = z.object({ ok: z.boolean() });

/** One connection of each kind: local ones on loopback or your network, cloud ones on their real hosts (consented). */
const KINDS: { id: string; conn: Record<string, unknown>; host: string; where: string; key?: string; auth?: string }[] = [
  { id: 'ollama', conn: { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434' }, host: '127.0.0.1:11434', where: 'this-computer' },
  { id: 'lmstudio', conn: { kind: 'lmstudio' }, host: '127.0.0.1:1234', where: 'this-computer' },
  { id: 'llamacpp', conn: { kind: 'llamacpp', baseUrl: 'http://192.168.1.5:8080/v1' }, host: '192.168.1.5:8080', where: 'your-network' },
  { id: 'custom', conn: { kind: 'openai-compatible', baseUrl: 'https://llm.example.com/v1' }, host: 'llm.example.com', where: 'internet', key: 'sk-custom-000000000000001111', auth: 'authorization' },
  { id: 'openrouter', conn: { kind: 'openrouter' }, host: 'openrouter.ai', where: 'internet', key: 'sk-or-000000000000000002222', auth: 'authorization' },
  { id: 'anthropic', conn: { kind: 'anthropic' }, host: 'api.anthropic.com', where: 'internet', key: 'sk-ant-0000000000000003333', auth: 'x-api-key' },
  { id: 'openai', conn: { kind: 'openai' }, host: 'api.openai.com', where: 'internet', key: 'sk-oai-0000000000000004444', auth: 'authorization' },
];

describe('every provider kind sends through egress', () => {
  const net = fakeNetwork();
  const home = aiHome({ ai: { enabled: true, connections: Object.fromEntries(KINDS.map((k) => [k.id, k.conn])) }, fetchImpl: net.impl });
  after(() => home.close());

  test('consent and keys first (cloud kinds)', async () => {
    for (const k of KINDS.filter((k) => k.key)) {
      assert.equal((await home.req('POST', `/api/ai/connections/${k.id}/consent`, CONSENT)).status, 200, k.id);
      assert.equal((await home.req('PUT', `/api/ai/connections/${k.id}/key`, { key: k.key })).status, 200, k.id);
    }
  });

  for (const k of KINDS) {
    test(`${k.conn.kind as string} (${k.where})`, async () => {
      const before = net.calls.length;
      const r = await withoutGlobalFetch(() => home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: k.id, model: 'model-a' }, system: 'Answer with JSON.', prompt: 'Reply with {"ok": true}.', schema }));
      assert.deepEqual(r.object, { ok: true });
      assert.equal(r.where, k.where);
      const call = net.calls.at(-1)!;
      assert.equal(net.calls.length, before + 1, 'one request');
      assert.equal(new URL(call.url).host, k.host);
      assert.equal(call.headers['user-agent'], AI_USER_AGENT, 'a fixed, versionless User-Agent');
      assert.doesNotMatch(JSON.stringify(call.headers), /ai-sdk|http-referer|x-title|x-stainless/i, 'nothing about the SDK or who is calling');
      if (k.auth) assert.match(call.headers[k.auth]!, new RegExp(k.key!.slice(-4)), 'its own key, to its own host');
      else assert.ok(!call.headers.authorization && !call.headers['x-api-key'], 'no key to a local runner');
      const line = home.log()[0]!;
      assert.equal(line.host, k.host);
      assert.equal(line.purpose, 'ai.test');
      assert.equal(line.feature, 'test');
      assert.equal(line.model, 'model-a');
      assert.equal(line.where, k.where);
      assert.equal(line.outcome, 'ok');
      assert.ok(typeof line.sent === 'number' && line.sent > 0, 'its size is logged');
      assert.doesNotMatch(JSON.stringify(home.log()), /Reply with|sk-/, 'never the content, never a key');
    });
  }

  test('Ollama gets num_ctx, think: false and the schema as format', () => {
    const call = net.calls.find((c) => c.url.endsWith('/api/chat'))!;
    assert.equal(call.body.think, false);
    assert.equal(call.body.options.num_ctx, 8192);
    assert.equal(call.body.format.type, 'object');
    assert.ok(call.body.format.properties.ok);
  });

  test('streaming goes through egress too', async () => {
    const before = net.calls.length;
    const s = await withoutGlobalFetch(async () => {
      const r = await home.ctx.ai.stream({ feature: 'test', purpose: 'ai.test', slot: { connection: 'anthropic', model: 'model-a' }, system: 's', prompt: 'p' });
      return { r, text: await (async () => {
        let t = '';
        for await (const c of r.textStream) t += c;
        return t;
      })().catch((e) => `ERR ${(e as Error).message}`) };
    });
    // the canned answer isn't a stream: what matters is that the request went out through egress, nowhere else
    assert.equal(net.calls.length, before + 1);
    assert.equal(new URL(net.calls.at(-1)!.url).host, 'api.anthropic.com');
    assert.equal(net.calls.at(-1)!.body.stream, true, 'a streaming request');
    void s;
  });
});

test('egress strips attribution headers and sets its own User-Agent, whatever a provider sends', async () => {
  const net = fakeNetwork();
  const home = aiHome({ ai: { enabled: true, connections: { lm: { kind: 'lmstudio' } } }, fetchImpl: net.impl });
  try {
    const send = home.ctx.egress.fetchFor({ purpose: 'ai.test', feature: 'test', model: 'm', connectionId: 'lm' });
    await send('http://127.0.0.1:1234/v1/models', { headers: { 'User-Agent': 'ai-sdk/openai-compatible/3.0.0 runtime/node', 'HTTP-Referer': 'https://example.com', 'X-Title': 'BragDoc', 'X-Stainless-Lang': 'js', Referer: 'https://example.com', Accept: 'application/json' } });
    const h = net.calls[0]!.headers;
    assert.equal(h['user-agent'], 'BragDoc');
    assert.equal(h.accept, 'application/json', 'ordinary headers stay');
    for (const k of ['http-referer', 'x-title', 'x-stainless-lang', 'referer']) assert.equal(h[k], undefined, k);
    // and it won't follow a provider anywhere: its own host only, no redirects
    await assert.rejects(send('http://localhost:1234/v1/models'), EgressDenied, 'another host, even loopback');
    await assert.rejects(send('http://127.0.0.1:2724/api/ai'), EgressDenied, 'another port on the same host: BragDoc itself');
    await assert.rejects(send('https://127.0.0.1:1234/v1/models'), EgressDenied, 'another scheme');
    assert.equal(net.calls.length, 1);
  } finally {
    home.close();
  }
});

test('the AI SDK refuses a model named by a string: there is no hosted gateway', async () => {
  const { sdk } = await loadSdk();
  await withoutGlobalFetch(async () => {
    await assert.rejects(sdk.generateText({ model: 'openai/gpt-5', prompt: 'hi', maxRetries: 0 }), /never names a model by string/);
  });
});

test('the providers never take a key from the environment', async () => {
  const { providers, sdk } = await loadSdk();
  const net = fakeNetwork();
  const home = aiHome({ ai: { enabled: true, connections: { a: { kind: 'anthropic', consent: { at: '2026-10-18T00:00:00Z', version: 1, host: 'api.anthropic.com' } }, o: { kind: 'openai', consent: { at: '2026-10-18T00:00:00Z', version: 1, host: 'api.openai.com' } } } }, fetchImpl: net.impl });
  const saved = { a: process.env.ANTHROPIC_API_KEY, o: process.env.OPENAI_API_KEY };
  process.env.ANTHROPIC_API_KEY = 'env-anthropic-key-must-not-be-used';
  process.env.OPENAI_API_KEY = 'env-openai-key-must-not-be-used';
  try {
    for (const id of ['a', 'o']) {
      const model = providers.modelFor({ config: home.config.get(), connectionId: id, model: 'm', fetch: home.ctx.egress.fetchFor({ purpose: 'ai.test', feature: 'test', model: 'm', connectionId: id }), apiKey: null });
      await sdk.generateText({ model, prompt: 'hi', maxRetries: 0 }).catch(() => {});
    }
    assert.equal(net.calls.length, 2);
    assert.doesNotMatch(JSON.stringify(net.calls.map((c) => c.headers)), /env-(anthropic|openai)-key/);
  } finally {
    process.env.ANTHROPIC_API_KEY = saved.a;
    process.env.OPENAI_API_KEY = saved.o;
    if (saved.a === undefined) delete process.env.ANTHROPIC_API_KEY;
    if (saved.o === undefined) delete process.env.OPENAI_API_KEY;
    home.close();
  }
});

describe('with AI off', () => {
  test('every call is ai_off before egress is touched, and the network log stays empty', async () => {
    const net = fakeNetwork();
    // a fully set-up local connection and a consented, keyed cloud one: only the master switch is off
    const home = aiHome({ ai: { enabled: false, text: { connection: 'ollama', model: 'm' }, features: { tidy: { enabled: true } }, connections: { ollama: { kind: 'ollama' }, or: { kind: 'openrouter', consent: { at: '2026-10-18T00:00:00Z', version: 1, host: 'openrouter.ai' } } } }, fetchImpl: net.impl });
    try {
      home.ctx.secrets.setAiKey('or', 'sk-or-000000000000000009999');
      const ai = home.ctx.ai;
      const calls: [string, () => Promise<unknown>][] = [
        ['object', () => ai.object({ feature: 'tidy', purpose: 'ai.tidy', system: 's', prompt: 'p', schema })],
        ['object (cloud)', () => ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'or', model: 'm' }, system: 's', prompt: 'p', schema })],
        ['stream', () => ai.stream({ feature: 'tidy', purpose: 'ai.tidy', system: 's', prompt: 'p' })],
        ['models', () => ai.models('ollama')],
      ];
      for (const [name, call] of calls) await assert.rejects(call(), (e: unknown) => e instanceof AiError && e.code === 'ai_off', name);
      assert.deepEqual(await ai.test('ollama', 'm'), { ok: false, model: 'm', where: 'this-computer', error: { code: 'ai_off', message: 'AI is off (Settings → AI).' } });
      // the routes too: 409, nothing sent
      assert.equal((await home.req('POST', '/api/ai/connections/ollama/test', { model: 'm' })).status, 409);
      assert.equal((await home.req('GET', '/api/ai/connections/ollama/models')).status, 409);
      // and egress itself refuses, should anything ask it directly
      await assert.rejects(home.ctx.egress.fetchFor({ purpose: 'ai.test', feature: 'test', connectionId: 'ollama' })('http://127.0.0.1:11434/api/tags'), (e: unknown) => e instanceof EgressDenied && e.code === 'ai_off');
      assert.equal(net.calls.length, 0, 'nothing was sent');
      assert.deepEqual(home.log().filter((e) => e.outcome !== 'denied'), [], 'nothing but that one refusal');
      assert.equal(ai.loaded(), false, 'the SDK was never loaded');
      assert.deepEqual(home.ctx.egress.allowList(), ['localhost', '127.0.0.1', '[::1]'], 'no AI host on the allow-list');
    } finally {
      home.close();
    }
  });

  test('a fresh install: AI off, every feature off, each one saying why', async () => {
    const home = aiHome();
    try {
      const { body } = await home.req('GET', '/api/ai');
      assert.equal(body.enabled, false);
      assert.deepEqual(body.connections, []);
      assert.deepEqual(body.egressHosts, []);
      for (const f of ['judge', 'tidy', 'draft']) {
        assert.equal(body.features[f].enabled, false, f);
        assert.deepEqual(body.readiness[f], { ready: false, reason: 'ai_off', message: 'AI is off (Settings → AI).', slot: null, where: null });
      }
      assert.equal(body.features.judge.when.onArrival, false, 'background judging is a second choice (SPEC R22)');
    } finally {
      home.close();
    }
  });
});

test('Egress keeps its own rules for everything else (plain http only to this computer or your network)', async () => {
  const net = fakeNetwork();
  const cfg = aiHome({ ai: { enabled: true, connections: { lan: { kind: 'ollama', baseUrl: 'http://192.168.1.5:11434' } } } });
  try {
    const eg = new Egress({ dataDir: cfg.dir, config: () => cfg.config.get(), fetchImpl: net.impl });
    // a your-network host is on the list while AI is on, over plain http: the one exception (SPEC R19)
    assert.ok(eg.allowList().includes('192.168.1.5'));
    await eg.fetchFor({ purpose: 'ai.test', feature: 'test', connectionId: 'lan' })('http://192.168.1.5:11434/api/tags');
    assert.equal(net.calls.length, 1);
    // …and the GitHub source's egressFetch still can't use plain http to anything that isn't
    await assert.rejects(eg.egressFetch({ purpose: 'test' }, 'http://example.com/'), EgressDenied);
    // nor be redirected by a remote host into a model runner on your network, though AI put it on the allow-list
    const gh = new Egress({ dataDir: cfg.dir, config: () => ({ ...cfg.config.get(), sources: { ...cfg.config.get().sources, github: { ...cfg.config.get().sources.github, enabled: true, auth: 'token' } } }), fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'http://192.168.1.5:11434/api/tags' } }) });
    await assert.rejects(gh.egressFetch({ purpose: 'github.user' }, 'https://api.github.com/user'), /may not redirect to this computer or your network/);
  } finally {
    cfg.close();
  }
});
