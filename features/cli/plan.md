# CLI Achievement Extraction API Implementation Plan

## Overview

Implement API endpoint to receive and process git commits from the CLI tool, extracting achievements and storing them in the database. The CLI will handle batching of commits, while the API enforces a strict limit on commits per request.

## Implementation Steps

### 1. API Endpoint Creation

- Create `/api/cli/commits` endpoint in Next.js app
- Implement POST method to receive repository commit history
- Add CLI token validation middleware
- Add request body validation using Zod
- Enforce strict limit of 100 commits per request

### 2. Request/Response Types

```typescript
interface RepositoryCommitHistory {
  repository: {
    name: string;
    path: string;
  };
  commits: Array<{
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
  }>;
}

interface ProcessingResponse {
  processedCount: number;
  achievements: Array<{
    id: string;
    description: string;
    date: string;
    source: {
      type: 'commit' | 'pr';
      hash?: string;
      prNumber?: number;
    };
  }>;
  errors?: Array<{
    commit: string;
    error: string;
  }>;
}
```

### 3. Database Updates

- Add source tracking for achievements
  - Add `source_type` enum ('commit', 'pr', 'chat')
  - Add `source_data` JSONB field for metadata
- Add commit hash tracking table
  - Store processed commit hashes
  - Link to resulting achievements

### 4. Achievement Extraction Logic

- Reuse existing achievement extraction logic from chat
- Adapt prompts for git commit context
- Add special handling for PR descriptions
- Process commits in context:
  - Include surrounding commit context for better understanding
  - Group related commits (e.g., same PR or related changes)
  - Handle duplicate detection

### 5. CLI Updates

- Implement client-side batching:

  ```typescript
  interface BatchConfig {
    maxCommitsPerBatch: number; // Default: 100
    contextWindow: number; // Number of commits for context
  }

  async function* extractInBatches(commits: Commit[], config: BatchConfig) {
    const batches = [];
    for (let i = 0; i < commits.length; i += config.maxCommitsPerBatch) {
      const batch = commits.slice(i, i + config.maxCommitsPerBatch);
      try {
        const result = await sendToAPI(batch);
        // Update local cache only after successful processing
        await updateProcessedCommitsCache(batch.map((c) => c.hash));
        yield result;
      } catch (error) {
        console.error(
          `Failed to process batch ${i}-${i + batch.length}`,
          error
        );
        throw error;
      }
    }
  }
  ```

- Implement local caching of processed commits
- Add progress reporting to user
- Handle API errors and retries

### 6. Commit Cache Implementation

#### Cache Module
```typescript
// src/cache/commits.ts
interface CommitCache {
  add(repoName: string, commitHashes: string[]): Promise<void>;
  has(repoName: string, commitHash: string): Promise<boolean>;
  list(repoName: string): Promise<string[]>;
  clear(repoName?: string): Promise<void>;
}

class FileCommitCache implements CommitCache {
  constructor(private basePath: string) {}
  
  private getCachePath(repoName: string): string {
    // Sanitize repo name for filesystem
    const safeName = repoName.replace(/[^a-zA-Z0-9-]/g, '_');
    return path.join(this.basePath, 'cache/commits', `${safeName}.txt`);
  }
  
  // Implementation details...
}
```

#### Implementation Steps

1. Cache Directory Setup
   - Create cache module for managing commit hashes
   - Implement filesystem operations for cache files
   - Add cache directory initialization to CLI startup

2. Cache Integration with Extract Command
   - Filter commits against cache before batching
   - Update cache after successful API responses
   - Handle `--no-cache` flag to skip cache
   - Add progress reporting for cache operations

3. Cache Management Commands
   - Implement `cache list` command
   - Implement `cache clear` command
   - Add repository-specific cache operations
   - Add cache statistics reporting

4. Testing
   - Unit tests for cache operations
   - Integration tests with extract command
   - Test cache file format and persistence
   - Test error handling and recovery

5. Documentation
   - Update README with cache commands
   - Document cache file format
   - Add troubleshooting guide for cache issues

#### Modified Extract Flow
```typescript
async function extractCommits(options: ExtractOptions) {
  // Initialize cache
  const cache = new FileCommitCache(config.cacheDir);
  
  // Get all commits
  const allCommits = collectGitCommits(options);
  
  // Filter out cached commits
  const newCommits = [];
  for (const commit of allCommits) {
    if (options.noCache || !(await cache.has(options.repository, commit.hash))) {
      newCommits.push(commit);
    }
  }
  
  console.log(`Found ${newCommits.length} new commits to process`);
  
  // Process in batches
  for await (const result of processInBatches(newCommits, batchConfig)) {
    // Update cache after successful processing
    await cache.add(
      options.repository,
      result.achievements.map(a => a.source.hash).filter(Boolean)
    );
    
    // Report progress
    console.log(`Processed ${result.achievements.length} achievements`);
  }
}
```

### 7. Testing

- Add comprehensive test suite
  - Token validation
  - Request validation
  - Commit limit enforcement
  - Achievement extraction
  - Error handling
  - CLI batching and caching
- Add Braintrust eval for commit-based achievement extraction

### 8. Documentation

- Update API documentation
- Add examples for CLI usage
- Document commit limits and batching behavior

## Next Steps

1. Implement database schema changes
2. Create API endpoint with validation and limits
3. Adapt achievement extraction
4. Implement CLI batching
5. Add tests
6. Update documentation
