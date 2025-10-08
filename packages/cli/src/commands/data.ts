import { Command } from 'commander';
import chalk from 'chalk';
import {
  fetchCompanies,
  fetchProjects,
  fetchStandups,
  fetchData,
} from '../utils/data';
import {
  getCompaniesCachePath,
  getProjectsCachePath,
  getStandupsCachePath,
  getMetaCachePath,
} from '../config/paths';
import { existsSync, unlinkSync } from 'node:fs';
import { UnauthenticatedError } from '../api/client';
import logger from '../utils/logger';

/**
 * Fetch all data from API
 */
async function fetchAllData() {
  try {
    console.log(chalk.blue('📊 Fetching all data from API...'));

    await fetchData({ force: true });

    console.log(chalk.green('✓ Successfully fetched and cached all data'));
    console.log(chalk.dim('  • Companies'));
    console.log(chalk.dim('  • Projects'));
    console.log(chalk.dim('  • Standups'));
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      console.log(chalk.yellow('⚠️  Not logged in.'));
      console.log(
        chalk.blue('💡 Run `bragdoc login` to authenticate with the web app.'),
      );
      return;
    }
    logger.error('Error fetching data:', error);
    console.error(chalk.red('Failed to fetch data:'), (error as Error).message);
  }
}

/**
 * Fetch companies data from API
 */
async function fetchCompaniesData() {
  try {
    console.log(chalk.blue('🏢 Fetching companies from API...'));

    await fetchCompanies({ force: true });

    console.log(
      chalk.green('✓ Successfully fetched and cached companies data'),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      console.log(chalk.yellow('⚠️  Not logged in.'));
      console.log(
        chalk.blue('💡 Run `bragdoc login` to authenticate with the web app.'),
      );
      return;
    }
    logger.error('Error fetching companies:', error);
    console.error(
      chalk.red('Failed to fetch companies:'),
      (error as Error).message,
    );
  }
}

/**
 * Fetch projects data from API
 */
async function fetchProjectsData() {
  try {
    console.log(chalk.blue('📁 Fetching projects from API...'));

    await fetchProjects({ force: true });

    console.log(chalk.green('✓ Successfully fetched and cached projects data'));
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      console.log(chalk.yellow('⚠️  Not logged in.'));
      console.log(
        chalk.blue('💡 Run `bragdoc login` to authenticate with the web app.'),
      );
      return;
    }
    logger.error('Error fetching projects:', error);
    console.error(
      chalk.red('Failed to fetch projects:'),
      (error as Error).message,
    );
  }
}

/**
 * Fetch standups data from API
 */
async function fetchStandupsData() {
  try {
    console.log(chalk.blue('👥 Fetching standups from API...'));

    await fetchStandups({ force: true });

    console.log(chalk.green('✓ Successfully fetched and cached standups data'));
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      console.log(chalk.yellow('⚠️  Not logged in.'));
      console.log(
        chalk.blue('💡 Run `bragdoc login` to authenticate with the web app.'),
      );
      return;
    }
    logger.error('Error fetching standups:', error);
    console.error(
      chalk.red('Failed to fetch standups:'),
      (error as Error).message,
    );
  }
}

/**
 * Clear all data cache files
 */
async function clearDataCache() {
  try {
    const cachePaths = [
      { path: getCompaniesCachePath(), name: 'companies' },
      { path: getProjectsCachePath(), name: 'projects' },
      { path: getStandupsCachePath(), name: 'standups' },
      { path: getMetaCachePath(), name: 'meta' },
    ];

    let deletedCount = 0;
    for (const { path, name } of cachePaths) {
      if (existsSync(path)) {
        unlinkSync(path);
        console.log(chalk.dim(`  Deleted ${name} cache`));
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      console.log(chalk.yellow('No cache files found to delete'));
    } else {
      console.log(chalk.green('✓ Data cache cleared'));
    }
  } catch (error) {
    logger.error('Error clearing data cache:', error);
    console.error(
      chalk.red('Failed to clear cache:'),
      (error as Error).message,
    );
  }
}

// Main data command
export const dataCommand = new Command('data')
  .description('Manage local data cache')
  .addCommand(
    new Command('fetch')
      .description('Fetch all data from API')
      .action(fetchAllData),
  )
  .addCommand(
    new Command('clear')
      .description('Clear local data cache')
      .action(clearDataCache),
  );
