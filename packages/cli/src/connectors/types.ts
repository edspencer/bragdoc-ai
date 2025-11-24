/**
 * Connector Architecture - Type Definitions
 *
 * This module defines the interfaces and types for the pluggable connector architecture.
 * Phase 1 establishes a generic interface pattern that will evolve to discriminated unions
 * in Phase 2 for better type safety across different connector implementations.
 *
 * The connector pattern enables support for multiple achievement data sources:
 * - Git: Extract from commit history
 * - GitHub: Extract from pull requests, issues, releases
 * - Jira: Extract from tickets, sprints, releases
 * - Future: Linear, GitLab, and other sources
 */

/**
 * Base configuration for any connector.
 *
 * Phase 1 Strategy: Generic interface with source type determining field applicability.
 * This supports immediate implementation while Phase 2 refines to discriminated unions:
 * `GitConnectorConfig | GitHubConnectorConfig | JiraConnectorConfig` for better type safety.
 *
 * @example
 * // Git connector config
 * {
 *   type: 'git',
 *   sourceId: '550e8400-e29b-41d4-a716-446655440000',
 *   projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   gitPath: '/Users/ed/Code/my-project',
 *   branchWhitelist: ['main', 'develop']
 * }
 */
export interface ConnectorConfig {
  /** Connector type: 'git', 'github', 'jira', etc. */
  type: 'git' | 'github' | 'jira';

  /** UUID of the Source record in the database */
  sourceId: string;

  /** UUID of the Project record this source belongs to */
  projectId: string;

  /** Git-specific: Path to repository on local filesystem */
  gitPath?: string;

  /** Git-specific: Branches to include in extraction (empty = all) */
  branchWhitelist?: string[];

  /** Generic fallback for source-specific configuration fields */
  [key: string]: any;
}

/**
 * Unified data format from any connector.
 *
 * All connectors transform their native data (Git commits, GitHub PRs, Jira tickets)
 * into this standardized format for consistent processing by the achievement pipeline.
 *
 * @example
 * {
 *   id: 'abc123def456',  // Git: commit hash, GitHub: PR number, Jira: issue key
 *   title: 'Implemented user authentication',
 *   description: 'Full commit message or PR description',
 *   author: 'john.doe',
 *   timestamp: new Date('2025-11-24T10:30:00Z'),
 *   raw: {
 *     // Source-specific data for future connectors to access
 *     hash: 'abc123def456...',
 *     parentHashes: [...],
 *     diff: '...',
 *   },
 *   isCached: false
 * }
 */
export interface ConnectorData {
  /**
   * Unique identifier for this data item within the source.
   * - Git: commit hash (short or full)
   * - GitHub: pull request number
   * - Jira: issue key (e.g., 'PROJ-123')
   */
  id: string;

  /**
   * Human-readable title or summary of the work.
   * - Git: first line of commit message
   * - GitHub: pull request title
   * - Jira: issue summary
   */
  title: string;

  /**
   * Full description or details of the work.
   * - Git: full commit message
   * - GitHub: PR description
   * - Jira: issue description
   */
  description: string;

  /**
   * Person who performed the work.
   * - Git: commit author name/email
   * - GitHub: PR author username
   * - Jira: issue assignee name
   */
  author: string;

  /**
   * When the work was performed.
   * - Git: commit timestamp
   * - GitHub: PR created/merged timestamp
   * - Jira: ticket resolved timestamp
   */
  timestamp: Date;

  /**
   * Raw source-specific data for connector-specific processing.
   * Enables future features while maintaining standardized interface.
   */
  raw: Record<string, any>;

  /**
   * Indicates whether this item was previously fetched and cached.
   * Used to optimize batch processing and avoid re-processing.
   */
  isCached?: boolean;
}

/**
 * Connector data with project and source context.
 *
 * Extends ConnectorData with metadata needed for achievement creation.
 * Used internally by the extract command when processing data from multiple sources.
 */
export interface ConnectorItem extends ConnectorData {
  /** UUID of the Source record this data came from */
  sourceId: string;

  /** UUID of the Project this data belongs to */
  projectId: string;

  /** Type of connector that produced this data */
  type: string;
}

/**
 * Base interface for all achievement source connectors.
 *
 * Each connector type (Git, GitHub, Jira) implements this interface,
 * providing a consistent contract for data fetching, validation, and caching.
 *
 * Implementations should handle errors gracefully with detailed logging,
 * respect rate limits and pagination, and optimize caching strategies
 * specific to each data source.
 *
 * @example
 * class GitConnector implements Connector {
 *   get type() { return 'git'; }
 *   async initialize(config) { ... }
 *   async fetch(options) { ... }
 *   async validate() { ... }
 *   async clearCache() { ... }
 * }
 */
export interface Connector {
  /**
   * Connector type identifier.
   * Used by ConnectorRegistry to manage connector instances.
   */
  readonly type: 'git' | 'github' | 'jira';

  /**
   * Initialize the connector with configuration.
   *
   * Called once at startup before any data fetching. Implementations should:
   * - Validate the config.type matches expected connector type
   * - Store configuration for later use
   * - Initialize cache if needed
   * - Set up any required connections or clients
   *
   * @param config - Connector configuration with type, sourceId, and type-specific fields
   * @throws Error if config is invalid or initialization fails
   *
   * @example
   * const git = new GitConnector();
   * await git.initialize({
   *   type: 'git',
   *   sourceId: '550e8400-e29b-41d4-a716-446655440000',
   *   projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
   *   gitPath: '/Users/ed/Code/my-project',
   * });
   */
  initialize(config: ConnectorConfig): Promise<void>;

  /**
   * Fetch data from this source.
   *
   * Implementations should:
   * - Use cache when possible to avoid re-fetching unchanged data
   * - Respect rate limits and implement backoff strategies
   * - Handle pagination for sources with large datasets
   * - Transform source-specific format to ConnectorData
   * - Log errors and progress for debugging
   *
   * @param options - Query options for filtering and controlling fetch behavior
   * @param options.since - Fetch data after this date (for incremental extraction)
   * @param options.until - Fetch data before this date (for testing/debugging)
   * @param options.limit - Maximum number of items to fetch
   * @param options.skipCache - If true, bypass cache and fetch fresh data
   * @returns Array of ConnectorData items in standardized format
   * @throws Error if fetch fails after retries
   *
   * @example
   * const data = await git.fetch({
   *   since: new Date(Date.now() - 7 * 86400000),  // Last 7 days
   *   limit: 100,
   *   skipCache: false,
   * });
   */
  fetch(options?: {
    since?: Date;
    until?: Date;
    limit?: number;
    skipCache?: boolean;
  }): Promise<ConnectorData[]>;

  /**
   * Validate configuration and connectivity.
   *
   * Called during setup to verify the source is accessible and properly configured.
   * Implementations should:
   * - Check that required configuration is present
   * - Verify access to the data source (file system, API, etc.)
   * - Test authentication if required
   * - Log diagnostic information for debugging
   *
   * @returns true if connector is valid and accessible, false otherwise
   *
   * @example
   * const isValid = await git.validate();
   * if (!isValid) {
   *   console.warn('Git repository not found at configured path');
   * }
   */
  validate(): Promise<boolean>;

  /**
   * Clear cached data for this source.
   *
   * Used for manual refresh, troubleshooting, or when explicit cache invalidation
   * is needed. Implementations can ignore if caching is not applicable.
   *
   * @throws Error if cache clearing fails
   *
   * @example
   * // Force refresh on next fetch
   * await git.clearCache();
   */
  clearCache(): Promise<void>;
}

/**
 * Unified caching interface for connector data.
 *
 * Enables each connector to implement custom caching strategies optimized
 * for its data source (file-based for Git, API response cache for HTTP, etc.)
 * while maintaining a consistent interface.
 *
 * @example
 * // Git-specific cache implementation
 * class CommitCache implements ConnectorCache {
 *   async has(id: string): Promise<boolean> { ... }
 *   async add(id: string, data: ConnectorData): Promise<void> { ... }
 *   async get(id: string): Promise<ConnectorData | null> { ... }
 *   async list(): Promise<string[]> { ... }
 *   async clear(): Promise<void> { ... }
 * }
 */
export interface ConnectorCache {
  /**
   * Check if data item is in cache.
   *
   * @param id - Unique identifier for the data item
   * @returns true if item is cached, false otherwise
   */
  has(id: string): Promise<boolean>;

  /**
   * Add data item to cache.
   *
   * @param id - Unique identifier for the data item
   * @param data - The ConnectorData to cache
   */
  add(id: string, data: ConnectorData): Promise<void>;

  /**
   * Get cached item by ID.
   *
   * @param id - Unique identifier for the data item
   * @returns Cached ConnectorData or null if not found
   */
  get(id: string): Promise<ConnectorData | null>;

  /**
   * List all cached IDs.
   *
   * @returns Array of all cached item IDs
   */
  list(): Promise<string[]>;

  /**
   * Clear all cached data.
   *
   * @throws Error if clear fails
   */
  clear(): Promise<void>;
}
