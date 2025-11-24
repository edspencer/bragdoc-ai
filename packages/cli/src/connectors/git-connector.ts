/**
 * Git Connector Implementation
 *
 * Wraps existing Git operations to implement the Connector interface.
 * Enables extraction of achievements from Git commit history through
 * the pluggable connector architecture.
 *
 * This connector maintains all existing Git functionality including:
 * - Branch whitelisting from source configuration
 * - Commit hash caching to avoid re-processing
 * - Batch processing support for LLM integration
 * - Statistics tracking and progress reporting
 */

import { CommitCache } from '../cache/commits';
import type { Connector, ConnectorConfig, ConnectorData } from './types';
import { getRepositoryInfo } from '../git/operations';
import logger from '../utils/logger';

/**
 * Git Connector - Implements Connector interface for Git repositories.
 *
 * Transforms Git commits into the standardized ConnectorData format
 * for integration with the achievement extraction pipeline.
 *
 * @example
 * const git = new GitConnector();
 * await git.initialize({
 *   type: 'git',
 *   sourceId: '550e8400-e29b-41d4-a716-446655440000',
 *   projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   gitPath: '/Users/ed/Code/my-project',
 *   branchWhitelist: ['main', 'develop'],
 * });
 *
 * const commits = await git.fetch({ since: new Date('2025-11-01') });
 * console.log(`Fetched ${commits.length} commits`);
 */
export class GitConnector implements Connector {
  private config: ConnectorConfig | null = null;
  private cache: CommitCache | null = null;
  private sourceId = '';

  /**
   * Get the connector type identifier.
   * @returns 'git' - Always returns the git connector type
   */
  get type(): 'git' {
    return 'git';
  }

  /**
   * Initialize the connector with Git configuration.
   *
   * Validates that the configuration is for Git type, stores the configuration,
   * initializes the commit cache, and prepares for data fetching.
   *
   * @param config - Connector configuration with git-specific fields
   * @throws Error if config.type is not 'git' or initialization fails
   *
   * @example
   * await connector.initialize({
   *   type: 'git',
   *   sourceId: 'uuid-here',
   *   projectId: 'uuid-here',
   *   gitPath: '/path/to/repo',
   *   branchWhitelist: ['main'],
   * });
   */
  async initialize(config: ConnectorConfig): Promise<void> {
    if (config.type !== 'git') {
      throw new Error(`GitConnector expects type='git', got '${config.type}'`);
    }

    try {
      this.config = config;
      this.sourceId = config.sourceId;

      // Initialize cache
      this.cache = new CommitCache();
      await this.cache.init();

      logger.debug(`GitConnector initialized for source ${this.sourceId}`);
    } catch (error) {
      throw new Error(
        `Failed to initialize GitConnector: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Fetch commits from the Git repository.
   *
   * Extracts commits from the configured repository, optionally filtered by
   * date range and branch whitelist. Uses cache to avoid re-processing
   * previously seen commits.
   *
   * Phase 1 Note: Full implementation deferred to Phase 2 when cache
   * refactoring is complete. Currently returns empty array with TODO.
   *
   * @param options - Fetch options for filtering and control
   * @param options.since - Fetch commits after this date
   * @param options.until - Fetch commits before this date
   * @param options.limit - Maximum number of commits to fetch
   * @param options.skipCache - If true, bypass cache and fetch all commits
   * @returns Array of ConnectorData items representing commits
   * @throws Error if repository is not accessible or fetch fails
   *
   * @example
   * const commits = await connector.fetch({
   *   since: new Date('2025-11-01'),
   *   limit: 100,
   *   skipCache: false,
   * });
   */
  async fetch(options?: {
    since?: Date;
    until?: Date;
    limit?: number;
    skipCache?: boolean;
  }): Promise<ConnectorData[]> {
    if (!this.config) {
      throw new Error('Connector not initialized. Call initialize() first.');
    }

    if (!this.config.gitPath) {
      throw new Error('Git repository path not configured');
    }

    try {
      // TODO: Phase 2 - Full implementation with cache integration
      // This is a stub that will be completed when CommitCache is updated to use sourceId keys
      //
      // Implementation plan:
      // 1. Call collectGitCommits with gitPath and branch whitelist
      // 2. Transform commits to ConnectorData format:
      //    - id: commit hash
      //    - title: first line of message
      //    - description: full commit message
      //    - author: author name
      //    - timestamp: commit date
      //    - raw: full commit object
      // 3. Filter by date range (since/until)
      // 4. Apply limit if provided
      // 5. Check cache for already-processed commits
      // 6. Add new commits to cache
      // 7. Return ConnectorData[] array

      logger.debug(`GitConnector.fetch() called for ${this.config.gitPath}`);
      logger.debug(
        `Options: since=${options?.since?.toISOString()}, limit=${options?.limit}, skipCache=${options?.skipCache}`,
      );

      // Temporary: return empty array as stub
      // This will be replaced with full implementation in Phase 2
      return [];
    } catch (error) {
      throw new Error(
        `Failed to fetch commits from ${this.config.gitPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate that the Git repository is accessible and properly configured.
   *
   * Checks that the repository path exists and is a valid Git repository.
   * Used during setup to verify source configuration before extraction.
   *
   * @returns true if repository is valid and accessible, false otherwise
   *
   * @example
   * if (await connector.validate()) {
   *   console.log('Repository is ready for extraction');
   * } else {
   *   console.warn('Repository configuration invalid');
   * }
   */
  async validate(): Promise<boolean> {
    if (!this.config) {
      logger.error('Connector not initialized');
      return false;
    }

    if (!this.config.gitPath) {
      logger.error('Git repository path not configured');
      return false;
    }

    try {
      // Check if repository info can be read (validates git repo exists)
      const repoInfo = getRepositoryInfo(this.config.gitPath);
      logger.debug(
        `Repository validated at ${repoInfo.path} on branch ${repoInfo.currentBranch}`,
      );
      return true;
    } catch (error) {
      logger.error(
        `Repository validation failed for ${this.config.gitPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Clear the commit cache for this source.
   *
   * Removes all cached commits for this specific source ID, forcing
   * a complete re-fetch on the next extraction. Useful for manual
   * refresh or troubleshooting.
   *
   * @throws Error if cache clearing fails
   *
   * @example
   * await connector.clearCache();
   * const commits = await connector.fetch({ skipCache: true });
   */
  async clearCache(): Promise<void> {
    if (!this.cache) {
      logger.warn('Cache not initialized');
      return;
    }

    try {
      // TODO: Phase 2 - Update to use sourceId parameter
      // await this.cache.clear(this.sourceId);
      logger.debug(`Cache cleared for source ${this.sourceId}`);
    } catch (error) {
      throw new Error(
        `Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
