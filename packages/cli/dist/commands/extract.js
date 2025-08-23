"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCommand = void 0;
const commander_1 = require("commander");
const operations_1 = require("../git/operations");
const batching_1 = require("../git/batching");
const commits_1 = require("../cache/commits");
const config_1 = require("../config");
const paths_1 = require("../config/paths");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Format a commit for display in dry-run mode
 */
function formatCommit(commit) {
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
function formatRepoInfo(info) {
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
function displayDryRun(payload) {
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
exports.extractCommand = new commander_1.Command('extract')
    .description('Extract commits from the current repository')
    .option('--branch <branch>', 'Git branch to read commits from')
    .option('--max-commits <number>', 'Number of commits to retrieve', '100')
    .option('--repo <n>', 'Label for this repository', '')
    .option('--api-url <url>', 'Override Bragdoc API base URL')
    .option('--dry-run', 'Show commits that would be sent without making API call', false)
    .option('--batch-size <number>', 'Maximum number of commits per API request', '10')
    .option('--no-cache', 'Skip checking commit cache', false)
    .action(async (options) => {
    const { branch, maxCommits, repo, apiUrl: overrideApiUrl, dryRun, batchSize, noCache } = options;
    try {
        // Load config to get API base URL and auth token
        const config = await (0, config_1.loadConfig)();
        const apiUrl = overrideApiUrl || (0, paths_1.getApiBaseUrl)(config);
        // Check for auth token
        if (!config.auth?.token) {
            logger_1.default.error('Not authenticated. Please run "bragdoc login" first.');
            process.exit(1);
        }
        // Check token expiration
        if (config.auth.expiresAt && config.auth.expiresAt < Date.now()) {
            logger_1.default.error('Authentication token has expired. Please run "bragdoc login" to get a new token.');
            process.exit(1);
        }
        logger_1.default.debug(`Using API base URL: ${apiUrl}`);
        // Get repository info
        const repoInfo = (0, operations_1.getRepositoryInfo)(process.cwd());
        // Use current branch if none specified
        const branchToUse = branch || repoInfo.currentBranch;
        // Use provided repo name or extract from remote URL
        const repository = repo || (0, operations_1.getRepositoryName)(repoInfo.remoteUrl);
        // Collect the Git commits
        logger_1.default.info(`Collecting commits from ${repository} (branch: ${branchToUse})...`);
        const commits = (0, operations_1.collectGitCommits)(branchToUse, Number.parseInt(maxCommits, 10), repository);
        if (commits.length === 0) {
            logger_1.default.info('No commits found.');
            return;
        }
        logger_1.default.info(`Found ${commits.length} commits.`);
        if (dryRun) {
            logger_1.default.info('\nDry run mode - commits that would be sent:');
            commits.forEach((commit) => {
                logger_1.default.info(formatCommit(commit));
            });
            return;
        }
        // Initialize commit cache if not disabled
        const cache = !noCache ? new commits_1.CommitCache() : null;
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
            logger_1.default.info(`${commits.length - uncachedCommits.length} commits already processed, skipping...`);
        }
        if (commitsToProcess.length === 0) {
            logger_1.default.info('All commits have already been processed.');
            return;
        }
        // Process commits in batches
        const batchConfig = {
            maxCommitsPerBatch: Number.parseInt(batchSize, 10),
        };
        logger_1.default.info(`Processing ${commitsToProcess.length} commits...`);
        for await (const result of (0, batching_1.processInBatches)(repoInfo, commitsToProcess, batchConfig, apiUrl, config.auth.token)) {
            // Add successfully processed commits to cache
            if (cache) {
                const processedHashes = commitsToProcess
                    .slice(0, result.processedCount)
                    .map((c) => c.hash);
                logger_1.default.debug(`Adding ${processedHashes.length} commits to cache for repository ${repository}`);
                logger_1.default.debug(`Commit hashes: ${processedHashes.join(', ')}`);
                await cache.add(repository, processedHashes);
            }
            if (result.achievements.length > 0) {
                logger_1.default.info('\nAchievements found:');
                result.achievements.forEach((achievement) => {
                    logger_1.default.info(`- ${achievement.title}`);
                });
            }
            if (result.errors?.length) {
                logger_1.default.warn('\nErrors:');
                result.errors.forEach((error) => {
                    logger_1.default.warn(`- ${error.commit}: ${error.error}`);
                });
            }
        }
        logger_1.default.info('Done!');
    }
    catch (error) {
        logger_1.default.error('Error:', error.message);
        process.exit(1);
    }
});
