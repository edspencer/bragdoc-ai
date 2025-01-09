import { Command } from 'commander';
import path from 'path';
import fetch from 'node-fetch';
import { collectGitCommits } from '../git/operations';
import { GitCommit } from '../git/types';

/**
 * Send commits to the Bragdoc API
 */
async function sendCommitsToBragDoc(
  commits: GitCommit[],
  apiUrl: string,
  apiToken: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/api/extract-from-commits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({ commits })
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
  .option('--branch <branch>', 'Git branch to read commits from', 'main')
  .option('--max-commits <number>', 'Number of commits to retrieve', '50')
  .option('--repo <name>', 'Label for this repository', '')
  .option('--api-token <token>', 'Bragdoc API token')
  .option(
    '--api-url <url>',
    'Bragdoc API base URL',
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

    // Make sure user provided an API token
    if (!apiToken) {
      console.error('Error: Missing --api-token option.');
      process.exit(1);
    }

    try {
      // If --repo is not specified, use the current folder name
      const repository = repo || path.basename(process.cwd());
      
      // Collect the Git commits
      console.log(`Collecting commits from ${repository}...`);
      const commits = collectGitCommits(
        branch,
        parseInt(maxCommits, 10),
        repository
      );
      console.log(`Collected ${commits.length} commits.`);

      // Send to Bragdoc API
      console.log('Sending commits to Bragdoc...');
      await sendCommitsToBragDoc(commits, apiUrl, apiToken);
      console.log('Done!');
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });
