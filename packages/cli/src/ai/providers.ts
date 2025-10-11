import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider-v2';
import type { LanguageModel } from 'ai';
import type { BragdocConfig } from '../config/types';
import logger from '../utils/logger';

/**
 * Creates an LLM instance based on configuration
 * Falls back to environment variables if config not set
 */
export function createLLMFromConfig(config: BragdocConfig): LanguageModel {
  const llmConfig = config.llm || { provider: 'openai' };
  const provider = llmConfig.provider;

  logger.debug(`Creating LLM with provider: ${provider}`);

  switch (provider) {
    case 'openai': {
      const apiKey = llmConfig.openai?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API key not found. Set it in config with:\n' +
            '  bragdoc init\n' +
            'Or set OPENAI_API_KEY environment variable'
        );
      }

      const model = llmConfig.openai?.model || 'gpt-4o';
      const baseURL = llmConfig.openai?.baseURL;

      const openaiProvider = createOpenAI({
        apiKey,
        ...(baseURL && { baseURL }),
      });

      return openaiProvider(model);
    }

    case 'anthropic': {
      const apiKey =
        llmConfig.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Anthropic API key not found. Set it in config with:\n' +
            '  bragdoc init\n' +
            'Or set ANTHROPIC_API_KEY environment variable'
        );
      }

      const model = llmConfig.anthropic?.model || 'claude-3-5-sonnet-20241022';
      const anthropicProvider = createAnthropic({ apiKey });
      return anthropicProvider(model);
    }

    case 'google': {
      const apiKey =
        llmConfig.google?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Google API key not found. Set it in config with:\n' +
            '  bragdoc init\n' +
            'Or set GOOGLE_GENERATIVE_AI_API_KEY environment variable'
        );
      }

      const model = llmConfig.google?.model || 'gemini-1.5-pro';
      // Google provider requires setting API key via environment variable
      // Store it temporarily if from config
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
      const result = google(model);
      // Restore original key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      } else {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      }
      return result;
    }

    case 'deepseek': {
      const apiKey = llmConfig.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error(
          'DeepSeek API key not found. Set it in config with:\n' +
            '  bragdoc init\n' +
            'Or set DEEPSEEK_API_KEY environment variable'
        );
      }

      const model = llmConfig.deepseek?.model || 'deepseek-chat';
      const baseURL =
        llmConfig.deepseek?.baseURL || 'https://api.deepseek.com/v1';

      const deepseekProvider = createOpenAI({
        apiKey,
        baseURL,
      });

      return deepseekProvider(model);
    }

    case 'ollama': {
      if (!llmConfig.ollama?.model) {
        throw new Error(
          'Ollama model not specified. Configure it with:\n' +
            '  bragdoc init\n' +
            'Available models: llama3.2, qwen2.5-coder, etc.\n' +
            'See: https://ollama.com/library'
        );
      }

      const baseURL = llmConfig.ollama.baseURL || 'http://localhost:11434/api';
      const ollama = createOllama({ baseURL });

      return ollama(llmConfig.ollama.model);
    }

    case 'openai-compatible': {
      if (
        !llmConfig.openaiCompatible?.baseURL ||
        !llmConfig.openaiCompatible?.model
      ) {
        throw new Error(
          'OpenAI-compatible configuration incomplete. Required: baseURL and model\n' +
            'Configure it with: bragdoc init\n' +
            'Example: LM Studio at http://localhost:1234/v1'
        );
      }

      const compatibleProvider = createOpenAI({
        baseURL: llmConfig.openaiCompatible.baseURL,
        apiKey: llmConfig.openaiCompatible.apiKey || 'not-needed',
      });

      return compatibleProvider(llmConfig.openaiCompatible.model);
    }

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Get a friendly name for the current LLM configuration
 */
export function getLLMDisplayName(config: BragdocConfig): string {
  const llmConfig = config.llm || { provider: 'openai' };

  switch (llmConfig.provider) {
    case 'openai':
      return `OpenAI (${llmConfig.openai?.model || 'gpt-4o'})`;
    case 'anthropic':
      return `Anthropic (${
        llmConfig.anthropic?.model || 'claude-3-5-sonnet-20241022'
      })`;
    case 'google':
      return `Google (${llmConfig.google?.model || 'gemini-1.5-pro'})`;
    case 'deepseek':
      return `DeepSeek (${llmConfig.deepseek?.model || 'deepseek-chat'})`;
    case 'ollama':
      return `Ollama (${llmConfig.ollama?.model || 'unknown'})`;
    case 'openai-compatible':
      return `OpenAI-Compatible (${
        llmConfig.openaiCompatible?.model || 'unknown'
      })`;
    default:
      return 'Unknown';
  }
}
