/**
 * Controls what data is extracted from git commits
 */
export type ExtractionDetailLevel =
  | 'minimal'
  | 'standard'
  | 'detailed'
  | 'comprehensive';

/**
 * Configuration for git commit extraction detail levels
 */
export interface ExtractionConfig {
  // Quick preset levels
  detailLevel?: ExtractionDetailLevel;

  // Fine-grained control (overrides detailLevel if set)
  includeStats?: boolean; // Include file change statistics (--numstat)
  includeDiff?: boolean; // Include code diffs (-p)

  // Diff limiting (when includeDiff is true)
  maxDiffLinesPerCommit?: number; // Max lines of diff per commit (default: 500)
  maxDiffLinesPerFile?: number; // Max lines of diff per file (default: 100)
  maxFilesInDiff?: number; // Max files to include in diff (default: 20)

  // Smart diff options
  excludeDiffPatterns?: string[]; // File patterns to exclude from diffs
  prioritizeDiffPatterns?: string[]; // File patterns to prioritize in diffs
}

/**
 * Types for project configuration
 */
export interface Project {
  path: string; //local root path of the project
  name?: string;
  enabled: boolean;
  maxCommits?: number;
  cronSchedule?: string;
  id?: string; // UUID of the project in the Bragdoc API
  remote?: string; // Git remote URL
  standupId?: string; // UUID of the standup this project is enrolled in (if any)
  extraction?: ExtractionConfig; // Extraction configuration for this project
}

/**
 * Legacy standup configuration (for backwards compatibility)
 */
export interface StandupConfig {
  enabled: boolean;
  standupId: string; // UUID of the standup in the Bragdoc API
  standupName?: string; // Friendly name for display
  cronSchedule?: string; // Cron schedule for WIP extraction (typically 10 mins before standup)
  repositoryPath?: string; // Optional: specific repo to extract WIP from (defaults to current dir)
}

/**
 * Standup configuration within a project
 */
export interface StandupProjectConfig {
  id: string; // UUID of the standup
  name?: string; // Friendly name for display
  enabled: boolean; // Whether this standup is active
  cronSchedule?: string; // Cron schedule for WIP extraction (typically 10 mins before standup)
  maxConcurrentExtracts?: number; // For bragdoc extract parallelization
  maxConcurrentWips?: number; // For WIP extraction parallelization
}

/**
 * LLM Provider types
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

/**
 * Main configuration type
 */
export interface BragdocConfig {
  auth?: {
    token?: string;
    expiresAt?: number;
  };
  projects: Project[];
  standups: StandupProjectConfig[];
  repositories?: Project[]; // Deprecated: use projects instead
  llm?: LLMConfig;
  settings: {
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
    dataCacheTimeout?: number; // Cache timeout in minutes for companies/projects/standups data
    apiBaseUrl?: string; // Optional API base URL for development/testing
    defaultExtraction?: ExtractionConfig; // Default extraction config for all projects
  };
}

/**
 * Default configuration settings
 */
export const DEFAULT_CONFIG: BragdocConfig = {
  projects: [],
  standups: [],
  llm: {
    provider: 'openai',
    openai: {
      model: 'gpt-4o',
    },
  },
  settings: {
    maxCommitsPerBatch: 10,
    defaultMaxCommits: 300,
    cacheEnabled: true,
    dataCacheTimeout: 5, // 5 minutes default
    defaultExtraction: {
      detailLevel: 'standard',
    },
  },
};
