# Task: Enhanced Git Commit Extraction with Configurable Detail Levels

## Background

Currently, the BragDoc CLI extract command only collects basic git commit data (hash, message, author, date, branch). This limits the LLM's ability to accurately extract achievements because it lacks context about:

- The actual code changes made
- The scope and scale of changes (files modified, lines added/removed)
- Technical implementation details

## Objective

Enhance the git extraction system to optionally include:
1. **File statistics** (--numstat) - files changed, lines added/removed
2. **Code diffs** (-p) - actual code changes

This should be configurable per-project with sensible global defaults, and include intelligent size limiting to prevent sending excessive data to the LLM.

## Specific Requirements

### 1. Configuration Types

Add new extraction configuration types in `packages/cli/src/config/types.ts`:

#### Extraction Detail Levels
```typescript
/**
 * Controls what data is extracted from git commits
 */
export type ExtractionDetailLevel = 'minimal' | 'standard' | 'detailed' | 'comprehensive';

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
  excludeDiffPatterns?: string[];     // File patterns to exclude from diffs (e.g., ['*.lock', 'package-lock.json'])
  prioritizeDiffPatterns?: string[];  // File patterns to prioritize in diffs (e.g., ['src/**/*.ts'])
}
```

#### Detail Level Presets

Define preset configurations for each detail level:

- **minimal**: Commit messages only (current behavior)
  - `includeStats: false`
  - `includeDiff: false`

- **standard**: Messages + file statistics
  - `includeStats: true`
  - `includeDiff: false`
  - Excludes lock files

- **detailed**: Messages + stats + limited diffs
  - `includeStats: true`
  - `includeDiff: true`
  - `maxDiffLinesPerCommit: 1000`
  - `maxDiffLinesPerFile: 200`
  - `maxFilesInDiff: 30`
  - Excludes lock files, dist/, build/
  - Prioritizes src/ and lib/ directories

- **comprehensive**: Messages + stats + extensive diffs
  - `includeStats: true`
  - `includeDiff: true`
  - `maxDiffLinesPerCommit: 2000`
  - `maxDiffLinesPerFile: 500`
  - `maxFilesInDiff: 50`
  - Excludes lock files, dist/, build/, node_modules/
  - Prioritizes src/, lib/, packages/ directories

#### Update Project Interface
```typescript
export interface Project {
  path: string;
  name?: string;
  enabled: boolean;
  maxCommits?: number;
  cronSchedule?: string;
  id?: string;
  remote?: string;
  standupId?: string;

  // NEW: Extraction configuration
  extraction?: ExtractionConfig;
}
```

#### Update Global Settings
```typescript
export interface BragdocConfig {
  // ... existing fields ...
  settings: {
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
    dataCacheTimeout?: number;
    apiBaseUrl?: string;

    // NEW: Default extraction config for all projects
    defaultExtraction?: ExtractionConfig;
  };
}
```

#### Update DEFAULT_CONFIG
Set default to 'standard' extraction level (messages + stats, no diffs).

### 2. Git Data Types

Extend git types in `packages/cli/src/git/types.ts`:

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

/**
 * Enhanced Git commit with optional stats and diffs
 */
export interface GitCommit {
  repository: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;

  // NEW: Optional enhanced data
  stats?: FileStats[];           // File change statistics (from --numstat)
  diff?: FileDiff[];             // Code diffs (from -p)
  diffTruncated?: boolean;       // Whether diff was truncated due to limits
}
```

### 3. Git Operations

Add enhanced collection functions in `packages/cli/src/git/operations.ts`:

#### New Functions Required

1. **`collectGitCommitsEnhanced()`**
   - Takes extraction config as parameter
   - Calls existing `collectGitCommits()` for base data
   - Conditionally enhances with stats and/or diffs based on config
   - Returns enhanced GitCommit array

2. **`enhanceCommitsWithStats()`**
   - Uses `git show --numstat --format="" <hash>` for each commit
   - Parses output into FileStats array
   - Adds to commit.stats

3. **`enhanceCommitsWithDiffs()`**
   - Uses `git show -p --format="" <hash>` for each commit
   - Applies intelligent size limiting
   - Parses into FileDiff array with truncation tracking
   - Adds to commit.diff and commit.diffTruncated

4. **`parseNumstat()`**
   - Parses `--numstat` output format: `additions\tdeletions\tpath`
   - Handles binary files (shown as `-` in numstat)
   - Returns FileStats array

5. **`parseDiff()`**
   - Splits diff output into per-file blocks
   - Applies prioritization based on patterns
   - Applies exclusion patterns
   - Limits lines per file and per commit
   - Tracks truncation status
   - Returns FileDiff array

6. **`splitDiffByFile()`**
   - Splits unified diff into separate file blocks
   - Extracts file path from `diff --git a/... b/...` headers
   - Returns array of { path, diff } objects

7. **`prioritizeDiffBlocks()`**
   - Sorts diff blocks by priority patterns (priority patterns first)
   - Filters out excluded patterns
   - Returns sorted/filtered array

8. **`resolveExtractionConfig()`**
   - Merges preset configuration with user overrides
   - Returns fully resolved config with all required fields

#### Size Limiting Strategy

When `includeDiff: true`:

1. **Per-file limits**: `maxDiffLinesPerFile` (default 100 lines)
   - Truncate individual file diffs that exceed limit
   - Add "... (N more lines)" indicator
   - Set `isTruncated: true`

2. **Per-commit limits**: `maxDiffLinesPerCommit` (default 500 lines)
   - Stop adding files once commit total is reached
   - Prioritize important files first (via prioritizeDiffPatterns)

3. **File count limits**: `maxFilesInDiff` (default 20 files)
   - Only include first N files (after prioritization)

4. **Pattern-based filtering**:
   - **Exclude patterns**: Skip files matching these patterns entirely
   - **Priority patterns**: Process these files first before others
   - Use glob-style matching (e.g., `src/**/*.ts`, `*.lock`)

### 4. Extract Command Updates

Modify `packages/cli/src/commands/extract.ts`:

#### New CLI Options
```typescript
.option('--detail-level <level>', 'Extraction detail level (minimal|standard|detailed|comprehensive)')
.option('--include-stats', 'Include file change statistics', false)
.option('--include-diff', 'Include code diffs', false)
```

#### Configuration Resolution Logic

Implement priority chain:
1. **CLI options** (highest priority)
2. **Project-specific config** (from ~/.bragdoc/config.yml)
3. **Global defaults** (from settings.defaultExtraction)

Add helper function:
```typescript
function getExtractionConfigForProject(
  projectConfig: Project,
  globalConfig: BragdocConfig,
  cliOptions: any
): ExtractionConfig
```

#### Use Enhanced Collection

```typescript
const extractionConfig = getExtractionConfigForProject(repoConfig, config, options);
const useEnhanced = extractionConfig.includeStats || extractionConfig.includeDiff;

const commits = useEnhanced
  ? collectGitCommitsEnhanced(branchToUse, maxCommits, repository, extractionConfig)
  : collectGitCommits(branchToUse, maxCommits, repository);
```

### 5. Prompt Component Updates

Update MDX components in `packages/cli/src/ai/prompts/elements.tsx`:

#### New Components

1. **`FileStats`** component
   - Renders file change statistics
   - Shows file path, additions, deletions
   - Format: `path/to/file.ts: +50 -10`

2. **`Diff`** component
   - Renders code diffs
   - Shows file path and diff content
   - Indicates truncation if applicable
   - Uses preformatted text for diff content

3. **Update `Commit`** component
   - Conditionally render FileStats if commit.stats exists
   - Conditionally render Diff if commit.diff exists
   - Maintain existing message/author/date rendering

#### Update Prompt Types

In `packages/cli/src/ai/prompts/types.ts`, update the `Commit` interface to match the enhanced `GitCommit`:

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

  // NEW: Enhanced data
  stats?: FileStats[];
  diff?: FileDiff[];
  diffTruncated?: boolean;
}
```

### 6. Update Extraction MDX Prompt

Modify `packages/cli/src/ai/prompts/extract-commit-achievements.mdx`:

Add instructions for using enhanced data:

```xml
<Instruction>
  When file statistics are provided:
  - Use them to understand the scale of changes
  - Consider files modified as indicators of affected systems
  - Large line changes may indicate significant refactoring or features
</Instruction>

<Instruction>
  When code diffs are provided:
  - Analyze actual code changes to understand technical implementation
  - Identify specific functions, classes, or modules affected
  - Use technical details in achievement descriptions
  - Note: diffs may be truncated for large changes
</Instruction>
```

## Example Configurations

### Minimal (default for new projects)
```yaml
projects:
  - path: /home/user/my-project
    name: My Project
    extraction:
      detailLevel: minimal
```

### Standard (recommended default)
```yaml
settings:
  defaultExtraction:
    detailLevel: standard
```

### Custom fine-grained control
```yaml
projects:
  - path: /home/user/backend-monorepo
    name: Backend API
    extraction:
      includeStats: true
      includeDiff: true
      maxDiffLinesPerCommit: 800
      maxFilesInDiff: 15
      excludeDiffPatterns:
        - "*.lock"
        - "dist/**"
        - "coverage/**"
      prioritizeDiffPatterns:
        - "src/**/*.ts"
        - "lib/**/*.ts"
```

### CLI override examples
```bash
# Use detailed level for this extraction only
bragdoc extract --detail-level detailed

# Include stats but not diffs
bragdoc extract --include-stats

# Include both stats and diffs
bragdoc extract --include-stats --include-diff
```

## Implementation Plan

1. **Update type definitions**
   - Add extraction types to `config/types.ts`
   - Add enhanced commit types to `git/types.ts`
   - Add prompt types to `ai/prompts/types.ts`

2. **Implement extraction config resolution**
   - Add preset definitions
   - Implement `resolveExtractionConfig()`
   - Add to DEFAULT_CONFIG

3. **Add enhanced git collection**
   - Implement `collectGitCommitsEnhanced()`
   - Implement `enhanceCommitsWithStats()`
   - Implement `enhanceCommitsWithDiffs()`
   - Implement all parsing and limiting functions

4. **Update extract command**
   - Add CLI options
   - Implement `getExtractionConfigForProject()`
   - Use enhanced collection conditionally

5. **Update prompt components**
   - Add FileStats component
   - Add Diff component
   - Update Commit component
   - Update MDX prompt instructions

6. **Testing**
   - Test each detail level preset
   - Test size limiting with large commits
   - Test pattern matching for priority/exclusion
   - Test CLI overrides
   - Test dry-run with enhanced data

7. **Documentation**
   - Update CLI documentation
   - Add examples to README
   - Document configuration options

## Success Criteria

1. Users can configure extraction detail level per-project
2. Global defaults work as expected
3. CLI options override configuration
4. Diff size limiting prevents excessive LLM context
5. Stats and diffs improve achievement extraction quality
6. Backward compatible (existing configs continue to work)
7. Default behavior is sensible (standard level with stats, no diffs)

## Technical Considerations

### Performance
- Git operations are synchronous (using execSync)
- Enhanced collection will be slower than basic collection
- Consider adding progress indicators for large extractions
- Stats collection is fast (one git command per commit)
- Diff collection is slower and generates more data

### LLM Context Management
- Diffs can be very large (hence the size limiting)
- Standard level (stats only) is a good default for most users
- Comprehensive level should only be used for small batches
- Consider batch size reduction when using detailed/comprehensive levels

### Backward Compatibility
- Existing configs without extraction settings use standard level
- Existing code using GitCommit interface continues to work (new fields are optional)
- No breaking changes to API

### Future Enhancements
- PR data integration (from GitHub/GitLab API)
- Semantic grouping of related commits
- Automatic detection of optimal detail level based on commit size
- Caching of stats/diffs to avoid repeated git operations
- Support for other VCS systems (SVN, Mercurial)
