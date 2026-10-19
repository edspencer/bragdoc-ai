// Jev, TypeSafe's hosted decision model, as the judge's model (SPEC R25, D82). Loaded only by sdk.ts's import(), like
// providers.ts: nothing here is resolved while AI is off.
//
// Jev doesn't write text. It's asked typed questions about a shared state ("is this a win?", "which project?") and
// answers each with a probability or a choice, never a reason. The AI SDK's `experimental_decide` is that interface;
// this file is the decision model behind it: one POST to OpenRouter's `/systemone` endpoint with `typesafe/jev-1.14`
// (OpenRouter's `typesafe/jev-router` is a chat model, not Jev). The SDK ships no Jev provider, so this is a small
// adapter (D82):
// - the SDK's `boolean` question is Jev's `noul` on the wire (P(true) comes back as `noul`), `choice` is `choice`;
// - the request goes through the fetch it's given (egress's fetchFor: the only network it has), with the key of the
//   OpenRouter connection Jev goes through, and nothing of the SDK's own (no attribution, no retries: maxRetries 0);
// - an HTTP failure is an APICallError with the status and the provider's body, so errors.ts classifies it like any
//   provider's (a refused key, rate limiting, the endpoint down); an answer that isn't what was asked for is the SDK's
//   InvalidResponseDataError (`bad_output`). The request body is never put on an error: it holds your text.
import { APICallError, InvalidResponseDataError, type Experimental_DecisionModelV4 as DecisionModelV4, type Experimental_DecisionModelV4Answer as DecisionAnswerV4, type Experimental_DecisionModelV4Question as DecisionQuestionV4, type JSONValue } from '@ai-sdk/provider';
import { experimental_decide, type Experimental_DecisionQuestion } from 'ai';
import type { ProviderFetch } from '../egress.js';

export type DecisionQuestion = Experimental_DecisionQuestion;
export type DecisionAnswer = DecisionAnswerV4;

export interface JevOptions {
  /** The OpenRouter connection's base URL (`https://openrouter.ai/api/v1`): the request goes to `<baseURL>/systemone`. */
  baseURL: string;
  model: string;
  apiKey: string | null;
  /** egress.fetchFor(...) for this call. */
  fetch: ProviderFetch;
  /** Per choice question, what an answer outside its options becomes (sdkAnswer). */
  fallbacks?: Record<string, string>;
}

/** What Jev's endpoint answers, per question. Anything else is an answer that wasn't asked for. */
type WireAnswer = { type: 'noul'; noul: number } | { type: 'choice'; choice: string; probabilities?: Record<string, number> } | { type: 'refusal' };

const isProbability = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

/** An SDK question → Jev's: `boolean` is `noul`, with its criteria as `true` / `false`. */
function wireQuestion(q: DecisionQuestionV4): Record<string, unknown> {
  if (q.type === 'boolean') return { type: 'noul', instructions: q.instructions, ...(q.criteria ? { criteria: q.criteria } : {}) };
  if (q.type === 'choice') return { type: 'choice', instructions: q.instructions, criteria: q.criteria };
  // supportedQuestionTypes keeps the others out before any request
  throw new Error(`Jev isn't asked ${q.type} questions here`);
}

/**
 * Jev's answer → the SDK's, or null when it isn't one. A choice's distribution isn't passed on (BragDoc never reads
 * it, and a sloppy one would fail the SDK's checks, losing the other answers too), and a choice outside the options
 * becomes `fallback` (the "none of these" option) when there is one: dropping a project, never inventing one.
 */
function sdkAnswer(q: DecisionQuestionV4, a: unknown, fallback?: string): DecisionAnswer | null {
  const w = a as WireAnswer | undefined;
  if (!w || typeof w !== 'object') return null;
  if (w.type === 'refusal') return { type: 'refusal' };
  if (q.type === 'boolean' && w.type === 'noul' && isProbability(w.noul)) return { type: 'boolean', probability: w.noul };
  if (q.type === 'choice' && w.type === 'choice' && typeof w.choice === 'string') {
    if (Object.hasOwn(q.criteria, w.choice)) return { type: 'choice', choice: w.choice };
    return fallback !== undefined && Object.hasOwn(q.criteria, fallback) ? { type: 'choice', choice: fallback } : null;
  }
  return null;
}

/** The SDK's state parts → the one JSON object Jev takes. BragDoc sends one JSON part (text only, never a file). */
function wireState(parts: readonly { type: string; value?: JSONValue; text?: string }[]): JSONValue {
  if (parts.length === 1 && parts[0]!.type === 'json') return parts[0]!.value!;
  if (parts.every((p) => p.type === 'text')) return { text: parts.map((p) => p.text).join('\n') };
  throw new Error('BragDoc sends Jev text only');
}

/** Jev as an AI SDK decision model, over the fetch it's given. */
export function jevModel({ baseURL, model, apiKey, fetch: send, fallbacks = {} }: JevOptions): DecisionModelV4 {
  const url = `${baseURL.replace(/\/+$/, '')}/systemone`;
  return {
    specificationVersion: 'v4',
    provider: 'openrouter.systemone',
    modelId: model,
    supportedQuestionTypes: ['boolean', 'choice'],
    async doDecide({ state, questions, abortSignal }) {
      const body = JSON.stringify({ model, state: wireState(state as never), questions: Object.fromEntries(Object.entries(questions).map(([id, q]) => [id, wireQuestion(q)])) });
      const res = await send(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
        body,
        ...(abortSignal ? { signal: abortSignal } : {}),
      });
      const text = await res.text();
      if (!res.ok) throw new APICallError({ message: `HTTP ${res.status}`, url, requestBodyValues: undefined, statusCode: res.status, responseBody: text, isRetryable: false });
      let j: { answers?: Record<string, unknown>; model?: string; id?: string; usage?: { input_tokens?: number; output_tokens?: number; cost?: number } };
      try {
        j = JSON.parse(text);
      } catch {
        throw new InvalidResponseDataError({ data: null, message: "Jev's answer isn't JSON" });
      }
      const answers: Record<string, DecisionAnswer> = {};
      for (const [id, q] of Object.entries(questions)) {
        const a = sdkAnswer(q, j.answers?.[id], fallbacks[id]);
        if (!a) throw new InvalidResponseDataError({ data: null, message: `Jev's answer to "${id}" isn't a ${q.type === 'boolean' ? 'probability' : q.type}` });
        answers[id] = a;
      }
      return {
        answers,
        rounding: { probabilityDecimals: 2 },
        usage: { ...(typeof j.usage?.input_tokens === 'number' ? { inputTokens: j.usage.input_tokens } : {}), ...(typeof j.usage?.output_tokens === 'number' ? { outputTokens: j.usage.output_tokens } : {}) },
        warnings: [],
        ...(typeof j.usage?.cost === 'number' ? { providerMetadata: { openrouter: { cost: j.usage.cost } } } : {}),
        response: { ...(j.id ? { id: j.id } : {}), ...(j.model ? { modelId: j.model } : {}) },
      };
    },
  };
}

export interface DecideRequest extends JevOptions {
  /** One JSON object: what every question is asked about. */
  state: { [k: string]: JSONValue };
  questions: Record<string, DecisionQuestion>;
  signal: AbortSignal;
}

/** One decision through the SDK's experimental_decide: its checks (one answer per question, valid distributions), no retries. */
export async function decide({ state, questions, signal, ...model }: DecideRequest): Promise<{ answers: Record<string, DecisionAnswer>; tokensIn: number | null; tokensOut: number | null; cost: number | null }> {
  const r = await experimental_decide({ model: jevModel(model), state, questions, maxRetries: 0, abortSignal: signal });
  const cost = (r.providerMetadata?.openrouter as { cost?: unknown } | undefined)?.cost;
  return { answers: r.answers as Record<string, DecisionAnswer>, tokensIn: r.usage.inputTokens ?? null, tokensOut: r.usage.outputTokens ?? null, cost: typeof cost === 'number' ? cost : null };
}
