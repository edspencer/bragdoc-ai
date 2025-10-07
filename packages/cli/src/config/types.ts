/**
 * Types for project configuration
 */
export interface Project {
  path: string;
  name?: string;
  enabled: boolean;
  maxCommits?: number;
  cronSchedule?: string;
  id?: string; // UUID of the project in the Bragdoc API
  remote?: string; // Git remote URL
  standupId?: string; // UUID of the standup this project is enrolled in (if any)
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
 * Main configuration type
 */
export interface BragdocConfig {
  auth?: {
    token?: string;
    expiresAt?: number;
  };
  projects: Project[];
  standups: StandupProjectConfig[];
  // Legacy fields for backwards compatibility
  repositories?: Project[]; // Deprecated: use projects instead
  standup?: StandupConfig; // Deprecated: use standups instead
  settings: {
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
    dataCacheTimeout?: number; // Cache timeout in minutes for companies/projects/standups data
    apiBaseUrl?: string; // Optional API base URL for development/testing
  };
}

/**
 * Default configuration settings
 */
export const DEFAULT_CONFIG: BragdocConfig = {
  projects: [],
  standups: [],
  settings: {
    maxCommitsPerBatch: 10,
    defaultMaxCommits: 300,
    cacheEnabled: true,
    dataCacheTimeout: 5, // 5 minutes default
  },
};
