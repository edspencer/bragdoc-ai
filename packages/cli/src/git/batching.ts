import type { GitCommit, RepositoryInfo, SourceItemType } from './types';
import logger from '../utils/logger';
import { renderExecute } from '../ai/extract-commit-achievements';
import type { Company, Project, User } from '../ai/prompts/types';
import type { ApiClient } from '../api/client';

/**
 * Derive sourceItemType from the raw type string
 *
 * Maps connector raw types to the database sourceItemType enum values.
 * Defaults to 'commit' for unknown types or missing rawType.
 *
 * @param rawType - Raw type string from connector (e.g., 'pr', 'issue', 'commit', 'pr_comment')
 * @returns The corresponding sourceItemType enum value
 */
function deriveSourceItemType(rawType: string | undefined): SourceItemType {
  switch (rawType) {
    case 'pr':
      return 'pr';
    case 'issue':
      return 'issue';
    case 'pr_comment':
      return 'pr_comment';
    case 'commit':
    default:
      return 'commit';
  }
}

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

        // Get sourceId from batch commits (should be the same for all commits in batch)
        const batchSourceId = batchCommits[0]?.sourceId || null;

        // Build a map from item hash to rawType for sourceItemType derivation
        // This allows us to look up the correct type when creating achievements
        const hashToRawType = new Map<string, string | undefined>();
        for (const commit of batchCommits) {
          hashToRawType.set(commit.hash, commit.rawType);
        }

        // Send extracted achievements to API for saving
        const savedAchievements = await apiClient.createAchievements(
          extractedAchievements.map((achievement) => {
            // Look up the rawType for this achievement's source item
            const rawType = achievement.commitHash
              ? hashToRawType.get(achievement.commitHash)
              : undefined;
            const sourceItemType = deriveSourceItemType(rawType);

            return {
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
              source: 'commit' as const,
              uniqueSourceId: achievement.commitHash || null,
              sourceId: batchSourceId,
              sourceItemType,
            };
          }),
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
