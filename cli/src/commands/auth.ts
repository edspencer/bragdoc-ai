import { Command } from 'commander';
import chalk from 'chalk';
import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { loadConfig, saveConfig } from '../config';
import { getDeviceName } from '../utils/device';
import fetch from 'node-fetch';
import logger from '../utils/logger';

interface AuthConfig {
  token?: string;
  expiresAt?: number;
}

interface TokenResponse {
  token: string;
  expiresAt: number;
}

const BASE_URL = process.env.BRAGDOC_URL || 'https://ngrok.edspencer.net';

/**
 * Start a local server to receive the auth token
 */
async function startAuthServer(state: string, deviceName: string): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    logger.debug('Starting local server...');
    const server = createServer((req, res) => {
      // Enable CORS for the browser to connect
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      logger.debug(`Received ${req.method} request`);
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            logger.debug('Received body:', body);
            const { token, state: receivedState } = JSON.parse(body);
            
            logger.debug('Comparing states:', { expected: state, received: receivedState });
            // Verify state parameter
            if (state !== receivedState) {
              throw new Error('Invalid state parameter');
            }
            
            res.writeHead(200);
            res.end('OK');
            server.close();
            logger.debug('Successfully received token');
            resolve({ token, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
          } catch (err) {
            logger.error('Error processing request:', err);
            res.writeHead(400);
            res.end('Invalid request');
            reject(err);
          }
        });
      } else {
        res.writeHead(405);
        res.end('Method not allowed');
      }
    });

    // Listen on all interfaces
    server.listen(5556, '0.0.0.0', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to start server');
      }
      logger.debug(`Server listening on port ${address.port}`);
    });

    server.on('error', (err) => {
      logger.error('Server error:', err);
      reject(err);
    });
  });
}

/**
 * Login to bragdoc
 */
async function login() {
  try {
    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex');
    
    logger.debug('Starting authentication...');
    
    // Get device name
    const deviceName = await getDeviceName();
    
    // Start server
    logger.debug('Starting local server...');
    const tokenPromise = startAuthServer(state, deviceName);
    
    // Open browser
    const authUrl = `${BASE_URL}/cli-auth?state=${state}&port=5556`;
    logger.debug('Opening browser for authentication...');
    const open = await import('open');
    await open.default(authUrl);
    
    // Wait for token
    logger.debug('Waiting for authentication to complete...');
    const { token, expiresAt } = await tokenPromise;
    
    // Save tokens
    const config = await loadConfig();
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
    delete config.auth;
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
      logger.warn('Not authenticated');
      return;
    }
    
    const expiresIn = Math.floor((auth.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    if (expiresIn <= 0) {
      logger.warn('Authentication expired');
      return;
    }
    
    logger.info('Authenticated');
    logger.info(`Token expires in ${expiresIn} days`);
  } catch (error) {
    logger.error('Failed to check auth status');
    logger.debug('Error details:', error);
    process.exit(1);
  }
}

// Create the auth command
export const authCommand = new Command('auth')
  .description('Manage authentication')
  .addCommand(
    new Command('login')
      .description('Login to bragdoc')
      .action(login)
  )
  .addCommand(
    new Command('logout')
      .description('Logout from bragdoc')
      .action(logout)
  )
  .addCommand(
    new Command('status')
      .description('Show authentication status')
      .action(status)
  );

// Create top-level login/logout commands as aliases
export const loginCommand = new Command('login')
  .description('Login to bragdoc')
  .action(login);

export const logoutCommand = new Command('logout')
  .description('Logout from bragdoc')
  .action(logout);
