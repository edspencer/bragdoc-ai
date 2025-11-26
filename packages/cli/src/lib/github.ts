/**
 * GitHub CLI Helper Functions
 *
 * Provides utilities for working with GitHub repositories and the gh CLI.
 * Used by the init flow to detect GitHub repos and offer GitHub extraction.
 */

import { execSync } from 'node:child_process';

/**
 * Parse GitHub repository from remote URL
 *
 * Handles common GitHub URL formats:
 * - git@github.com:owner/repo.git
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo
 *
 * @param remoteUrl - Git remote URL to parse
 * @returns Repository in "owner/repo" format, or null if not a GitHub URL
 *
 * @example
 * parseGitHubRepo('git@github.com:owner/repo.git')
 * // Returns: 'owner/repo'
 *
 * parseGitHubRepo('https://github.com/owner/repo')
 * // Returns: 'owner/repo'
 *
 * parseGitHubRepo('https://gitlab.com/owner/repo')
 * // Returns: null
 */
export function parseGitHubRepo(remoteUrl: string): string | null {
  const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

/**
 * Check if gh CLI is available and authenticated
 *
 * Performs two checks:
 * 1. Is the gh CLI installed? (runs `gh --version`)
 * 2. Is the user authenticated? (runs `gh auth status`)
 *
 * @returns Object with availability and authentication status
 *
 * @example
 * const status = await isGitHubCliAvailable();
 * if (status.available && status.authenticated) {
 *   // Can use GitHub connector
 * } else if (status.available && !status.authenticated) {
 *   // Show tip to run `gh auth login`
 * }
 */
export async function isGitHubCliAvailable(): Promise<{
  available: boolean;
  authenticated: boolean;
}> {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    return { available: false, authenticated: false };
  }

  try {
    const authResult = execSync('gh auth status 2>&1', { encoding: 'utf-8' });
    const authenticated = !authResult.toLowerCase().includes('not logged');
    return { available: true, authenticated };
  } catch {
    return { available: true, authenticated: false };
  }
}
