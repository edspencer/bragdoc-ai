import { createServer } from 'node:http';
import logger from '../utils/logger';

export interface TokenResponse {
  token: string;
  expiresAt: number;
}

/**
 * Start a local server to receive the auth token from browser OAuth flow
 * @param state - CSRF protection state parameter
 * @param deviceName - Name of the device for logging
 * @param apiUrl - API base URL (used for logging/debugging)
 * @returns Promise resolving to token and expiration
 */
export async function startAuthServer(
  state: string,
  _deviceName: string,
  _apiUrl: string,
): Promise<TokenResponse> {
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
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            logger.debug('Received body:', body);
            const { token, state: receivedState } = JSON.parse(body);

            logger.debug('Comparing states:', {
              expected: state,
              received: receivedState,
            });
            // Verify state parameter
            if (state !== receivedState) {
              throw new Error('Invalid state parameter');
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));

            // Close server after response is fully sent
            setTimeout(() => {
              server.close();
              logger.debug('Successfully received token');
            }, 100);

            resolve({
              token,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            });
          } catch (err) {
            logger.error('Error processing request:', err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request' }));
            reject(err);
          }
        });
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
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
