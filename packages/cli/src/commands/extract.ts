import { Command, Option } from 'commander';
import type { ExtractionConfig } from '../config/types';
import { resolveExtractionConfig } from '../config/extraction-presets';
import {
  processInBatches,
  type BatchConfig,
  type ExtractionContext,
} from '../git/batching';
import { CommitCache } from '../cache/commits';
import { SourcesCache } from '../cache/sources';
import { loadConfig } from '../config';
import logger from '../utils/logger';
import { createApiClient } from '../api/client';
import { getLLMDisplayName } from '../ai/providers';
import { isLLMConfigured } from '../config/llm-setup';
import {
  connectorRegistry,
  initializeConnectors,
} from '../connectors/registry';
import type { ConnectorItem } from '../connectors/types';

/**
 * Resolve extraction configuration from CLI options, project config, and global defaults
 * Priority: CLI options > Project config > Global defaults
 */
function getExtractionConfigForProject(
  projectConfig: any,
  globalConfig: any,
  cliOptions: any,
): ExtractionConfig | Record<string, any> {
  const config: any = {};

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

/**
 * Validate that the current branch is in the configured whitelist
 * Returns true if valid, false if validation failed (error already logged)
 */
function _validateBranchWhitelist(
  branchToUse: string,
  repoConfig: any,
  logger: any,
): boolean {
  // If no whitelist configured, all branches are allowed
  if (!repoConfig.branchWhitelist || repoConfig.branchWhitelist.length === 0) {
    logger.debug(
      'No branch whitelist configured for this project (all branches allowed)',
    );
    return true;
  }

  // Check if current branch is in whitelist
  if (repoConfig.branchWhitelist.includes(branchToUse)) {
    logger.debug(
      `Branch whitelist check passed: ${branchToUse} is in configured whitelist`,
    );
    return true;
  }

  // Branch not in whitelist - log error and instructions
  logger.error('Error: Current branch is not allowed for extraction.');
  logger.error(`Current branch: ${branchToUse}`);
  logger.error(`Allowed branches: ${repoConfig.branchWhitelist.join(', ')}`);
  logger.error('');
  logger.error(
    'Please switch to an allowed branch or reconfigure the whitelist.',
  );
  logger.error(
    `To update allowed branches, run: bragdoc projects update <path> --branch-whitelist <branches>`,
  );
  return false;
}

export const extractCommand = new Command('extract')
  .description('Extract achievements from configured sources')
  .option('--since <days>', 'Extract data from last N days')
  .option('--max <count>', 'Maximum items to extract')
  .option('--all', 'Extract all data (bypass cache)')
  .option('--project <id>', 'Extract from specific project only')
  .option(
    '--dry-run',
    'Show what would be processed without making changes',
    false,
  )
  .option('--batch-size <number>', 'Maximum items per processing batch', '10')
  .option('--no-cache', 'Skip checking cache', false)
  .addOption(
    new Option('--detail-level <level>', 'Extraction detail level').choices([
      'minimal',
      'standard',
      'detailed',
      'comprehensive',
    ]),
  )
  .option('--include-stats', 'Include file change statistics', false)
  .option('--include-diff', 'Include code diffs', false)
  .action(async (options) => {
    const {
      since,
      max,
      all: skipCache,
      project: projectIdFilter,
      dryRun,
      batchSize,
      noCache,
      detailLevel,
      includeStats,
      includeDiff,
    } = options;

    try {
      // Phase 2: Initialize connectors
      initializeConnectors();

      // Load config
      const config = await loadConfig();

      // Check for auth token
      if (!config.auth?.token) {
        logger.error('Not authenticated. Please run "bragdoc login" first.');
        process.exit(1);
      }

      // Check token expiration
      if (config.auth.expiresAt && config.auth.expiresAt < Date.now()) {
        logger.error(
          'Authentication token has expired. Please run "bragdoc login" to get a new token.',
        );
        process.exit(1);
      }

      // Validate LLM configuration before starting extraction
      if (!isLLMConfigured(config.llm)) {
        logger.error('LLM provider is not configured.');
        logger.info(
          'Achievement extraction requires an LLM provider to analyze data.',
        );
        logger.info('Run "bragdoc init" to configure your LLM provider.');
        logger.info('Alternatively, set an environment variable:');
        logger.info('  - OPENAI_API_KEY for OpenAI');
        logger.info('  - ANTHROPIC_API_KEY for Anthropic');
        logger.info('  - GOOGLE_GENERATIVE_AI_API_KEY for Google');
        process.exit(1);
      }

      const llmName = getLLMDisplayName(config);
      logger.debug(`Using LLM: ${llmName}`);

      // Create API client
      const apiClient = await createApiClient();

      // Phase 2: Sync sources cache from API
      logger.info('Fetching sources from API...');
      const sourcesCache = new SourcesCache();
      try {
        await sourcesCache.sync(apiClient);
        logger.debug(`Cached ${sourcesCache.count()} sources`);
      } catch (syncError: any) {
        logger.error(
          `Failed to synchronize sources: ${syncError.message || String(syncError)}`,
        );
        process.exit(1);
      }

      // Fetch user context from API
      logger.info('Fetching user context from API...');
      const [companies, projects, userProfile] = await Promise.all([
        apiClient.get<any[]>('/api/companies'),
        apiClient.get<any[]>('/api/projects'),
        apiClient.get<any>('/api/user'),
      ]);

      logger.debug(
        `Loaded ${companies.length} companies, ${projects.length} projects`,
      );

      // Parse options for connector fetch
      const fetchOptions: any = {};
      if (since) {
        fetchOptions.since = new Date(
          Date.now() - Number.parseInt(since, 10) * 86400000,
        );
      }
      if (max) {
        fetchOptions.limit = Number.parseInt(max, 10);
      }
      if (skipCache) {
        fetchOptions.skipCache = true;
      }

      // Process each project
      let totalProcessed = 0;
      let totalSuccessfulBatches = 0;

      for (const projectConfig of config.projects) {
        // Skip disabled projects or filter by project ID if specified
        if (!projectConfig.enabled) {
          logger.debug(`Skipping disabled project: ${projectConfig.name}`);
          continue;
        }

        if (projectIdFilter && projectConfig.id !== projectIdFilter) {
          logger.debug(`Skipping non-matching project: ${projectConfig.name}`);
          continue;
        }

        logger.info(`\nProcessing project: ${projectConfig.name}`);

        // Phase 2: Get sources for this project from cache
        const sources = sourcesCache.getByProjectId(projectConfig.id ?? '');

        if (sources.length === 0) {
          logger.warn(
            `No sources configured for project "${projectConfig.name}". Configure sources via the web app to enable extraction for this project.`,
          );
          continue;
        }

        logger.info(`Found ${sources.length} source(s) for this project`);

        // Collect data from all sources
        const allData: ConnectorItem[] = [];

        for (const source of sources) {
          try {
            logger.info(
              `  Extracting from source: ${source.name} (${source.type})`,
            );

            // Get connector from registry
            const connector = connectorRegistry.get(source.type);

            // Initialize connector with source config
            await connector.initialize({
              ...source.config,
              type: source.type,
              sourceId: source.id,
              projectId: source.projectId,
            });

            // Fetch data from connector
            const connectorData = await connector.fetch(fetchOptions);

            logger.debug(
              `  Fetched ${connectorData.length} items from ${source.name}`,
            );

            // Add sourceId, projectId, and type to each item
            const itemsWithContext = connectorData.map((item) => ({
              ...item,
              sourceId: source.id,
              projectId: source.projectId,
              type: source.type,
            }));

            allData.push(...itemsWithContext);
          } catch (sourceError: any) {
            logger.error(
              `  Failed to extract from source "${source.name}": ${sourceError.message || String(sourceError)}`,
            );
            // Continue to next source instead of aborting
            continue;
          }
        }

        if (allData.length === 0) {
          logger.info(
            `No data extracted from any source for project ${projectConfig.name}`,
          );
          continue;
        }

        logger.info(`Collected ${allData.length} items from all sources`);

        if (dryRun) {
          logger.info(
            `\nDry run mode - would process ${allData.length} items:`,
          );
          allData.slice(0, 5).forEach((item) => {
            logger.info(
              `  - ${(item as any).title || (item as any).message || (item as any).id}`,
            );
          });
          if (allData.length > 5) {
            logger.info(`  ... and ${allData.length - 5} more`);
          }
          continue;
        }

        // Filter out cached items if cache enabled
        let itemsToProcess = allData;
        const cache = !noCache ? new CommitCache() : null;

        if (cache) {
          await cache.init();
          const uncachedItems = [];

          for (const item of allData) {
            if (!(await cache.has(item.sourceId, item.id))) {
              uncachedItems.push(item);
            }
          }

          itemsToProcess = uncachedItems;
          if (allData.length > itemsToProcess.length) {
            logger.info(
              `${allData.length - itemsToProcess.length} items already processed, skipping...`,
            );
          }
        }

        if (itemsToProcess.length === 0) {
          logger.info('All items have already been processed.');
          continue;
        }

        // Resolve extraction configuration
        const cliOptions: any = {};
        if (detailLevel) cliOptions.detailLevel = detailLevel;
        if (includeStats) cliOptions.includeStats = includeStats;
        if (includeDiff) cliOptions.includeDiff = includeDiff;

        const extractionConfig = getExtractionConfigForProject(
          projectConfig,
          config,
          cliOptions,
        );

        const resolved = resolveExtractionConfig(extractionConfig);

        // Log extraction mode
        logger.info(
          `Extraction config: detailLevel=${extractionConfig.detailLevel || 'none'}, ` +
            `stats=${resolved.includeStats}, diff=${resolved.includeDiff}`,
        );

        // Transform ConnectorItems to format expected by processInBatches
        // Extract GitCommit data from the raw field since batch processing expects GitCommit format
        const itemsForBatching = itemsToProcess.map((item) => ({
          hash: item.id,
          message: item.description,
          author: item.author,
          date: item.timestamp.toISOString(),
          branch: '', // Not applicable for multi-source
          repository: projectConfig.name || 'Unknown Project',
          stats: item.raw.stats,
          diff: item.raw.diff,
          diffTruncated: item.raw.diffTruncated,
          sourceId: item.sourceId, // Pass through sourceId for API
          // Pass through raw type for sourceItemType derivation (pr, issue, commit, pr_comment)
          rawType: item.raw.type as string | undefined,
        }));

        // Batch process
        const batchConfig: BatchConfig = {
          maxCommitsPerBatch: Number.parseInt(batchSize, 10),
        };

        const extractionContext: ExtractionContext = {
          projectId: projectConfig.id ?? '',
          companies,
          projects,
          user: userProfile,
        };

        logger.info(`Processing ${itemsToProcess.length} items...`);

        let processedSoFar = 0;

        try {
          // Create a minimal repository info object for batch processing
          const repoInfo = {
            remoteUrl: '', // Not applicable for multi-source
            currentBranch: '', // Not applicable for multi-source
            path: process.cwd(),
          };

          for await (const result of processInBatches(
            repoInfo,
            itemsForBatching,
            batchConfig,
            extractionContext,
            apiClient,
          )) {
            // Add successfully processed items to cache
            if (cache) {
              const processedItems = itemsToProcess.slice(
                processedSoFar,
                processedSoFar + result.processedCount,
              );
              processedSoFar += result.processedCount;

              // Group by sourceId and cache each source's items
              const itemsBySource = new Map<string, string[]>();
              for (const item of processedItems) {
                if (!itemsBySource.has(item.sourceId)) {
                  itemsBySource.set(item.sourceId, []);
                }
                itemsBySource.get(item.sourceId)!.push(item.id);
              }

              for (const [sourceId, ids] of itemsBySource.entries()) {
                logger.debug(
                  `Adding ${ids.length} items to cache for source ${sourceId}`,
                );
                await cache.add(sourceId, ids);
              }
            }

            totalSuccessfulBatches++;

            if (result.achievements.length > 0) {
              logger.info('\nAchievements found:');
              result.achievements.forEach((achievement) => {
                logger.info(`  - ${achievement.title}`);
              });
            }

            if (result.errors?.length) {
              logger.warn('\nProcessing errors:');
              result.errors.forEach((error) => {
                logger.warn(`  - ${error.commit}: ${error.error}`);
              });
            }
          }

          totalProcessed += itemsToProcess.length;
        } catch (batchError: any) {
          logger.error(`Batch processing failed: ${batchError.message}`);
          if (totalSuccessfulBatches > 0) {
            logger.info(
              `Successfully processed ${totalSuccessfulBatches} batch(es) before failure`,
            );
          }
          throw batchError;
        }
      }

      if (totalProcessed > 0) {
        logger.info(
          `\nDone! Processed ${totalProcessed} items in ${totalSuccessfulBatches} batches.`,
        );
      } else {
        logger.info('No items found to process.');
      }
    } catch (error: any) {
      logger.error('Error:', error.message);
      process.exit(1);
    }
  });
