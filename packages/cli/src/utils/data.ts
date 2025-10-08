import { createApiClient } from '../api/client';
import { loadConfig } from '../config';
import {
  getCompaniesCachePath,
  getProjectsCachePath,
  getStandupsCachePath,
  getMetaCachePath,
  getDataCacheDir,
} from '../config/paths';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
import logger from './logger';

export interface FetchOptions {
  force?: boolean;
  cacheTimeout?: number;
}

interface MetaCache {
  fetchedAt: {
    companies?: number;
    projects?: number;
    standups?: number;
  };
}

/**
 * Read the meta cache file
 */
function readMetaCache(): MetaCache {
  try {
    const metaPath = getMetaCachePath();
    if (!existsSync(metaPath)) {
      return { fetchedAt: {} };
    }
    const content = readFileSync(metaPath, 'utf-8');
    return YAML.parse(content) as MetaCache;
  } catch (error) {
    logger.error('Error reading meta cache:', error);
    return { fetchedAt: {} };
  }
}

/**
 * Write the meta cache file
 */
function writeMetaCache(meta: MetaCache): void {
  try {
    const dataCacheDir = getDataCacheDir();
    mkdirSync(dataCacheDir, { recursive: true });

    const yamlString = YAML.stringify(meta);
    writeFileSync(getMetaCachePath(), yamlString, 'utf-8');
  } catch (error) {
    logger.error('Error writing meta cache:', error);
  }
}

/**
 * Update the timestamp for a specific cache key
 */
function updateMetaTimestamp(key: 'companies' | 'projects' | 'standups'): void {
  const meta = readMetaCache();
  meta.fetchedAt[key] = Date.now();
  writeMetaCache(meta);
}

/**
 * Check if cache is still valid based on timeout
 */
function isCacheValid(
  key: 'companies' | 'projects' | 'standups',
  cacheTimeout: number,
): boolean {
  const meta = readMetaCache();
  const timestamp = meta.fetchedAt[key];

  if (!timestamp) {
    return false;
  }

  const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
  return ageMinutes < cacheTimeout;
}

/**
 * Fetch companies from API or cache
 */
export async function fetchCompanies(
  options: FetchOptions = {},
): Promise<any[]> {
  try {
    const config = await loadConfig();
    const cacheTimeout =
      options.cacheTimeout ?? config.settings.dataCacheTimeout ?? 5;

    // Check if cache is valid and force is not set
    if (!options.force && isCacheValid('companies', cacheTimeout)) {
      const cachePath = getCompaniesCachePath();
      if (existsSync(cachePath)) {
        logger.debug('Using cached companies data');
        const content = readFileSync(cachePath, 'utf-8');
        return YAML.parse(content) as any[];
      }
    }

    // Fetch from API
    logger.debug('Fetching companies from API');
    const apiClient = await createApiClient();
    const companies = await apiClient.get<any[]>('/api/companies');

    // Write to cache
    const dataCacheDir = getDataCacheDir();
    mkdirSync(dataCacheDir, { recursive: true });
    writeFileSync(getCompaniesCachePath(), YAML.stringify(companies), 'utf-8');

    // Update meta timestamp
    updateMetaTimestamp('companies');

    return companies;
  } catch (error) {
    logger.error('Error fetching companies:', error);
    throw error;
  }
}

/**
 * Fetch projects from API or cache
 */
export async function fetchProjects(
  options: FetchOptions = {},
): Promise<any[]> {
  try {
    const config = await loadConfig();
    const cacheTimeout =
      options.cacheTimeout ?? config.settings.dataCacheTimeout ?? 5;

    // Check if cache is valid and force is not set
    if (!options.force && isCacheValid('projects', cacheTimeout)) {
      const cachePath = getProjectsCachePath();
      if (existsSync(cachePath)) {
        logger.debug('Using cached projects data');
        const content = readFileSync(cachePath, 'utf-8');
        return YAML.parse(content) as any[];
      }
    }

    // Fetch from API
    logger.debug('Fetching projects from API');
    const apiClient = await createApiClient();
    const projects = await apiClient.get<any[]>('/api/projects');

    // Write to cache
    const dataCacheDir = getDataCacheDir();
    mkdirSync(dataCacheDir, { recursive: true });
    writeFileSync(getProjectsCachePath(), YAML.stringify(projects), 'utf-8');

    // Update meta timestamp
    updateMetaTimestamp('projects');

    return projects;
  } catch (error) {
    logger.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Fetch standups from API or cache
 */
export async function fetchStandups(
  options: FetchOptions = {},
): Promise<any[]> {
  try {
    const config = await loadConfig();
    const cacheTimeout =
      options.cacheTimeout ?? config.settings.dataCacheTimeout ?? 5;

    // Check if cache is valid and force is not set
    if (!options.force && isCacheValid('standups', cacheTimeout)) {
      const cachePath = getStandupsCachePath();
      if (existsSync(cachePath)) {
        logger.debug('Using cached standups data');
        const content = readFileSync(cachePath, 'utf-8');
        return YAML.parse(content) as any[];
      }
    }

    // Fetch from API
    logger.debug('Fetching standups from API');
    const apiClient = await createApiClient();

    // The API returns { standups: [...] }
    const response = await apiClient.get<{ standups: any[] }>('/api/standups');
    const standups = response.standups;

    // Write to cache
    const dataCacheDir = getDataCacheDir();
    mkdirSync(dataCacheDir, { recursive: true });
    writeFileSync(getStandupsCachePath(), YAML.stringify(standups), 'utf-8');

    // Update meta timestamp
    updateMetaTimestamp('standups');

    return standups;
  } catch (error) {
    logger.error('Error fetching standups:', error);
    throw error;
  }
}

/**
 * Fetch all data from API (companies, projects, standups)
 */
export async function fetchData(options: FetchOptions = {}): Promise<void> {
  logger.debug('Fetching all data from API');

  await Promise.all([
    fetchCompanies({ force: true, ...options }),
    fetchProjects({ force: true, ...options }),
    fetchStandups({ force: true, ...options }),
  ]);

  logger.debug('Successfully fetched all data');
}
