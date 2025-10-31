import type { GitCommit, RepositoryInfo } from './types';
import logger from '../utils/logger';
import { renderExecute } from '../ai/extract-commit-achievements';
import type { Company, Project, User } from '../ai/prompts/types';
import type { ApiClient } from '../api/client';

export interface BatchConfig {
  maxCommitsPerBatch: number; // Default: 10
  contextWindow?: number; // Number of commits for context
  maxRetries?: number; // Maximum number of retries per batch
  retryDelayMs?: number; // Delay between retries in milliseconds
  // For testing - if provided, use this instead of setTimeout
  delayFn?: (ms: number) => Promise<void>;
}

export interface ExtractionContext {
  projectId: string;
  companies: Company[];
  projects: Project[];
  user: User;
}

/**
 * Process commits in batches, extracting achievements locally via LLM
 */
export async function* processInBatches(
  repository: RepositoryInfo,
  commits: GitCommit[],
  config: BatchConfig,
  extractionContext: ExtractionContext,
  apiClient: ApiClient,
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
    let succeeded = false;

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

        logger.debug(
          `Extracting achievements from ${batchCommits.length} commits locally...`,
        );

        // Extract achievements locally using LLM
        const extractedAchievements = await renderExecute({
          commits: batchCommits.map((commit) => ({
            hash: commit.hash,
            message: commit.message,
            author: {
              name: commit.author.split('<')[0]?.trim() || '',
              email: commit.author.match(/<(.+?)>/)?.[1] || '',
            },
            date: commit.date,
          })),
          repository: {
            name:
              repository.remoteUrl
                ?.split('/')
                .pop()
                ?.replace(/\.git$/, '') || 'unknown',
            path: repository.path,
            remoteUrl: repository.remoteUrl,
          },
          companies: extractionContext.companies,
          projects: extractionContext.projects,
          user: extractionContext.user,
        });

        logger.debug(
          `Extracted ${extractedAchievements.length} achievements, sending to API...`,
        );

        // Send extracted achievements to API for saving
        const savedAchievements = await apiClient.createAchievements(
          extractedAchievements.map((achievement) => ({
            title: achievement.title,
            summary: achievement.summary,
            details: achievement.details,
            eventDuration: achievement.eventDuration,
            eventStart: achievement.eventStart,
            eventEnd: achievement.eventEnd,
            projectId: extractionContext.projectId,
            companyId: achievement.companyId,
            impact: achievement.impact,
            impactSource: 'llm' as const,
            source: 'llm' as const,
          })),
        );

        const result: BatchResult = {
          processedCount: batchCommits.length,
          achievements: savedAchievements.map((a) => ({
            id: a.id,
            date: a.createdAt || new Date().toISOString(),
            source: a.source || 'llm',
            title: a.title,
          })),
        };

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

        succeeded = true;
        yield result;
        // Success, break the retry loop
        break;
      } catch (error: any) {
        lastError = error;
        attempt++;

        if (attempt >= maxRetries) {
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

    // If the retry loop completes without success, throw an error
    if (!succeeded) {
      logger.error(
        `Failed to process batch ${batchNum + 1}/${totalBatches} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      );
      throw new Error(
        `Maximum retries (${maxRetries}) exceeded for batch ${batchNum + 1}. Last error: ${lastError?.message || 'Unknown error'}`,
      );
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
