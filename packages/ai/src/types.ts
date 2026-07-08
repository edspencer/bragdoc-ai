/**
 * LLM Provider types shared between the BragDoc web app and CLI.
 *
 * NOTE: this package deliberately keeps zod out of its public API surface —
 * the CLI uses zod v4 while the web app uses zod v3.
 */
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'ollama'
  | 'openai-compatible';

export interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string; // Default: 'gpt-4o'
}

export interface AnthropicConfig {
  apiKey?: string;
  model?: string; // Default: 'claude-3-5-sonnet-20241022'
}

export interface GoogleConfig {
  apiKey?: string;
  model?: string; // Default: 'gemini-1.5-pro'
}

export interface DeepSeekConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string; // Default: 'deepseek-chat'
}

export interface OllamaConfig {
  baseURL?: string; // Default: 'http://localhost:11434'
  model: string; // Required: e.g., 'llama3.2', 'qwen2.5-coder'
}

export interface OpenAICompatibleConfig {
  baseURL: string;
  apiKey?: string;
  model: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  google?: GoogleConfig;
  deepseek?: DeepSeekConfig;
  ollama?: OllamaConfig;
  openaiCompatible?: OpenAICompatibleConfig;
}
