"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutCommand = exports.loginCommand = exports.authCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const node_http_1 = require("node:http");
const node_crypto_1 = require("node:crypto");
const config_1 = require("../config");
const paths_1 = require("../config/paths");
const device_1 = require("../utils/device");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Start a local server to receive the auth token
 */
async function startAuthServer(state, deviceName, apiUrl) {
    return new Promise((resolve, reject) => {
        logger_1.default.debug('Starting local server...');
        const server = (0, node_http_1.createServer)((req, res) => {
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
            logger_1.default.debug(`Received ${req.method} request`);
            if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    try {
                        logger_1.default.debug('Received body:', body);
                        const { token, state: receivedState } = JSON.parse(body);
                        logger_1.default.debug('Comparing states:', { expected: state, received: receivedState });
                        // Verify state parameter
                        if (state !== receivedState) {
                            throw new Error('Invalid state parameter');
                        }
                        res.writeHead(200);
                        res.end('OK');
                        server.close();
                        logger_1.default.debug('Successfully received token');
                        resolve({ token, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
                    }
                    catch (err) {
                        logger_1.default.error('Error processing request:', err);
                        res.writeHead(400);
                        res.end('Invalid request');
                        reject(err);
                    }
                });
            }
            else {
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
            logger_1.default.debug(`Server listening on port ${address.port}`);
        });
        server.on('error', (err) => {
            logger_1.default.error('Server error:', err);
            reject(err);
        });
    });
}
/**
 * Login to bragdoc
 */
async function login(options) {
    try {
        const config = await (0, config_1.loadConfig)();
        const apiUrl = options.apiUrl || (0, paths_1.getApiBaseUrl)(config);
        logger_1.default.debug(`Using API base URL: ${apiUrl}`);
        // Generate state for CSRF protection
        const state = (0, node_crypto_1.randomBytes)(32).toString('hex');
        logger_1.default.debug('Starting authentication...');
        // Get device name
        const deviceName = await (0, device_1.getDeviceName)();
        // Start server
        logger_1.default.debug('Starting local server...');
        const tokenPromise = startAuthServer(state, deviceName, apiUrl);
        // Open browser
        const authUrl = `${apiUrl}/cli-auth?state=${state}&port=5556`;
        logger_1.default.debug('Opening browser for authentication...');
        const open = await import('open');
        await open.default(authUrl);
        // Wait for token
        logger_1.default.debug('Waiting for authentication to complete...');
        const { token, expiresAt } = await tokenPromise;
        // Save tokens
        config.auth = {
            token,
            expiresAt,
        };
        await (0, config_1.saveConfig)(config);
        console.log(chalk_1.default.green('Successfully authenticated!'));
    }
    catch (error) {
        logger_1.default.error('Authentication failed:', error);
        console.error(chalk_1.default.red('Authentication failed'));
        process.exit(1);
    }
}
/**
 * Logout from bragdoc
 */
async function logout() {
    try {
        const config = await (0, config_1.loadConfig)();
        config.auth = undefined;
        await (0, config_1.saveConfig)(config);
        console.log(chalk_1.default.green('Successfully logged out!'));
    }
    catch (error) {
        logger_1.default.error('Logout failed:', error);
        console.error(chalk_1.default.red('Logout failed'));
        process.exit(1);
    }
}
/**
 * Show auth status
 */
async function status() {
    try {
        const config = await (0, config_1.loadConfig)();
        const auth = config.auth;
        if (!auth?.token || !auth?.expiresAt) {
            console.log(chalk_1.default.yellow('Not authenticated'));
            return;
        }
        const expiresIn = Math.floor((auth.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        if (expiresIn <= 0) {
            console.log(chalk_1.default.yellow('Authentication expired'));
            return;
        }
        console.log(chalk_1.default.green('Authenticated'));
        console.log(chalk_1.default.gray(`Token expires in ${expiresIn} days`));
    }
    catch (error) {
        logger_1.default.error('Failed to check auth status');
        logger_1.default.debug('Error details:', error);
        console.error(chalk_1.default.red('Failed to check auth status'));
        process.exit(1);
    }
}
// Create the auth command
exports.authCommand = new commander_1.Command('auth')
    .description('Manage authentication')
    .addCommand(new commander_1.Command('login')
    .description('Login to bragdoc')
    .option('--api-url <url>', 'Override Bragdoc API base URL')
    .action(login))
    .addCommand(new commander_1.Command('logout')
    .description('Logout from bragdoc')
    .action(logout))
    .addCommand(new commander_1.Command('status')
    .description('Show authentication status')
    .action(status));
// Create top-level login/logout commands as aliases
exports.loginCommand = new commander_1.Command('login')
    .description('Log in to your Bragdoc account')
    .option('--api-url <url>', 'Override Bragdoc API base URL')
    .action(login);
exports.logoutCommand = new commander_1.Command('logout')
    .description('Logout from bragdoc')
    .action(logout);
