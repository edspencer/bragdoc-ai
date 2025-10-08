import { mkdir, chmod, readFile, writeFile, access } from 'node:fs/promises';
import { parse, stringify } from 'yaml';
import { type BragdocConfig, DEFAULT_CONFIG } from './types';
import chalk from 'chalk';

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
  const dirs = [getConfigDir(), getCacheDir(), getCommitsCacheDir()];

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

    // Handle backwards compatibility: migrate legacy `repositories` to `projects`
    if (config.repositories && !config.projects) {
      console.log(
        chalk.yellow(
          '⚠️  Using legacy "repositories" field. Please update your config to use "projects" instead.',
        ),
      );
      config.projects = config.repositories;
    }

    // Handle backwards compatibility: migrate legacy `projectId` to `id` in projects
    if (config.projects) {
      for (const project of config.projects) {
        const legacyProject = project as any;
        if (
          'projectId' in legacyProject &&
          legacyProject.projectId &&
          !project.id
        ) {
          project.id = legacyProject.projectId;
        }
      }
    }

    // Ensure standups array exists
    if (!config.standups) {
      config.standups = [];
    }

    // Merge with default config to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...config,
      projects: config.projects || [],
      standups: config.standups || [],
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

  // Ensure config is in new format before saving
  // Remove legacy fields to enforce migration
  const configToSave = {
    ...config,
    projects: config.projects || [],
    standups: config.standups || [],
  };

  // Remove legacy fields
  configToSave.repositories = undefined;
  configToSave.standup = undefined;

  // Ensure projects use `id` field (not `projectId`)
  if (configToSave.projects) {
    for (const project of configToSave.projects) {
      if ('projectId' in project) {
        (project as any).projectId = undefined;
      }
    }
  }

  // Clean up orphaned standup configs (standups with no enrolled projects)
  if (configToSave.standups && configToSave.standups.length > 0) {
    configToSave.standups = configToSave.standups.filter((standup) => {
      const hasEnrolledProjects = configToSave.projects.some(
        (project) => project.standupId === standup.id,
      );
      return hasEnrolledProjects;
    });
  }

  const yamlContent = stringify(configToSave);

  await writeFile(configPath, yamlContent, { encoding: 'utf8', mode: 0o600 });
}
