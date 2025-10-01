import { homedir } from 'node:os';
import { join } from 'node:path';

import type { BragdocConfig } from './types';

/**
 * Get the path to the bragdoc config directory
 */
export function getConfigDir(): string {
  return join(homedir(), '.bragdoc');
}

export function getLogsDir(): string {
  return join(getConfigDir(), 'logs');
}

/**
 * Get the path to the cache directory
 */
export function getCacheDir(): string {
  return join(getConfigDir(), 'cache');
}

/**
 * Get the path to the commits cache directory
 */
export function getCommitsCacheDir(): string {
  return join(getCacheDir(), 'commits');
}

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.yml');
}

/**
 * Get the API base URL from config or use default
 */
export function getApiBaseUrl(config: BragdocConfig): string {
  return config.settings.apiBaseUrl || 'https://www.bragdoc.ai';
}
