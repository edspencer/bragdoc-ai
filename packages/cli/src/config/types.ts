/**
 * Types for repository configuration
 */
export interface Repository {
  path: string;
  name?: string;
  enabled: boolean;
  maxCommits?: number;
  cronSchedule?: string;
  projectId?: string; // UUID of the project in the Bragdoc API
}

/**
 * Standup configuration
 */
export interface StandupConfig {
  enabled: boolean;
  standupId: string; // UUID of the standup in the Bragdoc API
  standupName?: string; // Friendly name for display
  cronSchedule?: string; // Cron schedule for WIP extraction (typically 10 mins before standup)
  repositoryPath?: string; // Optional: specific repo to extract WIP from (defaults to current dir)
}

/**
 * Main configuration type
 */
export interface BragdocConfig {
  auth?: {
    token?: string;
    expiresAt?: number;
  };
  repositories: Repository[];
  standup?: StandupConfig; // Optional standup configuration
  settings: {
    defaultTimeRange: string;
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
  repositories: [],
  settings: {
    defaultTimeRange: '30d',
    maxCommitsPerBatch: 10,
    defaultMaxCommits: 300,
    cacheEnabled: true,
    dataCacheTimeout: 5, // 5 minutes default
  },
};
