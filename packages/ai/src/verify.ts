import { APICallError, generateText } from 'ai';
import { type CreateLLMOptions, createLLMFromConfig } from './providers';
import type { LLMConfig } from './types';

const VERIFY_TIMEOUT_MS = 15_000;

/**
 * OpenAI rejects `max_completion_tokens` below 16 for reasoning models
 * (the o-series and gpt-5 family), which would make a perfectly valid key on
 * such a model report a spurious verification failure. 16 is the smallest
 * value accepted everywhere, and the probe response is discarded anyway.
 */
const VERIFY_MAX_OUTPUT_TOKENS = 16;

/**
 * Coarse classification of why verification failed.
 *
 * Callers that expose verification results to an untrusted caller (the web
 * app's PUT /api/user/llm-config) should surface a fixed message keyed off
 * this code rather than `error`, which embeds provider-supplied response text
 * and would otherwise let a user read back the body of whatever endpoint they
 * pointed the probe at.
 */
export type VerifyLLMFailureCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'invalid_request'
  | 'provider_error'
  | 'unreachable'
  | 'blocked_redirect'
  | 'timeout'
  | 'unknown';

export type VerifyLLMConfigResult =
  | { ok: true }
  | { ok: false; code: VerifyLLMFailureCode; error: string };

/**
 * Options for {@link verifyLLMConfig}. Mirrors the model-construction options
 * so a server-side verify flow can refuse the `process.env` API-key fallback.
 */
export type VerifyLLMConfigOptions = Pick<
  CreateLLMOptions,
  'allowEnvFallback' | 'remediationHint' | 'fetch'
>;

/**
 * Verify that an LLM configuration actually works by instantiating the model
 * and running a tiny generateText probe against the provider.
 *
 * Never throws — failures (bad key, unreachable endpoint, unknown model,
 * timeout) are returned as `{ ok: false, code, error }`, where `error` is a
 * human-readable but provider-derived (therefore untrusted) message and
 * `code` is a safe classification.
 *
 * `options.fetch` is forwarded to the provider factory; the web app passes an
 * SSRF-guarded fetch so the probe cannot be redirected to an internal host.
 */
export async function verifyLLMConfig(
  config: LLMConfig,
  options: VerifyLLMConfigOptions = {},
): Promise<VerifyLLMConfigResult> {
  try {
    const model = createLLMFromConfig(config, options);

    await generateText({
      model,
      prompt: 'ping',
      maxOutputTokens: VERIFY_MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: classifyVerificationError(error),
      error: describeVerificationError(error),
    };
  }
}

/**
 * Walk an error and everything it wraps: `cause` chains plus the `errors`
 * array carried by the AI SDK's RetryError and by AggregateError.
 */
function* errorChain(error: unknown): Generator<unknown> {
  const seen = new Set<unknown>();
  const pending: unknown[] = [error];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current == null || seen.has(current)) continue;
    seen.add(current);
    yield current;

    if (current instanceof Error) {
      if (current.cause != null) pending.push(current.cause);
      const nested = (current as { errors?: unknown }).errors;
      if (Array.isArray(nested)) pending.push(...nested);
    }
  }
}

function classifyVerificationError(error: unknown): VerifyLLMFailureCode {
  const chain = [...errorChain(error)];

  // A custom fetch (see the web app's lib/llm/safe-fetch) can pre-classify a
  // failure it raised itself by tagging the error it throws.
  for (const link of chain) {
    const tagged = (link as { llmVerificationCode?: unknown })
      .llmVerificationCode;
    if (typeof tagged === 'string') return tagged as VerifyLLMFailureCode;
  }

  for (const link of chain) {
    if (
      link instanceof Error &&
      (link.name === 'TimeoutError' || link.name === 'AbortError')
    ) {
      return 'timeout';
    }
  }

  for (const link of chain) {
    if (!APICallError.isInstance(link)) continue;

    const status = link.statusCode;
    // No status at all means no HTTP response ever came back
    if (status == null) return 'unreachable';
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status === 429) return 'rate_limited';
    if (status >= 500) return 'provider_error';
    if (status >= 400) return 'invalid_request';
  }

  // `fetch failed` and friends surface as TypeError
  for (const link of chain) {
    if (link instanceof TypeError) return 'unreachable';
  }

  return 'unknown';
}

function describeVerificationError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return `Verification timed out after ${
        VERIFY_TIMEOUT_MS / 1000
      } seconds. Check that the provider endpoint is reachable.`;
    }

    // AI SDK errors (e.g. APICallError) carry the provider's response in the
    // message; include the cause when it adds information.
    const cause = error.cause;
    if (
      cause instanceof Error &&
      cause.message &&
      !error.message.includes(cause.message)
    ) {
      return `${error.message}: ${cause.message}`;
    }

    return error.message;
  }

  return String(error);
}
