import { Command } from 'commander';
import chalk from 'chalk';
import { extractWip as extractGitWip, isGitRepository } from '../git/wip';
import logger from '../utils/logger';

/**
 * Extract work-in-progress from the current repository
 */
async function extractWipAction(options: { log?: boolean }): Promise<void> {
  const cwd = process.cwd();

  // Check if it's a git repository
  if (!isGitRepository(cwd)) {
    console.log(chalk.red('⨯ Not a git repository'));
    console.log(chalk.blue('💡 Run this command from within a git repository'));
    process.exit(1);
  }

  if (options.log) {
    console.log(chalk.blue('📝 Extracting work-in-progress...'));
  }

  // Extract WIP info
  const wipInfo = extractGitWip(cwd);

  if (!wipInfo.hasChanges) {
    if (options.log) {
      console.log(chalk.yellow('No uncommitted changes found.'));
    }
    return;
  }

  if (options.log) {
    console.log(chalk.green('✓ Found changes:'));
    console.log('');
    console.log(wipInfo.summary);
  } else {
    // Simply output to stdout without logging
    console.log(wipInfo.summary);
  }
}

export const wipCommand = new Command('wip')
  .description('Extract work-in-progress from current repository')
  .option('--log', 'Show verbose logging')
  .action(extractWipAction);
