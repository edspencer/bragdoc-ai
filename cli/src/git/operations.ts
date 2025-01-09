import { execSync } from 'child_process';
import { GitCommit } from './types';

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
