import { generateText } from 'ai';
import { createLLMFromConfig } from './providers';
import type { LLMConfig } from './types';

const VERIFY_TIMEOUT_MS = 15_000;

export type VerifyLLMConfigResult = { ok: true } | { ok: false; error: string };

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
): Promise<VerifyLLMConfigResult> {
  try {
    const model = createLLMFromConfig(config);

    await generateText({
      model,
      prompt: 'ping',
      maxOutputTokens: 8,
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
