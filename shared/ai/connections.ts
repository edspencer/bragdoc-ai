// Connections: somewhere models run (SPEC R17). The kinds, their preset addresses, and the two questions everything
// else asks of a connection: where does it send (its base URL's host class), and does it need a key. Pure data and
// functions, shared by the server and the web app.
import { hostClass, type HostClass } from './hosts.js';

export const AI_KINDS = ['ollama', 'lmstudio', 'llamacpp', 'openai-compatible', 'anthropic', 'openai', 'openrouter', 'jev'] as const;
export type AiKind = (typeof AI_KINDS)[number];

/** The model features: each has its own switch (SPEC R17). */
export const AI_FEATURES = ['judge', 'tidy', 'draft'] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/** What a network-log line or an activity line says a call was for (SPEC R19): the features, plus the platform's own. */
export const AI_CALL_FEATURES = ['judge', 'tidy', 'draft', 'test', 'detect', 'pull'] as const;
export type AiCallFeature = (typeof AI_CALL_FEATURES)[number];

/** A connection as config.yaml holds it (`ai.connections.<id>`). */
export interface AiConnectionConfig {
  kind: AiKind;
  name?: string;
  baseUrl?: string;
  contextTokens?: number;
  via?: string;
  consent?: { at: string; version: number; host?: string } | null;
}

/** Where each kind is reached when no `baseUrl` is given. `openai-compatible` has none: you type it. */
export const KIND_BASE_URL: Record<AiKind, string | null> = {
  ollama: 'http://127.0.0.1:11434',
  lmstudio: 'http://127.0.0.1:1234/v1',
  llamacpp: 'http://127.0.0.1:8080/v1',
  'openai-compatible': null,
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  jev: null, // its `via` connection's (an OpenRouter one)
};

/** Plain names for each kind. */
export const KIND_LABEL: Record<AiKind, string> = {
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  llamacpp: 'llama.cpp',
  'openai-compatible': 'OpenAI-compatible server',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  jev: 'Jev (via OpenRouter)',
};

/** Kinds that run on a machine you control: they never need a key, though one may be set (LM Studio can ask for one). */
export const LOCAL_RUNNER_KINDS: readonly AiKind[] = ['ollama', 'lmstudio', 'llamacpp'];

/** Kinds that can't work without a key. `jev` uses its `via` connection's. */
export const KEY_REQUIRED: readonly AiKind[] = ['anthropic', 'openai', 'openrouter', 'jev'];

/** The context size a local connection is budgeted against when it doesn't say (SPEC R20). */
export const DEFAULT_CONTEXT_TOKENS = 8192;

/**
 * Kinds that answer typed decisions (yes or no as a probability, a choice), not text: Jev. Such a connection can be
 * the judge's model and nothing else (D82): never the text slot, Tidy's or Draft's.
 */
export const decisionOnly = (kind: AiKind | undefined): boolean => kind === 'jev';

/** Jev's one model, at OpenRouter's `/systemone` endpoint (not `typesafe/jev-router`, a chat model; D82). */
export const JEV_MODEL = 'typesafe/jev-1.14';
/** Jev's models (`typesafe/jev-1.14`, a later `typesafe/jev-1.15`); never `typesafe/jev-router`. */
export const isJevModel = (model: string | undefined): boolean => /^typesafe\/jev-\d[\w.-]*$/.test(model ?? '');
/** A cloud model's budget (SPEC R24). */
export const CLOUD_CONTEXT_TOKENS = 30_000;

/** A connection id: what config.yaml keys it by, and what the API's URLs carry. */
export const CONNECTION_ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** The base URL a connection's requests go to, or null when it has none (an unfinished custom one, a jev without via). */
export function baseUrlOf(c: AiConnectionConfig, all: Record<string, AiConnectionConfig> = {}): string | null {
  if (c.kind === 'jev') {
    const via = c.via ? all[c.via] : undefined;
    return via && via.kind === 'openrouter' ? baseUrlOf(via, all) : null;
  }
  return (c.baseUrl ?? KIND_BASE_URL[c.kind])?.replace(/\/+$/, '') ?? null;
}

/** Its base URL's host class; a connection with no usable URL counts as internet (never trusted as local). */
export function connectionClass(c: AiConnectionConfig, all: Record<string, AiConnectionConfig> = {}): HostClass {
  const url = baseUrlOf(c, all);
  return url ? hostClass(url) : 'internet';
}

/** Cloud = its host isn't this computer or your network. Consent depends on this, never on the kind (SPEC R17). */
export function isCloud(c: AiConnectionConfig, all: Record<string, AiConnectionConfig> = {}): boolean {
  return connectionClass(c, all) === 'internet';
}

/** The connection whose key this one uses: its own, or for `jev` its `via`'s. */
export function keyOwner(id: string, all: Record<string, AiConnectionConfig>): string {
  const c = all[id];
  return c?.kind === 'jev' && c.via ? c.via : id;
}

/** The context size prompts are budgeted against. */
export function contextTokensOf(c: AiConnectionConfig, all: Record<string, AiConnectionConfig> = {}): number {
  return c.contextTokens ?? (isCloud(c, all) ? CLOUD_CONTEXT_TOKENS : DEFAULT_CONTEXT_TOKENS);
}
