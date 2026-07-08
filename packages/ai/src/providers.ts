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
 * Creates an LLM instance based on configuration.
 *
 * API keys may come from the config itself or (as a fallback) from the
 * conventional environment variable for the provider — this preserves the
 * CLI's config-or-env behavior. Explicit provider instances are always
 * created (`createOpenAI`, `createAnthropic`, `createGoogleGenerativeAI`,
 * `createOllama`), so a passed-in apiKey never relies on ambient env state.
 */
export function createLLMFromConfig(llmConfig?: LLMConfig): LanguageModel {
  const config = llmConfig ?? { provider: 'openai' as const };
  const provider = config.provider;

  switch (provider) {
    case 'openai': {
      const apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API key not found. Provide an apiKey in the LLM config ' +
            'or set the OPENAI_API_KEY environment variable',
        );
      }

      const model = config.openai?.model || DEFAULT_MODELS.openai;
      const baseURL = config.openai?.baseURL;

      const openaiProvider = createOpenAI({
        apiKey,
        ...(baseURL && { baseURL }),
      });

      return openaiProvider(model);
    }

    case 'anthropic': {
      const apiKey = config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Anthropic API key not found. Provide an apiKey in the LLM config ' +
            'or set the ANTHROPIC_API_KEY environment variable',
        );
      }

      const model = config.anthropic?.model || DEFAULT_MODELS.anthropic;
      const anthropicProvider = createAnthropic({ apiKey });
      return anthropicProvider(model);
    }

    case 'google': {
      const apiKey =
        config.google?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Google API key not found. Provide an apiKey in the LLM config ' +
            'or set the GOOGLE_GENERATIVE_AI_API_KEY environment variable',
        );
      }

      const model = config.google?.model || DEFAULT_MODELS.google;
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(model);
    }

    case 'deepseek': {
      const apiKey = config.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error(
          'DeepSeek API key not found. Provide an apiKey in the LLM config ' +
            'or set the DEEPSEEK_API_KEY environment variable',
        );
      }

      const model = config.deepseek?.model || DEFAULT_MODELS.deepseek;
      const baseURL = config.deepseek?.baseURL || 'https://api.deepseek.com/v1';

      const deepseekProvider = createOpenAI({
        apiKey,
        baseURL,
      });

      return deepseekProvider(model);
    }

    case 'ollama': {
      if (!config.ollama?.model) {
        throw new Error(
          'Ollama model not specified. ' +
            'Available models: llama3.2, qwen2.5-coder, etc.\n' +
            'See: https://ollama.com/library',
        );
      }

      const baseURL = config.ollama.baseURL || 'http://localhost:11434/api';
      const ollama = createOllama({ baseURL });

      return ollama(config.ollama.model);
    }

    case 'openai-compatible': {
      if (
        !config.openaiCompatible?.baseURL ||
        !config.openaiCompatible?.model
      ) {
        throw new Error(
          'OpenAI-compatible configuration incomplete. Required: baseURL and model\n' +
            'Example: LM Studio at http://localhost:1234/v1',
        );
      }

      const compatibleProvider = createOpenAI({
        baseURL: config.openaiCompatible.baseURL,
        apiKey: config.openaiCompatible.apiKey || 'not-needed',
      });

      return compatibleProvider(config.openaiCompatible.model);
    }

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
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
