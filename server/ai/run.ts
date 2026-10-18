// ctx.ai: every model call BragDoc makes goes through here (SPEC R20). It's a thin shell until the first call: it
// holds no SDK import of its own (only `import type`s through sdk.ts), and loads the SDK on demand.
//
// - **Gates first** (policy.ts): AI or the feature off → `ai_off`, no model → `no_model`, a cloud connection without
//   consent → `not_consented`, no key → `no_key`. Checked before anything is queued, again when a job starts, and
//   once a second while it runs: turning AI off or revoking a connection mid-call aborts it (and egress refuses its
//   next request anyway).
// - **One queue per connection**: one call at a time on this computer or your network (the CPU or GPU is the
//   bottleneck), two at a time to the internet. `now` (someone is waiting: tidy, draft, a test) goes ahead of
//   `background` (the judge's runs). Every job takes an AbortSignal; the timeout counts from when it starts, not while
//   it waits: 180 s local and 60 s cloud by default, which a caller may raise (Draft does).
// - **Structured answers** (object): the provider's native schema support (json_schema, Ollama's format, Anthropic's
//   output format), then Zod, then ONE repair retry that shows the model its mistake. A server that refuses schemas is
//   remembered (per connection and model) and asked in JSON mode, with the schema in the instructions instead.
// - No retries of our own beyond that one, and none of the SDK's (maxRetries: 0): a retry is a second request the user
//   didn't see coming, and against a rate limit it makes things worse.
// - **Decisions** (decide): typed questions to a decision model (Jev, D82) through the SDK's experimental_decide, in
//   the same line, with the same gates, timeouts and log. No repair: a decision model's answer is valid or it isn't.
import { z } from 'zod';
import type { AiModelsResponse, AiTestResult, AiTrigger, AiWhere } from '../../shared/api.js';
import { baseUrlOf, decisionOnly, isJevModel, JEV_MODEL, type AiCallFeature } from '../../shared/ai/connections.js';
import type { Config } from '../config.js';
import type { Egress } from '../egress.js';
import type { Secrets } from '../secrets.js';
import { AiError, classify, isGate, SCHEMA_UNSUPPORTED_RE } from './errors.js';
import { connectionGate, connectionHost, featureGate, featureSlot, whereOf, type Gate, type Slot } from './policy.js';
import type { DecisionAnswer, DecisionQuestion } from './decide.js';
import { loadSdk, type Loaded } from './sdk.js';

export const LOCAL_TIMEOUT_MS = 180_000;
export const CLOUD_TIMEOUT_MS = 60_000;
/** A connection's waiting line can't grow without bound: past this, a call is refused as `busy`. */
export const MAX_WAITING = 200;
const MODELS_TIMEOUT_MS = 15_000;

export type Priority = 'now' | 'background';

export interface CallBase {
  /** What it's for: gated on that feature's switch (`test` needs only AI on). */
  feature: AiCallFeature;
  /** Shown in Network activity, e.g. `ai.judge`. */
  purpose: string;
  /** Which model, if not the feature's own (or the text slot). */
  slot?: Slot;
  system: string;
  prompt: string;
  signal?: AbortSignal;
  /** Default: `background` for the judge, `now` for everything else. */
  priority?: Priority;
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
  /** Groups calls into one run in the activity log: a run's id from `ctx.aiActivity.start()` (PR22). */
  runId?: string;
  /** What started a call that isn't part of a run, for its activity line. Default `now` (someone asked). */
  trigger?: AiTrigger;
}

/** What every call carries but its prompt: a decision has a state and questions instead. */
export type CallMeta = Omit<CallBase, 'system' | 'prompt' | 'temperature' | 'maxOutputTokens'>;

/** Typed questions about one state, for a decision model (Jev, D82). */
export interface DecideCall extends CallMeta {
  /** What every question is about: one JSON object of plain text fields. */
  state: Record<string, string>;
  questions: Record<string, DecisionQuestion>;
  /** Per choice question, the option an answer outside its options becomes (so it can't sink the other answers). */
  fallbacks?: Record<string, string>;
}

export type { DecisionAnswer, DecisionQuestion };

export interface ObjectCall<T> extends CallBase {
  schema: z.ZodType<T>;
  /** Sent to providers that take a schema name (json_schema's `name`). */
  schemaName?: string;
}

/** What every call reports besides its answer. Never any content. */
export interface CallInfo {
  connection: string;
  model: string;
  where: AiWhere;
  ms: number;
  tokensIn: number | null;
  tokensOut: number | null;
  /** `schema`: the provider enforced it; `json`: JSON mode plus our own check (a server that can't do schemas). */
  mode: 'schema' | 'json';
  /** The first answer didn't validate and the one repair retry fixed it. */
  repaired: boolean;
}

/** One finished call, for whoever listens (the AI activity log, PR22). */
export interface CallRecord {
  feature: AiCallFeature;
  purpose: string;
  runId?: string;
  trigger?: AiTrigger;
  connection: string;
  model: string;
  where: AiWhere;
  startedAt: string;
  ms: number;
  outcome: 'ok' | 'error' | 'cancelled';
  error?: string;
  tokensIn: number | null;
  tokensOut: number | null;
}

export interface StreamResult {
  /** The answer as it arrives. Stopping early (break) cancels the call. */
  textStream: AsyncIterable<string>;
  /** Settles when it's over: the whole text and the call's details, or the AiError. */
  done: Promise<CallInfo & { text: string }>;
}

export interface Ai {
  object<T>(call: ObjectCall<T>): Promise<{ object: T } & CallInfo>;
  stream(call: CallBase): Promise<StreamResult>;
  /** Typed questions to a decision model (a `jev` connection): an answer per question, never any prose. */
  decide(call: DecideCall): Promise<{ answers: Record<string, DecisionAnswer>; cost: number | null } & CallInfo>;
  /** Settings' Test connection: one tiny structured request (SPEC R17). Never throws. */
  test(connectionId: string, model?: string, signal?: AbortSignal): Promise<AiTestResult>;
  /** The models a connection offers (Ollama's tags, an OpenAI-style /models). */
  models(connectionId: string, signal?: AbortSignal): Promise<AiModelsResponse['models']>;
  /** Why `feature` can't run now (or null), with the slot it would use. */
  readiness(feature: AiCallFeature, slot?: Slot): { gate: Gate | null; slot: Slot | null };
  /** Stop everything running or waiting (AI switched off): each fails with `code`. */
  cancelAll(code: 'ai_off' | 'not_consented', message: string): void;
  /** Listen to every finished call. Returns the unsubscribe. */
  onCall(fn: (r: CallRecord) => void): () => void;
  /** What's running and waiting, per connection. */
  queue(): Record<string, { running: number; waiting: number }>;
  /** Has the SDK been loaded (any model call made) in this process? */
  loaded(): boolean;
}

export interface AiOptions {
  config: () => Config;
  egress: Egress;
  secrets: Secrets;
  /** Swaps the SDK loader (tests). */
  load?: () => Promise<Loaded>;
  now?: () => number;
  /** How often a running job re-checks its gates (ms). */
  watchMs?: number;
}

interface Job {
  connection: string;
  priority: Priority;
  controller: AbortController;
  start: () => void;
  fail: (e: AiError) => void;
  /** Set when the gates closed under a running job: what it fails with. */
  killedBy?: Gate;
  recheck: () => Gate | null;
}

/** A downloader that refuses: our prompts are text, and the SDK's own downloader would fetch outside egress. */
const noDownloads = async (reqs: unknown[]) => {
  if (reqs.length) throw new Error('BragDoc sends models text only; nothing is downloaded');
  return [];
};

export function createAi({ config, egress, secrets, load = loadSdk, now = Date.now, watchMs = 1000 }: AiOptions): Ai {
  const lanes = new Map<string, { running: Set<Job>; waiting: Job[] }>();
  const listeners = new Set<(r: CallRecord) => void>();
  /** connection + model pairs that refused a schema once: asked in JSON mode from then on. */
  const schemaless = new Set<string>();
  /** OpenRouter models that refused to turn reasoning off ("reasoning is mandatory"): asked with low effort from then on. */
  const mustReason = new Set<string>();
  let sdkLoaded = false;
  let watcher: ReturnType<typeof setInterval> | null = null;

  const hasKey = (owner: string): boolean => {
    try {
      return !!secrets.aiKey(owner);
    } catch {
      return false;
    }
  };

  function readiness(feature: AiCallFeature, slot?: Slot): { gate: Gate | null; slot: Slot | null } {
    const cfg = config();
    const s = slot ?? (feature === 'judge' || feature === 'tidy' || feature === 'draft' ? featureSlot(cfg, feature) : null);
    let gate = featureGate(cfg, feature, s, { hasKey });
    if (gate?.code === 'no_key') {
      // say so when the reason is a secrets.yaml that can't be read, not a key never given
      try {
        secrets.aiKey(s!.connection, cfg.ai.connections);
      } catch (e) {
        gate = { code: 'no_key', message: (e as Error).message };
      }
    }
    return { gate, slot: s };
  }

  const lane = (id: string) => {
    let l = lanes.get(id);
    if (!l) lanes.set(id, (l = { running: new Set(), waiting: [] }));
    return l;
  };

  function pump(id: string): void {
    const l = lane(id);
    const limit = whereOf(config().ai, id) === 'internet' ? 2 : 1;
    while (l.running.size < limit && l.waiting.length) {
      const i = l.waiting.findIndex((j) => j.priority === 'now');
      const job = l.waiting.splice(i >= 0 ? i : 0, 1)[0]!;
      l.running.add(job);
      job.start();
    }
    if (!l.running.size && !l.waiting.length) lanes.delete(id);
    watch();
  }

  /** While anything runs, re-check its gates: AI off or consent revoked stops it mid-call. */
  function watch(): void {
    const any = [...lanes.values()].some((l) => l.running.size);
    if (any && !watcher) {
      watcher = setInterval(() => {
        for (const l of lanes.values())
          for (const j of l.running) {
            const g = j.recheck();
            if (g && !j.killedBy) {
              j.killedBy = g;
              j.controller.abort();
            }
          }
      }, watchMs);
      watcher.unref?.();
    } else if (!any && watcher) {
      clearInterval(watcher);
      watcher = null;
    }
  }

  /**
   * Run `fn` in connection `slot.connection`'s line, with its timeout and abort, and report it. The gates were checked
   * by the caller; they're checked again when it starts (things change while a job waits).
   */
  function enqueue<T>(call: CallMeta, slot: Slot, fn: (signal: AbortSignal, info: { connection: string; model: string; where: AiWhere; host: string | null }) => Promise<T & { tokensIn?: number | null; tokensOut?: number | null }>): Promise<T> {
    const id = slot.connection;
    const cfg = config();
    const where = whereOf(cfg.ai, id);
    const host = connectionHost(cfg.ai, id);
    const priority = call.priority ?? (call.feature === 'judge' ? 'background' : 'now');
    const timeoutMs = call.timeoutMs ?? (where === 'internet' ? CLOUD_TIMEOUT_MS : LOCAL_TIMEOUT_MS);
    if (call.signal?.aborted) return Promise.reject(new AiError('cancelled', 'cancelled'));
    if ((lanes.get(id)?.waiting.length ?? 0) >= MAX_WAITING) return Promise.reject(new AiError('busy', `${MAX_WAITING} calls are already waiting for ${id}; try again later`));
    const l = lane(id);
    return new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      // settled once, however it ends: a job failed by cancelAll must not be reported again when its caller aborts
      let settled = false;
      let timedOut = false;
      let started = false;
      const startedAt = new Date(now()).toISOString();
      const t0 = { v: 0 };
      const report = (outcome: CallRecord['outcome'], extra: Partial<CallRecord>) => {
        if (settled) return;
        settled = true;
        call.signal?.removeEventListener('abort', onAbort);
        const r: CallRecord = { feature: call.feature, purpose: call.purpose, ...(call.runId ? { runId: call.runId } : {}), ...(call.trigger ? { trigger: call.trigger } : {}), connection: id, model: slot.model, where, startedAt, ms: started ? now() - t0.v : 0, outcome, tokensIn: null, tokensOut: null, ...extra };
        for (const f of listeners) {
          try {
            f(r);
          } catch {
            /* a listener's problem isn't the call's */
          }
        }
      };
      const onAbort = () => {
        if (settled) return;
        if (!started) {
          const i = l.waiting.indexOf(job);
          if (i >= 0) l.waiting.splice(i, 1);
          report('cancelled', { error: 'cancelled' });
          reject(new AiError('cancelled', 'cancelled'));
          pump(id);
        } else controller.abort();
      };
      call.signal?.addEventListener('abort', onAbort, { once: true });
      const job: Job = {
        connection: id,
        priority,
        controller,
        recheck: () => readiness(call.feature, slot).gate,
        fail: (e) => {
          report('error', { error: e.code });
          reject(e);
        },
        start: () => {
          started = true;
          t0.v = now();
          const gate = job.recheck();
          const finish = () => {
            l.running.delete(job);
            call.signal?.removeEventListener('abort', onAbort);
            pump(id);
          };
          if (gate) {
            finish();
            job.fail(new AiError(gate.code, gate.message));
            return;
          }
          const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs);
          timer.unref?.();
          fn(controller.signal, { connection: id, model: slot.model, where, host })
            .then((v) => {
              clearTimeout(timer);
              finish();
              report('ok', { tokensIn: v.tokensIn ?? null, tokensOut: v.tokensOut ?? null });
              resolve(v);
            })
            .catch((e: unknown) => {
              clearTimeout(timer);
              finish();
              const err = job.killedBy
                ? new AiError(job.killedBy.code, `${job.killedBy.message} (stopped mid-call)`)
                : classify(e, { connection: id, host, timedOut, cancelled: !timedOut && (call.signal?.aborted ?? false), key: keyFor(id) });
              report(err.code === 'cancelled' ? 'cancelled' : 'error', { error: err.code });
              reject(err);
            });
        },
      };
      l.waiting.push(job);
      pump(id);
    });
  }

  /** The gates for a call, or throws the AiError (409) before anything is queued. */
  function gated(call: CallMeta): Slot {
    const { gate, slot } = readiness(call.feature, call.slot);
    if (gate) throw new AiError(gate.code, gate.message);
    return slot!;
  }

  async function sdk(): Promise<Loaded> {
    const l = await load();
    sdkLoaded = true;
    return l;
  }

  const keyFor = (id: string): string | null => {
    try {
      return secrets.aiKey(id, config().ai.connections);
    } catch {
      return null;
    }
  };

  /** A decision model can't write text: say so plainly rather than let a provider factory fail. */
  function textOnly(slot: Slot): void {
    if (decisionOnly(config().ai.connections[slot.connection]?.kind)) throw new AiError('no_model', `${slot.connection} is Jev, which answers yes-or-no decisions for the judge only: it can't write text`);
  }

  async function object<T>(call: ObjectCall<T>): Promise<{ object: T } & CallInfo> {
    const slot = gated(call);
    textOnly(slot);
    return enqueue(call, slot, async (signal, info) => {
      const { sdk: ai, providers } = await sdk();
      const started = now();
      const send = egress.fetchFor({ purpose: call.purpose, feature: call.feature, model: slot.model, connectionId: slot.connection });
      const apiKey = keyFor(slot.connection);
      const pairKey = `${slot.connection}\0${slot.model}`;
      // OpenRouter: reasoning off (SPEC R20), as the spike ran it. A reasoning model spends a small answer budget on
      // thinking and returns nothing (Haiku through OpenRouter did, on a long OCR text); some insist on reasoning, and
      // get the least (D74)
      const openrouter = config().ai.connections[slot.connection]?.kind === 'openrouter';
      const reasoning = (): Record<string, { reasoning: { effort: string; exclude: boolean } }> => (openrouter ? { openrouter: { reasoning: { effort: mustReason.has(pairKey) ? 'low' : 'none', exclude: true } } } : {});
      let tokensIn = 0;
      let tokensOut = 0;
      const count = (u: { inputTokens?: number; outputTokens?: number } | undefined) => {
        tokensIn += u?.inputTokens ?? 0;
        tokensOut += u?.outputTokens ?? 0;
      };

      /** One request. Returns the raw text; throws APICallError and friends for the caller to classify. */
      const ask = async (mode: 'schema' | 'json', messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> => {
        const model = providers.modelFor({ config: config(), connectionId: slot.connection, model: slot.model, fetch: send, apiKey, jsonMode: mode === 'json' });
        const system = mode === 'json' ? `${call.system}\n\nAnswer with only a JSON object that matches this JSON schema, and nothing else:\n${JSON.stringify(z.toJSONSchema(call.schema))}` : call.system;
        try {
          const r = await ai.generateText({
            model,
            system,
            messages,
            output: mode === 'schema' ? ai.Output.object({ schema: call.schema, ...(call.schemaName ? { name: call.schemaName } : {}) }) : ai.Output.json(),
            abortSignal: signal,
            maxRetries: 0,
            temperature: call.temperature ?? 0,
            ...(call.maxOutputTokens ? { maxOutputTokens: call.maxOutputTokens } : {}),
            experimental_download: noDownloads,
            // the schema guides the model; strict mode would refuse a schema with optional fields at some providers,
            // and our own Zod check below is the strict one
            providerOptions: { openaiCompatible: { strictJsonSchema: false }, openai: { strictJsonSchema: false }, ...reasoning() },
          });
          count(r.usage as { inputTokens?: number; outputTokens?: number });
          return r.text;
        } catch (e) {
          const err = e as { name?: string; text?: string; usage?: { inputTokens?: number; outputTokens?: number } };
          // the model answered, but not with what was asked: hand its text back for our own check and the repair
          if (err.name === 'AI_NoObjectGeneratedError' && typeof err.text === 'string') {
            count(err.usage);
            return err.text;
          }
          // a model that won't answer without reasoning: once more with the least of it, and remember (not the repair)
          const said = `${(e as { message?: string }).message ?? ''} ${(e as { responseBody?: string }).responseBody ?? ''}`;
          if (openrouter && !mustReason.has(pairKey) && /reasoning is mandatory/i.test(said)) {
            mustReason.add(pairKey);
            return ask(mode, messages);
          }
          throw e;
        }
      };

      const check = (text: string): { ok: true; value: T } | { ok: false; issue: string } => {
        let raw: unknown;
        try {
          raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
        } catch {
          // not the parser's message: it quotes the answer, and an error's words may end up in a log
          return { ok: false, issue: "it isn't valid JSON" };
        }
        const r = call.schema.safeParse(raw);
        if (r.success) return { ok: true, value: r.data };
        const i = r.error.issues[0]!;
        return { ok: false, issue: `${i.path.join('.') || 'the answer'}: ${i.message}` };
      };

      const user = [{ role: 'user' as const, content: call.prompt }];
      let mode: 'schema' | 'json' = schemaless.has(pairKey) ? 'json' : 'schema';
      let text: string;
      try {
        text = await ask(mode, user);
      } catch (e) {
        const c = classify(e, { connection: slot.connection, host: info.host });
        // a server that can't do schemas: once more in JSON mode, and remember (this isn't the repair retry)
        if (mode === 'schema' && (c.code === 'no_structured_output' || (c.code === 'failed' && SCHEMA_UNSUPPORTED_RE.test(c.message)))) {
          schemaless.add(pairKey);
          mode = 'json';
          try {
            text = await ask(mode, user);
          } catch (e2) {
            const c2 = classify(e2, { connection: slot.connection, host: info.host });
            if (c2.code === 'no_structured_output' || (c2.code === 'failed' && SCHEMA_UNSUPPORTED_RE.test(c2.message)))
              throw new AiError('no_structured_output', `${slot.model} on ${info.host} can't return structured answers, even in JSON mode.`);
            throw e2;
          }
        } else throw e;
      }
      let result = check(text);
      let repaired = false;
      if (!result.ok) {
        // the one repair retry: show the model its answer and what was wrong with it
        const again = await ask(mode, [...user, { role: 'assistant', content: text.slice(0, 4000) }, { role: 'user', content: `That answer wasn't valid: ${result.issue}. Answer again with only the JSON object.` }]);
        result = check(again);
        if (!result.ok) throw new AiError('bad_output', `${slot.model}'s answer wasn't what was asked for, twice (${result.issue}).`);
        repaired = true;
      }
      return { object: result.value, connection: slot.connection, model: slot.model, where: info.where, ms: now() - started, tokensIn: tokensIn || null, tokensOut: tokensOut || null, mode, repaired };
    });
  }

  async function stream(call: CallBase): Promise<StreamResult> {
    const slot = gated(call);
    textOnly(slot);
    // the answer is handed over through a small buffer: the job holds its place in the line until the stream ends
    const chunks: string[] = [];
    let wake: (() => void) | null = null;
    let ended = false;
    let failure: unknown = null;
    const consumer = new AbortController();
    const signal = call.signal ? AbortSignal.any([call.signal, consumer.signal]) : consumer.signal;
    const done = enqueue({ ...call, signal }, slot, async (sig, info) => {
      const { sdk: ai, providers } = await sdk();
      const started = now();
      const send = egress.fetchFor({ purpose: call.purpose, feature: call.feature, model: slot.model, connectionId: slot.connection });
      const model = providers.modelFor({ config: config(), connectionId: slot.connection, model: slot.model, fetch: send, apiKey: keyFor(slot.connection) });
      let streamError: unknown = null;
      const r = ai.streamText({
        model,
        system: call.system,
        prompt: call.prompt,
        abortSignal: sig,
        maxRetries: 0,
        ...(call.temperature !== undefined ? { temperature: call.temperature } : {}),
        ...(call.maxOutputTokens ? { maxOutputTokens: call.maxOutputTokens } : {}),
        experimental_download: noDownloads,
        onError: ({ error }) => {
          streamError = error;
        },
      });
      let text = '';
      for await (const part of r.textStream) {
        text += part;
        chunks.push(part);
        wake?.();
      }
      if (streamError) throw streamError;
      const u = (await r.usage) as { inputTokens?: number; outputTokens?: number };
      return { text, connection: slot.connection, model: slot.model, where: info.where, ms: now() - started, tokensIn: u?.inputTokens ?? null, tokensOut: u?.outputTokens ?? null, mode: 'schema' as const, repaired: false };
    });
    done.then(
      () => {
        ended = true;
        wake?.();
      },
      (e: unknown) => {
        failure = e;
        ended = true;
        wake?.();
      },
    );
    async function* textStream(): AsyncGenerator<string> {
      try {
        for (;;) {
          if (chunks.length) {
            yield chunks.shift()!;
            continue;
          }
          if (ended) {
            if (failure) throw failure;
            return;
          }
          await new Promise<void>((r) => (wake = r));
          wake = null;
        }
      } finally {
        if (!ended) consumer.abort(); // the reader stopped early: cancel the call
      }
    }
    done.catch(() => {}); // the failure is also thrown into textStream; don't leave it unhandled when nobody awaits done
    return { textStream: textStream(), done };
  }

  async function decide(call: DecideCall): Promise<{ answers: Record<string, DecisionAnswer>; cost: number | null } & CallInfo> {
    const slot = gated(call);
    const conn = config().ai.connections[slot.connection];
    if (!decisionOnly(conn?.kind)) throw new AiError('no_model', `${slot.connection} isn't a decision model: only a Jev connection answers typed questions`);
    return enqueue(call, slot, async (signal, info) => {
      const { decisions } = await sdk();
      const started = now();
      const cfg = config();
      const r = await decisions.decide({
        baseURL: baseUrlOf(cfg.ai.connections[slot.connection]!, cfg.ai.connections)!,
        model: slot.model,
        apiKey: keyFor(slot.connection),
        fetch: egress.fetchFor({ purpose: call.purpose, feature: call.feature, model: slot.model, connectionId: slot.connection }),
        state: call.state,
        questions: call.questions,
        ...(call.fallbacks ? { fallbacks: call.fallbacks } : {}),
        signal,
      });
      return { answers: r.answers, cost: r.cost, connection: slot.connection, model: slot.model, where: info.where, ms: now() - started, tokensIn: r.tokensIn, tokensOut: r.tokensOut, mode: 'schema' as const, repaired: false };
    });
  }

  async function test(connectionId: string, model?: string, signal?: AbortSignal): Promise<AiTestResult> {
    const cfg = config();
    const m =
      model ??
      (cfg.ai.text?.connection === connectionId ? cfg.ai.text.model : undefined) ??
      Object.values(cfg.ai.features).map((f) => f.model).find((s) => s?.connection === connectionId)?.model;
    const where = cfg.ai.connections[connectionId] ? whereOf(cfg.ai, connectionId) : null;
    // Jev: one typed question about nothing of yours (its consent statement's "test")
    if (decisionOnly(cfg.ai.connections[connectionId]?.kind)) {
      const jm = model ?? JEV_MODEL;
      if (!isJevModel(jm)) return { ok: false, model: jm, where, error: { code: 'model_missing', message: `Jev's model is ${JEV_MODEL} (${jm} isn't one of Jev's: typesafe/jev-router is a chat model). Nothing was sent.` } };
      try {
        const r = await decide({
          feature: 'test',
          purpose: 'ai.test',
          slot: { connection: connectionId, model: jm },
          state: { text: 'BragDoc is checking that this connection works.' },
          questions: { ok: { type: 'boolean', instructions: 'Is this text a connection check?' } },
          priority: 'now',
          ...(signal ? { signal } : {}),
        });
        return { ok: true, model: jm, where: r.where, ms: r.ms, structured: true };
      } catch (e) {
        const err = e instanceof AiError ? e : classify(e, { connection: connectionId, host: connectionHost(cfg.ai, connectionId) });
        return { ok: false, model: jm, where, error: { code: err.code, message: err.message } };
      }
    }
    if (!m) return { ok: false, model: null, where, error: { code: 'no_model', message: 'choose a model to test (Settings → AI)' } };
    try {
      const r = await object({
        feature: 'test',
        purpose: 'ai.test',
        slot: { connection: connectionId, model: m },
        system: 'You are checking that a connection works. Answer with JSON only.',
        prompt: 'Reply with {"ok": true}.',
        schema: z.object({ ok: z.boolean() }),
        schemaName: 'connection_test',
        priority: 'now',
        ...(signal ? { signal } : {}),
      });
      return { ok: true, model: m, where: r.where, ms: r.ms, structured: r.mode === 'schema' };
    } catch (e) {
      const err = e instanceof AiError ? e : classify(e, { connection: connectionId, host: connectionHost(cfg.ai, connectionId) });
      return { ok: false, model: m, where, error: { code: err.code, message: err.message } };
    }
  }

  async function models(connectionId: string, signal?: AbortSignal): Promise<AiModelsResponse['models']> {
    const cfg = config();
    const gate = connectionGate(cfg, connectionId, { hasKey });
    if (gate) throw new AiError(gate.code, gate.message);
    const c = cfg.ai.connections[connectionId]!;
    // Jev has one model, and OpenRouter's list doesn't carry it: nothing is asked
    if (decisionOnly(c.kind)) return [{ name: JEV_MODEL, sizeBytes: null }];
    const base = baseUrlOf(c, cfg.ai.connections)!;
    const send = egress.fetchFor({ purpose: 'ai.models', feature: 'test', connectionId });
    const key = keyFor(connectionId);
    const headers: Record<string, string> = c.kind === 'anthropic' ? { 'anthropic-version': '2023-06-01', ...(key ? { 'x-api-key': key } : {}) } : key ? { authorization: `Bearer ${key}` } : {};
    const url = c.kind === 'ollama' ? `${base}/api/tags` : `${base}/models`;
    const timeout = AbortSignal.timeout(MODELS_TIMEOUT_MS);
    try {
      const res = await send(url, { headers, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      const body = await res.text();
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { statusCode: res.status, responseBody: body });
      const j = JSON.parse(body) as { models?: { name?: string; size?: number }[]; data?: { id?: string }[] };
      if (c.kind === 'ollama') return (j.models ?? []).filter((x) => typeof x.name === 'string').map((x) => ({ name: x.name!, sizeBytes: typeof x.size === 'number' ? x.size : null }));
      return (j.data ?? []).filter((x) => typeof x.id === 'string').map((x) => ({ name: x.id!, sizeBytes: null }));
    } catch (e) {
      throw classify(e, { connection: connectionId, host: connectionHost(cfg.ai, connectionId), timedOut: timeout.aborted, key });
    }
  }

  return {
    object,
    stream,
    decide,
    test,
    models,
    readiness,
    cancelAll(code, message) {
      for (const [id, l] of lanes) {
        for (const j of l.waiting.splice(0)) j.fail(new AiError(code, message));
        for (const j of l.running) {
          j.killedBy = { code, message };
          j.controller.abort();
        }
        pump(id);
      }
    },
    onCall(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    queue() {
      return Object.fromEntries([...lanes].map(([id, l]) => [id, { running: l.running.size, waiting: l.waiting.length }]));
    },
    loaded: () => sdkLoaded,
  };
}

export { AiError, isGate };
