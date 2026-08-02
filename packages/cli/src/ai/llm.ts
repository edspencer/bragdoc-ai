import { createLLMFromConfig } from '@bragdoc/ai';
import type { LanguageModel } from 'ai';
import { loadConfig } from '../config';

let cachedModel: LanguageModel | null = null;

/**
 * Appended to any LLM configuration error so CLI users get actionable
 * remediation. The shared @bragdoc/ai package is web-consumed too, so it
 * deliberately knows nothing about `bragdoc` commands — callers supply their
 * own guidance.
 */
export const CLI_LLM_REMEDIATION_HINT =
  'Configure a provider with "bragdoc llm set" (or run "bragdoc init").';

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
  cachedModel = createLLMFromConfig(config.llm, {
    remediationHint: CLI_LLM_REMEDIATION_HINT,
  });

  return cachedModel;
}

/**
 * Clear the cached model instance
 * Useful for testing or when config changes
 */
export function clearModelCache(): void {
  cachedModel = null;
}
