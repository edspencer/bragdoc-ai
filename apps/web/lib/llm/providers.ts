/**
 * Mapping helpers between the database's `llm_provider` enum values
 * (underscored, e.g. 'openai_compatible') and the `@bragdoc/ai` package's
 * `LLMProvider` union (dashed, e.g. 'openai-compatible'), plus a builder
 * that turns a stored user config row shape into an `LLMConfig` for
 * `createLLMFromConfig` / `verifyLLMConfig`.
 *
 * Plain data only — safe to import from both server and client code.
 */

import type { LLMConfig, LLMProvider } from '@bragdoc/ai';
import type { LLMProviderDbValue } from '@bragdoc/database';

export const LLM_PROVIDER_DB_VALUES = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'ollama',
  'openai_compatible',
] as const;

/** Providers that do not require an API key */
export const KEYLESS_PROVIDERS: LLMProviderDbValue[] = ['ollama'];

/** Providers that require a baseURL (self-hosted / custom endpoints) */
export const BASE_URL_REQUIRED_PROVIDERS: LLMProviderDbValue[] = [
  'ollama',
  'openai_compatible',
];

/** Short display names for the configured-provider list */
export const PROVIDER_DISPLAY_NAMES: Record<LLMProviderDbValue, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  ollama: 'Ollama',
  openai_compatible: 'OpenAI-Compatible',
};

export function dbProviderToLLMProvider(
  provider: LLMProviderDbValue,
): LLMProvider {
  return provider === 'openai_compatible' ? 'openai-compatible' : provider;
}

export function llmProviderToDbProvider(
  provider: LLMProvider,
): LLMProviderDbValue {
  return provider === 'openai-compatible' ? 'openai_compatible' : provider;
}

export interface BuildLLMConfigInput {
  provider: LLMProviderDbValue;
  apiKey?: string;
  model: string;
  baseURL?: string;
}

/**
 * Build an `LLMConfig` (as consumed by `createLLMFromConfig` /
 * `verifyLLMConfig`) from flat per-user config values.
 */
export function buildLLMConfig({
  provider,
  apiKey,
  model,
  baseURL,
}: BuildLLMConfigInput): LLMConfig {
  switch (provider) {
    case 'openai':
      return { provider, openai: { apiKey, model, baseURL } };
    case 'anthropic':
      return { provider, anthropic: { apiKey, model } };
    case 'google':
      return { provider, google: { apiKey, model } };
    case 'deepseek':
      return { provider, deepseek: { apiKey, model, baseURL } };
    case 'ollama':
      return { provider, ollama: { model, baseURL } };
    case 'openai_compatible':
      return {
        provider: 'openai-compatible',
        openaiCompatible: {
          apiKey,
          model,
          // baseURL is validated as required before we get here
          baseURL: baseURL ?? '',
        },
      };
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported LLM provider: ${exhaustive}`);
    }
  }
}
