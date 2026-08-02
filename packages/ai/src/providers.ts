import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import type { LLMConfig, LLMProvider } from './types';

/**
 * Default model for each provider, used when the config does not specify one.
 */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
  ollama: 'llama3.2',
  'openai-compatible': 'model-name',
};

/**
 * Options controlling how a model is built from an {@link LLMConfig}.
 */
export interface CreateLLMOptions {
  /**
   * Custom `fetch` handed to the underlying `@ai-sdk/*` provider. The web app
   * uses this to supply an SSRF-guarded fetch (redirects are re-validated
   * rather than followed blindly) when probing a user-supplied base URL.
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Whether a missing `apiKey` may fall back to the conventional
   * `<PROVIDER>_API_KEY` environment variable.
   *
   * `true` (the default) preserves the CLI's config-or-env behaviour, where
   * the environment belongs to the same person as the config.
   *
   * Server/multi-tenant callers (the web app) MUST pass `false`: falling back
   * there would silently bill a user's request to the platform's own key.
   * With `false`, a config without an `apiKey` throws instead of reading
   * `process.env`.
   *
   * @default true
   */
  allowEnvFallback?: boolean;

  /**
   * Optional caller-specific guidance appended to configuration errors, so
   * each consumer can tell its own users how to fix the problem (the CLI
   * points at `bragdoc llm set`, the web app at its settings page) without
   * this package having to know who is calling it.
   */
  remediationHint?: string;
}

/**
 * Builds a configuration error, appending the caller's remediation hint when
 * one was supplied.
 */
function configError(message: string, remediationHint?: string): Error {
  return new Error(
    remediationHint ? `${message}\n${remediationHint}` : message,
  );
}

/**
 * Resolves an API key from the config, optionally falling back to the
 * provider's conventional environment variable.
 */
function resolveApiKey(
  configuredKey: string | undefined,
  envVar: string,
  allowEnvFallback: boolean,
): string | undefined {
  if (configuredKey) {
    return configuredKey;
  }

  return allowEnvFallback ? process.env[envVar] : undefined;
}

/**
 * Builds the "API key not found" error for a provider. The wording depends on
 * whether the environment fallback was even permitted, so we never tell a web
 * user to set a server-side environment variable.
 */
function missingApiKeyError(
  providerLabel: string,
  envVar: string,
  allowEnvFallback: boolean,
  remediationHint?: string,
): Error {
  const message = allowEnvFallback
    ? `${providerLabel} API key not found. Provide an apiKey in the LLM config ` +
      `or set the ${envVar} environment variable`
    : `${providerLabel} API key not found. Provide an apiKey in the LLM config ` +
      '(environment variable fallback is disabled)';

  return configError(message, remediationHint);
}

/**
 * Creates an LLM instance based on configuration.
 *
 * API keys may come from the config itself or (as a fallback) from the
 * conventional environment variable for the provider — this preserves the
 * CLI's config-or-env behavior, and can be turned off with
 * `{ allowEnvFallback: false }`. Explicit provider instances are always
 * created (`createOpenAI`, `createAnthropic`, `createGoogleGenerativeAI`,
 * `createOllama`), so a passed-in apiKey never relies on ambient env state.
 */
export function createLLMFromConfig(
  llmConfig?: LLMConfig,
  options: CreateLLMOptions = {},
): LanguageModel {
  const { allowEnvFallback = true, remediationHint } = options;
  const config = llmConfig ?? { provider: 'openai' as const };
  const provider = config.provider;
  const fetchOption = options.fetch ? { fetch: options.fetch } : {};

  switch (provider) {
    case 'openai': {
      const apiKey = resolveApiKey(
        config.openai?.apiKey,
        'OPENAI_API_KEY',
        allowEnvFallback,
      );
      if (!apiKey) {
        throw missingApiKeyError(
          'OpenAI',
          'OPENAI_API_KEY',
          allowEnvFallback,
          remediationHint,
        );
      }

      const model = config.openai?.model || DEFAULT_MODELS.openai;
      const baseURL = config.openai?.baseURL;

      const openaiProvider = createOpenAI({
        apiKey,
        ...(baseURL && { baseURL }),
        ...fetchOption,
      });

      return openaiProvider(model);
    }

    case 'anthropic': {
      const apiKey = resolveApiKey(
        config.anthropic?.apiKey,
        'ANTHROPIC_API_KEY',
        allowEnvFallback,
      );
      if (!apiKey) {
        throw missingApiKeyError(
          'Anthropic',
          'ANTHROPIC_API_KEY',
          allowEnvFallback,
          remediationHint,
        );
      }

      const model = config.anthropic?.model || DEFAULT_MODELS.anthropic;
      const anthropicProvider = createAnthropic({ apiKey, ...fetchOption });
      return anthropicProvider(model);
    }

    case 'google': {
      const apiKey = resolveApiKey(
        config.google?.apiKey,
        'GOOGLE_GENERATIVE_AI_API_KEY',
        allowEnvFallback,
      );
      if (!apiKey) {
        throw missingApiKeyError(
          'Google',
          'GOOGLE_GENERATIVE_AI_API_KEY',
          allowEnvFallback,
          remediationHint,
        );
      }

      const model = config.google?.model || DEFAULT_MODELS.google;
      const googleProvider = createGoogleGenerativeAI({
        apiKey,
        ...fetchOption,
      });
      return googleProvider(model);
    }

    case 'deepseek': {
      const apiKey = resolveApiKey(
        config.deepseek?.apiKey,
        'DEEPSEEK_API_KEY',
        allowEnvFallback,
      );
      if (!apiKey) {
        throw missingApiKeyError(
          'DeepSeek',
          'DEEPSEEK_API_KEY',
          allowEnvFallback,
          remediationHint,
        );
      }

      const model = config.deepseek?.model || DEFAULT_MODELS.deepseek;
      const baseURL = config.deepseek?.baseURL || 'https://api.deepseek.com/v1';

      const deepseekProvider = createOpenAI({
        apiKey,
        baseURL,
        ...fetchOption,
      });

      return deepseekProvider(model);
    }

    case 'ollama': {
      if (!config.ollama?.model) {
        throw configError(
          'Ollama model not specified. ' +
            'Available models: llama3.2, qwen2.5-coder, etc.\n' +
            'See: https://ollama.com/library',
          remediationHint,
        );
      }

      const baseURL = config.ollama.baseURL || 'http://localhost:11434/api';
      const ollama = createOllama({ baseURL, ...fetchOption });

      return ollama(config.ollama.model);
    }

    case 'openai-compatible': {
      if (
        !config.openaiCompatible?.baseURL ||
        !config.openaiCompatible?.model
      ) {
        throw configError(
          'OpenAI-compatible configuration incomplete. Required: baseURL and model\n' +
            'Example: LM Studio at http://localhost:1234/v1',
          remediationHint,
        );
      }

      const compatibleProvider = createOpenAI({
        baseURL: config.openaiCompatible.baseURL,
        apiKey: config.openaiCompatible.apiKey || 'not-needed',
        ...fetchOption,
      });

      return compatibleProvider(config.openaiCompatible.model);
    }

    default:
      throw configError(
        `Unsupported LLM provider: ${provider}`,
        remediationHint,
      );
  }
}

/**
 * Get a friendly name for the given LLM configuration
 */
export function getLLMDisplayName(llmConfig?: LLMConfig): string {
  const config = llmConfig ?? { provider: 'openai' as const };

  switch (config.provider) {
    case 'openai':
      return `OpenAI (${config.openai?.model || DEFAULT_MODELS.openai})`;
    case 'anthropic':
      return `Anthropic (${config.anthropic?.model || DEFAULT_MODELS.anthropic})`;
    case 'google':
      return `Google (${config.google?.model || DEFAULT_MODELS.google})`;
    case 'deepseek':
      return `DeepSeek (${config.deepseek?.model || DEFAULT_MODELS.deepseek})`;
    case 'ollama':
      return `Ollama (${config.ollama?.model || 'unknown'})`;
    case 'openai-compatible':
      return `OpenAI-Compatible (${config.openaiCompatible?.model || 'unknown'})`;
    default:
      return 'Unknown';
  }
}

/**
 * Check if LLM configuration is valid and complete.
 * Note: Does NOT check environment variables - we want explicit config.
 */
export function isLLMConfigured(config: LLMConfig | undefined): boolean {
  if (!config) return false;

  const { provider } = config;

  switch (provider) {
    case 'openai':
      return !!config.openai?.apiKey;
    case 'anthropic':
      return !!config.anthropic?.apiKey;
    case 'google':
      return !!config.google?.apiKey;
    case 'deepseek':
      return !!config.deepseek?.apiKey;
    case 'ollama':
      return !!config.ollama?.model;
    case 'openai-compatible':
      return !!(
        config.openaiCompatible?.baseURL && config.openaiCompatible?.model
      );
    default:
      return false;
  }
}
