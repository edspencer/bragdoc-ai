import { Command } from 'commander';
import path from 'path';
import fetch from 'node-fetch';
import { collectGitCommits, getRepositoryInfo } from '../git/operations';
import { GitCommit, BragdocPayload, RepositoryInfo } from '../git/types';

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
  .option('--repo <name>', 'Label for this repository', '')
  .option('--api-token <token>', 'Bragdoc API token')
  .option(
    '--api-url <url>',
    'Bragdoc API base URL',
    'https://api.bragdoc.ai'
  )
  .option(
    '--dry-run',
    'Show commits that would be sent without making API call',
    false
  )
  .action(async (options) => {
    const {
      branch,
      maxCommits,
      repo,
      apiToken,
      apiUrl,
      dryRun
    } = options;

    // Only require API token if not in dry-run mode
    if (!dryRun && !apiToken) {
      console.error('Error: Missing --api-token option.');
      process.exit(1);
    }

    try {
      // If --repo is not specified, use the current folder name
      const repository = repo || path.basename(process.cwd());
      
      // Get repository info
      const repoInfo = getRepositoryInfo(process.cwd());
      
      // Use current branch if none specified
      const branchToUse = branch || repoInfo.currentBranch;
      
      // Collect the Git commits
      console.log(`Collecting commits from ${repository} (branch: ${branchToUse})...`);
      const commits = collectGitCommits(
        branchToUse,
        parseInt(maxCommits, 10),
        repository
      );

      // Prepare payload
      const payload: BragdocPayload = {
        repository: repoInfo,
        commits
      };

      if (dryRun) {
        displayDryRun(payload);
      } else {
        console.log(`Collected ${commits.length} commits.`);
        console.log('Sending commits to Bragdoc...');
        await sendCommitsToBragDoc(payload, apiUrl, apiToken);
        console.log('Done!');
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });