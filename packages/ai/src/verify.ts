import { generateText } from 'ai';
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

export type VerifyLLMConfigResult = { ok: true } | { ok: false; error: string };

/**
 * Options for {@link verifyLLMConfig}. Mirrors the model-construction options
 * so a server-side verify flow can refuse the `process.env` API-key fallback.
 */
export type VerifyLLMConfigOptions = Pick<
  CreateLLMOptions,
  'allowEnvFallback' | 'remediationHint'
>;

/**
 * Verify that an LLM configuration actually works by instantiating the model
 * and running a tiny generateText probe against the provider.
 *
 * Never throws — failures (bad key, unreachable endpoint, unknown model,
 * timeout) are returned as `{ ok: false, error }` with a human-readable
 * provider error message.
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
    return { ok: false, error: describeVerificationError(error) };
  }
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
