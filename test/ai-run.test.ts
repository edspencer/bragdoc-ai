// ctx.ai against the fake model server (SPEC R20, R28): structured answers (native schema → Zod → one repair; JSON
// mode where a server takes no schema), every fake scenario mapped to its error code, streaming, the test and the
// model list, and the queue: `now` overtakes `background`, abort, timeouts, one at a time per local connection, two
// to the cloud, and AI switched off mid-call.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { AiError } from '../server/ai/errors.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';
import { aiHome, CONSENT, fakeNetwork, type AiHome } from './ai-fixture.ts';

const schema = z.object({ ok: z.boolean(), confidence: z.number().min(0).max(1) });
const ask = (home: AiHome, connection: string, extra: Record<string, unknown> = {}) =>
  home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection, model: 'qwen3.5:4b' }, system: 'Answer with JSON.', prompt: 'Is this a win?', schema, ...extra });
const code = (c: string) => (e: unknown) => {
  assert.ok(e instanceof AiError, String(e));
  assert.equal(e.code, c, e.message);
  return true;
};

let fake: Awaited<ReturnType<typeof startFakeLlm>>;
before(async () => {
  fake = await startFakeLlm({ scenario: 'ok', slowMs: 400 });
});
after(() => fake.close());

/** A home with an Ollama-kind and an OpenAI-compatible-kind connection for each scenario, on one fake server. */
function scenarioHome(): AiHome {
  const connections: Record<string, unknown> = {};
  for (const s of ['ok', 'slow', 'down', 'bad-json', 'bad-json-once', 'no-schema', 'timeout', 'rate-limited', 'refused-key', 'quota', 'context-too-long']) {
    connections[`o-${s}`] = { kind: 'ollama', baseUrl: `${fake.url}/s/${s}`, contextTokens: 4096 };
    connections[`v-${s}`] = { kind: 'lmstudio', baseUrl: `${fake.url}/s/${s}/v1` };
  }
  return aiHome({ ai: { enabled: true, connections } });
}

describe('structured answers', () => {
  let home: AiHome;
  before(() => {
    home = scenarioHome();
  });
  after(() => home.close());

  test('ok: valid on the first try, through the provider’s own schema support', async () => {
    for (const kind of ['o', 'v']) {
      const r = await ask(home, `${kind}-ok`);
      assert.deepEqual(r.object, { ok: true, confidence: 0.5 });
      assert.deepEqual([r.mode, r.repaired, r.where], ['schema', false, 'this-computer']);
      assert.ok(r.tokensIn && r.tokensOut, 'tokens, as the runner reported them');
    }
    const sent = fake.requests.filter((r) => r.path === '/api/chat').at(-1)!.body as any;
    assert.deepEqual([sent.think, sent.options.num_ctx, sent.format.type, sent.options.temperature], [false, 4096, 'object', 0], 'Ollama: thinking off, the context size, the schema');
    const v = fake.requests.filter((r) => r.path === '/v1/chat/completions').at(-1)!.body as any;
    assert.equal(v.response_format.type, 'json_schema');
    assert.equal(v.response_format.json_schema.strict, false, 'non-strict: our Zod check is the strict one');
  });

  test('bad-json-once: one repair retry that shows the model its mistake, then valid', async () => {
    for (const kind of ['o', 'v']) {
      const n = fake.requests.length;
      const r = await ask(home, `${kind}-bad-json-once`);
      assert.equal(r.repaired, true);
      const calls = fake.requests.slice(n);
      assert.equal(calls.length, 2, 'exactly one retry');
      assert.match(JSON.stringify(calls[1]!.body), /wasn't valid/);
    }
  });

  test('bad-json: still wrong after the one repair → bad_output (two requests, never three)', async () => {
    const n = fake.requests.length;
    await assert.rejects(ask(home, 'o-bad-json'), code('bad_output'));
    assert.equal(fake.requests.length - n, 2);
  });

  test('no-schema: JSON mode with the schema in the instructions, remembered for that model', async () => {
    let n = fake.requests.length;
    const r = await ask(home, 'v-no-schema');
    assert.deepEqual([r.mode, r.object.ok], ['json', true]);
    assert.equal(fake.requests.length - n, 2, 'refused once, then JSON mode');
    assert.equal((fake.requests.at(-1)!.body as any).response_format.type, 'json_object');
    n = fake.requests.length;
    await ask(home, 'v-no-schema');
    assert.equal(fake.requests.length - n, 1, 'straight to JSON mode the second time');
    // Ollama's format refused the same way
    assert.equal((await ask(home, 'o-no-schema')).mode, 'json');
  });

  test('every fake scenario maps to its code', async () => {
    const want: [string, string][] = [
      ['down', 'unreachable'],
      ['rate-limited', 'rate_limited'],
      ['refused-key', 'key_refused'],
      ['quota', 'quota'],
      ['context-too-long', 'context_too_long'],
    ];
    for (const [s, c] of want) await assert.rejects(ask(home, `v-${s}`), code(c), s);
    await assert.rejects(ask(home, 'o-down'), code('unreachable'));
    await assert.rejects(ask(home, 'o-context-too-long'), code('context_too_long'));
    await assert.rejects(ask(home, 'o-ok', { slot: { connection: 'o-ok', model: 'missing-model:1b' } }), code('model_missing'));
    await assert.rejects(ask(home, 'o-ok', { slot: { connection: 'o-ok', model: 'llama9:70b' } }), code('model_missing'), 'not pulled');
    await assert.rejects(ask(home, 'o-timeout', { timeoutMs: 300 }), code('timeout'));
    assert.equal((await ask(home, 'o-slow')).object.ok, true, 'slow still answers');
    // and each failure is in the network log, in words, with no content
    const log = home.log();
    assert.ok(log.some((e) => e.outcome === 'error' && /ECONNRESET|other side closed|socket|fetch failed/i.test(e.error ?? '')), 'the dropped connection');
    assert.ok(log.some((e) => e.status === 429));
    assert.doesNotMatch(JSON.stringify(log), /Is this a win/);
  });

  test('test(): "works, N ms, structured answers: yes", or the reason in words', async () => {
    const ok = await home.ctx.ai.test('o-ok', 'qwen3.5:4b');
    assert.equal(ok.ok, true);
    assert.ok(ok.ok && ok.structured && ok.ms >= 0);
    const js = await home.ctx.ai.test('v-no-schema', 'gemma4:e4b');
    assert.ok(js.ok && !js.structured, 'works, but only in JSON mode');
    const down = await home.ctx.ai.test('o-down', 'qwen3.5:4b');
    assert.ok(!down.ok && down.error.code === 'unreachable' && /isn't answering/.test(down.error.message));
    const nomodel = await home.ctx.ai.test('o-ok');
    assert.ok(!nomodel.ok && nomodel.error.code === 'no_model');
  });

  test('models(): Ollama’s tags, an OpenAI-style list', async () => {
    assert.deepEqual((await home.ctx.ai.models('o-ok')).map((m) => m.name), ['qwen3.5:4b', 'gemma4:e4b']);
    assert.deepEqual((await home.ctx.ai.models('v-ok')).map((m) => m.name), ['qwen3.5:4b', 'gemma4:e4b']);
    await assert.rejects(home.ctx.ai.models('o-down'), code('unreachable'));
  });
});

describe('streaming', () => {
  let home: AiHome;
  before(() => {
    home = scenarioHome();
  });
  after(() => home.close());

  test('text arrives in pieces, and done says how it went', async () => {
    for (const id of ['o-ok', 'v-ok']) {
      const s = await home.ctx.ai.stream({ feature: 'test', purpose: 'ai.test', slot: { connection: id, model: 'qwen3.5:4b' }, system: 's', prompt: 'echo: a long enough sentence to arrive in several pieces' });
      const parts: string[] = [];
      for await (const p of s.textStream) parts.push(p);
      assert.ok(parts.length > 1, id);
      assert.equal(parts.join(''), 'You said: a long enough sentence to arrive in several pieces');
      assert.equal((await s.done).text, parts.join(''));
    }
  });

  test('stopping early cancels the call; a runner that goes away is an error in words', async () => {
    const s = await home.ctx.ai.stream({ feature: 'test', purpose: 'ai.test', slot: { connection: 'o-slow', model: 'qwen3.5:4b' }, system: 's', prompt: 'echo: one two three four five six seven eight nine ten' });
    for await (const _ of s.textStream) break;
    await assert.rejects(s.done, code('cancelled'));
    const down = await home.ctx.ai.stream({ feature: 'test', purpose: 'ai.test', slot: { connection: 'o-down', model: 'qwen3.5:4b' }, system: 's', prompt: 'p' });
    await assert.rejects((async () => {
      for await (const _ of down.textStream);
    })(), code('unreachable'));
  });
});

describe('the queue', () => {
  test('one at a time per local connection, and `now` overtakes `background`', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { slow: { kind: 'ollama', baseUrl: `${fake.url}/s/slow` } } } });
    try {
      const order: string[] = [];
      const go = (name: string, priority: 'now' | 'background') => ask(home, 'slow', { priority, prompt: name }).then(() => order.push(name));
      const a = go('bg-1', 'background');
      await new Promise((r) => setTimeout(r, 50)); // bg-1 is running
      const b = go('bg-2', 'background');
      const c = go('now-1', 'now');
      assert.deepEqual(home.ctx.ai.queue(), { slow: { running: 1, waiting: 2 } });
      await Promise.all([a, b, c]);
      assert.deepEqual(order, ['bg-1', 'now-1', 'bg-2']);
      assert.deepEqual(home.ctx.ai.queue(), {});
    } finally {
      home.close();
    }
  });

  test('abort: a waiting job leaves the line without sending; a running one is cancelled', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { slow: { kind: 'ollama', baseUrl: `${fake.url}/s/slow` } } } });
    try {
      const first = new AbortController();
      const second = new AbortController();
      const n = fake.requests.length;
      const a = ask(home, 'slow', { signal: first.signal });
      const b = ask(home, 'slow', { signal: second.signal });
      second.abort();
      await assert.rejects(b, code('cancelled'));
      await new Promise((r) => setTimeout(r, 50));
      first.abort();
      await assert.rejects(a, code('cancelled'));
      assert.equal(fake.requests.length - n, 1, 'the waiting one never sent anything');
      await assert.rejects(ask(home, 'slow', { signal: AbortSignal.abort() }), code('cancelled'), 'already aborted: never queued');
    } finally {
      home.close();
    }
  });

  test('the cloud gets two at a time', async () => {
    let inFlight = 0;
    let most = 0;
    const net = fakeNetwork(async (url, body) => {
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise((r) => setTimeout(r, 100));
      inFlight--;
      const { cannedAnswer } = await import('./ai-fixture.ts');
      return cannedAnswer(url, body, { ok: true, confidence: 0.9 });
    });
    const home = aiHome({ ai: { enabled: true, connections: { c: { kind: 'openai-compatible', baseUrl: 'https://llm.example.com/v1' } } }, fetchImpl: net.impl });
    try {
      await home.req('POST', '/api/ai/connections/c/consent', CONSENT);
      await Promise.all([1, 2, 3, 4, 5].map(() => ask(home, 'c')));
      assert.equal(most, 2);
    } finally {
      home.close();
    }
  });

  test('OpenRouter: reasoning off; a model that insists gets low effort once, remembered (not the repair retry)', async () => {
    const net = fakeNetwork(async (url, body) => {
      const { cannedAnswer } = await import('./ai-fixture.ts');
      if (body.model === 'thinker' && body.reasoning?.effort === 'none')
        return new Response(JSON.stringify({ error: { message: 'Reasoning is mandatory for this endpoint and cannot be disabled.', code: 400 } }), { status: 400, headers: { 'content-type': 'application/json' } });
      return cannedAnswer(url, body, { ok: true, confidence: 0.9 });
    });
    const home = aiHome({ ai: { enabled: true, connections: { or: { kind: 'openrouter' } } }, fetchImpl: net.impl });
    try {
      await home.req('POST', '/api/ai/connections/or/consent', CONSENT);
      await home.req('PUT', '/api/ai/connections/or/key', { key: 'sk-or-v1-test-not-a-real-key' });
      const r = await ask(home, 'or', { slot: { connection: 'or', model: 'plain' } });
      assert.equal(r.repaired, false);
      assert.deepEqual(net.calls.map((c) => c.body.reasoning), [{ effort: 'none', exclude: true }]);
      const t = await ask(home, 'or', { slot: { connection: 'or', model: 'thinker' } });
      assert.equal(t.repaired, false);
      await ask(home, 'or', { slot: { connection: 'or', model: 'thinker' } });
      assert.deepEqual(
        net.calls.slice(1).map((c) => c.body.reasoning.effort),
        ['none', 'low', 'low'],
        'refused once, then low effort, and remembered',
      );
    } finally {
      home.close();
    }
  });

  test('AI switched off mid-call: the running call stops (ai_off), the waiting ones too, and nothing more is sent', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { slow: { kind: 'ollama', baseUrl: `${fake.url}/s/timeout` } } } });
    try {
      const n = fake.requests.length;
      const running = ask(home, 'slow');
      const waiting = ask(home, 'slow');
      await new Promise((r) => setTimeout(r, 100));
      const off = await home.req('PUT', '/api/ai', { enabled: false });
      assert.equal(off.status, 200);
      await assert.rejects(running, code('ai_off'));
      await assert.rejects(waiting, code('ai_off'));
      assert.equal(fake.requests.length - n, 1);
    } finally {
      home.close();
    }
  });

  test('a hand edit that turns AI off stops a running call within a second (the job re-checks its gates)', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { slow: { kind: 'ollama', baseUrl: `${fake.url}/s/timeout` } } } });
    try {
      const running = ask(home, 'slow');
      await new Promise((r) => setTimeout(r, 100));
      home.config.update({ ai: { enabled: false } }); // what the watcher would see after an edit on disk
      const t0 = Date.now();
      await assert.rejects(running, (e: unknown) => e instanceof AiError && e.code === 'ai_off' && /stopped mid-call/.test(e.message));
      assert.ok(Date.now() - t0 < 2500);
    } finally {
      home.close();
    }
  });

  test('a waiting call failed by cancelAll is reported once, even when its caller then goes away', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { slow: { kind: 'ollama', baseUrl: `${fake.url}/s/timeout` } } } });
    try {
      const seen: string[] = [];
      home.ctx.ai.onCall((r) => seen.push(r.outcome));
      const running = ask(home, 'slow');
      const ac = new AbortController();
      const waiting = ask(home, 'slow', { signal: ac.signal });
      await new Promise((r) => setTimeout(r, 50));
      home.ctx.ai.cancelAll('ai_off', 'AI was switched off.');
      await assert.rejects(waiting, code('ai_off'));
      await assert.rejects(running, code('ai_off'));
      ac.abort();
      await new Promise((r) => setTimeout(r, 20));
      assert.deepEqual(seen.sort(), ['error', 'error']);
      assert.deepEqual(home.ctx.ai.queue(), {}, 'no empty lines left behind');
    } finally {
      home.close();
    }
  });

  test('every call is reported to listeners (the activity log’s seam), with no content', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { ok: { kind: 'ollama', baseUrl: fake.url }, down: { kind: 'ollama', baseUrl: `${fake.url}/s/down` } } } });
    try {
      const seen: unknown[] = [];
      home.ctx.ai.onCall((r) => seen.push(r));
      await ask(home, 'ok', { runId: 'run-1' });
      await ask(home, 'down').catch(() => {});
      assert.deepEqual(
        seen.map((r: any) => [r.feature, r.connection, r.model, r.where, r.outcome, r.error ?? null, r.runId ?? null]),
        [
          ['test', 'ok', 'qwen3.5:4b', 'this-computer', 'ok', null, 'run-1'],
          ['test', 'down', 'qwen3.5:4b', 'this-computer', 'error', 'unreachable', null],
        ],
      );
      assert.doesNotMatch(JSON.stringify(seen), /Is this a win/);
    } finally {
      home.close();
    }
  });
});

describe('gates', () => {
  test('a feature needs AI on, its own switch and a model; every gate is checked before anything is queued', async () => {
    const home = aiHome({ ai: { enabled: true, connections: { ok: { kind: 'ollama', baseUrl: fake.url } } } });
    try {
      const tidy = () => home.ctx.ai.object({ feature: 'tidy', purpose: 'ai.tidy', system: 's', prompt: 'p', schema });
      await assert.rejects(tidy(), code('ai_off'), 'the feature is off');
      await home.req('PUT', '/api/ai/features/tidy', { enabled: true });
      await assert.rejects(tidy(), code('no_model'));
      await home.req('PUT', '/api/ai', { text: { connection: 'ok', model: 'qwen3.5:4b' } });
      assert.equal((await tidy()).object.ok, true);
      const status = (await home.req('GET', '/api/ai')).body;
      assert.deepEqual(status.readiness.tidy, { ready: true, reason: null, message: null, slot: { connection: 'ok', model: 'qwen3.5:4b' }, where: 'this-computer' });
      assert.equal(status.readiness.judge.reason, 'ai_off', 'turning one feature on turns no other on');
      assert.equal(home.ctx.ai.queue().ok, undefined);
    } finally {
      home.close();
    }
  });
});

test('a client that goes away cancels its call, over a real socket, and frees the line', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { startServer } = await import('../server/index.ts');
  const { tmpHome } = await import('./fixture.ts');
  const h = tmpHome();
  fs.mkdirSync(h.dataDir, { recursive: true });
  fs.writeFileSync(path.join(h.dataDir, 'config.yaml'), `ai:\n  enabled: true\n  connections:\n    f: { kind: ollama, baseUrl: "${fake.url}/s/timeout" }\n`);
  const { port, close } = await startServer(0, { dataDir: h.dataDir, webDist: null, homedir: h.home, env: { PATH: '' } });
  try {
    const post = (p: string, body: unknown, signal?: AbortSignal) => fetch(`http://127.0.0.1:${port}${p}`, { method: p.endsWith('/f') ? 'PUT' : 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, ...(signal ? { signal } : {}) });
    const ac = new AbortController();
    const first = post('/api/ai/connections/f/test', { model: 'qwen3.5:4b' }, ac.signal).catch((e) => e.name);
    await new Promise((r) => setTimeout(r, 300));
    ac.abort(); // the tab was closed
    assert.equal(await first, 'AbortError');
    // the same connection (the same line), now answering: it runs at once, so the first call is gone
    await post('/api/ai/connections/f', { baseUrl: fake.url });
    const t0 = Date.now();
    const second = (await (await post('/api/ai/connections/f/test', { model: 'qwen3.5:4b' })).json()) as { ok: boolean };
    assert.equal(second.ok, true);
    assert.ok(Date.now() - t0 < 2000, `waited ${Date.now() - t0} ms behind a call nobody was waiting for`);
  } finally {
    await close();
    h.cleanup();
  }
});

test('an upstream error that echoes the key never passes it on', async () => {
  const { classify } = await import('../server/ai/errors.ts');
  const key = 'sk-or-v1-abcdef0123456789';
  const e = classify({ statusCode: 401, responseBody: JSON.stringify({ error: { message: `Invalid API key: ${key}` } }) }, { connection: 'or', host: 'openrouter.ai', key });
  assert.equal(e.code, 'key_refused');
  assert.ok(!e.message.includes('abcdef0123456789'), e.message);
  // and a bug of ours (a TypeError that isn't a network failure) isn't blamed on the runner
  assert.equal(classify(new TypeError("Cannot read properties of undefined (reading 'x')"), { connection: 'o', host: '127.0.0.1' }).code, 'failed');
  assert.equal(classify(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }), { connection: 'o', host: '127.0.0.1' }).code, 'unreachable');
});
