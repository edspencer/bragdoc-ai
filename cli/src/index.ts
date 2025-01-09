#!/usr/bin/env node

import { Command } from 'commander';
import { execSync } from 'child_process';
import fetch from 'node-fetch'; // npm install node-fetch
import path from 'path';
import fs from 'fs';
import { reposCommand } from './commands/repos';

/** Type describing a single Git commit. */
type GitCommit = {
  repository: string; // The name of the repo, provided by the user.
  hash: string;
  message: string; // Full commit message (title and body).
};

/**
 * Collects Git commit data for a given branch and maxCommits count.
 * If repository name is omitted, you can default it to something like
 * the directory name or a blank string.
 */
function collectGitCommits(
  branch: string,
  maxCommits: number,
  repositoryName: string
): GitCommit[] {
  // Get commit hash and full message (title + body).
  const logCommand = `git log ${branch} --pretty=format:"%H|||%B|||%an|||%ai" --max-count=${maxCommits}`;
  const output = execSync(logCommand).toString();

  // Each line from git log corresponds to one commit.
  // We split by newlines, then split each line by |||.
  const lines = output.split('\n').filter(line => line.trim() !== '');

  console.log(output)

  return lines.map(line => {
    const [hash, fullMessage, author, date] = line.split('|||');

    console.log(hash)
    console.log(fullMessage)

    return {
      repository: repositoryName,
      hash: hash.trim(),
      message: fullMessage.trim()
    };
  });
}

/**
 * Sends the collected commits to the (hypothetical) Bragdoc API.
 * Adjust the endpoint as needed; here we use /api/extract-from-commits.
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

// Create a Commander program for the CLI:
const program = new Command();

program
  .name('bragdoc')
  .description('CLI tool for managing your brag document')
  .version('0.1.0');

// Add the repos command
program.addCommand(reposCommand);

// The "extract" command collects Git commits and sends them to the API.
program
  .command('extract')
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
    const commits = collectGitCommits(branch, parseInt(maxCommits, 10), repositoryName);

    console.log(`Collected ${commits.length} commits from ${repositoryName} ...`);

    // Send them up to the Bragdoc service.
    try {
      console.log(commits)
      // await sendCommitsToBragDoc(commits, apiUrl, apiToken);
    } catch (err: any) {
      console.error(`Failed to send commits: ${err.message}`);
      process.exit(1);
    }

    console.log('Done!');
  });

// Parse the command line args.
program.parse(process.argv);
