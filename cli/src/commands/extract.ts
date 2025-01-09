import { Command } from 'commander';
import path from 'path';
import fetch from 'node-fetch';
import { collectGitCommits } from '../git/operations';
import { GitCommit } from '../git/types';

/**
 * Sends the collected commits to the Bragdoc API.
 */
async function sendCommitsToBragDoc(
  commits: GitCommit[],
  bragdocApiUrl: string,
  apiToken: string
) {
  const payload = { commits };

  const response = await fetch(`${bragdocApiUrl}/api/extract-from-commits`, {
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

  console.log('Commits sent successfully!');
}

export const extractCommand = new Command('extract')
  .description('Extract commits from repositories')
  .option('--branch <branch>', 'Git branch to read commits from', 'main')
  .option('--max-commits <number>', 'Number of commits to retrieve', '50')
  .option('--repo <name>', 'Label for this repository', '')
  .option('--api-token <token>', 'Bragdoc API token')
  .option(
    '--api-url <url>',
    'Bragdoc API base URL (default: https://api.bragdoc.ai)',
    'https://api.bragdoc.ai'
  )
  .action(async (options) => {
    const {
      branch,
      maxCommits,
      repo,
      apiToken,
      apiUrl
    } = options;

    // Make sure user provided an API token.
    if (!apiToken) {
      console.error('Error: Missing --api-token option.');
      process.exit(1);
    }

    // Collect the Git commits locally.
    // If --repo is not specified, use the current folder name by default.
    const repositoryName = repo || path.basename(process.cwd());
    const commits = await collectGitCommits(branch, parseInt(maxCommits, 10), repositoryName);

    console.log(`Collected ${commits.length} commits from ${repositoryName} ...`);

    // Send them up to the Bragdoc service.
    try {
      await sendCommitsToBragDoc(commits, apiUrl, apiToken);
    } catch (err: any) {
      console.error(`Failed to send commits: ${err.message}`);
      process.exit(1);
    }

    console.log('Done!');
  });
