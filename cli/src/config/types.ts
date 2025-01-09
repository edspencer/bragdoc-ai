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
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  repositories: Repository[];
  settings: {
    defaultTimeRange: string;
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
  };
}

/**
 * Default configuration settings
 */
export const DEFAULT_CONFIG: BragdocConfig = {
  repositories: [],
  settings: {
    defaultTimeRange: '30d',
    maxCommitsPerBatch: 100,
    defaultMaxCommits: 300,
    cacheEnabled: true,
  },
};
