import type { GitCommit, BragdocPayload, RepositoryInfo } from './types';

export interface BatchConfig {
  maxCommitsPerBatch: number; // Default: 100
  contextWindow?: number; // Number of commits for context
  maxRetries?: number; // Maximum number of retries per batch
  retryDelayMs?: number; // Delay between retries in milliseconds
  // For testing - if provided, use this instead of setTimeout
  delayFn?: (ms: number) => Promise<void>;
}

/**
 * Process commits in batches, sending them to the API
 */
export async function* processInBatches(
  repository: RepositoryInfo,
  commits: GitCommit[],
  config: BatchConfig,
  apiUrl: string,
  apiToken: string,
): AsyncGenerator<BatchResult, void, unknown> {
  const batchSize = config.maxCommitsPerBatch;
  const maxRetries = config.maxRetries || 3;
  const retryDelayMs = config.retryDelayMs || 1000;
  const totalBatches = Math.ceil(commits.length / batchSize);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * batchSize;
    const end = Math.min(start + batchSize, commits.length);
    const batchCommits = commits.slice(start, end);

    // Log progress
    console.log(
      `Processing batch ${batchNum + 1}/${totalBatches} (${batchCommits.length} commits)...`,
    );

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${maxRetries - 1} for batch ${batchNum + 1}...`);
          // Use injected delay function or setTimeout
          const delay = config.delayFn || ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)));
          await delay(retryDelayMs);
        }

        const payload: BragdocPayload = {
          repository,
          commits: batchCommits,
        };

        const response = await fetch(`${apiUrl}/api/cli/commits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API error (status ${response.status}): ${errorText}`,
          );
        }

        const result: BatchResult = await response.json();
        
        if (attempt > 0) {
          console.log(`Successfully processed batch ${batchNum + 1} after ${attempt + 1} attempts`);
        }
        
        yield result;
        // Success, break the retry loop
        break;
      } catch (error: any) {
        lastError = error;
        attempt++;

        if (attempt === maxRetries) {
          console.error(
            `Failed to process batch ${batchNum + 1}/${totalBatches} after ${maxRetries} attempts:`,
            error.message,
          );
          throw new Error(
            `Maximum retries (${maxRetries}) exceeded for batch ${batchNum + 1}. Last error: ${error.message}`,
          );
        } else {
          console.warn(
            `Error processing batch ${batchNum + 1} (attempt ${attempt}/${maxRetries}):`,
            error.message,
          );
        }
      }
    }
  }
}

export interface BatchResult {
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
