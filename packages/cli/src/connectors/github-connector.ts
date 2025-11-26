/**
 * GitHub Connector Implementation
 *
 * Extracts achievements from GitHub repositories via the gh CLI.
 * Supports commits, pull requests, issues, and PR comments.
 * Alternative to GitConnector for GitHub-hosted repositories.
 *
 * Key Benefits:
 * - No local clone required
 * - Rich PR data with descriptions and review context
 * - Multiple data types from single source (commits, PRs, issues)
 * - Per-file statistics included
 *
 * Prerequisites:
 * - gh CLI installed (https://cli.github.com/)
 * - gh CLI authenticated (run `gh auth login`)
 */

import { execSync } from 'node:child_process';
import { CommitCache } from '../cache/commits';
import type { Connector, ConnectorConfig, ConnectorData } from './types';
import logger from '../utils/logger';

/**
 * GitHub commit data from API response
 */
interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}

/**
 * GitHub commit with optional stats (from individual commit fetch)
 */
interface GitHubCommitWithStats extends GitHubCommit {
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    additions: number;
    deletions: number;
  }>;
}

/**
 * GitHub PR data from gh pr list command
 */
interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  mergedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  headRefName: string;
  baseRefName: string;
  url: string;
}

/**
 * GitHub issue data from gh issue list command
 */
interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  closedAt: string;
  url: string;
  labels: Array<{ name: string }>;
}

/**
 * Check if gh CLI is installed and authenticated
 *
 * @returns Object with availability and authentication status
 */
async function checkGitHubCli(): Promise<{
  available: boolean;
  authenticated: boolean;
  error?: string;
}> {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    return {
      available: false,
      authenticated: false,
      error:
        'GitHub CLI (gh) is not installed. Install from https://cli.github.com/',
    };
  }

  try {
    const authStatus = execSync('gh auth status 2>&1', { encoding: 'utf-8' });
    const isAuthenticated = !authStatus.toLowerCase().includes('not logged');
    return {
      available: true,
      authenticated: isAuthenticated,
      error: isAuthenticated
        ? undefined
        : "GitHub CLI is not authenticated. Run 'gh auth login' first.",
    };
  } catch {
    return {
      available: true,
      authenticated: false,
      error: "GitHub CLI is not authenticated. Run 'gh auth login' first.",
    };
  }
}

/**
 * Execute gh command and parse JSON output
 *
 * Handles common error scenarios:
 * - Rate limiting: Provides helpful message to wait
 * - Auth issues: Suggests re-authentication
 *
 * @param command - Full gh command to execute
 * @returns Parsed JSON output from command
 * @throws Error with helpful message for rate limits or auth issues
 */
function runGhCommand<T>(command: string): T {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(output) as T;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for rate limiting
    if (errorMessage.includes('rate limit')) {
      throw new Error(
        'GitHub API rate limit exceeded. Please wait and try again.',
      );
    }

    // Check for auth issues
    if (
      errorMessage.includes('401') ||
      errorMessage.includes('authentication')
    ) {
      throw new Error(
        "GitHub authentication failed. Run 'gh auth login' to re-authenticate.",
      );
    }

    throw error;
  }
}

/**
 * GitHub Connector - Implements Connector interface for GitHub repositories.
 *
 * Transforms GitHub commits, PRs, and issues into the standardized ConnectorData
 * format for integration with the achievement extraction pipeline.
 *
 * @example
 * const github = new GitHubConnector();
 * await github.initialize({
 *   type: 'github',
 *   sourceId: '550e8400-e29b-41d4-a716-446655440000',
 *   projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 *   repo: 'owner/repo',
 *   includeCommits: true,
 *   includePRs: true,
 *   includeIssues: false,
 * });
 *
 * const data = await github.fetch({ since: new Date('2025-11-01') });
 * console.log(`Fetched ${data.length} items`);
 */
export class GitHubConnector implements Connector {
  private config: ConnectorConfig | null = null;
  private cache: CommitCache | null = null;
  private sourceId = '';

  /**
   * Get the connector type identifier.
   * @returns 'github' - Always returns the github connector type
   */
  get type(): 'github' {
    return 'github';
  }

  /**
   * Initialize the connector with GitHub configuration.
   *
   * Validates that the configuration is for GitHub type, stores the configuration,
   * initializes the commit cache, and prepares for data fetching.
   *
   * @param config - Connector configuration with github-specific fields
   * @throws Error if config.type is not 'github' or initialization fails
   *
   * @example
   * await connector.initialize({
   *   type: 'github',
   *   sourceId: 'uuid-here',
   *   projectId: 'uuid-here',
   *   repo: 'owner/repo',
   *   includeCommits: true,
   *   includePRs: true,
   * });
   */
  async initialize(config: ConnectorConfig): Promise<void> {
    if (config.type !== 'github') {
      throw new Error(
        `GitHubConnector expects type='github', got '${config.type}'`,
      );
    }

    if (!config.repo) {
      throw new Error(
        'GitHub repository (repo) not configured. Format: owner/repo',
      );
    }

    // Validate repo format (owner/repo)
    if (!/^[\w.-]+\/[\w.-]+$/.test(config.repo)) {
      throw new Error(
        `Invalid repository format: ${config.repo}. Expected: owner/repo`,
      );
    }

    try {
      this.config = config;
      this.sourceId = config.sourceId;

      // Initialize cache
      this.cache = new CommitCache();
      await this.cache.init();

      logger.debug(
        `GitHubConnector initialized for source ${this.sourceId}, repo ${config.repo}`,
      );
    } catch (error) {
      throw new Error(
        `Failed to initialize GitHubConnector: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate that the GitHub repository is accessible and properly configured.
   *
   * Checks that gh CLI is installed, authenticated, and can access the repo.
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

    if (!this.config.repo) {
      logger.error('GitHub repository (repo) not configured');
      return false;
    }

    // Check gh CLI availability and auth
    const ghStatus = await checkGitHubCli();
    if (!ghStatus.available) {
      logger.error(ghStatus.error);
      return false;
    }

    if (!ghStatus.authenticated) {
      logger.error(ghStatus.error);
      return false;
    }

    // Check repository access
    try {
      execSync(`gh repo view ${this.config.repo} --json name`, {
        stdio: 'ignore',
      });
      logger.debug(`Repository ${this.config.repo} is accessible`);
      return true;
    } catch (error) {
      logger.error(
        `Cannot access repository ${this.config.repo}. Check permissions and repository name.`,
      );
      return false;
    }
  }

  /**
   * Fetch commits from GitHub API
   *
   * @param options - Fetch options
   * @param options.since - Fetch commits after this date
   * @param options.limit - Maximum number of commits to fetch
   * @returns Array of ConnectorData items representing commits
   */
  private async fetchCommits(options?: {
    since?: Date;
    limit?: number;
  }): Promise<ConnectorData[]> {
    if (!this.config?.repo) return [];

    const repo = this.config.repo;
    const includeStats = this.config.commitStats !== false;
    const author = this.config.author || '@me';
    const branch = this.config.branch;
    const limit = options?.limit || 100;

    // Build query params
    let queryParams = `per_page=${Math.min(limit, 100)}`;
    if (options?.since) {
      queryParams += `&since=${options.since.toISOString()}`;
    }
    if (branch) {
      queryParams += `&sha=${branch}`;
    }

    logger.debug(`Fetching commits from ${repo} with params: ${queryParams}`);

    try {
      // Fetch commit list
      const commits = runGhCommand<GitHubCommit[]>(
        `gh api repos/${repo}/commits?${queryParams}`,
      );

      // Filter by author if specified and not @me (gh handles @me)
      let filteredCommits = commits;
      if (author && author !== '@me') {
        filteredCommits = commits.filter(
          (c) =>
            c.commit.author.email === author || c.commit.author.name === author,
        );
      }

      // Transform to ConnectorData
      const connectorData: ConnectorData[] = [];

      for (const commit of filteredCommits.slice(0, limit)) {
        let stats: GitHubCommitWithStats['stats'];
        let files: GitHubCommitWithStats['files'];

        // Fetch stats for each commit if enabled
        if (includeStats) {
          try {
            const commitWithStats = runGhCommand<GitHubCommitWithStats>(
              `gh api repos/${repo}/commits/${commit.sha}`,
            );
            stats = commitWithStats.stats;
            files = commitWithStats.files;
          } catch (error) {
            logger.warn(
              `Failed to fetch stats for commit ${commit.sha}: ${error}`,
            );
          }
        }

        const lines = commit.commit.message.split('\n');
        const title = lines[0] || 'No commit message';

        connectorData.push({
          id: commit.sha,
          title,
          description: commit.commit.message,
          author: commit.commit.author.name,
          timestamp: new Date(commit.commit.author.date),
          raw: {
            sha: commit.sha,
            email: commit.commit.author.email,
            stats,
            files,
            type: 'commit',
          },
          isCached: false,
        });
      }

      return connectorData;
    } catch (error) {
      logger.error(`Failed to fetch commits: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch merged pull requests from GitHub
   *
   * @param options - Fetch options
   * @param options.since - Fetch PRs merged after this date
   * @param options.limit - Maximum number of PRs to fetch
   * @returns Array of ConnectorData items representing PRs
   */
  private async fetchPullRequests(options?: {
    since?: Date;
    limit?: number;
  }): Promise<ConnectorData[]> {
    if (!this.config?.repo) return [];

    const repo = this.config.repo;
    const author = this.config.author || '@me';
    const limit = options?.limit || 100;

    logger.debug(`Fetching merged PRs from ${repo}`);

    try {
      const prs = runGhCommand<GitHubPR[]>(
        `gh pr list --repo ${repo} --author "${author}" --state merged --limit ${limit} --json number,title,body,mergedAt,additions,deletions,changedFiles,headRefName,baseRefName,url`,
      );

      // Filter by date if provided
      let filteredPRs = prs;
      if (options?.since) {
        filteredPRs = prs.filter(
          (pr) => new Date(pr.mergedAt) >= options.since!,
        );
      }

      return filteredPRs.map((pr) => ({
        id: String(pr.number), // Just the number, sourceItemType distinguishes from issues
        title: pr.title,
        description: pr.body || '',
        author,
        timestamp: new Date(pr.mergedAt),
        raw: {
          number: pr.number,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
          headBranch: pr.headRefName,
          baseBranch: pr.baseRefName,
          url: pr.url,
          type: 'pr', // Use 'pr' to match sourceItemType enum and cache key format
        },
        isCached: false,
      }));
    } catch (error) {
      logger.error(`Failed to fetch pull requests: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch closed issues from GitHub
   *
   * Retrieves issues that the authenticated user authored and that have been
   * closed. Useful for tracking feature requests, bug fixes, and other work
   * items that resulted in achievements.
   *
   * @param options - Fetch options
   * @param options.since - Fetch issues closed after this date
   * @param options.limit - Maximum number of issues to fetch
   * @returns Array of ConnectorData items representing issues
   *
   * @example
   * const issues = await connector.fetchIssues({
   *   since: new Date('2025-11-01'),
   *   limit: 50,
   * });
   */
  private async fetchIssues(options?: {
    since?: Date;
    limit?: number;
  }): Promise<ConnectorData[]> {
    if (!this.config?.repo) return [];

    const repo = this.config.repo;
    const author = this.config.author || '@me';
    const limit = options?.limit || 100;

    logger.debug(`Fetching closed issues from ${repo}`);

    try {
      const issues = runGhCommand<GitHubIssue[]>(
        `gh issue list --repo ${repo} --author "${author}" --state closed --limit ${limit} --json number,title,body,closedAt,url,labels`,
      );

      // Filter by date if provided
      let filteredIssues = issues;
      if (options?.since) {
        filteredIssues = issues.filter(
          (issue) => new Date(issue.closedAt) >= options.since!,
        );
      }

      return filteredIssues.map((issue) => ({
        id: String(issue.number), // Just the number, sourceItemType distinguishes from PRs
        title: issue.title,
        description: issue.body || '',
        author,
        timestamp: new Date(issue.closedAt),
        raw: {
          number: issue.number,
          labels: issue.labels.map((l) => l.name),
          url: issue.url,
          type: 'issue',
        },
        isCached: false,
      }));
    } catch (error) {
      logger.error(`Failed to fetch issues: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch data from GitHub repository.
   *
   * Orchestrates fetching of commits, PRs, and issues based on configuration.
   * Uses cache to avoid re-processing previously seen items.
   *
   * @param options - Fetch options for filtering and control
   * @param options.since - Fetch data after this date (for incremental extraction)
   * @param options.until - Fetch data before this date (for testing/debugging)
   * @param options.limit - Maximum number of items to fetch per type
   * @param options.skipCache - If true, bypass cache and fetch all data
   * @returns Array of ConnectorData items in standardized format
   * @throws Error if repository is not accessible or fetch fails
   *
   * @example
   * const data = await connector.fetch({
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

    const includeCommits = this.config.includeCommits !== false;
    const includePRs = this.config.includePRs !== false;
    const includeIssues = this.config.includeIssues === true;

    logger.debug(`GitHubConnector.fetch() for ${this.config.repo}`);
    logger.debug(
      `Options: commits=${includeCommits}, PRs=${includePRs}, issues=${includeIssues}`,
    );

    let allData: ConnectorData[] = [];

    // Fetch commits
    if (includeCommits) {
      const commits = await this.fetchCommits(options);
      logger.debug(`Fetched ${commits.length} commits`);
      allData = allData.concat(commits);
    }

    // Fetch PRs
    if (includePRs) {
      const prs = await this.fetchPullRequests(options);
      logger.debug(`Fetched ${prs.length} merged PRs`);
      allData = allData.concat(prs);
    }

    // Fetch issues (if enabled)
    if (includeIssues) {
      const issues = await this.fetchIssues(options);
      logger.debug(`Fetched ${issues.length} closed issues`);
      allData = allData.concat(issues);
    }

    // Apply until filter
    if (options?.until) {
      allData = allData.filter((item) => item.timestamp <= options.until!);
    }

    // Check cache and mark cached items (unless skipCache is true)
    if (!options?.skipCache && this.cache) {
      const cachedIds = await this.cache.list(this.sourceId);
      const cachedSet = new Set(cachedIds);

      // Create cache key based on type and id
      allData = allData.map((item) => {
        const cacheKey = `${item.raw.type}-${item.id}`;
        return {
          ...item,
          isCached: cachedSet.has(cacheKey),
        };
      });

      // Filter out cached items
      const uncachedData = allData.filter((item) => !item.isCached);
      logger.debug(
        `${cachedIds.length} items cached, ${uncachedData.length} new items`,
      );
      allData = uncachedData;
    }

    logger.debug(`Returning ${allData.length} items from GitHubConnector`);
    return allData;
  }

  /**
   * Clear the cache for this source.
   *
   * Removes all cached items for this specific source ID, forcing
   * a complete re-fetch on the next extraction. Useful for manual
   * refresh or troubleshooting.
   *
   * @throws Error if cache clearing fails
   *
   * @example
   * await connector.clearCache();
   * const data = await connector.fetch({ skipCache: true });
   */
  async clearCache(): Promise<void> {
    if (!this.cache) {
      logger.warn('Cache not initialized');
      return;
    }

    try {
      await this.cache.clear(this.sourceId);
      logger.debug(`Cache cleared for source ${this.sourceId}`);
    } catch (error) {
      throw new Error(
        `Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
