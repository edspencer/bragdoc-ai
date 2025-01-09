import { execSync } from 'child_process';
import { GitCommit, RepositoryInfo } from './types';

/**
 * Get information about the current git repository
 */
export function getRepositoryInfo(path: string = '.'): RepositoryInfo {
  try {
    // Get remote URL
    const remoteUrl = execSync('git config --get remote.origin.url', { cwd: path })
      .toString()
      .trim();

    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: path })
      .toString()
      .trim();

    return {
      remoteUrl,
      currentBranch,
      path
    };
  } catch (error: any) {
    throw new Error(`Failed to get repository info: ${error.message}`);
  }
}

/**
 * Collects Git commit data for a given branch and maxCommits count.
 */
export function collectGitCommits(
  branch: string,
  maxCommits: number,
  repository: string
): GitCommit[] {
  try {
    // Get commit hash and full message (title + body).
    // Use %x00 as a commit separator and %x1f as a field separator
    const logCommand = `git log ${branch} --pretty=format:"%H%x1f%B%x1f%an%x1f%ai%x00" --max-count=${maxCommits}`;
    const output = execSync(logCommand).toString();

    // Split the output by null character to get individual commits
    const commits = output
      .split('\0') // Split commits by null character
      .filter(commit => commit.trim()) // Remove empty entries
      .map(commit => {
        const [hash, message, author, date] = commit
          .split('\x1f') // Split commit fields by unit separator
          .map(field => field.trim());

        if (!hash || !message || !author || !date) {
          throw new Error(`Invalid git log entry format: ${commit}`);
        }

        return {
          repository,
          hash,
          message,
          author,
          date,
          branch
        };
      });

    return commits;
  } catch (error: any) {
    throw new Error(`Failed to extract commits: ${error.message}`);
  }
}

/**
 * Get the name of the current repository from the remote URL or directory name
 */
export async function getCurrentRepoName(): Promise<string> {
  try {
    const repoInfo = getRepositoryInfo();
    
    // Try to extract name from remote URL first
    const remoteUrl = repoInfo.remoteUrl;
    if (remoteUrl) {
      // Handle SSH URLs like 'git@github.com:owner/repo.git'
      if (remoteUrl.includes('@')) {
        const match = remoteUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
        if (match) return match[2];
      }
      
      // Handle HTTPS URLs like 'https://github.com/owner/repo.git'
      const urlMatch = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/);
      if (urlMatch) return urlMatch[1];
    }
    
    // Fallback to directory name
    return repoInfo.path.split('/').pop() || 'unknown-repo';
  } catch (error: any) {
    throw new Error(`Failed to get repository name: ${error.message}`);
  }
}
