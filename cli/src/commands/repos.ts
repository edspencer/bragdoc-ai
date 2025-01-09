import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config';
import { validateRepository } from '../utils/git';
import { Repository } from '../config/types';

import { resolve } from 'path';

/**
 * Normalize a repository path to an absolute path
 */
export function normalizeRepoPath(path: string): string {
  return resolve(path);
}

export const reposCommand = new Command('repos')
  .description('Manage repositories for bragdoc')
  .addCommand(
    new Command('list')
      .description('List all configured repositories')
      .action(listRepos)
  )
  .addCommand(
    new Command('add')
      .description('Add a repository to bragdoc')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .option('-n, --name <name>', 'Friendly name for the repository')
      .option('-m, --max-commits <number>', 'Maximum number of commits to extract')
      .action(addRepo)
  )
  .addCommand(
    new Command('remove')
      .description('Remove a repository from bragdoc')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .action(removeRepo)
  )
  .addCommand(
    new Command('update')
      .description('Update repository settings')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .option('-n, --name <name>', 'Update friendly name')
      .option('-m, --max-commits <number>', 'Update maximum commits')
      .action(updateRepo)
  )
  .addCommand(
    new Command('enable')
      .description('Enable a repository')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .action((path) => toggleRepo(path, true))
  )
  .addCommand(
    new Command('disable')
      .description('Disable a repository')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .action((path) => toggleRepo(path, false))
  );

/**
 * Format repository for display
 */
function formatRepo(repo: Repository, defaultMaxCommits: number): string {
  const status = repo.enabled ? chalk.green('✓') : chalk.red('⨯');
  const name = repo.name ? `${repo.name} ` : '';
  const maxCommits = repo.maxCommits || defaultMaxCommits;
  const disabled = !repo.enabled ? ' [disabled]' : '';
  
  return `${status} ${name}(${repo.path}) [max: ${maxCommits}]${disabled}`;
}

/**
 * List all repositories
 */
export async function listRepos() {
  const config = await loadConfig();
  
  if (config.repositories.length === 0) {
    console.log('No repositories configured. Add one with: bragdoc repos add <path>');
    return;
  }
  
  console.log('Configured repositories:');
  config.repositories.forEach(repo => {
    console.log(formatRepo(repo, config.settings.defaultMaxCommits));
  });
}

/**
 * Add a new repository
 */
export async function addRepo(path: string = process.cwd(), options: { name?: string; maxCommits?: number } = {}) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);
  
  // Validate repository
  await validateRepository(absolutePath);
  
  // Check for duplicates
  if (config.repositories.some(r => r.path === absolutePath)) {
    throw new Error('Repository already exists in configuration');
  }
  
  // Add repository
  const newRepo: Repository = {
    path: absolutePath,
    name: options.name,
    enabled: true,
    maxCommits: options.maxCommits ? parseInt(options.maxCommits.toString(), 10) : undefined,
  };
  
  config.repositories.push(newRepo);
  await saveConfig(config);
  
  console.log(`Added repository: ${formatRepo(newRepo, config.settings.defaultMaxCommits)}`);
}

/**
 * Remove a repository
 */
export async function removeRepo(path: string = process.cwd()) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);
  
  const index = config.repositories.findIndex(r => r.path === absolutePath);
  if (index === -1) {
    throw new Error('Repository not found in configuration');
  }
  
  config.repositories.splice(index, 1);
  await saveConfig(config);
  
  console.log(`Removed repository: ${absolutePath}`);
}

/**
 * Update repository settings
 */
export async function updateRepo(
  path: string = process.cwd(),
  options: { name?: string; maxCommits?: number } = {}
) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);
  
  const repo = config.repositories.find(r => r.path === absolutePath);
  if (!repo) {
    throw new Error('Repository not found in configuration');
  }
  
  if (options.name !== undefined) {
    repo.name = options.name;
  }
  
  if (options.maxCommits !== undefined) {
    repo.maxCommits = parseInt(options.maxCommits.toString(), 10);
  }
  
  await saveConfig(config);
  console.log(`Updated repository: ${formatRepo(repo, config.settings.defaultMaxCommits)}`);
}

/**
 * Enable or disable a repository
 */
export async function toggleRepo(path: string = process.cwd(), enabled: boolean) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);
  
  const repo = config.repositories.find(r => r.path === absolutePath);
  if (!repo) {
    throw new Error('Repository not found in configuration');
  }
  
  repo.enabled = enabled;
  await saveConfig(config);
  
  console.log(
    `${enabled ? 'Enabled' : 'Disabled'} repository: ${formatRepo(repo, config.settings.defaultMaxCommits)}`
  );
}
