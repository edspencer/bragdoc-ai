import type { LLMProvider } from './types';

/**
 * A user-facing description of an LLM provider, including where to sign up
 * for an API key. Used by the CLI's interactive setup and the web app's
 * provider settings UI.
 */
export interface ProviderOption {
  name: string;
  value: LLMProvider;
  description: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    name: 'OpenAI (GPT-4, GPT-4o)',
    value: 'openai',
    description: 'Get API key at https://platform.openai.com/api-keys',
  },
  {
    name: 'Anthropic (Claude)',
    value: 'anthropic',
    description: 'Get API key at https://console.anthropic.com/settings/keys',
  },
  {
    name: 'Google (Gemini)',
    value: 'google',
    description: 'Get API key at https://aistudio.google.com/app/apikey',
  },
  {
    name: 'DeepSeek',
    value: 'deepseek',
    description: 'Get API key at https://platform.deepseek.com/api_keys',
  },
  {
    name: 'Ollama (Local LLMs)',
    value: 'ollama',
    description: 'Run LLMs locally - requires Ollama installed',
  },
  {
    name: 'OpenAI-Compatible (LM Studio, LocalAI, etc.)',
    value: 'openai-compatible',
    description: 'Any OpenAI-compatible API endpoint',
  },
];
