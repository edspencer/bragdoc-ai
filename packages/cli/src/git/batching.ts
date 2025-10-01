import type { GitCommit, BragdocPayload, RepositoryInfo } from './types';
import logger from '../utils/logger';

export interface BatchConfig {
  maxCommitsPerBatch: number; // Default: 10
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

  logger.info(
    `Processing ${commits.length} commits in ${totalBatches} batches`,
  );
  logger.debug(
    `Batch config: size=${batchSize}, maxRetries=${maxRetries}, retryDelay=${retryDelayMs}ms`,
  );

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * batchSize;
    const end = Math.min(start + batchSize, commits.length);
    const batchCommits = commits.slice(start, end);

    // Log progress
    logger.info(
      `\nProcessing batch ${batchNum + 1}/${totalBatches} (${batchCommits.length} commits)...`,
    );

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          logger.warn(
            `Retry attempt ${attempt}/${maxRetries - 1} for batch ${batchNum + 1}...`,
          );
          // Use injected delay function or setTimeout
          const delay =
            config.delayFn ||
            ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
          await delay(retryDelayMs);
        }

        const payload: BragdocPayload = {
          repository,
          commits: batchCommits,
        };

        logger.debug(
          `Sending batch ${batchNum + 1} to API: ${apiUrl}/api/cli/commits`,
        );
        logger.debug(`Batch payload: ${JSON.stringify(payload, null, 2)}`);

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
          logger.info(
            `Successfully processed batch ${batchNum + 1} after ${attempt + 1} attempts`,
          );
        }

        logger.debug(
          `Batch ${batchNum + 1} results: ${result.processedCount} commits processed, ` +
            `${result.achievements.length} achievements found, ` +
            `${result.errors?.length || 0} errors`,
        );

        yield result;
        // Success, break the retry loop
        break;
      } catch (error: any) {
        lastError = error;
        attempt++;

        if (attempt === maxRetries) {
          logger.error(
            `Failed to process batch ${batchNum + 1}/${totalBatches} after ${maxRetries} attempts: ${error.message}`,
          );
          throw new Error(
            `Maximum retries (${maxRetries}) exceeded for batch ${batchNum + 1}. Last error: ${error.message}`,
          );
        } else {
          logger.warn(
            `Error processing batch ${batchNum + 1} (attempt ${attempt}/${maxRetries}): ${error.message}`,
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
    date: string;
    source: string;
    title: string;
  }>;
  errors?: Array<{
    commit: string;
    error: string;
  }>;
}
