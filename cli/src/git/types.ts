/**
 * Type describing a single Git commit
 */
export interface GitCommit {
  repository: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
}

/**
 * Options for extracting commits
 */
export interface ExtractionOptions {
  branch: string;
  maxCommits: number;
  repository: string;
}
