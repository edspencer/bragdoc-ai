import { Command } from 'commander';
import chalk from 'chalk';
import { randomBytes } from 'node:crypto';
import { loadConfig, saveConfig } from '../config';
import { getApiBaseUrl } from '../config/paths';
import { getDeviceName } from '../utils/device';
import logger from '../utils/logger';
import { startAuthServer } from '../lib/auth';

interface AuthConfig {
  token?: string;
  expiresAt?: number;
}

/**
 * Login to bragdoc
 */
async function login(options: { apiUrl?: string }) {
  try {
    const config = await loadConfig();
    const apiUrl = options.apiUrl || getApiBaseUrl(config);

    logger.debug(`Using API base URL: ${apiUrl}`);

    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex');

    logger.debug('Starting authentication...');

    // Get device name
    const deviceName = await getDeviceName();

    // Start server
    logger.debug('Starting local server...');
    const tokenPromise = startAuthServer(state, deviceName, apiUrl);

    // Open browser
    const authUrl = `${apiUrl}/cli-auth?state=${state}&port=5556`;
    logger.debug('Opening browser for authentication...');
    const open = await import('open');
    await open.default(authUrl);

    // Wait for token
    logger.debug('Waiting for authentication to complete...');
    const { token, expiresAt } = await tokenPromise;

    // Save tokens
    config.auth = {
      token,
      expiresAt,
    };
    await saveConfig(config);

    console.log(chalk.green('Successfully authenticated!'));
  } catch (error) {
    logger.error('Authentication failed:', error);
    console.error(chalk.red('Authentication failed'));
    process.exit(1);
  }
}

/**
 * Logout from bragdoc
 */
async function logout() {
  try {
    const config = await loadConfig();
    config.auth = undefined;
    await saveConfig(config);
    console.log(chalk.green('Successfully logged out!'));
  } catch (error) {
    logger.error('Logout failed:', error);
    console.error(chalk.red('Logout failed'));
    process.exit(1);
  }
}

/**
 * Show auth status
 */
async function status() {
  try {
    const config = await loadConfig();
    const auth = config.auth as AuthConfig;

    if (!auth?.token || !auth?.expiresAt) {
      console.log(chalk.yellow('Not authenticated'));
      return;
    }

    const expiresIn = Math.floor(
      (auth.expiresAt - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (expiresIn <= 0) {
      console.log(chalk.yellow('Authentication expired'));
      return;
    }

    console.log(chalk.green('Authenticated'));
    console.log(chalk.gray(`Token expires in ${expiresIn} days`));
  } catch (error) {
    logger.error('Failed to check auth status');
    logger.debug('Error details:', error);
    console.error(chalk.red('Failed to check auth status'));
    process.exit(1);
  }
}

// Create the auth command
export const authCommand = new Command('auth')
  .description('Manage authentication')
  .addCommand(
    new Command('login')
      .description('Login to bragdoc')
      .option('--api-url <url>', 'Override Bragdoc API base URL')
      .action(login),
  )
  .addCommand(
    new Command('logout').description('Logout from bragdoc').action(logout),
  )
  .addCommand(
    new Command('status')
      .description('Show authentication status')
      .action(status),
  );

// Create top-level login/logout commands as aliases
export const loginCommand = new Command('login')
  .description('Log in to your Bragdoc account')
  .option('--api-url <url>', 'Override Bragdoc API base URL')
  .action(login);

export const logoutCommand = new Command('logout')
  .description('Logout from bragdoc')
  .action(logout);
