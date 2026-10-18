// How a model call failed, as a fixed set of codes with a sentence for people (SPEC R17's "plain words"). Every
// failure ctx.ai reports is an AiError: the gates (409, nothing sent) or one of these. No SDK import: the SDK's
// errors are recognised by shape (APICallError's statusCode and responseBody) and by name, so this file can be loaded
// with AI off.
import type { AiErrorCode, AiGateCode } from '../../shared/api.js';
import { EgressDenied } from '../egress.js';

export type { AiErrorCode, AiGateCode };

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode | AiGateCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }

  /** The HTTP status a route answers with: gates are 409 (nothing was sent); a model's failure is the upstream's. */
  get status(): 409 | 502 | 504 | 503 | 499 | 500 {
    switch (this.code) {
      case 'ai_off':
      case 'no_model':
      case 'not_consented':
      case 'no_key':
        return 409;
      case 'timeout':
        return 504;
      case 'busy':
      case 'rate_limited':
        return 503;
      case 'cancelled':
        return 499;
      case 'failed':
        return 500;
      default:
        return 502;
    }
  }
}

export const isGate = (code: string): code is AiGateCode => code === 'ai_off' || code === 'no_model' || code === 'not_consented' || code === 'no_key';

interface HttpLike {
  statusCode?: number;
  responseBody?: string;
  message?: string;
  name?: string;
  cause?: unknown;
}

/** The provider's own words from an error body, trimmed: `{"error":{"message":"…"}}`, `{"error":"…"}` or text. */
function upstreamMessage(body: string | undefined): string {
  if (!body) return '';
  try {
    const j = JSON.parse(body) as { error?: string | { message?: string }; message?: string };
    const m = typeof j.error === 'string' ? j.error : (j.error?.message ?? j.message);
    if (typeof m === 'string') return m.slice(0, 300);
  } catch {
    /* not JSON */
  }
  return body.slice(0, 300);
}

const CONTEXT_RE = /context(?:[ _]length| window| size)|maximum context|too many tokens|prompt is too long|context_length_exceeded|exceeds the (?:model'?s )?(?:maximum|context)/i;
const QUOTA_RE = /quota|credit|insufficient[_ ]funds|billing|payment required|balance/i;
const MODEL_RE = /model[^.]*(?:not found|does not exist|not installed|unknown)|no such model|try pulling it/i;
/** A server that can't do JSON schemas says so about response_format / format / json_schema. */
export const SCHEMA_UNSUPPORTED_RE = /response_format|json_schema|structured output|format.*(?:not supported|unsupported|invalid)|(?:not supported|unsupported).*(?:format|schema)/i;

/** An error from a model call, as an AiError. `where` and `connection` make the sentence specific. */
export function classify(e: unknown, ctx: { connection: string; host: string | null; timedOut?: boolean; cancelled?: boolean }): AiError {
  if (e instanceof AiError) return e;
  const host = ctx.host ?? ctx.connection;
  if (ctx.timedOut) return new AiError('timeout', `${host} didn't answer in time; it may be busy or the model too slow on this machine.`);
  if (ctx.cancelled) return new AiError('cancelled', 'cancelled');
  if (e instanceof EgressDenied) {
    if (e.code) return new AiError(e.code, e.message);
    return new AiError('failed', e.message);
  }
  const err = (e ?? {}) as HttpLike;
  // the SDK wraps what a fetch threw (RetryError, APICallError without a status)
  const inner = (err.cause ?? {}) as HttpLike;
  if (inner instanceof EgressDenied) return classify(inner, ctx);
  const status = err.statusCode ?? inner.statusCode;
  const said = upstreamMessage(err.responseBody ?? inner.responseBody) || err.message || '';
  if (status === undefined) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return new AiError(ctx.timedOut ? 'timeout' : 'cancelled', 'cancelled');
    const text = `${err.message ?? ''} ${(inner as { code?: string }).code ?? ''} ${String((err.cause as { cause?: { code?: string } })?.cause?.code ?? '')}`;
    if (/ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|socket|fetch failed|other side closed|terminated|UND_ERR/i.test(text) || err.name === 'TypeError')
      return new AiError('unreachable', `${host} isn't answering. Is the model runner running?`);
    if (err.name === 'AI_NoObjectGeneratedError' || err.name === 'AI_JSONParseError' || err.name === 'AI_TypeValidationError')
      return new AiError('bad_output', `the model's answer wasn't what was asked for (${said.slice(0, 160)})`);
    return new AiError('failed', said || 'the call failed');
  }
  if (status === 401 || status === 403) return new AiError('key_refused', `${host} refused the key${said ? `: ${said}` : ''}.`);
  if (status === 402 || (status === 429 && QUOTA_RE.test(said))) return new AiError('quota', `${host} says the account is out of credit${said ? `: ${said}` : ''}.`);
  if (status === 429) return new AiError('rate_limited', `${host} is limiting requests; try again in a little while.`);
  if (CONTEXT_RE.test(said)) return new AiError('context_too_long', `the prompt is too long for this model's context${said ? ` (${said})` : ''}.`);
  if (status === 404 || MODEL_RE.test(said)) return new AiError('model_missing', `that model isn't available on ${host}${said ? `: ${said}` : ''}.`);
  if (status === 400 && SCHEMA_UNSUPPORTED_RE.test(said)) return new AiError('no_structured_output', `this model or server can't return structured answers (${said}).`);
  if (status >= 500) return new AiError('failed', `${host} had a problem (${status})${said ? `: ${said}` : ''}.`);
  return new AiError('failed', `${host} answered ${status}${said ? `: ${said}` : ''}.`);
}
