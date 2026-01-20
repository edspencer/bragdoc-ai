/**
 * @bragdoc/cli Library Exports
 *
 * This module exports the core extraction functionality for use as a library.
 * The CLI uses these same functions internally, ensuring consistent behavior.
 *
 * Usage:
 *   import { renderExecute, createLLMFromConfig } from '@bragdoc/cli/lib';
 *   // or
 *   import { renderExecute, createLLMFromConfig } from '@bragdoc/cli';
 */

// Core extraction functions
export {
  render,
  execute,
  executeStream,
  renderExecute,
  type ExecuteOptions,
} from './ai/extract-commit-achievements';

// LLM configuration
export { getExtractionModel, clearModelCache } from './ai/llm';

// LLM providers - for creating models with custom configs
export { createLLMFromConfig, getLLMDisplayName } from './ai/providers';

// Types for extraction
export type {
  Commit,
  Repository,
  Company,
  Project,
  User,
  ExtractedAchievement,
  LLMExtractedAchievement,
  ExtractCommitAchievementsPromptProps,
  FetchExtractCommitAchievementsPromptProps,
} from './ai/prompts/types';

// Schema for validation
export { achievementResponseSchema } from './ai/prompts/types';

// Config types - useful for creating LLM configs
export type {
  BragdocConfig,
  LLMConfig,
  LLMProvider,
} from './config/types';
