import type { FileDiff } from './types';
import type { ExtractionConfig } from '../config/types';

interface DiffBlock {
  path: string;
  diff: string;
}

/**
 * Split unified diff output into per-file blocks
 * Looks for "diff --git a/... b/..." headers
 */
export function splitDiffByFile(diffOutput: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  const lines = diffOutput.split('\n');

  let currentPath: string | null = null;
  let currentDiff: string[] = [];

  for (const line of lines) {
    // Check for new file header
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (match) {
      // Save previous block if exists
      if (currentPath && currentDiff.length > 0) {
        blocks.push({
          path: currentPath,
          diff: currentDiff.join('\n'),
        });
      }

      // Start new block
      currentPath = match[2]; // Use the "b/" path
      currentDiff = [line];
    } else if (currentPath) {
      currentDiff.push(line);
    }
  }

  // Save last block
  if (currentPath && currentDiff.length > 0) {
    blocks.push({
      path: currentPath,
      diff: currentDiff.join('\n'),
    });
  }

  return blocks;
}

/**
 * Check if a file path matches any of the given glob-style patterns
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching: ** for any subdirs, * for any chars
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(path)) {
      return true;
    }
  }
  return false;
}

/**
 * Prioritize and filter diff blocks based on patterns
 */
export function prioritizeDiffBlocks(
  blocks: DiffBlock[],
  config: Required<Omit<ExtractionConfig, 'detailLevel'>>,
): DiffBlock[] {
  // Filter out excluded patterns
  const filtered = blocks.filter(
    (block) => !matchesPattern(block.path, config.excludeDiffPatterns),
  );

  // Separate into priority and non-priority
  const priority: DiffBlock[] = [];
  const normal: DiffBlock[] = [];

  for (const block of filtered) {
    if (matchesPattern(block.path, config.prioritizeDiffPatterns)) {
      priority.push(block);
    } else {
      normal.push(block);
    }
  }

  // Return priority blocks first
  return [...priority, ...normal];
}

/**
 * Apply size limits to diff blocks
 */
export function limitDiffSize(
  blocks: DiffBlock[],
  config: Required<Omit<ExtractionConfig, 'detailLevel'>>,
): { diffs: FileDiff[]; truncated: boolean } {
  const result: FileDiff[] = [];
  let totalLines = 0;
  let truncated = false;

  for (const block of blocks) {
    // Stop if we've reached the file limit
    if (result.length >= config.maxFilesInDiff) {
      truncated = true;
      break;
    }

    const diffLines = block.diff.split('\n');
    const lineCount = diffLines.length;

    // Check if adding this file would exceed commit limit
    if (totalLines + lineCount > config.maxDiffLinesPerCommit) {
      // Calculate how many lines we can include
      const remainingLines = config.maxDiffLinesPerCommit - totalLines;
      if (remainingLines > 0) {
        result.push({
          path: block.path,
          diff: `${diffLines.slice(0, remainingLines).join('\n')}\n... (${lineCount - remainingLines} more lines)`,
          isTruncated: true,
        });
      }
      truncated = true;
      break;
    }

    // Check if this file exceeds per-file limit
    if (lineCount > config.maxDiffLinesPerFile) {
      result.push({
        path: block.path,
        diff: `${diffLines.slice(0, config.maxDiffLinesPerFile).join('\n')}\n... (${lineCount - config.maxDiffLinesPerFile} more lines)`,
        isTruncated: true,
      });
      truncated = true;
      totalLines += config.maxDiffLinesPerFile;
    } else {
      result.push({
        path: block.path,
        diff: block.diff,
        isTruncated: false,
      });
      totalLines += lineCount;
    }
  }

  return { diffs: result, truncated };
}
