# Implementation Plan: Enhanced Git Commit Extraction with Configurable Detail Levels

## Summary

This plan implements configurable extraction detail levels for the BragDoc CLI, enhancing the achievement extraction process by optionally including file statistics (--numstat) and code diffs (-p) from git commits. This will provide the LLM with richer context about actual code changes, improving the quality and accuracy of extracted achievements.

The implementation adds four preset detail levels (minimal, standard, detailed, comprehensive) with fine-grained configuration options, intelligent diff size limiting to prevent excessive LLM context, and a priority-based file filtering system.

## High-Level Overview

1. **Type Definitions and Configuration** - Add new types for extraction configuration, update existing interfaces, and define preset detail levels
2. **Git Operations Enhancement** - Implement enhanced commit collection functions with stats and diff extraction, including intelligent size limiting
3. **Extract Command Updates** - Add CLI options and configuration resolution logic to use enhanced collection
4. **Prompt Component Updates** - Create new components to render stats/diffs and update the extraction prompt
5. **Testing** - Comprehensive testing of all detail levels, size limits, and configuration resolution
6. **Documentation** - Update CLI documentation and examples

## Table of Contents

- [Phase 1: Type Definitions and Configuration](#phase-1-type-definitions-and-configuration)
  - [1.1 Add Extraction Configuration Types](#11-add-extraction-configuration-types)
  - [1.2 Add Preset Detail Level Definitions](#12-add-preset-detail-level-definitions)
  - [1.3 Update Git Types](#13-update-git-types)
  - [1.4 Update Prompt Types](#14-update-prompt-types)
- [Phase 2: Git Operations Enhancement](#phase-2-git-operations-enhancement)
  - [2.1 Add Diff Parsing Utilities](#21-add-diff-parsing-utilities)
  - [2.2 Add Stats Parsing Utility](#22-add-stats-parsing-utility)
  - [2.3 Add Enhanced Commit Collection Functions](#23-add-enhanced-commit-collection-functions)
- [Phase 3: Extract Command Updates](#phase-3-extract-command-updates)
  - [3.1 Add CLI Options](#31-add-cli-options)
  - [3.2 Add Configuration Resolution Logic](#32-add-configuration-resolution-logic)
  - [3.3 Use Enhanced Collection](#33-use-enhanced-collection)
  - [3.4 Update Dry Run Display](#34-update-dry-run-display)
- [Phase 4: Prompt Component Updates](#phase-4-prompt-component-updates)
  - [4.1 Add JSX Type Declarations](#41-add-jsx-type-declarations)
  - [4.2 Add New Prompt Components](#42-add-new-prompt-components)
  - [4.3 Update Commit Component](#43-update-commit-component)
  - [4.4 Update MDX Prompt Instructions](#44-update-mdx-prompt-instructions)
- [Phase 5: Testing](#phase-5-testing)
- [Phase 6: Documentation](#phase-6-documentation)
  - [6.1 Update CLI README](#61-update-cli-readme)
  - [6.2 Update Main README](#62-update-main-readme)
  - [6.3 Update CLAUDE.md](#63-update-claudemd)
  - [6.4 Consider docs/FEATURES.md](#64-consider-docsfeaturesmd)

## Implementation Phases

### Phase 1: Type Definitions and Configuration

#### 1.1 Add Extraction Configuration Types

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/src/config/types.ts`**

  Add the following type definitions at the top of the file, after the imports:

  ```typescript
  /**
   * Controls what data is extracted from git commits
   */
  export type ExtractionDetailLevel = 'minimal' | 'standard' | 'detailed' | 'comprehensive';

  /**
   * Configuration for git commit extraction detail levels
   */
  export interface ExtractionConfig {
    // Quick preset levels
    detailLevel?: ExtractionDetailLevel;

    // Fine-grained control (overrides detailLevel if set)
    includeStats?: boolean;      // Include file change statistics (--numstat)
    includeDiff?: boolean;        // Include code diffs (-p)

    // Diff limiting (when includeDiff is true)
    maxDiffLinesPerCommit?: number;     // Max lines of diff per commit (default: 500)
    maxDiffLinesPerFile?: number;       // Max lines of diff per file (default: 100)
    maxFilesInDiff?: number;            // Max files to include in diff (default: 20)

    // Smart diff options
    excludeDiffPatterns?: string[];     // File patterns to exclude from diffs
    prioritizeDiffPatterns?: string[];  // File patterns to prioritize in diffs
  }
  ```

  Add the `extraction?: ExtractionConfig;` field to the `Project` interface (after the `standupId` field).

  Update the `BragdocConfig` settings interface to include:
  ```typescript
  settings: {
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
    dataCacheTimeout?: number;
    apiBaseUrl?: string;

    // NEW: Default extraction config for all projects
    defaultExtraction?: ExtractionConfig;
  };
  ```

  Update the `DEFAULT_CONFIG` constant to include the default extraction configuration:
  ```typescript
  export const DEFAULT_CONFIG: BragdocConfig = {
    projects: [],
    standups: [],
    llm: {
      provider: 'openai',
      openai: {
        model: 'gpt-4o',
      },
    },
    settings: {
      maxCommitsPerBatch: 10,
      defaultMaxCommits: 300,
      cacheEnabled: true,
      dataCacheTimeout: 5,
      defaultExtraction: {
        detailLevel: 'standard',
      },
    },
  };
  ```

#### 1.2 Add Preset Detail Level Definitions

- [x] **Create `/Users/ed/Code/brag-ai/packages/cli/src/config/extraction-presets.ts`**

  This new file will contain preset configurations for each detail level:

  ```typescript
  import type { ExtractionConfig } from './types';

  /**
   * Preset configurations for extraction detail levels
   */
  export const EXTRACTION_PRESETS: Record<string, ExtractionConfig> = {
    minimal: {
      includeStats: false,
      includeDiff: false,
    },
    standard: {
      includeStats: true,
      includeDiff: false,
      excludeDiffPatterns: ['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
    },
    detailed: {
      includeStats: true,
      includeDiff: true,
      maxDiffLinesPerCommit: 1000,
      maxDiffLinesPerFile: 200,
      maxFilesInDiff: 30,
      excludeDiffPatterns: [
        '*.lock',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'dist/**',
        'build/**',
        '.next/**',
      ],
      prioritizeDiffPatterns: ['src/**', 'lib/**', 'packages/**'],
    },
    comprehensive: {
      includeStats: true,
      includeDiff: true,
      maxDiffLinesPerCommit: 2000,
      maxDiffLinesPerFile: 500,
      maxFilesInDiff: 50,
      excludeDiffPatterns: [
        '*.lock',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'dist/**',
        'build/**',
        '.next/**',
        'node_modules/**',
        'coverage/**',
      ],
      prioritizeDiffPatterns: ['src/**', 'lib/**', 'packages/**', 'apps/**'],
    },
  };

  /**
   * Resolve extraction configuration from preset and overrides
   * Priority: explicit overrides > preset > defaults
   */
  export function resolveExtractionConfig(
    config?: ExtractionConfig
  ): Required<Omit<ExtractionConfig, 'detailLevel'>> {
    if (!config) {
      config = { detailLevel: 'standard' };
    }

    // Start with preset if specified
    const preset = config.detailLevel
      ? EXTRACTION_PRESETS[config.detailLevel]
      : EXTRACTION_PRESETS.standard;

    // Merge with explicit overrides
    return {
      includeStats: config.includeStats ?? preset.includeStats ?? false,
      includeDiff: config.includeDiff ?? preset.includeDiff ?? false,
      maxDiffLinesPerCommit: config.maxDiffLinesPerCommit ?? preset.maxDiffLinesPerCommit ?? 500,
      maxDiffLinesPerFile: config.maxDiffLinesPerFile ?? preset.maxDiffLinesPerFile ?? 100,
      maxFilesInDiff: config.maxFilesInDiff ?? preset.maxFilesInDiff ?? 20,
      excludeDiffPatterns: config.excludeDiffPatterns ?? preset.excludeDiffPatterns ?? [],
      prioritizeDiffPatterns: config.prioritizeDiffPatterns ?? preset.prioritizeDiffPatterns ?? [],
    };
  }
  ```

#### 1.3 Update Git Types

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/src/git/types.ts`**

  Add the following type definitions at the end of the file:

  ```typescript
  /**
   * File change statistics from git --numstat
   */
  export interface FileStats {
    path: string;
    additions: number;
    deletions: number;
  }

  /**
   * File diff information
   */
  export interface FileDiff {
    path: string;
    diff: string;        // The actual diff content
    isTruncated: boolean; // Whether this diff was truncated due to size limits
  }
  ```

  Update the existing `GitCommit` interface to add optional enhanced data fields:

  ```typescript
  export interface GitCommit {
    repository: string;
    hash: string;
    message: string;
    author: string;
    date: string;
    branch: string;

    // Enhanced data (optional)
    stats?: FileStats[];           // File change statistics (from --numstat)
    diff?: FileDiff[];             // Code diffs (from -p)
    diffTruncated?: boolean;       // Whether diff was truncated due to limits
  }
  ```

#### 1.4 Update Prompt Types

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/src/ai/prompts/types.ts`**

  Import the new types from git/types.ts at the top:
  ```typescript
  import type { FileStats, FileDiff } from '../../git/types';
  ```

  Update the `Commit` interface to include the enhanced data fields:

  ```typescript
  export interface Commit {
    hash: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    date: string;
    prDetails?: {
      title: string;
      description: string;
      number: number;
    };

    // Enhanced data
    stats?: FileStats[];
    diff?: FileDiff[];
    diffTruncated?: boolean;
  }
  ```

### Phase 2: Git Operations Enhancement

#### 2.1 Add Diff Parsing Utilities

- [x] **Create `/Users/ed/Code/brag-ai/packages/cli/src/git/diff-parsing.ts`**

  This new file will contain utilities for parsing and limiting diffs.

  **Note on implementation approach**: The SPEC.md mentions a `parseDiff()` function, but for better modularity and testability, this functionality is implemented as three separate functions: `splitDiffByFile()`, `prioritizeDiffBlocks()`, and `limitDiffSize()`. These are then composed together in the `enhanceCommitsWithDiffs()` function (Phase 2.3).

  File content:

  ```typescript
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
    config: Required<Omit<ExtractionConfig, 'detailLevel'>>
  ): DiffBlock[] {
    // Filter out excluded patterns
    const filtered = blocks.filter(
      block => !matchesPattern(block.path, config.excludeDiffPatterns)
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
    config: Required<Omit<ExtractionConfig, 'detailLevel'>>
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
            diff: diffLines.slice(0, remainingLines).join('\n') +
                  `\n... (${lineCount - remainingLines} more lines)`,
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
          diff: diffLines.slice(0, config.maxDiffLinesPerFile).join('\n') +
                `\n... (${lineCount - config.maxDiffLinesPerFile} more lines)`,
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
  ```

#### 2.2 Add Stats Parsing Utility

- [x] **Add to `/Users/ed/Code/brag-ai/packages/cli/src/git/operations.ts`**

  Add this function after the `getCurrentGitUser()` function:

  ```typescript
  import type { FileStats } from './types';

  /**
   * Parse git --numstat output into FileStats array
   * Format: "additions\tdeletions\tpath"
   * Binary files show as "-\t-\tpath"
   */
  function parseNumstat(numstatOutput: string): FileStats[] {
    const stats: FileStats[] = [];
    const lines = numstatOutput.trim().split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;

      const [addStr, delStr, path] = parts;

      // Handle binary files (shown as "-")
      const additions = addStr === '-' ? 0 : parseInt(addStr, 10);
      const deletions = delStr === '-' ? 0 : parseInt(delStr, 10);

      stats.push({ path, additions, deletions });
    }

    return stats;
  }
  ```

#### 2.3 Add Enhanced Commit Collection Functions

- [x] **Add to `/Users/ed/Code/brag-ai/packages/cli/src/git/operations.ts`**

  Add these imports at the top:
  ```typescript
  import type { ExtractionConfig } from '../config/types';
  import { resolveExtractionConfig } from '../config/extraction-presets';
  import { splitDiffByFile, prioritizeDiffBlocks, limitDiffSize } from './diff-parsing';
  ```

  Add these functions after the `collectGitCommits()` function:

  ```typescript
  /**
   * Enhance commits with file statistics from --numstat
   */
  function enhanceCommitsWithStats(commits: GitCommit[]): GitCommit[] {
    return commits.map(commit => {
      try {
        const numstatOutput = execSync(
          `git show --numstat --format="" ${commit.hash}`,
          { encoding: 'utf8' }
        );

        const stats = parseNumstat(numstatOutput);

        return { ...commit, stats };
      } catch (error: any) {
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
    config: Required<Omit<ExtractionConfig, 'detailLevel'>>
  ): GitCommit[] {
    return commits.map(commit => {
      try {
        const diffOutput = execSync(
          `git show -p --format="" ${commit.hash}`,
          { encoding: 'utf8' }
        );

        // Parse and process diff
        const blocks = splitDiffByFile(diffOutput);
        const prioritized = prioritizeDiffBlocks(blocks, config);
        const { diffs, truncated } = limitDiffSize(prioritized, config);

        return {
          ...commit,
          diff: diffs,
          diffTruncated: truncated,
        };
      } catch (error: any) {
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
  ```

### Phase 3: Extract Command Updates

#### 3.1 Add CLI Options

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/src/commands/extract.ts`**

  Add these imports at the top of the file:

  ```typescript
  import { Option } from 'commander';
  ```

  Add new options to the command definition (after the existing options, before `.action()`):

  ```typescript
  .addOption(
    new Option(
      '--detail-level <level>',
      'Extraction detail level'
    ).choices(['minimal', 'standard', 'detailed', 'comprehensive'])
  )
  .option('--include-stats', 'Include file change statistics', false)
  .option('--include-diff', 'Include code diffs', false)
  ```

  **Note**: Using `addOption()` with `.choices()` provides automatic validation of the detail level value. Commander will reject invalid values and show the available choices to the user.

#### 3.2 Add Configuration Resolution Logic

- [x] **Add to `/Users/ed/Code/brag-ai/packages/cli/src/commands/extract.ts`**

  Add these imports at the top:
  ```typescript
  import type { ExtractionConfig } from '../config/types';
  import { resolveExtractionConfig } from '../config/extraction-presets';
  import { collectGitCommitsEnhanced } from '../git/operations';
  ```

  Add this helper function before the `.action()` callback:

  ```typescript
  /**
   * Resolve extraction configuration from CLI options, project config, and global defaults
   * Priority: CLI options > Project config > Global defaults
   */
  function getExtractionConfigForProject(
    projectConfig: any,
    globalConfig: any,
    cliOptions: any
  ): ExtractionConfig {
    const config: ExtractionConfig = {};

    // Start with global defaults
    if (globalConfig.settings?.defaultExtraction) {
      Object.assign(config, globalConfig.settings.defaultExtraction);
    }

    // Override with project-specific config
    if (projectConfig?.extraction) {
      Object.assign(config, projectConfig.extraction);
    }

    // Override with CLI options (highest priority)
    if (cliOptions.detailLevel) {
      config.detailLevel = cliOptions.detailLevel;
    }
    if (cliOptions.includeStats !== undefined) {
      config.includeStats = cliOptions.includeStats;
    }
    if (cliOptions.includeDiff !== undefined) {
      config.includeDiff = cliOptions.includeDiff;
    }

    return config;
  }
  ```

#### 3.3 Use Enhanced Collection

- [x] **Update the `.action()` callback in `/Users/ed/Code/brag-ai/packages/cli/src/commands/extract.ts`**

  Extract the new CLI options from the options parameter (add to the destructuring at line 96):
  ```typescript
  const {
    branch,
    maxCommits,
    repo,
    apiUrl: overrideApiUrl,
    dryRun,
    batchSize,
    noCache,
    detailLevel,
    includeStats,
    includeDiff,
  } = options;
  ```

  Replace the commit collection section (around lines 150-157) with:

  ```typescript
  // Resolve extraction configuration
  const extractionConfig = getExtractionConfigForProject(
    repoConfig,
    config,
    { detailLevel, includeStats, includeDiff }
  );

  const resolved = resolveExtractionConfig(extractionConfig);
  const useEnhanced = resolved.includeStats || resolved.includeDiff;

  // Log extraction mode
  if (useEnhanced) {
    logger.info(
      `Using enhanced extraction: stats=${resolved.includeStats}, diff=${resolved.includeDiff}`
    );
    if (resolved.includeDiff) {
      logger.debug(
        `Diff limits: ${resolved.maxDiffLinesPerCommit} lines/commit, ` +
        `${resolved.maxDiffLinesPerFile} lines/file, ${resolved.maxFilesInDiff} files`
      );
    }
  }

  // Collect the Git commits
  logger.info(
    `Collecting commits from ${repository} (branch: ${branchToUse})...`
  );
  const commits = useEnhanced
    ? collectGitCommitsEnhanced(branchToUse, Number.parseInt(maxCommits, 10), repository, extractionConfig)
    : collectGitCommits(branchToUse, Number.parseInt(maxCommits, 10), repository);
  ```

#### 3.4 Update Dry Run Display

- [x] **Update the `formatCommit()` function in `/Users/ed/Code/brag-ai/packages/cli/src/commands/extract.ts`**

  First, add the import for `GitCommit` type at the top of the file:

  ```typescript
  import type { GitCommit } from '../git/types';
  ```

  Then replace the existing `formatCommit()` function (around lines 24-40) with:

  ```typescript
  /**
   * Format a commit for display in dry-run mode
   */
  function formatCommit(commit: GitCommit): string {
    const hashShort = commit.hash.slice(0, 7);
    const messageFirstLine = commit.message.split('\n')[0];
    const date = new Date(commit.date).toLocaleDateString();

    const parts = [
      `${hashShort} - ${date} - ${commit.author}`,
      `  ${messageFirstLine}`,
    ];

    // Add message body if present
    const messageBody = commit.message
      .split('\n')
      .slice(1)
      .map((line) => `  ${line}`)
      .join('\n');
    if (messageBody.trim()) {
      parts.push(messageBody);
    }

    // Add stats if present
    if (commit.stats && commit.stats.length > 0) {
      parts.push('');
      parts.push('  File Statistics:');
      commit.stats.forEach(stat => {
        parts.push(`    ${stat.path}: +${stat.additions} -${stat.deletions}`);
      });
    }

    // Add diff summary if present
    if (commit.diff && commit.diff.length > 0) {
      parts.push('');
      parts.push('  Code Changes:');
      commit.diff.forEach(fileDiff => {
        const lineCount = fileDiff.diff.split('\n').length;
        const truncatedNote = fileDiff.isTruncated ? ' (truncated)' : '';
        parts.push(`    ${fileDiff.path}: ${lineCount} lines${truncatedNote}`);
      });
      if (commit.diffTruncated) {
        parts.push('    (some files omitted due to size limits)');
      }
    }

    return parts.filter(Boolean).join('\n');
  }
  ```

### Phase 4: Prompt Component Updates

#### 4.1 Add JSX Type Declarations

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/src/ai/prompts/elements.tsx`**

  Add new intrinsic elements to the global JSX namespace declaration (add after the existing `date` element around line 95):

  ```typescript
  // File stats elements
  'file-stats': React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  'file-stat': React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  path: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  additions: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  deletions: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;

  // Diff elements
  'file-diff': React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  'diff-content': React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  note: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >;
  ```

#### 4.2 Add New Prompt Components

- [x] **Add to `/Users/ed/Code/brag-ai/packages/cli/src/ai/prompts/elements.tsx`**

  Add these imports at the top:
  ```typescript
  import type { FileStats as FileStatsType, FileDiff as FileDiffType } from '../../git/types';
  ```

  Add these new component functions at the end of the file:

  ```typescript
  export function FileStats({ stats }: { stats?: FileStatsType[] }) {
    if (!stats || stats.length === 0) {
      return null;
    }

    // @ts-ignore - Custom JSX elements for AI prompts
    return (
      <file-stats>
        {stats.map((stat, index) => (
          <file-stat key={index}>
            <path>{stat.path}</path>
            <additions>{stat.additions}</additions>
            <deletions>{stat.deletions}</deletions>
          </file-stat>
        ))}
      </file-stats>
    );
  }

  export function Diff({ diffs, truncated }: { diffs?: FileDiffType[]; truncated?: boolean }) {
    if (!diffs || diffs.length === 0) {
      return null;
    }

    // @ts-ignore - Custom JSX elements for AI prompts
    return (
      <>
        {diffs.map((fileDiff, index) => (
          <file-diff key={index}>
            <path>{fileDiff.path}</path>
            <diff-content>{fileDiff.diff}</diff-content>
            {fileDiff.isTruncated && <note>This diff was truncated due to size limits</note>}
          </file-diff>
        ))}
        {truncated && <note>Some files were omitted due to size limits</note>}
      </>
    );
  }
  ```

#### 4.3 Update Commit Component

- [x] **Update the `Commit` component in `/Users/ed/Code/brag-ai/packages/cli/src/ai/prompts/elements.tsx`**

  Replace the existing `Commit` function (around line 171) with:

  ```typescript
  export function Commit({ commit }: { commit: RepositoryCommit }) {
    // @ts-ignore - Custom JSX elements for AI prompts
    return (
      <commit>
        <message>{commit?.message}</message>
        <hash>{commit?.hash}</hash>
        <author>
          {commit?.author?.name} - {commit?.author?.email}
        </author>
        <date>{commit?.date}</date>
        {commit?.stats && <FileStats stats={commit.stats} />}
        {commit?.diff && <Diff diffs={commit.diff} truncated={commit.diffTruncated} />}
      </commit>
    );
  }
  ```

#### 4.4 Update MDX Prompt Instructions

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/src/ai/prompts/extract-commit-achievements.mdx`**

  Add new instructions for using enhanced data. Insert these after the existing `<Instruction>` elements (around line 57, before the closing `</Instructions>` tag):

  ```xml
  <Instruction>
    When file statistics are provided within file-stats elements:
    - Use them to understand the scale and scope of changes
    - Consider the number of files modified as indicators of affected systems
    - Large line changes (additions + deletions) may indicate significant refactoring or new features
    - Pay attention to which files were modified together, as this may indicate related functionality
  </Instruction>

  <Instruction>
    When code diffs are provided within file-diff elements:
    - Analyze the actual code changes to understand technical implementation details
    - Identify specific functions, classes, modules, or APIs that were added or modified
    - Use technical details from the diffs to create more specific achievement descriptions
    - Consider the complexity and sophistication of the code changes when assessing impact
    - Note: diffs may be truncated for large changes - focus on the visible changes
    - If a diff is marked as truncated, acknowledge that the full scope may be larger
  </Instruction>

  <Instruction>
    When both stats and diffs are available:
    - Use stats to understand overall scope (how many files, how many lines)
    - Use diffs to understand specific technical changes
    - Combine both to create comprehensive achievement descriptions
  </Instruction>
  ```

### Phase 5: Testing

See the separate `TEST_PLAN.md` file for comprehensive testing requirements. At a high level, testing should cover:

- All four detail level presets (minimal, standard, detailed, comprehensive)
- Configuration resolution priority (CLI > project > global)
- Diff size limiting with various commit sizes
- Pattern matching for exclusion and prioritization
- Dry-run display with enhanced data
- Integration with the full extraction pipeline

#### 5.1 Integrate Test Plan

- [ ] **Run add-to-test-plan SlashCommand**

  Execute the `/add-to-test-plan` command to integrate the test plan into the master test plan:

  ```bash
  /add-to-test-plan tasks/commit-extraction/TEST_PLAN.md
  ```

  This will absorb the UI tests from this feature's test plan into the project's master test plan.

### Phase 6: Documentation

#### 6.1 Update CLI README

- [x] **Update `/Users/ed/Code/brag-ai/packages/cli/README.md`**

  Add a new section titled "## Extraction Detail Levels" after the existing command documentation. Include:

  - Explanation of the four detail levels (minimal, standard, detailed, comprehensive)
  - When to use each level
  - How to configure via CLI options vs config file
  - Examples of each configuration approach
  - Performance and LLM context considerations

  Example content to add:

  ```markdown
  ## Extraction Detail Levels

  BragDoc CLI supports configurable extraction detail levels to control how much data is collected from git commits. More detailed extraction provides the LLM with richer context for better achievement extraction, but uses more LLM tokens and takes longer to process.

  ### Detail Levels

  - **minimal**: Commit messages only (fastest, least context)
  - **standard**: Messages + file statistics (recommended default)
  - **detailed**: Messages + stats + limited code diffs
  - **comprehensive**: Messages + stats + extensive code diffs (slowest, most context)

  ### CLI Options

  ```bash
  # Use a preset detail level
  bragdoc extract --detail-level detailed

  # Fine-grained control
  bragdoc extract --include-stats           # Add file statistics only
  bragdoc extract --include-stats --include-diff  # Add both stats and diffs
  ```

  ### Configuration File

  Set defaults in `~/.bragdoc/config.yml`:

  ```yaml
  # Global default for all projects
  settings:
    defaultExtraction:
      detailLevel: standard

  # Project-specific configuration
  projects:
    - path: /home/user/my-project
      extraction:
        detailLevel: detailed
        # Or fine-grained control:
        includeStats: true
        includeDiff: true
        maxDiffLinesPerCommit: 800
        excludeDiffPatterns:
          - "*.lock"
          - "dist/**"
  ```

  ### Performance Considerations

  - **minimal**: Fastest, best for large commit batches
  - **standard**: Good balance of speed and context (recommended)
  - **detailed**: Slower, use for smaller batches or important projects
  - **comprehensive**: Slowest, only for critical extractions or small batches

  Diff extraction adds significant LLM context. Consider reducing `--batch-size` when using `detailed` or `comprehensive` levels.
  ```

#### 6.2 Update Main README

- [x] **Update `/Users/ed/Code/brag-ai/README.md`**

  Add a brief mention of configurable extraction detail levels in the CLI features section. Look for the section describing the CLI tool and add:

  ```markdown
  - **Configurable extraction detail levels**: Choose between minimal (messages only), standard (messages + stats), detailed (limited diffs), or comprehensive (extensive diffs) to balance speed vs context richness
  ```

#### 6.3 Update CLAUDE.md

- [x] **Update `/Users/ed/Code/brag-ai/CLAUDE.md`**

  Update the CLI Tool section to document the new extraction configuration. Find the "### Configuration" subsection (around line 600) and add:

  ```markdown
  #### Extraction Configuration

  Projects and global settings can specify extraction detail levels:

  ```yaml
  settings:
    defaultExtraction:
      detailLevel: 'standard'  # minimal | standard | detailed | comprehensive

  projects:
    - path: /path/to/repo
      extraction:
        includeStats: true
        includeDiff: true
        maxDiffLinesPerCommit: 1000
        excludeDiffPatterns: ['*.lock', 'dist/**']
        prioritizeDiffPatterns: ['src/**']
  ```

  Detail levels:
  - **minimal**: Commit messages only
  - **standard**: Messages + file statistics (default)
  - **detailed**: Messages + stats + limited diffs
  - **comprehensive**: Messages + stats + extensive diffs
  ```

  Also update the "### Git Operations" section (around line 650) to mention the new `collectGitCommitsEnhanced()` function:

  ```markdown
  #### Enhanced Collection

  ```typescript
  import { collectGitCommitsEnhanced } from '../git/operations';

  const commits = collectGitCommitsEnhanced(
    branch,
    maxCommits,
    repository,
    extractionConfig  // Optional ExtractionConfig
  );
  ```

  Supports optional file statistics and code diffs with intelligent size limiting.
  ```

#### 6.4 Consider docs/FEATURES.md

- [x] **Evaluate whether `/Users/ed/Code/brag-ai/docs/FEATURES.md` needs updating**

  Review the docs/FEATURES.md file to determine if it should document this CLI enhancement. Since this is a CLI-only feature and FEATURES.md typically focuses on web application features, it likely does not need updating. However, check the file to confirm its scope and make a conscious decision.

  If FEATURES.md does include CLI features, add a brief entry describing configurable extraction detail levels.

## Instructions for Implementation

1. **Mark your progress**: As you complete each task, mark it with an `[x]` in the checkbox. Update the PLAN.md file in the repository so progress is tracked.

2. **Follow the phase order**: Complete phases in order, as later phases depend on earlier ones. However, within a phase, tasks can generally be completed in any order unless specifically noted.

3. **Test incrementally**: After completing each phase, run the CLI to ensure no syntax errors or obvious bugs were introduced. The full test suite will be run in Phase 5.

4. **Preserve existing functionality**: The new fields in `GitCommit` are all optional, so existing code using this interface will continue to work without modification.

5. **Use existing patterns**: Follow the established patterns in the codebase:
   - Named exports for functions and components
   - TypeScript strict mode with explicit types
   - Error handling with try-catch around git commands
   - Logger for user-facing messages (info/warn/error) and debug for details

6. **Configuration priority**: Remember the priority chain: CLI options > Project config > Global defaults. The `resolveExtractionConfig()` function handles merging presets with overrides.

7. **Git command patterns**: All git commands use `execSync` with string output. The repository path is set via the `cwd` option where needed (though most commands in operations.ts run in the current directory).

8. **Size limiting strategy**: The diff limiting is designed to prevent excessive LLM context. Test with large commits to ensure limits work correctly.

9. **MDX prompt components**: The custom JSX elements (like `<file-stats>`) are used by the LLM prompt system. They get serialized to XML-like tags in the actual prompt.

10. **Backward compatibility**: Existing configs without extraction settings will use the default 'standard' level. No migration is required.

## Notes

- The implementation adds approximately 500-600 lines of new code across ~8 files
- No database changes are required
- No API changes are required (this is CLI-only)
- The feature is fully backward compatible
- Default behavior is 'standard' level (messages + stats, no diffs)
