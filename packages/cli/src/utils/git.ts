import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Check if a directory is a git repository
 */
export async function isGitRepository(path: string): Promise<boolean> {
  try {
    const gitDir = join(path, '.git');
    await access(gitDir);

    // Additional check: try git status
    await execAsync('git status', { cwd: path });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a path exists, is accessible, and is a git repository
 * Throws an error if validation fails
 */
export async function validateRepository(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(`Path does not exist or is not accessible: ${path}`);
  }

  if (!(await isGitRepository(path))) {
    throw new Error(`Path is not a git repository: ${path}`);
  }
}
