// Shared by the AI tests (PR21): a throwaway data home with the app, its config and egress, plus a fake network that
// answers model calls the way each provider's API does. Cloud hosts can't be pointed at the loopback fake model
// server (and no release build gets a way to redirect one), so cloud paths run through an injected egress fetchImpl
// (SPEC R28): nothing here ever reaches a real provider.
import path from 'node:path';
import type { Hono } from 'hono';
import { ConfigStore } from '../server/config.ts';
import type { AppContext } from '../server/context.ts';
import { Egress, readNetworkLog } from '../server/egress.ts';
import { EventBus } from '../server/events.ts';
import { initHome } from '../server/home.ts';
import { createAppWithContext } from '../server/index.ts';
import { rmTmp, tmpDir } from './fixture.ts';

export interface NetCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
}

type Impl = (url: URL, init: RequestInit) => Promise<Response>;

/** A model's answer in the shape its API returns, for a request to `url` with `body`. */
export function cannedAnswer(url: URL, body: any, answer: unknown = { ok: true }): Response {
  const text = typeof answer === 'string' ? answer : JSON.stringify(answer);
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
  if (url.pathname.endsWith('/api/chat')) return json({ model: body.model, message: { role: 'assistant', content: text }, done: true, done_reason: 'stop', prompt_eval_count: 10, eval_count: 3 });
  if (url.pathname.endsWith('/messages')) {
    const tool = (body.tools ?? []).some((t: { name?: string }) => t.name === 'json');
    return json({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: tool ? [{ type: 'tool_use', id: 't1', name: 'json', input: JSON.parse(text) }] : [{ type: 'text', text }], stop_reason: tool ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 3 } });
  }
  if (url.pathname.endsWith('/chat/completions')) return json({ id: 'c1', object: 'chat.completion', created: 0, model: body.model, choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 3 } });
  if (url.pathname.endsWith('/api/tags')) return json({ models: [{ name: 'qwen3.5:4b', size: 1 }] });
  if (url.pathname.endsWith('/models')) return json({ data: [{ id: 'model-a' }] });
  return json({ error: 'nothing here' }, 404);
}

/** A fake network: records every request egress lets out, and answers like a model provider. */
export function fakeNetwork(answer: (url: URL, body: any) => Response | Promise<Response> = (u, b) => cannedAnswer(u, b)) {
  const calls: NetCall[] = [];
  const impl: Impl = async (url, init) => {
    const raw = typeof init.body === 'string' ? init.body : init.body ? new TextDecoder().decode(init.body as ArrayBuffer) : '';
    const body = raw ? JSON.parse(raw) : null;
    calls.push({ url: url.href, method: init.method ?? 'GET', headers: Object.fromEntries(new Headers(init.headers).entries()), body });
    return answer(url, body);
  };
  return { impl, calls };
}

export interface AiHome {
  dir: string;
  app: Hono;
  ctx: AppContext;
  config: ConfigStore;
  bus: EventBus;
  /** A JSON request to the app. */
  req(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }>;
  log(): ReturnType<typeof readNetworkLog>['entries'];
  close(): void;
}

/** A data home (laid out, with the starter config.yaml) and the app on it. `ai` is merged into config.yaml first. */
export function aiHome({ ai, fetchImpl }: { ai?: Record<string, unknown>; fetchImpl?: Impl } = {}): AiHome {
  const root = tmpDir('bragdoc-ai-');
  const dir = path.join(root, '.bragdoc');
  initHome(dir);
  const bus = new EventBus();
  const config = new ConfigStore(dir, { onChange: () => bus.emit({ type: 'config' }) });
  config.load();
  if (ai) config.update({ ai });
  const egress = new Egress({ dataDir: dir, config: () => config.get(), ...(fetchImpl ? { fetchImpl } : {}) });
  const { app, ctx } = createAppWithContext({ dataDir: dir, webDist: null, config, bus, egress });
  return {
    dir,
    app,
    ctx,
    config,
    bus,
    async req(method, p, body) {
      const res = await app.request(p, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
    log: () => readNetworkLog(dir, { limit: 1000 }).entries,
    close: () => rmTmp(root),
  };
}

/** Replace globalThis.fetch with one that throws, for the length of `fn`: nothing may reach the network but egress's fetchImpl. */
export async function withoutGlobalFetch<T>(fn: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error('globalThis.fetch was called: something went around egress');
  }) as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
}

/** The consent body for a connection, at the statement's current version. */
export const CONSENT = { version: 1 };
