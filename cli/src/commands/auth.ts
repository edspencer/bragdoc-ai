import { Command } from 'commander';
import chalk from 'chalk';
import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { loadConfig, saveConfig } from '../config';
import { getDeviceName } from '../utils/device';
import fetch from 'node-fetch';

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
    // Find an available port
    const server = createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            const response = await fetch(`${BASE_URL}/api/cli/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state, deviceName }),
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json() as TokenResponse;
            res.writeHead(200);
            res.end('OK');
            server.close();
            resolve(data);
          } catch (err) {
            res.writeHead(400);
            res.end('Invalid request');
            reject(err);
          }
        });
      } else {
        res.writeHead(405);
        res.end('Method not allowed');
      }
    }).listen(0); // Let the OS assign a random port

    server.on('error', (err) => {
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
    
    console.log(chalk.blue('Starting authentication...'));
    
    // Get device name
    const deviceName = await getDeviceName();
    
    // Create and start server
    const server = createServer();
    const serverPromise = new Promise<number>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to start server');
        }
        resolve(address.port);
      });
    });
    
    const port = await serverPromise;
    
    // Open browser
    const authUrl = `${BASE_URL}/cli-auth?state=${state}&port=${port}`;
    console.log(chalk.blue('Opening browser for authentication...'));
    const open = await import('open');
    await open.default(authUrl);
    
    // Wait for token
    console.log(chalk.blue('Waiting for authentication to complete...'));
    const { token, expiresAt } = await startAuthServer(state, deviceName);
    
    // Save tokens
    const config = await loadConfig();
    config.auth = {
      token,
      expiresAt,
    };
    await saveConfig(config);
    
    console.log(chalk.green('Successfully authenticated!'));
  } catch (error) {
    console.error(chalk.red('Authentication failed:'), error);
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
    console.error(chalk.red('Logout failed:'), error);
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
    
    if (!auth?.token) {
      console.log(chalk.yellow('Not authenticated'));
      return;
    }
    
    const expiresIn = auth.expiresAt ? Math.floor((auth.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
    if (expiresIn <= 0) {
      console.log(chalk.yellow('Authentication expired'));
      return;
    }
    
    console.log(chalk.green('Authenticated'));
    console.log(chalk.gray(`Token expires in ${expiresIn} days`));
  } catch (error) {
    console.error(chalk.red('Failed to check auth status:'), error);
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
