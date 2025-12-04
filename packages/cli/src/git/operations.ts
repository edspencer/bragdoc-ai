import { execSync } from 'node:child_process';
import type { GitCommit, RepositoryInfo, FileStats } from './types';
import type { ExtractionConfig } from '../config/types';
import { resolveExtractionConfig } from '../config/extraction-presets';
import {
  splitDiffByFile,
  prioritizeDiffBlocks,
  limitDiffSize,
} from './diff-parsing';

/**
 * Get information about the current git repository
 */
export function getRepositoryInfo(path = '.'): RepositoryInfo {
  try {
    // Get remote URL
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: path,
    })
      .toString()
      .trim();

    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: path,
    })
      .toString()
      .trim();

    return {
      remoteUrl,
      currentBranch,
      path,
    };
  } catch (error: any) {
    throw new Error(`Failed to get repository info: ${error.message}`);
  }
}

/**
 * Get the current git user's name
 */
export function getCurrentGitUser(repositoryPath?: string): string {
  try {
    const userName = execSync('git config user.name', {
      cwd: repositoryPath || process.cwd(),
    })
      .toString()
      .trim();
    return userName;
  } catch (error: any) {
    throw new Error(`Failed to get git user name: ${error.message}`);
  }
}

/**
 * Parse git --numstat output into FileStats array
 * Format: "additions\tdeletions\tpath"
 * Binary files show as "-\t-\tpath"
 */
export function parseNumstat(numstatOutput: string): FileStats[] {
  const stats: FileStats[] = [];
  const lines = numstatOutput
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const [addStr, delStr, path] = parts;

    // Handle binary files (shown as "-")
    const additions = addStr === '-' ? 0 : Number.parseInt(addStr, 10);
    const deletions = delStr === '-' ? 0 : Number.parseInt(delStr, 10);

    stats.push({ path, additions, deletions });
  }

  return stats;
}

/**
 * Collects Git commit data for a given branch and maxCommits count.
 * Only collects commits authored by the current git user.
 */
export function collectGitCommits(
  branch: string,
  maxCommits: number,
  repository: string,
): GitCommit[] {
  try {
    // Get the current git user to filter commits
    const currentUser = getCurrentGitUser(repository);

    // Get commit hash and full message (title + body).
    // Use %x00 as a commit separator and %x1f as a field separator
    // Filter by current user with --author flag
    const logCommand = `git log ${branch} --reverse --author="${currentUser}" --pretty=format:"%H%x1f%B%x1f%an%x1f%ai%x00" --max-count=${maxCommits}`;
    const output = execSync(logCommand, { cwd: repository }).toString();

    // Split the output by null character to get individual commits
    const commits = output
      .split('\0') // Split commits by null character
      .filter((commit) => commit.trim()) // Remove empty entries
      .map((commit) => {
        const [hash, message, author, date] = commit
          .split('\x1f') // Split commit fields by unit separator
          .map((field) => field.trim());

        if (!hash || !message || !author || !date) {
          throw new Error(`Invalid git log entry format: ${commit}`);
        }

        return {
          repository,
          hash,
          message,
          author,
          date,
          branch,
        };
      });

    return commits;
  } catch (error: any) {
    throw new Error(`Failed to extract commits: ${error.message}`);
  }
}

/**
 * Enhance commits with file statistics from --numstat
 */
function enhanceCommitsWithStats(commits: GitCommit[]): GitCommit[] {
  return commits.map((commit) => {
    try {
      const numstatOutput = execSync(
        `git show --numstat --format="" ${commit.hash}`,
        { encoding: 'utf8', cwd: commit.repository },
      );

      const stats = parseNumstat(numstatOutput);

      return { ...commit, stats };
    } catch (_error: any) {
      // If we can't get stats for a commit, just skip it
      return commit;
    }
  });
}

/**
 * Enhance commits with code diffs
 */
function enhanceCommitsWithDiffs(
  commits: GitCommit[],
  config: Required<Omit<ExtractionConfig, 'detailLevel'>>,
): GitCommit[] {
  return commits.map((commit) => {
    try {
      const diffOutput = execSync(`git show -p --format="" ${commit.hash}`, {
        encoding: 'utf8',
        cwd: commit.repository,
      });

      // Parse and process diff
      const blocks = splitDiffByFile(diffOutput);
      const prioritized = prioritizeDiffBlocks(blocks, config);
      const { diffs, truncated } = limitDiffSize(prioritized, config);

      return {
        ...commit,
        diff: diffs,
        diffTruncated: truncated,
      };
    } catch (_error: any) {
      // If we can't get diff for a commit, just skip it
      return commit;
    }
  });
}

/**
 * Collect Git commits with optional enhanced data (stats and/or diffs)
 */
export function collectGitCommitsEnhanced(
  branch: string,
  maxCommits: number,
  repository: string,
  extractionConfig?: ExtractionConfig,
): GitCommit[] {
  // Get base commits using existing function
  let commits = collectGitCommits(branch, maxCommits, repository);

  // Resolve configuration
  const config = resolveExtractionConfig(extractionConfig);

  // Enhance with stats if requested
  if (config.includeStats) {
    commits = enhanceCommitsWithStats(commits);
  }

  // Enhance with diffs if requested
  if (config.includeDiff) {
    commits = enhanceCommitsWithDiffs(commits, config);
  }

  return commits;
}

/**
 * Extract repository name from remote URL
 */
export function getRepositoryName(remoteUrl: string): string {
  try {
    // Handle SSH URLs (git@github.com:user/repo.git)
    if (remoteUrl.startsWith('git@')) {
      const match = remoteUrl.match(/git@[^:]+:([^/]+)\/([^.]+)(\.git)?$/);
      if (match) {
        return match[2];
      }
    }

    // Handle HTTPS URLs (https://github.com/user/repo.git)
    if (remoteUrl.startsWith('http')) {
      const match = remoteUrl.match(
        /https?:\/\/[^/]+\/([^/]+)\/([^.]+)(\.git)?$/,
      );
      if (match) {
        return match[2];
      }
    }

    // If we can't parse the URL, use it as is (sanitized)
    return remoteUrl.replace(/[^a-zA-Z0-9-]/g, '_');
  } catch (_error) {
    // If anything goes wrong, return a sanitized version of the URL
    return remoteUrl.replace(/[^a-zA-Z0-9-]/g, '_');
  }
}

/**
 * Get the name of the current repository from the remote URL or directory name
 */
export async function getCurrentRepoName(): Promise<string> {
  try {
    const repoInfo = getRepositoryInfo();
    return getRepositoryName(repoInfo.remoteUrl);
  } catch (_error) {
    // If we can't get the repository info, use the current directory name
    return process.cwd().split('/').pop() || '';
  }
}
