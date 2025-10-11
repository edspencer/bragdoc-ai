import type { LanguageModel } from 'ai';
import { loadConfig } from '../config';
import { createLLMFromConfig } from './providers';

let cachedModel: LanguageModel | null = null;

/**
 * Get the configured LLM for achievement extraction
 * Caches the model instance for performance
 *
 * Note: Requires appropriate API key to be set in config or environment
 */
export async function getExtractionModel(): Promise<LanguageModel> {
  if (cachedModel) {
    return cachedModel;
  }

  const config = await loadConfig();
  cachedModel = createLLMFromConfig(config);

  return cachedModel;
}

/**
 * Clear the cached model instance
 * Useful for testing or when config changes
 */
export function clearModelCache(): void {
  cachedModel = null;
}
