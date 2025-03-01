
import { mkdir, chmod, readFile, writeFile, access } from 'node:fs/promises';
import { parse, stringify } from 'yaml';
import { type BragdocConfig, DEFAULT_CONFIG } from './types';

import {
  getCacheDir,
  getConfigDir,
  getConfigPath,
  getCommitsCacheDir,
} from './paths';

/**
 * Ensure all required directories exist with correct permissions
 */
export async function ensureConfigDir(): Promise<void> {
  const dirs = [
    getConfigDir(),
    getCacheDir(),
    getCommitsCacheDir()
  ];

  for (const dir of dirs) {
    try {
      await access(dir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(dir, { recursive: true });
      // Set directory permissions to 700 (drwx------)
      await chmod(dir, 0o700);
    }
  }
}

/**
 * Load the configuration file, creating a default if it doesn't exist
 */
export async function loadConfig(): Promise<BragdocConfig> {
  await ensureConfigDir();
  const configPath = getConfigPath();

  try {
    const content = await readFile(configPath, 'utf8');
    const config = parse(content) as BragdocConfig;
    
    // Merge with default config to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...config,
      settings: {
        ...DEFAULT_CONFIG.settings,
        ...(config.settings || {}),
      },
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create default config
      console.log('Creating new configuration file...');
      await saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

/**
 * Save the configuration file with correct permissions
 */
export async function saveConfig(config: BragdocConfig): Promise<void> {
  const configPath = getConfigPath();
  const yamlContent = stringify(config);
  
  await writeFile(configPath, yamlContent, { encoding: 'utf8', mode: 0o600 });
}
