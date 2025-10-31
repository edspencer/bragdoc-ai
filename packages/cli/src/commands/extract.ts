import { Command, Option } from 'commander';
import {
  collectGitCommits,
  collectGitCommitsEnhanced,
  getRepositoryInfo,
  getRepositoryName,
} from '../git/operations';
import type { GitCommit, RepositoryInfo } from '../git/types';
import type { ExtractionConfig } from '../config/types';
import { resolveExtractionConfig } from '../config/extraction-presets';
import {
  processInBatches,
  type BatchConfig,
  type ExtractionContext,
} from '../git/batching';
import { CommitCache } from '../cache/commits';
import { loadConfig } from '../config';
import { getApiBaseUrl } from '../config/paths';
import logger from '../utils/logger';
import { createApiClient } from '../api/client';
import { getLLMDisplayName } from '../ai/providers';
import { isLLMConfigured } from '../config/llm-setup';

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
    for (const stat of commit.stats) {
      parts.push(`    ${stat.path}: +${stat.additions} -${stat.deletions}`);
    }
  }

  // Add diff summary if present
  if (commit.diff && commit.diff.length > 0) {
    parts.push('');
    parts.push('  Code Changes:');
    for (const fileDiff of commit.diff) {
      const lineCount = fileDiff.diff.split('\n').length;
      const truncatedNote = fileDiff.isTruncated ? ' (truncated)' : '';
      parts.push(`    ${fileDiff.path}: ${lineCount} lines${truncatedNote}`);
    }
    if (commit.diffTruncated) {
      parts.push('    (some files omitted due to size limits)');
    }
  }

  return parts.filter(Boolean).join('\n');
}

/**
 * Format repository info for display in dry-run mode
 */
function formatRepoInfo(info: RepositoryInfo): string {
  return [
    'Repository Information:',
    `  Remote URL: ${info.remoteUrl}`,
    `  Current Branch: ${info.currentBranch}`,
    `  Local Path: ${info.path}`,
    '',
  ].join('\n');
}

/**
 * Display commits that would be sent to the API
 */
function displayDryRun(repository: RepositoryInfo, commits: GitCommit[]): void {
  console.log('\nDry run mode - data that would be processed:');
  console.log('============================================');

  // Display repository info
  console.log(formatRepoInfo(repository));

  // Display commits
  console.log(`Found ${commits.length} commits\n`);

  commits.forEach((commit, index) => {
    console.log(formatCommit(commit));
    if (index < commits.length - 1) {
      console.log(''); // Add blank line between commits
    }
  });

  console.log('\nNo changes were sent to the API (dry-run mode)');
}

/**
 * Resolve extraction configuration from CLI options, project config, and global defaults
 * Priority: CLI options > Project config > Global defaults
 */
function getExtractionConfigForProject(
  projectConfig: any,
  globalConfig: any,
  cliOptions: any,
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

/**
 * Validate that the current branch is in the configured whitelist
 * Returns true if valid, false if validation failed (error already logged)
 */
function validateBranchWhitelist(
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
  .description('Extract commits from the current repository')
  .option('--branch <branch>', 'Git branch to read commits from')
  .option('--max-commits <number>', 'Number of commits to retrieve', '300')
  .option('--repo <n>', 'Label for this repository', '')
  .option('--api-url <url>', 'Override Bragdoc API base URL')
  .option(
    '--dry-run',
    'Show commits that would be sent without making API call',
    false,
  )
  .option(
    '--batch-size <number>',
    'Maximum number of commits per API request',
    '10',
  )
  .option('--no-cache', 'Skip checking commit cache', false)
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

    try {
      // Load config to get API base URL and auth token
      const config = await loadConfig();
      const apiUrl = overrideApiUrl || getApiBaseUrl(config);

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

      logger.debug(`Using API base URL: ${apiUrl}`);

      const repoInfo = getRepositoryInfo(process.cwd());

      // Check if this repository has a projectId configured
      const repoConfig = config.projects.find(
        (p) =>
          p.path === process.cwd() ||
          p.path === repoInfo.path ||
          repoInfo.path.startsWith(p.path),
      );

      if (!repoConfig?.id) {
        logger.error('This repository is not linked to a Bragdoc project.');
        logger.info('Run "bragdoc init" to set up the connection.');
        process.exit(1);
      }

      // Use current branch if none specified
      const branchToUse = branch || repoInfo.currentBranch;

      // Validate branch against whitelist if configured
      if (!validateBranchWhitelist(branchToUse, repoConfig, logger)) {
        process.exit(1);
      }

      // Use provided repo name or extract from remote URL
      const repository = repo || getRepositoryName(repoInfo.remoteUrl);

      // Resolve extraction configuration
      // Only pass CLI options that were explicitly set (not default values)
      const cliOptions: any = {};
      if (detailLevel) cliOptions.detailLevel = detailLevel;
      // Only override boolean flags if they're true (user explicitly set them)
      if (includeStats) cliOptions.includeStats = includeStats;
      if (includeDiff) cliOptions.includeDiff = includeDiff;

      const extractionConfig = getExtractionConfigForProject(
        repoConfig,
        config,
        cliOptions,
      );

      const resolved = resolveExtractionConfig(extractionConfig);
      const useEnhanced = resolved.includeStats || resolved.includeDiff;

      // Log extraction mode
      logger.info(
        `Extraction config: detailLevel=${extractionConfig.detailLevel || 'none'}, ` +
          `stats=${resolved.includeStats}, diff=${resolved.includeDiff}`,
      );
      if (useEnhanced) {
        if (resolved.includeDiff) {
          logger.debug(
            `Diff limits: ${resolved.maxDiffLinesPerCommit} lines/commit, ` +
              `${resolved.maxDiffLinesPerFile} lines/file, ${resolved.maxFilesInDiff} files`,
          );
        }
      }

      // Collect the Git commits
      logger.info(
        `Collecting commits from ${repository} (branch: ${branchToUse})...`,
      );
      const commits = useEnhanced
        ? collectGitCommitsEnhanced(
            branchToUse,
            Number.parseInt(maxCommits, 10),
            repository,
            extractionConfig,
          )
        : collectGitCommits(
            branchToUse,
            Number.parseInt(maxCommits, 10),
            repository,
          );

      if (commits.length === 0) {
        logger.info('No commits found.');
        return;
      }

      logger.info(`Found ${commits.length} commits.`);

      if (dryRun) {
        displayDryRun(repoInfo, commits);
        return;
      }

      // Initialize commit cache if not disabled
      const cache = !noCache ? new CommitCache() : null;

      // Filter out cached commits
      let commitsToProcess = commits;
      if (cache) {
        const uncachedCommits = [];
        for (const commit of commits) {
          if (!(await cache.has(repository, commit.hash))) {
            uncachedCommits.push(commit);
          }
        }
        commitsToProcess = uncachedCommits;
        logger.info(
          `${
            commits.length - uncachedCommits.length
          } commits already processed, skipping...`,
        );
      }

      if (commitsToProcess.length === 0) {
        logger.info('All commits have already been processed.');
        return;
      }

      const apiClient = await createApiClient();

      // Validate LLM configuration before starting extraction
      if (!isLLMConfigured(config.llm)) {
        logger.error('LLM provider is not configured.');
        logger.info(
          'Achievement extraction requires an LLM provider to analyze commits.',
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

      logger.info('Fetching user context from API...');
      const [companies, projects, userProfile] = await Promise.all([
        apiClient.get<any[]>('/api/companies'),
        apiClient.get<any[]>('/api/projects'),
        apiClient.get<any>('/api/user'),
      ]);

      const extractionContext: ExtractionContext = {
        projectId: repoConfig.id!,
        companies,
        projects,
        user: userProfile,
      };

      logger.debug(
        `Loaded ${companies.length} companies, ${projects.length} projects`,
      );

      // Process commits in batches
      const batchConfig: BatchConfig = {
        maxCommitsPerBatch: Number.parseInt(batchSize, 10),
      };

      logger.info(`Processing ${commitsToProcess.length} commits...`);

      let processedSoFar = 0;
      let successfulBatches = 0;

      try {
        for await (const result of processInBatches(
          repoInfo,
          commitsToProcess,
          batchConfig,
          extractionContext,
          apiClient,
        )) {
          // Add successfully processed commits to cache
          if (cache) {
            const processedHashes = commitsToProcess
              .slice(processedSoFar, processedSoFar + result.processedCount)
              .map((c) => c.hash);
            processedSoFar += result.processedCount;
            logger.debug(
              `Adding ${processedHashes.length} commits to cache for repository ${repository}`,
            );
            logger.debug(`Commit hashes: ${processedHashes.join(', ')}`);
            await cache.add(repository, processedHashes);
          }

          successfulBatches++;

          if (result.achievements.length > 0) {
            logger.info('\nAchievements found:');
            result.achievements.forEach((achievement) => {
              logger.info(`- ${achievement.title}`);
            });
          }

          if (result.errors?.length) {
            logger.warn('\nErrors:');
            result.errors.forEach((error) => {
              logger.warn(`- ${error.commit}: ${error.error}`);
            });
          }
        }

        logger.info('Done!');
      } catch (batchError: any) {
        // If batch processing fails, log the error and exit
        // Cache has only been updated for successfully completed batches
        logger.error(`\nBatch processing failed: ${batchError.message}`);
        if (successfulBatches > 0) {
          logger.info(
            `Successfully processed ${successfulBatches} batch(es) before failure`,
          );
        }
        throw batchError;
      }
    } catch (error: any) {
      logger.error('Error:', error.message);
      process.exit(1);
    }
  });
