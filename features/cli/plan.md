# Implementation Plan: Git Commit Extraction

## Phase 1: Core Git Extraction Module

### 1. Git Extraction Types and Interfaces
Location: `cli/src/git/types.ts`

```typescript
interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  repository: string;
  branch: string;
  pullRequest?: {
    number: number;
    title: string;
    body: string;
  };
}

interface ExtractionOptions {
  branch?: string;
  since?: string;
  maxCommits?: number;
  includePRs?: boolean;
}
```

### 2. Git Operations Module
Location: `cli/src/git/operations.ts`

Core functions:
```typescript
// Get commits from a repository with options
async function getCommits(repoPath: string, options: ExtractionOptions): Promise<GitCommit[]>;

// Extract PR information from commit messages if available
async function extractPRDetails(commit: GitCommit): Promise<GitCommit>;

// Parse git log output into structured data
function parseGitLog(output: string, repoName: string): GitCommit[];

// Validate time range format (e.g., "30d", "6m", "1y")
function validateTimeRange(timeRange: string): boolean;

// Convert time range to git-compatible date
function timeRangeToDate(timeRange: string): string;
```

## Phase 2: Command Implementation

### 1. Extract Command
Location: `cli/src/commands/extract.ts`

1. Command Structure:
```typescript
program
  .command('extract')
  .description('Extract commits from repositories')
  .option('-b, --branch <branch>', 'Git branch to extract from', 'main')
  .option('-t, --time-range <range>', 'Time range to extract (e.g., 30d, 6m, 1y)', '30d')
  .option('-m, --max-commits <number>', 'Maximum commits to extract')
  .option('--include-prs', 'Include pull request details', false)
  .option('-r, --repository <path>', 'Specific repository to extract from')
  .action(extractCommand);
```

2. Implementation:
```typescript
async function extractCommand(options: ExtractOptions) {
  const config = await loadConfig();
  const repositories = options.repository 
    ? [{ path: options.repository }] 
    : config.repositories.filter(r => r.enabled);

  for (const repo of repositories) {
    const commits = await getCommits(repo.path, {
      branch: options.branch,
      since: options.timeRange,
      maxCommits: options.maxCommits || repo.maxCommits || config.settings.defaultMaxCommits,
      includePRs: options.includePrs
    });

    await sendCommitsBatch(commits, config.settings.maxCommitsPerBatch);
  }
}
```

### 2. API Integration
Location: `cli/src/api/commits.ts`

```typescript
// Send commits in batches to avoid overwhelming the API
async function sendCommitsBatch(
  commits: GitCommit[], 
  batchSize: number
): Promise<void>;

// Handle API responses and errors
function handleApiResponse(
  response: Response, 
  commits: GitCommit[]
): Promise<void>;
```

## Phase 3: Caching and Performance

### 1. Commit Cache
Location: `cli/src/cache/commits.ts`

```typescript
interface CommitCache {
  lastExtracted: string;
  commits: Map<string, GitCommit>;
}

// Cache management functions
async function saveToCache(commits: GitCommit[]): Promise<void>;
async function loadFromCache(): Promise<CommitCache>;
async function clearCache(): Promise<void>;
```

### 2. Performance Optimizations
- Implement parallel processing for multiple repositories
- Use streaming for large git logs
- Implement rate limiting for API requests
- Cache API responses

## Phase 4: Error Handling and Logging

### 1. Error Types
Location: `cli/src/errors.ts`

```typescript
class GitExtractionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
  }
}

class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}
```

### 2. Logging Module
Location: `cli/src/utils/logger.ts`

```typescript
interface LogOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: boolean;
  prefix?: string;
}

function createLogger(options: LogOptions): Logger;
```

## Implementation Order

1. Core Git Operations
   - Basic commit extraction
   - Time range parsing
   - Git log parsing

2. Command Structure
   - Extract command implementation
   - Options handling
   - Configuration integration

3. API Integration
   - Batch processing
   - Error handling
   - Rate limiting

4. Caching Layer
   - Cache implementation
   - Performance optimizations

5. Error Handling & Logging
   - Error types
   - Logging system
   - User feedback

6. Testing
   - Unit tests for git operations
   - Integration tests for API
   - Error case testing