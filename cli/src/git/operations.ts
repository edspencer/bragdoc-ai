import { execSync } from 'child_process';
import { GitCommit, ExtractionOptions, PullRequestRef } from './types';

/**
 * Collects Git commit data for a given branch and maxCommits count.
 */
export function collectGitCommits(
  branch: string,
  maxCommits: number,
  repositoryName: string
): GitCommit[] {
  try {
    // Get commit hash and full message (title + body).
    // Use a unique separator that won't appear in commit messages
    const separator = '|||<<COMMIT_SEPARATOR>>|||';
    const logCommand = `git log ${branch} --pretty=format:"%H${separator}%B${separator}%an${separator}%ai" --max-count=${maxCommits}`;
    const output = execSync(logCommand).toString();

    // Split by our unique separator and filter empty entries
    const commits = output
      .split(separator + '\n')
      .filter(entry => entry.trim())
      .map(entry => {
        const parts = entry.split(separator);
        if (parts.length !== 4) {
          throw new Error(`Invalid git log entry format: ${entry}`);
        }

        const [hash, message, author, date] = parts.map(part => part.trim());
        return {
          repository: repositoryName,
          hash,
          message,
          author,
          date,
          branch
        };
      });

    return commits;
  } catch (error: any) {
    // Re-throw git errors with more context
    throw error;
  }
}

/**
 * Extract commits from a git repository
 */
export async function getCommits(repoPath: string, options: ExtractionOptions): Promise<GitCommit[]> {
  const {
    branch = 'main',
    maxCommits,
    since,
    includePRs = false
  } = options;

  // Build git log command with options
  let logCommand = `git -C "${repoPath}" log ${branch} --pretty=format:"%H|||%B|||%an|||%ai"`;
  
  if (maxCommits) {
    logCommand += ` --max-count=${maxCommits}`;
  }
  
  if (since) {
    const sinceDate = timeRangeToDate(since);
    if (sinceDate) {
      logCommand += ` --since="${sinceDate}"`;
    }
  }

  try {
    const output = execSync(logCommand).toString();
    const commits = parseGitLog(output, repoPath, branch);

    if (includePRs) {
      return Promise.all(commits.map(commit => extractPRDetails(commit)));
    }

    return commits;
  } catch (error: any) {
    throw new Error(`Failed to extract commits from ${repoPath}: ${error.message}`);
  }
}

/**
 * Parse git log output into structured commit data
 */
export function parseGitLog(output: string, repoPath: string, branch: string): GitCommit[] {
  const lines = output.split('\n').filter(line => line.trim() !== '');

  return lines.map(line => {
    const [hash, message, author, date] = line.split('|||');
    
    return {
      repository: repoPath,
      hash: hash.trim(),
      message: message.trim(),
      author: author.trim(),
      date: date.trim(),
      branch
    };
  });
}

/**
 * Extract PR information from a commit if available
 */
export async function extractPRDetails(commit: GitCommit): Promise<GitCommit> {
  const prRef = extractPRReference(commit.message);
  if (!prRef) {
    return commit;
  }

  try {
    // Try to get PR details from local git
    const prCommand = `git -C "${commit.repository}" show -s --format=%B ${commit.hash}`;
    const prDetails = execSync(prCommand).toString();
    
    return {
      ...commit,
      pullRequest: {
        number: prRef.number,
        title: prRef.title || extractPRTitle(prDetails),
        body: prRef.body || prDetails
      }
    };
  } catch {
    // If we can't get PR details, just return the PR number
    return {
      ...commit,
      pullRequest: {
        number: prRef.number,
        title: '',
        body: ''
      }
    };
  }
}

/**
 * Extract PR reference from commit message
 * Handles formats like:
 * - Merge pull request #123 from branch
 * - (#123)
 * - [#123]
 */
function extractPRReference(message: string): PullRequestRef | null {
  const patterns = [
    /Merge pull request #(\d+)/i,
    /\(#(\d+)\)/,
    /\[#(\d+)\]/,
    /#(\d+)/
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        number: parseInt(match[1], 10)
      };
    }
  }

  return null;
}

/**
 * Extract PR title from PR description
 */
function extractPRTitle(prDetails: string): string {
  const lines = prDetails.split('\n');
  return lines[0].trim();
}

/**
 * Validate and convert time range to git-compatible date
 * Supports formats: 30d, 6m, 1y
 */
export function timeRangeToDate(timeRange: string): string | null {
  const match = timeRange.match(/^(\d+)([dmy])$/);
  if (!match) {
    return null;
  }

  const [, amount, unit] = match;
  const now = new Date();
  const value = parseInt(amount, 10);

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() - value);
      break;
    case 'm':
      now.setMonth(now.getMonth() - value);
      break;
    case 'y':
      now.setFullYear(now.getFullYear() - value);
      break;
  }

  return now.toISOString();
}
