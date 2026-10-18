// A fake model server for tests, the docs' captures and box QA (SPEC R28): CI never calls a real model. It speaks
// just enough of three APIs, on 127.0.0.1 only:
//   Ollama             GET /api/version, GET /api/tags, POST /api/chat (streamed or not), POST /api/pull (streamed)
//   OpenAI-compatible  GET /v1/models, POST /v1/chat/completions (json_schema, json_object, SSE streaming)
//   Anthropic          GET /v1/models, POST /v1/messages (output format, the json tool, SSE streaming)
// Answers come from the rule table in answers.ts. The scenario says how it behaves:
//   ok · slow · down · bad-json · bad-json-once · no-schema · timeout · rate-limited · refused-key · quota ·
//   context-too-long · no-models
// chosen per request, first match: a `/s/<scenario>/` path prefix (so one server can be several connections:
// `http://127.0.0.1:<port>/s/bad-json/v1`), then the scenario this process was started with, then FAKE_LLM_SCENARIO,
// then $HOME/.fake-llm/scenario (re-read each request, so QA can switch it while BragDoc runs), else ok.
// A model named `missing…` is never installed (404, like a model you haven't pulled).
//
//   node --import tsx test/fixtures/fake-llm/server.ts --port 5150 [--scenario slow]
//
// GET /_fake/requests lists what it was sent (newest last; DELETE clears it): tests check think, num_ctx, headers.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decisionAsked } from '../../../scripts/eval/decision.ts';
import { answerFor, type AnswerRule, type FakeRequest } from './answers.ts';

export const SCENARIOS = ['ok', 'slow', 'down', 'bad-json', 'bad-json-once', 'no-schema', 'timeout', 'rate-limited', 'refused-key', 'quota', 'context-too-long', 'no-models'] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const FAKE_MODELS = ['qwen3.5:4b', 'gemma4:e4b'];

export interface Recorded {
  method: string;
  path: string;
  scenario: Scenario;
  headers: Record<string, string>;
  body: unknown;
  /** Which answers.ts row answered, for model calls. */
  rule?: string;
}

export interface FakeLlmOptions {
  scenario?: Scenario;
  /** How long `slow` waits (ms), and the gap between streamed chunks. Default 1500. */
  slowMs?: number;
  /** Each step of a fake pull (ms). Default 150. */
  pullStepMs?: number;
  /** Rows checked before answers.ts's: a replayed recording (test/ai-replay.ts replayRules). */
  rules?: AnswerRule[];
  env?: NodeJS.ProcessEnv;
}

export interface FakeLlm {
  server: http.Server;
  requests: Recorded[];
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
  });

function scenarioOf(prefix: string | null, opts: FakeLlmOptions): Scenario {
  const env = opts.env ?? process.env;
  let s: string | undefined = prefix ?? opts.scenario ?? env.FAKE_LLM_SCENARIO;
  if (!s) {
    try {
      s = fs.readFileSync(path.join(env.HOME || '/nonexistent', '.fake-llm', 'scenario'), 'utf8').trim();
    } catch {
      s = 'ok';
    }
  }
  return (SCENARIOS as readonly string[]).includes(s) ? (s as Scenario) : 'ok';
}

const text = (c: unknown): string =>
  typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => (typeof p === 'string' ? p : ((p as { text?: string }).text ?? ''))).join('') : '';

/** The request in the shape answers.ts reads. */
function normalise(api: FakeRequest['api'], b: Record<string, any>): FakeRequest {
  const messages: { role: string; content: string }[] = (b.messages ?? []).map((m: { role: string; content: unknown }) => ({ role: m.role, content: text(m.content) }));
  let system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  if (api === 'anthropic') system = text(b.system);
  let schema: Record<string, unknown> | null = null;
  let schemaName: string | null = null;
  let json = false;
  if (api === 'ollama') {
    if (b.format && typeof b.format === 'object') schema = b.format;
    json = !!b.format;
  } else if (api === 'openai') {
    const rf = b.response_format;
    if (rf?.type === 'json_schema') {
      schema = rf.json_schema?.schema ?? null;
      schemaName = rf.json_schema?.name ?? null;
    }
    json = rf?.type === 'json_schema' || rf?.type === 'json_object';
  } else {
    const fmt = b.output_config?.format ?? b.output_format;
    const tool = (b.tools ?? []).find((t: { name?: string }) => t.name === 'json');
    if (fmt?.schema) schema = fmt.schema;
    else if (tool) schema = tool.input_schema;
    json = !!schema;
  }
  const schemaSent = !!schema;
  // JSON mode with the schema in the instructions (a server that can't take one): read it from there, as a model would
  if (json && !schema) {
    const at = system.indexOf('JSON schema');
    const brace = at >= 0 ? system.indexOf('{', at) : -1;
    if (brace >= 0) schema = safeParse(system.slice(brace)) as Record<string, unknown> | null;
    if (typeof schema !== 'object') schema = null;
  }
  const users = messages.filter((m) => m.role === 'user');
  return { api, model: String(b.model ?? ''), system, messages, prompt: users.at(-1)?.content ?? '', schema, schemaName, schemaSent, json, stream: !!b.stream };
}

/** A structured answer as the scenario shapes it: valid JSON, or (bad-json) not. */
function answerText(r: FakeRequest, scenario: Scenario, rules: AnswerRule[] = []): { rule: string; out: string } {
  const { rule, value } = answerFor(r, rules);
  const repairing = r.messages.some((m) => m.role === 'user' && /wasn't valid/.test(m.content));
  if (r.json && (scenario === 'bad-json' || (scenario === 'bad-json-once' && !repairing))) return { rule, out: 'Sure! Here is what you asked for: {"ok": tru' };
  return { rule, out: typeof value === 'string' && !r.json ? value : JSON.stringify(value) };
}

/** Split an answer into a few chunks for streaming. */
const chunks = (s: string): string[] => s.match(/[\s\S]{1,24}/g) ?? [''];

export function createFakeLlm(opts: FakeLlmOptions = {}): FakeLlm {
  const requests: Recorded[] = [];
  const slowMs = opts.slowMs ?? 1500;
  const pullStepMs = opts.pullStepMs ?? 150;
  const pulled = new Set<string>();

  const server = http.createServer(async (req, res) => {
    const aborted = new AbortController();
    res.on('close', () => aborted.abort());
    let p = new URL(req.url ?? '/', 'http://fake').pathname;
    const m = /^\/s\/([a-z-]+)(\/.*)$/.exec(p);
    const scenario = scenarioOf(m ? m[1]! : null, opts);
    if (m) p = m[2]!;
    const raw = await new Promise<string>((resolve) => {
      let s = '';
      req.setEncoding('utf8');
      req.on('data', (d) => (s += d));
      req.on('end', () => resolve(s));
    });
    let body: Record<string, any> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      /* the endpoint says so below */
    }
    if (p === '/_fake/requests') {
      if (req.method === 'DELETE') requests.length = 0;
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(requests));
      return;
    }
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)]));
    const rec: Recorded = { method: req.method ?? 'GET', path: p, scenario, headers, body: raw ? body : null };
    requests.push(rec);
    if (requests.length > 500) requests.shift();

    // Jev's decision endpoint (OpenRouter's /api/v1/systemone, D82) answers like OpenRouter, wherever it's mounted
    const decision = /\/systemone$/.test(p);
    const api: FakeRequest['api'] | null = decision ? 'openai' : p.startsWith('/api/') ? 'ollama' : p === '/v1/messages' || (p === '/v1/models' && 'x-api-key' in req.headers) ? 'anthropic' : p.startsWith('/v1/') ? 'openai' : null;
    const json = (status: number, v: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(v));
    const error = (status: number, message: string, type = 'invalid_request_error') =>
      api === 'ollama' ? json(status, { error: message }) : api === 'anthropic' ? json(status, { type: 'error', error: { type, message } }) : json(status, { error: { message, type, code: null } });

    // ---- the scenarios that don't depend on the endpoint
    if (scenario === 'down') {
      req.socket.destroy(); // the runner went away: the connection drops with no answer
      return;
    }
    if (scenario === 'timeout') {
      await sleep(10 * 60_000, aborted.signal); // hold the request until the client gives up
      if (!res.writableEnded && !res.destroyed) res.destroy();
      return;
    }
    if (scenario === 'slow') await sleep(slowMs, aborted.signal);
    if (aborted.signal.aborted) return;
    const modelCall = req.method === 'POST' && (p === '/api/chat' || p === '/v1/chat/completions' || p === '/v1/messages');
    if (scenario === 'refused-key' && api !== 'ollama') return error(401, 'Invalid API key', 'authentication_error');
    if (scenario === 'rate-limited') return res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '30' }).end(JSON.stringify(api === 'anthropic' ? { type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit exceeded' } } : { error: { message: 'Rate limit exceeded, slow down', type: 'rate_limit' } }));
    if (scenario === 'quota' && api !== 'ollama') return error(402, 'Insufficient credits: add more to your account', 'billing_error');

    // ---- Ollama
    if (p === '/api/version' && req.method === 'GET') return json(200, { version: '0.0.0-fake' });
    if (p === '/api/tags' && req.method === 'GET') {
      const names = scenario === 'no-models' ? [...pulled] : [...new Set([...FAKE_MODELS, ...pulled])];
      return json(200, { models: names.map((name) => ({ name, model: name, size: 3_300_000_000, details: { family: name.split(':')[0], parameter_size: '4B', quantization_level: 'Q4_K_M' } })) });
    }
    if (p === '/api/pull' && req.method === 'POST') {
      const name = String(body.model ?? body.name ?? '');
      if (!name || name.startsWith('missing')) return error(404, `pull model manifest: file does not exist`);
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      const total = 3_300_000_000;
      res.write(JSON.stringify({ status: 'pulling manifest' }) + '\n');
      for (let i = 1; i <= 10; i++) {
        await sleep(pullStepMs, aborted.signal);
        if (aborted.signal.aborted) return; // Cancel: the client closed the stream, nothing is "installed"
        res.write(JSON.stringify({ status: `pulling ${'0'.repeat(12)}`, digest: `sha256:${'0'.repeat(64)}`, total, completed: Math.round((total * i) / 10) }) + '\n');
      }
      pulled.add(name);
      res.end(JSON.stringify({ status: 'success' }) + '\n');
      return;
    }

    // ---- OpenAI-compatible and Anthropic model lists
    if (p === '/v1/models' && req.method === 'GET') {
      const names = scenario === 'no-models' ? [] : FAKE_MODELS;
      return json(200, api === 'anthropic' ? { data: names.map((id) => ({ type: 'model', id, display_name: id })), has_more: false } : { object: 'list', data: names.map((id) => ({ id, object: 'model', owned_by: 'fake' })) });
    }

    if (decision && req.method === 'POST') return systemone(body, scenario, opts.rules ?? [], json, rec);
    if (!modelCall || !api) return error(404, `the fake model server has no ${req.method} ${p}`);
    if (!raw || typeof body !== 'object') return error(400, 'the request body is not JSON');

    const r = normalise(api, body);
    const known = api !== 'ollama' || (scenario !== 'no-models' && FAKE_MODELS.includes(r.model)) || pulled.has(r.model);
    if (!r.model || r.model.startsWith('missing') || !known)
      return error(404, api === 'ollama' ? `model '${r.model}' not found, try pulling it first` : `The model \`${r.model}\` does not exist`, 'not_found_error');
    if (scenario === 'context-too-long') return error(400, api === 'openai' ? "This model's maximum context length is 4096 tokens. However, your messages resulted in 9000 tokens." : 'prompt is too long: context length exceeded');
    if (scenario === 'no-schema' && r.schemaSent) return error(400, api === 'ollama' ? 'format: structured outputs are not supported by this server' : "response_format 'json_schema' is not supported by this server");
    if (api === 'anthropic' && !headers['x-api-key'] && !headers.authorization) return error(401, 'x-api-key header is required', 'authentication_error');

    const { rule, out } = answerText(r, scenario, opts.rules);
    rec.rule = rule;
    const usage = { in: Math.ceil(raw.length / 4), out: Math.ceil(out.length / 4) };
    const gap = scenario === 'slow' ? Math.min(slowMs / 4, 400) : 0;

    if (api === 'ollama') {
      if (!r.stream) return json(200, { model: r.model, created_at: new Date().toISOString(), message: { role: 'assistant', content: out }, done: true, done_reason: 'stop', prompt_eval_count: usage.in, eval_count: usage.out });
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      for (const c of chunks(out)) {
        if (aborted.signal.aborted) return;
        res.write(JSON.stringify({ model: r.model, message: { role: 'assistant', content: c }, done: false }) + '\n');
        if (gap) await sleep(gap, aborted.signal);
      }
      res.end(JSON.stringify({ model: r.model, message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: usage.in, eval_count: usage.out }) + '\n');
      return;
    }

    if (api === 'openai') {
      const id = 'chatcmpl-fake';
      if (!r.stream)
        return json(200, { id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: r.model, choices: [{ index: 0, message: { role: 'assistant', content: out }, finish_reason: 'stop' }], usage: { prompt_tokens: usage.in, completion_tokens: usage.out, total_tokens: usage.in + usage.out } });
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = (v: unknown) => res.write(`data: ${JSON.stringify(v)}\n\n`);
      send({ id, object: 'chat.completion.chunk', created: 0, model: r.model, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] });
      for (const c of chunks(out)) {
        if (aborted.signal.aborted) return;
        send({ id, object: 'chat.completion.chunk', created: 0, model: r.model, choices: [{ index: 0, delta: { content: c }, finish_reason: null }] });
        if (gap) await sleep(gap, aborted.signal);
      }
      send({ id, object: 'chat.completion.chunk', created: 0, model: r.model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: usage.in, completion_tokens: usage.out, total_tokens: usage.in + usage.out } });
      res.end('data: [DONE]\n\n');
      return;
    }

    // Anthropic: the json tool when it was offered one, else text
    const tool = (body.tools ?? []).some((t: { name?: string }) => t.name === 'json');
    const content = tool ? [{ type: 'tool_use', id: 'toolu_fake', name: 'json', input: safeParse(out) }] : [{ type: 'text', text: out }];
    const msg = { id: 'msg_fake', type: 'message', role: 'assistant', model: r.model, content, stop_reason: tool ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: usage.in, output_tokens: usage.out } };
    if (!r.stream) return json(200, msg);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type: string, v: unknown) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...(v as object) })}\n\n`);
    ev('message_start', { message: { ...msg, content: [], stop_reason: null, usage: { input_tokens: usage.in, output_tokens: 0 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    for (const c of chunks(out)) {
      if (aborted.signal.aborted) return;
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: c } });
      if (gap) await sleep(gap, aborted.signal);
    }
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: usage.out } });
    ev('message_stop', {});
    res.end();
  });
  return { server, requests };
}

/**
 * Jev at OpenRouter's /systemone (D82): typed questions about a state, answered `noul` (P(yes)) or `choice`, as the
 * real endpoint does (its 400s included). The answer comes from the rule table like any other (the `jev` row, or a
 * recording's), in the AI SDK's shape (`boolean` → `noul` here). `bad-json`: an answer that isn't one.
 */
function systemone(body: Record<string, any>, scenario: Scenario, rules: AnswerRule[], json: (status: number, v: unknown) => unknown, rec: Recorded): unknown {
  const model = String(body.model ?? '');
  if (!/^typesafe\/jev-\d/.test(model)) return json(400, { error: { message: `Model ${model} does not exist`, code: 400 } });
  const qs = body.questions && typeof body.questions === 'object' ? (body.questions as Record<string, { type?: string; instructions?: unknown; criteria?: unknown }>) : null;
  if (!qs || !Object.keys(qs).length || Object.values(qs).some((q) => !['noul', 'choice', 'score', 'box'].includes(String(q?.type))))
    return json(400, { error: { message: "Invalid discriminator value. Expected 'noul' | 'choice' | 'score' | 'box'", code: 400 } });
  if (!body.state || typeof body.state !== 'object') return json(400, { error: { message: 'state: expected an object', code: 400 } });
  const { system, prompt } = decisionAsked(body.state, qs);
  const r: FakeRequest = { api: 'openai', model, system, messages: [{ role: 'user', content: prompt }], prompt, schema: null, schemaName: 'jev_decision', schemaSent: false, json: true, stream: false };
  const { rule, value } = answerFor(r, rules);
  rec.rule = rule;
  const sdk = (value ?? {}) as Record<string, { type?: string; probability?: number; choice?: string; probabilities?: Record<string, number> }>;
  const answers = Object.fromEntries(
    Object.keys(qs).map((id) => {
      const a = sdk[id];
      if (scenario === 'bad-json' || scenario === 'bad-json-once') return [id, { type: 'noul', noul: 'very likely' }];
      if (a?.type === 'boolean') return [id, { type: 'noul', noul: a.probability }];
      if (a?.type === 'choice') return [id, { type: 'choice', choice: a.choice, ...(a.probabilities ? { probabilities: a.probabilities } : {}) }];
      return [id, a ?? { type: 'refusal' }];
    }),
  );
  return json(200, { model: `${model}-fake`, answers, usage: { input_tokens: Math.ceil(JSON.stringify(body).length / 4), output_tokens: 12, cost: 0 }, id: 'gen-dec-fake', provider: 'TypeSafe (fake)' });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/** Start one on a free port (or `port`), on 127.0.0.1 only. */
export async function startFakeLlm(opts: FakeLlmOptions & { port?: number } = {}): Promise<{ url: string; port: number; requests: Recorded[]; close: () => Promise<void> }> {
  const { server, requests } = createFakeLlm(opts);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? 0, '127.0.0.1', () => resolve());
  });
  const port = (server.address() as { port: number }).port;
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

// run directly: `node --import tsx test/fixtures/fake-llm/server.ts --port 5150 [--scenario slow] [--slow-ms 8000] [--recording <file>] [--pull-step-ms 1000]`
// (--recording: answer what a recording was asked with what it recorded, as the replay tests do)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n: string) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const scenario = arg('scenario') as Scenario | undefined;
  if (scenario && !SCENARIOS.includes(scenario)) {
    process.stderr.write(`unknown scenario ${scenario} (${SCENARIOS.join(', ')})\n`);
    process.exit(2);
  }
  const port = Number(arg('port') ?? process.env.PORT ?? 0);
  const recording = arg('recording');
  const rules = recording ? (await import('./replay.ts')).replayRules((await import('../../../scripts/eval/lib.ts')).readRecording(recording)) : [];
  // --pull-step-ms: a slower fake download, for trying Cancel and "AI off mid-download" by hand
  const step = Number(arg('pull-step-ms') ?? NaN);
  const slowMs = arg('slow-ms') ? Number(arg('slow-ms')) : undefined; // box QA: long enough to press Cancel
  const f = await startFakeLlm({ port, rules, ...(scenario ? { scenario } : {}), ...(Number.isFinite(step) ? { pullStepMs: step } : {}), ...(slowMs ? { slowMs } : {}) });
  process.stdout.write(`fake-llm on ${f.url} (scenario: ${scenario ?? 'from FAKE_LLM_SCENARIO or ~/.fake-llm/scenario, else ok'})\n`);
}
