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
 * Get the path to the data cache directory
 */
export function getDataCacheDir(): string {
  return join(getCacheDir(), 'data');
}

/**
 * Get the path to the companies cache file
 */
export function getCompaniesCachePath(): string {
  return join(getDataCacheDir(), 'companies.yml');
}

/**
 * Get the path to the projects cache file
 */
export function getProjectsCachePath(): string {
  return join(getDataCacheDir(), 'projects.yml');
}

/**
 * Get the path to the standups cache file
 */
export function getStandupsCachePath(): string {
  return join(getDataCacheDir(), 'standups.yml');
}

/**
 * Get the path to the meta cache file
 */
export function getMetaCachePath(): string {
  return join(getDataCacheDir(), 'meta.yml');
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
  return config.settings.apiBaseUrl || 'https://app.bragdoc.ai';
}
