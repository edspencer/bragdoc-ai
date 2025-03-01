/**
 * Types for repository configuration
 */
export interface Repository {
  path: string;
  name?: string;
  enabled: boolean;
  maxCommits?: number;
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
  settings: {
    defaultTimeRange: string;
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
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
  },
};
