import { execSync } from 'node:child_process';
import logger from '../utils/logger';

export interface WipInfo {
  hasChanges: boolean;
  modifiedFiles: string[];
  untrackedFiles: string[];
  diff: string;
  summary: string; // Human-readable summary of changes
}

/**
 * Extract work-in-progress information from a git repository
 */
export function extractWip(repositoryPath = '.'): WipInfo {
  try {
    // Get modified/staged files
    const statusOutput = execSync('git status --porcelain', {
      cwd: repositoryPath,
      encoding: 'utf-8',
    });

    const modifiedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    // Parse git status output
    // Format: XY filename
    // X = index status, Y = working tree status
    // ?? = untracked, M = modified, A = added, D = deleted, etc.
    for (const line of statusOutput.trim().split('\n')) {
      if (!line) continue;

      const status = line.substring(0, 2);
      const filename = line.substring(3);

      if (status === '??') {
        untrackedFiles.push(filename);
      } else {
        modifiedFiles.push(filename);
      }
    }

    // Get diff of changes
    let diff = '';
    try {
      // Get diff of tracked files
      diff = execSync('git diff HEAD', {
        cwd: repositoryPath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      });
    } catch (error) {
      logger.warn('Failed to get git diff:', error);
    }

    const hasChanges = modifiedFiles.length > 0 || untrackedFiles.length > 0;

    // Generate a simple summary
    const summary = generateSimpleSummary(modifiedFiles, untrackedFiles, diff);

    return {
      hasChanges,
      modifiedFiles,
      untrackedFiles,
      diff,
      summary,
    };
  } catch (error: any) {
    logger.error('Error extracting WIP:', error);
    throw new Error(`Failed to extract WIP: ${error.message}`);
  }
}

/**
 * Generate a simple text summary of changes
 */
function generateSimpleSummary(
  modifiedFiles: string[],
  untrackedFiles: string[],
  diff: string,
): string {
  const parts: string[] = [];

  if (modifiedFiles.length > 0) {
    parts.push(`Modified files (${modifiedFiles.length}):`);
    // Show up to 10 files
    const filesToShow = modifiedFiles.slice(0, 10);
    for (const file of filesToShow) {
      parts.push(`  - ${file}`);
    }
    if (modifiedFiles.length > 10) {
      parts.push(`  ... and ${modifiedFiles.length - 10} more`);
    }
    parts.push('');
  }

  if (untrackedFiles.length > 0) {
    parts.push(`Untracked files (${untrackedFiles.length}):`);
    // Show up to 10 files
    const filesToShow = untrackedFiles.slice(0, 10);
    for (const file of filesToShow) {
      parts.push(`  - ${file}`);
    }
    if (untrackedFiles.length > 10) {
      parts.push(`  ... and ${untrackedFiles.length - 10} more`);
    }
    parts.push('');
  }

  // Add some basic stats from the diff
  if (diff) {
    const lines = diff.split('\n');
    const additions = lines.filter((l) => l.startsWith('+')).length;
    const deletions = lines.filter((l) => l.startsWith('-')).length;

    parts.push(`Changes: +${additions} -${deletions} lines`);
  }

  return parts.join('\n');
}

/**
 * Check if the current directory is a git repository
 */
export function isGitRepository(path = '.'): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: path,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}
