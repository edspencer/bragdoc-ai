/**
 * Per-user LLM model resolution (BYOK).
 *
 * Every server-side AI call must obtain its model through
 * `resolveModelForUser` so that non-demo users always run on their own
 * stored provider config. There is intentionally NO env-key fallback for
 * regular users — if no config exists, `NoLLMConfigError` is thrown and
 * routes surface it as HTTP 409 `{ error: 'no_llm_configured' }`.
 *
 * Demo users are the one exception: demo mode must work with zero setup,
 * so demo sessions run on the platform `OPENAI_API_KEY` using the
 * historical task→model mapping.
 *
 * (Embeddings are a separate, deliberate exception — see
 * `lib/ai/embeddings.ts`.)
 */

import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { createLLMFromConfig } from '@bragdoc/ai';
import { getDefaultLLMConfig, getUserById } from '@bragdoc/database';
import type { User } from '@bragdoc/database';
import { decryptApiKey } from '@/lib/crypto/llm-keys';
import { buildLLMConfig, KEYLESS_PROVIDERS } from '@/lib/llm/providers';

export type LLMTask = 'chat' | 'extraction' | 'generation';

/**
 * Thrown when a non-demo user has no usable LLM provider config.
 * Routes catch this and return `noLLMConfigResponse()`.
 */
export class NoLLMConfigError extends Error {
  constructor(message = 'No LLM provider configured for this user') {
    super(message);
    this.name = 'NoLLMConfigError';
  }
}

/** Error code returned to clients when no LLM provider is configured. */
export const NO_LLM_CONFIGURED_ERROR = 'no_llm_configured';

/**
 * Standard 409 response for routes catching `NoLLMConfigError`.
 * Clients detect `{ error: 'no_llm_configured' }` and show the
 * "Connect your AI provider" CTA.
 */
export function noLLMConfigResponse(): Response {
  return Response.json({ error: NO_LLM_CONFIGURED_ERROR }, { status: 409 });
}

/**
 * Platform-key model per task, used ONLY for demo users.
 *
 * These mirror the models the pre-BYOK code actually sent to OpenAI, not
 * the wider `getLLM()` lookup table:
 *  - extraction  → gpt-4o-mini   (`gpt4oMiniModel`)
 *  - generation  → gpt-4.1-mini  (`gpt41MiniModel`)
 *  - chat        → gpt-4o-mini   (`routerModel`, which aliased
 *                                 `gpt4oMiniModel`, not gpt-4o)
 *
 * Demo traffic bills to the platform `OPENAI_API_KEY`, so these must not
 * drift upwards. Non-demo users are unaffected — they run every task on
 * the single model stored in their own config.
 */
const DEMO_TASK_MODELS: Record<LLMTask, string> = {
  extraction: 'gpt-4o-mini',
  generation: 'gpt-4.1-mini',
  chat: 'gpt-4o-mini',
};

/**
 * Authoritative demo check for the case where the session user object did
 * not carry `isDemo`.
 *
 * `isDemo` is declared in Better Auth's `user.additionalFields`
 * (lib/better-auth/config.ts) so it normally arrives on `session.user`.
 * It can still be missing for CLI JWT-sourced users, whose claims never
 * include it. Those users are non-demo in practice, but confirming
 * against the DB keeps demo mode working even if the session shape
 * regresses, and costs a query only on the about-to-fail path.
 */
async function isDemoUserInDatabase(userId: string): Promise<boolean> {
  try {
    const dbUser = await getUserById(userId);
    return dbUser?.isDemo === true;
  } catch (error) {
    // Fail safe: a lookup failure must never grant platform-key access.
    console.error('Failed to confirm demo status for user:', error);
    return false;
  }
}

/**
 * Resolve the language model to use for the given user and task.
 *
 * 1. Demo users → platform `OPENAI_API_KEY` with the task→model mapping
 *    above (demo keeps working with zero setup).
 * 2. Otherwise → the user's default `user_llm_config` row: decrypt the
 *    stored key and build the model via `createLLMFromConfig`. The user's
 *    single chosen model serves all tasks in v1.
 * 3. No config → confirm the user really is not a demo user (see
 *    `isDemoUserInDatabase`), then throw `NoLLMConfigError`.
 *
 * Note: JWT-sourced users (CLI auth) never carry `isDemo`; a missing flag
 * is treated as false unless the database says otherwise.
 */
export async function resolveModelForUser(
  user: User,
  task: LLMTask,
): Promise<LanguageModel> {
  if (user.isDemo === true) {
    return openai(DEMO_TASK_MODELS[task]);
  }

  const config = await getDefaultLLMConfig(user.id);

  if (!config) {
    // Demo users have no stored config by design. Before failing, make
    // sure we are not looking at a demo user whose session simply did not
    // carry the flag — otherwise demo mode dead-ends on a 409 CTA.
    if (await isDemoUserInDatabase(user.id)) {
      return openai(DEMO_TASK_MODELS[task]);
    }

    throw new NoLLMConfigError();
  }

  let apiKey: string | undefined;
  if (config.encryptedApiKey && config.iv) {
    apiKey = await decryptApiKey(config.encryptedApiKey, config.iv);
  } else if (!KEYLESS_PROVIDERS.includes(config.provider)) {
    // A keyed provider without stored key material is unusable; do NOT
    // fall through to createLLMFromConfig's env-var fallback.
    throw new NoLLMConfigError(
      `Stored ${config.provider} config has no API key`,
    );
  }

  return createLLMFromConfig(
    buildLLMConfig({
      provider: config.provider,
      apiKey,
      model: config.model,
      baseURL: config.baseURL ?? undefined,
    }),
  );
}
