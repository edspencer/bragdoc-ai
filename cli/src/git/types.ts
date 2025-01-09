/**
 * Represents a single Git commit with optional PR information
 */
export interface GitCommit {
  repository: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  pullRequest?: {
    number: number;
    title: string;
    body: string;
  };
}

/**
 * Options for git commit extraction
 */
export interface ExtractionOptions {
  branch?: string;
  since?: string;
  maxCommits?: number;
  includePRs?: boolean;
}

/**
 * Represents a parsed PR reference from a commit message
 */
export interface PullRequestRef {
  number: number;
  title?: string;
  body?: string;
}
