import os from 'os';
import path from 'path';

/**
 * Get the global .bragdoc directory path
 * This is where we store configuration, cache, and other global data
 */
export function getGlobalDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.bragdoc');
}

/**
 * Get the path to the global config file
 */
export function getConfigPath(): string {
  return path.join(getGlobalDir(), 'config.yml');
}

/**
 * Get the path to the cache directory
 */
export function getCachePath(): string {
  return path.join(getGlobalDir(), 'cache');
}

/**
 * Ensure all required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  const fs = await import('fs/promises');
  const dirs = [
    getGlobalDir(),
    getCachePath(),
    path.join(getCachePath(), 'commits')
  ];

  await Promise.all(
    dirs.map(dir => fs.mkdir(dir, { recursive: true }))
  );
}
