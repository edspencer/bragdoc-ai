/**
 * File change statistics from git --numstat
 */
export interface FileStats {
  path: string;
  additions: number;
  deletions: number;
}

/**
 * File diff information
 */
export interface FileDiff {
  path: string;
  diff: string; // The actual diff content
  isTruncated: boolean; // Whether this diff was truncated due to size limits
}

/**
 * Source item type for achievement tracking
 * Used to distinguish between different types of source items (commits, PRs, issues, etc.)
 */
export type SourceItemType = 'commit' | 'pr' | 'issue' | 'pr_comment';

/**
 * Type describing a single Git commit or connector data item
 * Extended to support multi-source extraction (GitHub PRs, issues, etc.)
 */
export interface GitCommit {
  repository: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;

  // Enhanced data (optional)
  stats?: FileStats[]; // File change statistics (from --numstat)
  diff?: FileDiff[]; // Code diffs (from -p)
  diffTruncated?: boolean; // Whether diff was truncated due to limits
  sourceId?: string; // Source ID from which this commit was fetched (for multi-source support)

  // Multi-source support (optional)
  rawType?: string; // Raw type from connector (e.g., 'pr', 'issue', 'commit', 'pr_comment')
}

/**
 * Options for extracting commits
 */
export interface ExtractionOptions {
  branch: string;
  maxCommits: number;
  repository: string;
}

/** Repository information */
export interface RepositoryInfo {
  remoteUrl: string;
  currentBranch: string;
  path: string;
}

/** Payload sent to Bragdoc API */
export interface BragdocPayload {
  repository: RepositoryInfo;
  commits: GitCommit[];
}
