// Who may ask which model what, decided from config.yaml alone (SPEC R17, R19, R20). Pure functions, no SDK and no
// I/O: egress asks them on every request, ctx.ai before it queues anything, GET /api/ai to say what's ready. Keeping
// them in one place is what makes "AI off" mean off everywhere at once.
//
// The gates, in the order they're checked (all 409 from the API):
// - `ai_off`: the master switch is off, or the feature's own switch is;
// - `no_model`: no model chosen for it, or the connection it names is gone or has no address;
// - `not_consented`: a cloud connection (by host: shared/ai/hosts.ts) without current consent;
// - `no_key`: a kind that needs a key has none.
import { baseUrlOf, isCloud, KEY_REQUIRED, keyOwner, type AiCallFeature, type AiConnectionConfig, type AiFeature } from '../../shared/ai/connections.js';
import { consentCurrent } from '../../shared/ai/consent.js';
import { hostClass } from '../../shared/ai/hosts.js';
import type { Config } from '../config.js';

export type GateCode = 'ai_off' | 'no_model' | 'not_consented' | 'no_key';

export interface Gate {
  code: GateCode;
  message: string;
}

export interface Slot {
  connection: string;
  model: string;
}

type AiConfig = Config['ai'];

const hostOf = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

/** A connection's host as the allow-list compares it (lower case; IPv6 in brackets), or null when it has no address. */
export function connectionHost(ai: AiConfig, id: string): string | null {
  const c = ai.connections[id];
  return c ? hostOf(baseUrlOf(c, ai.connections)) : null;
}

/** Does this cloud connection have consent for the statement shown today, for the host it points at now? */
export function hasConsent(ai: AiConfig, id: string): boolean {
  const c = ai.connections[id];
  return !!c && consentCurrent(c.kind, c.consent, connectionHost(ai, id));
}

/** Local, or cloud with current consent: may this connection be sent anything (AI on aside)? */
export function connectionAllowed(ai: AiConfig, id: string): boolean {
  const c = ai.connections[id];
  if (!c || !baseUrlOf(c, ai.connections)) return false;
  return !isCloud(c, ai.connections) || hasConsent(ai, id);
}

/**
 * The hosts AI adds to egress's allow-list: none while AI is off; otherwise each local connection's host and each
 * consented cloud one's (SPEC R19). Turning AI off removes them on the next request.
 */
export function aiHosts(config: Config): string[] {
  const ai = config.ai;
  if (!ai.enabled) return [];
  const hosts = new Set<string>();
  for (const id of Object.keys(ai.connections)) {
    const h = connectionHost(ai, id);
    if (h && connectionAllowed(ai, id)) hosts.add(h);
  }
  return [...hosts];
}

/**
 * Why a call to connection `id` may not go out right now, or null. Asked by egress on every request (so revoking one of
 * two connections on the same host stops that one at once) and by ctx.ai before queueing. Keys aren't egress's concern.
 */
export function connectionGate(config: Config, id: string, opts: { hasKey?: (owner: string) => boolean } = {}): Gate | null {
  const ai = config.ai;
  if (!ai.enabled) return { code: 'ai_off', message: 'AI is off (Settings → AI).' };
  const c = ai.connections[id];
  if (!c) return { code: 'no_model', message: `there's no AI connection called ${id}` };
  if (!baseUrlOf(c, ai.connections))
    return { code: 'no_model', message: c.kind === 'jev' ? `${id} needs an OpenRouter connection to go through (via)` : `${id} has no address yet` };
  if (isCloud(c, ai.connections) && !hasConsent(ai, id))
    return { code: 'not_consented', message: `${id} sends to ${connectionHost(ai, id)}, on the internet: allow it first (Settings → AI). Nothing was sent.` };
  if (opts.hasKey && KEY_REQUIRED.includes(c.kind) && !opts.hasKey(keyOwner(id, ai.connections)))
    return { code: 'no_key', message: `${id} needs a key (Settings → AI). Nothing was sent.` };
  return null;
}

/** The model a feature uses: its own, else the text slot. */
export function featureSlot(config: Config, feature: AiFeature): Slot | null {
  return config.ai.features[feature].model ?? config.ai.text;
}

/** Why `feature` can't run now, or null. `test` needs only AI on and the connection's own gates. */
export function featureGate(config: Config, feature: AiCallFeature, slot: Slot | null, opts: { hasKey?: (owner: string) => boolean } = {}): Gate | null {
  if (!config.ai.enabled) return { code: 'ai_off', message: 'AI is off (Settings → AI).' };
  if ((feature === 'judge' || feature === 'tidy' || feature === 'draft') && !config.ai.features[feature].enabled)
    return { code: 'ai_off', message: `${feature} is off (Settings → AI).` };
  if (!slot) return { code: 'no_model', message: 'no model is chosen (Settings → AI).' };
  return connectionGate(config, slot.connection, opts);
}

/** Where a connection's calls go, for the log and the UI. */
export function whereOf(ai: AiConfig, id: string): ReturnType<typeof hostClass> {
  const c: AiConnectionConfig | undefined = ai.connections[id];
  const url = c ? baseUrlOf(c, ai.connections) : null;
  return url ? hostClass(url) : 'internet';
}
