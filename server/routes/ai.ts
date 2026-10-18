// AI settings, connections, keys, consent and the connection test (v0.2, SPEC R17). Settings → AI (PR23) is the UI;
// until then these are the only way to switch anything on, and they switch nothing on by themselves.
//   GET    /api/ai                              AiStatus: settings, connections (hasKey/keyHint, consent, class),
//                                               readiness per feature, the AI hosts on egress's allow-list
//   PUT    /api/ai                              { enabled?, text? }: the master switch and the text slot
//   POST   /api/ai/connections                  add one (`id` defaults to the kind)
//   PUT    /api/ai/connections/:id              edit (a new host clears its consent); DELETE removes it and its key
//   PUT    /api/ai/connections/:id/key          { key }; DELETE …/key forgets it (removed from secrets.yaml)
//   POST   /api/ai/connections/:id/consent      { version }: the statement shown (shared/ai/consent.ts); DELETE revokes
//   POST   /api/ai/connections/:id/test         { model? }: one tiny structured request (gates are 409, nothing sent)
//   GET    /api/ai/connections/:id/models       what the connection offers
//   PUT    /api/ai/features/:feature            a feature's settings (a merge patch)
// Every write goes through ctx.config.update() (D53) or secrets.ts, and answers with the new AiStatus. Keys are never
// returned (D64).
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { AiConnectionView, AiFeatureReadiness, AiStatus } from '../../shared/api.js';
import { AI_FEATURES, AI_KINDS, baseUrlOf, CONNECTION_ID_RE, connectionClass, contextTokensOf, decisionOnly, isCloud, isJevModel, JEV_MODEL, KEY_REQUIRED, type AiConnectionConfig, type AiFeature } from '../../shared/ai/connections.js';
import { consentCurrent, consentStatement } from '../../shared/ai/consent.js';
import { hostClass } from '../../shared/ai/hosts.js';
import { AiError } from '../ai/errors.js';
import { aiHosts, connectionGate, connectionHost, whereOf } from '../ai/policy.js';
import { AiJudgeSchema, AiSimpleFeatureSchema, AiSlotSchema, ConfigWriteError, type Config } from '../config.js';
import type { AppContext } from '../context.js';
import { apiError, jsonBody } from '../http.js';
import { SecretsError } from '../secrets.js';
import { ValidationError } from '../store/errors.js';

/** A request the API refuses, with its status and code. */
class Refused extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const ConnectionFields = {
  name: z.string().trim().min(1).max(80),
  baseUrl: z.string().trim().min(1).max(500),
  contextTokens: z.number().int().min(512).max(2_000_000),
  via: z.string().regex(CONNECTION_ID_RE),
};
const CreateSchema = z.strictObject({
  id: z.string().regex(CONNECTION_ID_RE, 'lower case letters, digits and -, up to 40').optional(),
  kind: z.enum(AI_KINDS),
  name: ConnectionFields.name.optional(),
  baseUrl: ConnectionFields.baseUrl.optional(),
  contextTokens: ConnectionFields.contextTokens.optional(),
  via: ConnectionFields.via.optional(),
});
const UpdateSchema = z.strictObject({
  name: ConnectionFields.name.nullable().optional(),
  baseUrl: ConnectionFields.baseUrl.nullable().optional(),
  contextTokens: ConnectionFields.contextTokens.nullable().optional(),
  via: ConnectionFields.via.nullable().optional(),
});
const SettingsSchema = z.strictObject({ enabled: z.boolean().optional(), text: AiSlotSchema.nullable().optional() });
// a key is one token: no spaces or line breaks (a paste that caught a newline is trimmed first)
const KeySchema = z.strictObject({ key: z.string().trim().min(8, 'that looks too short for a key').max(500, 'that’s longer than any key (500 characters at most)').regex(/^\S+$/, 'a key has no spaces in it') });
const ConsentSchema = z.strictObject({ version: z.number().int().min(1) });
const TestSchema = z.strictObject({ model: z.string().trim().min(1).max(200).optional() });

/** Checks a base URL the way egress will treat it (SPEC R19): plain http only to this computer or your network. */
export function checkBaseUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Refused(400, 'bad_url', `${raw} isn't a web address (it should start with http:// or https://)`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Refused(400, 'bad_url', `${u.protocol}// isn't allowed: use http:// or https://`);
  if (u.username || u.password) throw new Refused(400, 'bad_url', "don't put a password in the address: keys go in the key field");
  if (u.search || u.hash) throw new Refused(400, 'bad_url', 'the address can’t have a ?query or #fragment');
  if (u.protocol === 'http:' && hostClass(u) === 'internet')
    throw new Refused(400, 'plain_http', `only https leaves this computer: http:// is for a model runner on this computer or your network, and ${u.hostname} is on the internet`);
  return u.toString().replace(/\/+$/, '');
}

async function body<T>(c: Context, schema: z.ZodType<T>, what: string): Promise<T> {
  let raw: unknown;
  try {
    raw = await jsonBody(c.req);
  } catch (e) {
    throw new Refused(400, 'invalid', (e as Error).message);
  }
  const r = schema.safeParse(raw ?? {});
  if (!r.success) {
    const i = r.error.issues[0]!;
    throw new Refused(400, 'invalid', `${what}: ${i.path.join('.') || 'the body'}: ${i.message}`);
  }
  return r.data;
}

function view(ctx: AppContext, cfg: Config, id: string, c: AiConnectionConfig): AiConnectionView {
  const all = cfg.ai.connections;
  const url = baseUrlOf(c, all);
  const host = connectionHost(cfg.ai, id);
  const cloud = isCloud(c, all);
  const key = ctx.secrets.aiKeyHint(id, all);
  const gate = connectionGate(cfg, id, { hasKey: () => key.hasKey });
  return {
    id,
    kind: c.kind,
    name: c.name ?? null,
    baseUrl: url,
    host,
    class: connectionClass(c, all),
    cloud,
    contextTokens: contextTokensOf(c, all),
    via: c.via ?? null,
    consent: c.consent ? { at: c.consent.at, version: c.consent.version, current: consentCurrent(c.kind, c.consent, host) } : null,
    consentVersion: cloud ? consentStatement(c.kind).version : null,
    needsKey: KEY_REQUIRED.includes(c.kind),
    hasKey: key.hasKey,
    keyHint: key.keyHint,
    // AI off isn't the connection's problem: GET /api/ai says that once, at the top
    blocked: gate && gate.code !== 'ai_off' ? { code: gate.code, message: gate.message } : null,
  };
}

export function aiStatus(ctx: AppContext): AiStatus {
  const cfg = ctx.config.get();
  let secretsProblem: string | null = null;
  try {
    ctx.secrets.aiKey('-');
  } catch (e) {
    secretsProblem = (e as Error).message;
  }
  const readiness = Object.fromEntries(
    AI_FEATURES.map((f): [AiFeature, AiFeatureReadiness] => {
      const { gate, slot } = ctx.ai.readiness(f);
      return [f, { ready: !gate, reason: gate?.code ?? null, message: gate?.message ?? null, slot, where: slot && cfg.ai.connections[slot.connection] ? whereOf(cfg.ai, slot.connection) : null }];
    }),
  ) as AiStatus['readiness'];
  return {
    enabled: cfg.ai.enabled,
    text: cfg.ai.text,
    connections: Object.entries(cfg.ai.connections).map(([id, c]) => view(ctx, cfg, id, c)),
    features: cfg.ai.features,
    readiness,
    egressHosts: aiHosts(cfg),
    secretsProblem,
  };
}

export function registerAi(app: Hono, ctx: AppContext): void {
  /** Run a write, then answer with the new status (and tell open tabs). Maps every refusal to its status. */
  const write = async (c: Context, fn: () => unknown | Promise<unknown>, status: 200 | 201 = 200): Promise<Response> => {
    try {
      const out = await fn();
      ctx.bus.emit({ type: 'ai' });
      return c.json(out ?? aiStatus(ctx), status);
    } catch (e) {
      return refusal(c, e);
    }
  };

  const connection = (id: string): AiConnectionConfig => {
    const conn = CONNECTION_ID_RE.test(id) ? ctx.config.get().ai.connections[id] : undefined;
    if (!conn) throw new Refused(404, 'not_found', `there's no AI connection called ${id}`);
    return conn;
  };

  const update = (patch: Record<string, unknown>) => ctx.config.update({ ai: patch });

  app.get('/api/ai', (c) => c.json(aiStatus(ctx)));

  app.put('/api/ai', (c) =>
    write(c, async () => {
      const b = await body(c, SettingsSchema, 'AI settings');
      if (b.text && !ctx.config.get().ai.connections[b.text.connection]) throw new Refused(400, 'invalid', `there's no AI connection called ${b.text.connection}`);
      if (b.text) slotFor(ctx.config.get().ai.connections, b.text, 'text');
      update({ ...(b.enabled !== undefined ? { enabled: b.enabled } : {}), ...(b.text !== undefined ? { text: b.text } : {}) });
      // switched off: whatever is running or waiting stops now, not at its next request
      if (b.enabled === false) {
        ctx.ai.cancelAll('ai_off', 'AI was switched off.');
        ctx.localAi.cancelAll('ai_off', 'AI was switched off.');
      }
    }),
  );

  app.post('/api/ai/connections', (c) =>
    write(
      c,
      async () => {
        const b = await body(c, CreateSchema, 'a connection');
        const all = ctx.config.get().ai.connections;
        let id = b.id ?? b.kind;
        if (b.id && all[b.id]) throw new Refused(409, 'exists', `there's already a connection called ${b.id}`);
        for (let n = 2; all[id]; n++) id = `${b.kind}-${n}`;
        const conn: AiConnectionConfig = { kind: b.kind, ...(b.name ? { name: b.name } : {}) };
        if (b.baseUrl) conn.baseUrl = checkBaseUrl(b.baseUrl);
        if (b.contextTokens) conn.contextTokens = b.contextTokens;
        if (b.kind === 'jev') {
          if (b.baseUrl || b.contextTokens) throw new Refused(400, 'invalid', 'Jev has no address or context size of its own: it goes through its OpenRouter connection (`via`)');
          if (!b.via || all[b.via]?.kind !== 'openrouter') throw new Refused(400, 'invalid', 'Jev goes through an OpenRouter connection: send `via` with its id');
          conn.via = b.via;
        } else if (b.via) throw new Refused(400, 'invalid', 'only a Jev connection has `via`');
        if (b.kind === 'openai-compatible' && !conn.baseUrl) throw new Refused(400, 'invalid', 'an OpenAI-compatible server needs its address (baseUrl)');
        update({ connections: { [id]: conn } });
        return { connection: view(ctx, ctx.config.get(), id, ctx.config.get().ai.connections[id]!), status: aiStatus(ctx) };
      },
      201,
    ),
  );

  app.put('/api/ai/connections/:id', (c) =>
    write(c, async () => {
      const id = c.req.param('id');
      const conn = connection(id);
      const b = await body(c, UpdateSchema, 'a connection');
      if (conn.kind === 'jev' && (b.baseUrl || b.contextTokens)) throw new Refused(400, 'invalid', 'Jev has no address or context size of its own: it goes through its OpenRouter connection (`via`)');
      const patch: Record<string, unknown> = {};
      if (b.name !== undefined) patch.name = b.name;
      if (b.contextTokens !== undefined) patch.contextTokens = b.contextTokens;
      if (b.baseUrl !== undefined) {
        if (b.baseUrl === null && conn.kind === 'openai-compatible') throw new Refused(400, 'invalid', 'an OpenAI-compatible server needs its address');
        patch.baseUrl = b.baseUrl === null ? null : checkBaseUrl(b.baseUrl);
      }
      if (b.via !== undefined) {
        if (conn.kind !== 'jev') throw new Refused(400, 'invalid', 'only a Jev connection has `via`');
        if (!b.via || ctx.config.get().ai.connections[b.via]?.kind !== 'openrouter') throw new Refused(400, 'invalid', '`via` must be an OpenRouter connection');
        patch.via = b.via;
      }
      // consent is for a host: pointed somewhere else, it asks again (SPEC R17)
      const before = connectionHost(ctx.config.get().ai, id);
      const next = { ...conn, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v ?? undefined])) } as AiConnectionConfig;
      const after = (() => {
        const u = baseUrlOf(next, { ...ctx.config.get().ai.connections, [id]: next });
        try {
          return u ? new URL(u).hostname.toLowerCase() : null;
        } catch {
          return null;
        }
      })();
      // consent and a key are for a host (and a Jev's for its OpenRouter account): pointed somewhere else, both go,
      // so a key entered for one provider is never sent to another (SPEC R17)
      const moved = after !== before || (b.via !== undefined && b.via !== conn.via);
      if (moved && conn.consent) patch.consent = null;
      update({ connections: { [id]: patch } });
      if (moved && conn.kind !== 'jev') ctx.secrets.setAiKey(id, null);
    }),
  );

  app.delete('/api/ai/connections/:id', (c) =>
    write(c, () => {
      const id = c.req.param('id');
      connection(id);
      const cfg = ctx.config.get();
      const feats: Record<string, unknown> = {};
      for (const f of AI_FEATURES) if (cfg.ai.features[f].model?.connection === id) feats[f] = { model: null };
      // its key first: with secrets.yaml broken, refuse (409) rather than leave a key a new connection of that id would inherit
      ctx.secrets.setAiKey(id, null);
      // a Jev that went through it has nothing to go through, and its consent goes too: an OpenRouter connection added
      // later under the same id (another account, another key) asks again before Jev sends anything (D82)
      const orphans = Object.fromEntries(Object.entries(cfg.ai.connections).filter(([, x]) => x.kind === 'jev' && x.via === id && x.consent).map(([j]) => [j, { consent: null }]));
      update({ connections: { ...orphans, [id]: null }, ...(cfg.ai.text?.connection === id ? { text: null } : {}), ...(Object.keys(feats).length ? { features: feats } : {}) });
    }),
  );

  app.put('/api/ai/connections/:id/key', (c) =>
    write(c, async () => {
      const id = c.req.param('id');
      const conn = connection(id);
      if (conn.kind === 'jev') throw new Refused(400, 'invalid', `Jev uses its OpenRouter connection's key (${conn.via ?? 'none set'})`);
      const { key } = await body(c, KeySchema, 'a key');
      const replaced = !!ctx.secrets.aiKeyHint(id).hasKey;
      ctx.secrets.setAiKey(id, key);
      // a different key may be a different account: a Jev going through this connection asks again (D82)
      if (replaced) {
        const jevs = Object.entries(ctx.config.get().ai.connections).filter(([, x]) => x.kind === 'jev' && x.via === id && x.consent);
        if (jevs.length) update({ connections: Object.fromEntries(jevs.map(([j]) => [j, { consent: null }])) });
      }
      return { id, ...ctx.secrets.aiKeyHint(id) };
    }),
  );

  app.delete('/api/ai/connections/:id/key', (c) =>
    write(c, () => {
      const id = c.req.param('id');
      if (connection(id).kind === 'jev') throw new Refused(400, 'invalid', "Jev uses its OpenRouter connection's key: forget that one's");
      ctx.secrets.setAiKey(id, null);
      return { id, ...ctx.secrets.aiKeyHint(id) };
    }),
  );

  app.post('/api/ai/connections/:id/consent', (c) =>
    write(c, async () => {
      const id = c.req.param('id');
      const conn = connection(id);
      const { version } = await body(c, ConsentSchema, 'consent');
      const cfg = ctx.config.get();
      if (!isCloud(conn, cfg.ai.connections)) throw new Refused(400, 'not_cloud', `${id} is on this computer or your network: it needs no consent`);
      // nowhere to send yet (a Jev whose OpenRouter connection is gone): there's no host to consent to
      if (!connectionHost(cfg.ai, id)) throw new Refused(409, 'no_model', `${id} has no address yet${conn.kind === 'jev' ? ': it needs an OpenRouter connection to go through' : ''}`);
      const want = consentStatement(conn.kind).version;
      if (version !== want) throw new Refused(409, 'stale_consent', `that was version ${version} of what ${id} would send; the current one is ${want}. Read it again.`);
      update({ connections: { [id]: { consent: { at: new Date().toISOString(), version, host: connectionHost(cfg.ai, id) } } } });
    }),
  );

  app.delete('/api/ai/connections/:id/consent', (c) =>
    write(c, () => {
      const id = c.req.param('id');
      connection(id);
      // nothing more is sent from now: egress refuses the next request, and ctx.ai stops a running call within a second
      update({ connections: { [id]: { consent: null } } });
      ctx.localAi.cancelAll('not_consented', `${id} was revoked.`);
    }),
  );

  app.post('/api/ai/connections/:id/test', async (c) => {
    try {
      const id = c.req.param('id');
      connection(id);
      const { model } = await body(c, TestSchema, 'a test');
      const r = await ctx.ai.test(id, model, c.req.raw.signal);
      // a gate means nothing was sent: that's a refusal (409), not a test result
      if (!r.ok && (r.error.code === 'ai_off' || r.error.code === 'not_consented' || r.error.code === 'no_key')) return c.json(apiError(r.error.code, r.error.message), 409);
      return c.json(r);
    } catch (e) {
      return refusal(c, e);
    }
  });

  app.get('/api/ai/connections/:id/models', async (c) => {
    try {
      const id = c.req.param('id');
      connection(id);
      return c.json({ models: await ctx.ai.models(id, c.req.raw.signal) });
    } catch (e) {
      return refusal(c, e);
    }
  });

  app.put('/api/ai/features/:feature', (c) =>
    write(c, async () => {
      const feature = c.req.param('feature') as AiFeature;
      if (!AI_FEATURES.includes(feature)) throw new Refused(404, 'not_found', `there's no AI feature called ${feature} (${AI_FEATURES.join(', ')})`);
      const raw = await body(c, z.record(z.string(), z.unknown()), feature);
      const cfg = ctx.config.get();
      const schema = feature === 'judge' ? AiJudgeSchema : AiSimpleFeatureSchema;
      const known = Object.keys(schema.shape);
      const unknown = Object.keys(raw).filter((k) => !known.includes(k));
      if (unknown.length) throw new Refused(400, 'invalid', `${feature} has no setting ${unknown.join(', ')} (it has ${known.join(', ')})`);
      // validated as the whole feature after the change, the way config.yaml will be read
      const merged = mergeDeep(cfg.ai.features[feature] as Record<string, unknown>, raw);
      const r = schema.safeParse(merged);
      if (!r.success) {
        const i = r.error.issues[0]!;
        throw new Refused(400, 'invalid', `${feature}: ${i.path.join('.')}: ${i.message}`);
      }
      const slot = (raw as { model?: { connection?: string } | null }).model;
      if (slot && !cfg.ai.connections[slot.connection ?? '']) throw new Refused(400, 'invalid', `there's no AI connection called ${slot.connection}`);
      if (slot) slotFor(cfg.ai.connections, slot as { connection: string; model: string }, feature);
      update({ features: { [feature]: raw } });
    }),
  );
}

/**
 * May this connection and model fill this slot? A decision model (Jev) only judges: never the text slot (Tidy's and
 * Draft's), nor their own; and only with one of Jev's models (D82).
 */
function slotFor(all: Record<string, AiConnectionConfig>, slot: { connection: string; model: string }, use: AiFeature | 'text'): void {
  const conn = all[slot.connection];
  if (!decisionOnly(conn?.kind)) return;
  if (use !== 'judge') throw new Refused(400, 'invalid', `${slot.connection} is Jev, which answers yes-or-no decisions for the judge only: choose a chat model for ${use === 'text' ? 'the text slot' : use}`);
  if (!isJevModel(slot.model)) throw new Refused(400, 'invalid', `Jev's model is ${JEV_MODEL} (${slot.model} isn't one of Jev's: typesafe/jev-router is a chat model)`);
}

/** A merge patch applied to plain data (null removes a key: its default applies). */
function mergeDeep(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else if (typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && out[k] !== null) out[k] = mergeDeep(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

function refusal(c: Context, e: unknown): Response {
  if (e instanceof Refused) return c.json(apiError(e.code, e.message), e.status);
  if (e instanceof AiError) return c.json(apiError(e.code, e.message), e.status as 409);
  if (e instanceof ConfigWriteError) return c.json(apiError('config_invalid', e.message), 409);
  if (e instanceof SecretsError) return c.json(apiError('secrets_invalid', e.message), 409);
  if (e instanceof ValidationError) return c.json(apiError('invalid', e.message), 400);
  throw e;
}
