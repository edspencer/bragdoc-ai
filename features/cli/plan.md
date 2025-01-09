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

### 6. Testing

- Add comprehensive test suite
  - Token validation
  - Request validation
  - Commit limit enforcement
  - Achievement extraction
  - Error handling
  - CLI batching and caching
- Add Braintrust eval for commit-based achievement extraction

### 7. Documentation

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
