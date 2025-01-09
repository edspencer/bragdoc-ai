import { Command } from 'commander';
import path from 'path';
import { collectGitCommits, getRepositoryInfo } from '../git/operations';
import { GitCommit, BragdocPayload, RepositoryInfo } from '../git/types';
import { processInBatches, type BatchConfig } from '../git/batching';
import { CommitCache } from '../cache/commits';
import { loadConfig, getApiBaseUrl } from '../config';
import logger from '../utils/logger';

/**
 * Format a commit for display in dry-run mode
 */
function formatCommit(commit: GitCommit): string {
  const hashShort = commit.hash.slice(0, 7);
  const messageFirstLine = commit.message.split('\n')[0];
  const date = new Date(commit.date).toLocaleDateString();
  
  return [
    `${hashShort} - ${date} - ${commit.author}`,
    `  ${messageFirstLine}`,
    commit.message.split('\n').slice(1)
      .map(line => `  ${line}`)
      .join('\n'),
  ].filter(Boolean).join('\n');
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
    ''
  ].join('\n');
}

/**
 * Display commits that would be sent to the API
 */
function displayDryRun(payload: BragdocPayload): void {
  console.log('\nDry run mode - data that would be sent to API:');
  console.log('============================================');
  
  // Display repository info
  console.log(formatRepoInfo(payload.repository));
  
  // Display commits
  console.log(`Found ${payload.commits.length} commits\n`);
  
  payload.commits.forEach((commit, index) => {
    console.log(formatCommit(commit));
    if (index < payload.commits.length - 1) {
      console.log(''); // Add blank line between commits
    }
  });
  
  console.log('\nNo changes were sent to the API (dry-run mode)');
}

/**
 * Send commits to the Bragdoc API
 */
async function sendCommitsToBragDoc(
  payload: BragdocPayload,
  apiUrl: string,
  apiToken: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/api/extract-from-commits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Error from Bragdoc API (status ${response.status}): ${body}`
    );
  }
}

export const extractCommand = new Command('extract')
  .description('Extract commits from the current repository')
  .option('--branch <branch>', 'Git branch to read commits from')
  .option('--max-commits <number>', 'Number of commits to retrieve', '10')
  .option('--repo <n>', 'Label for this repository', '')
  .option(
    '--api-url <url>',
    'Override Bragdoc API base URL',
  )
  .option(
    '--dry-run',
    'Show commits that would be sent without making API call',
    false
  )
  .option(
    '--batch-size <number>',
    'Maximum number of commits per API request',
    '100'
  )
  .option(
    '--no-cache',
    'Skip checking commit cache',
    false
  )
  .action(async (options) => {
    const {
      branch,
      maxCommits,
      repo,
      apiUrl: overrideApiUrl,
      dryRun,
      batchSize,
      cache: useCache
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
        logger.error('Authentication token has expired. Please run "bragdoc login" to get a new token.');
        process.exit(1);
      }
      
      logger.debug(`Using API base URL: ${apiUrl}`);

      // If --repo is not specified, use the current folder name
      const repository = repo || path.basename(process.cwd());
      
      // Get repository info
      const repoInfo = getRepositoryInfo(process.cwd());
      
      // Use current branch if none specified
      const branchToUse = branch || repoInfo.currentBranch;
      
      // Collect the Git commits
      logger.info(`Collecting commits from ${repository} (branch: ${branchToUse})...`);
      const commits = collectGitCommits(
        branchToUse,
        parseInt(maxCommits, 10),
        repository
      );

      if (commits.length === 0) {
        logger.info('No commits found.');
        return;
      }

      logger.info(`Found ${commits.length} commits.`);

      if (dryRun) {
        logger.info('\nDry run mode - commits that would be sent:');
        commits.forEach((commit) => {
          logger.info(formatCommit(commit));
        });
        return;
      }

      // Initialize commit cache
      const cache = useCache ? new CommitCache() : null;
      
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
        logger.info(`${commits.length - uncachedCommits.length} commits already processed, skipping...`);
      }

      if (commitsToProcess.length === 0) {
        logger.info('All commits have already been processed.');
        return;
      }

      // Process commits in batches
      const batchConfig: BatchConfig = {
        maxCommitsPerBatch: parseInt(batchSize, 10),
      };

      logger.info(`Processing ${commitsToProcess.length} commits...`);

      for await (const result of processInBatches(
        repoInfo,
        commitsToProcess,
        batchConfig,
        apiUrl,
        config.auth.token
      )) {
        // Add successfully processed commits to cache
        if (cache) {
          const processedHashes = commitsToProcess
            .slice(0, result.processedCount)
            .map((c) => c.hash);
          await cache.add(repository, processedHashes);
        }

        if (result.achievements.length > 0) {
          logger.info('\nAchievements found:');
          result.achievements.forEach((achievement) => {
            logger.info(`- ${achievement.description}`);
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
    } catch (error: any) {
      logger.error('Error:', error.message);
      process.exit(1);
    }
  });
