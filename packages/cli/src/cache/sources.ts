/**
 * Sources Cache - Local manifest of available sources
 *
 * Maintains a local copy of user sources to avoid repeated API calls during extraction.
 * Sources are fetched from the API and cached locally with a timestamp for staleness tracking.
 *
 * Cache File Location: ~/.bragdoc/cache/data/sources.yml
 *
 * Synchronization Strategy:
 * - On every extract: fetch fresh sources from API and update cache
 * - Fallback: if API unavailable, use cached sources with staleness warning
 * - Staleness warning: log warning if lastSynced > 7 days old
 */

import fs from 'node:fs/promises';
import * as YAML from 'yaml';
import { getSourcesCachePath, getDataCacheDir } from '../config/paths';
import type { ApiClient } from '../api/client';
import logger from '../utils/logger';

/**
 * Source type - mirrors database Source table
 */
export interface CachedSource {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  type: 'git' | 'github' | 'jira';
  config: Record<string, any>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sources cache file format
 */
interface SourcesCacheData {
  version: number;
  lastSynced: string;
  sources: CachedSource[];
}

/**
 * Sources Cache - Manages local source manifest synchronization
 *
 * Caches sources locally to optimize extraction performance and provide
 * fallback when API is temporarily unavailable.
 *
 * @example
 * const cache = new SourcesCache();
 * await cache.sync(apiClient);  // Fetch fresh sources
 * const sources = cache.getByProjectId(projectId);
 * for (const source of sources) {
 *   console.log(`${source.name}: ${source.type}`);
 * }
 */
export class SourcesCache {
  private readonly cachePath: string;
  private sources: Map<string, CachedSource> = new Map();
  private lastSynced: Date | null = null;

  constructor() {
    this.cachePath = getSourcesCachePath();
  }

  /**
   * Load sources from cache file.
   *
   * Reads sources.yml from disk and populates in-memory cache.
   * Handles missing file gracefully (returns empty cache).
   *
   * @throws Error if YAML parse fails or file system error occurs
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      const data = YAML.parse(content) as SourcesCacheData;

      if (!data || !data.sources) {
        logger.debug('Sources cache is empty or invalid');
        this.sources.clear();
        this.lastSynced = null;
        return;
      }

      // Populate in-memory cache
      this.sources.clear();
      for (const source of data.sources) {
        this.sources.set(source.id, source);
      }

      if (data.lastSynced) {
        this.lastSynced = new Date(data.lastSynced);
      }

      logger.debug(
        `Loaded ${this.sources.size} sources from cache (synced ${this.lastSynced ? this.lastSynced.toISOString() : 'never'})`,
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.debug('Sources cache file not found, starting with empty cache');
        this.sources.clear();
        this.lastSynced = null;
        return;
      }

      // YAML parse error or other file system error
      logger.error(
        `Failed to load sources cache: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.sources.clear();
      this.lastSynced = null;
    }
  }

  /**
   * Save sources to cache file.
   *
   * Writes sources.yml with current sources and updates lastSynced timestamp.
   * Creates cache directory if it doesn't exist.
   *
   * @throws Error if write fails
   */
  async save(): Promise<void> {
    try {
      // Ensure cache directory exists
      const dataCacheDir = getDataCacheDir();
      await fs.mkdir(dataCacheDir, { recursive: true });

      const data: SourcesCacheData = {
        version: 1,
        lastSynced: new Date().toISOString(),
        sources: Array.from(this.sources.values()),
      };

      const yaml = YAML.stringify(data);

      await fs.writeFile(this.cachePath, yaml, 'utf-8');
      this.lastSynced = new Date(data.lastSynced);

      logger.debug(
        `Saved ${this.sources.size} sources to cache at ${this.cachePath}`,
      );
    } catch (error: any) {
      throw new Error(
        `Failed to save sources cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Synchronize sources with API.
   *
   * Fetches latest sources from API and updates local cache.
   * Falls back to cached sources with warning if API unavailable.
   * Logs staleness warning if cache is > 7 days old.
   *
   * @param apiClient - Authenticated API client
   * @throws Error only if both API fetch and cache load fail completely
   */
  async sync(apiClient: ApiClient): Promise<void> {
    try {
      // Try to fetch fresh sources from API
      logger.debug('Fetching sources from API...');

      try {
        const response = await apiClient.get<{
          sources: CachedSource[];
        }>('/api/sources');

        if (response?.sources) {
          // Update in-memory cache with fresh data
          this.sources.clear();
          for (const source of response.sources) {
            this.sources.set(source.id, source);
          }

          // Save to disk
          await this.save();

          logger.debug(`Synced ${this.sources.size} sources from API`);
          return;
        }
      } catch (apiError: any) {
        logger.warn(
          `Failed to fetch sources from API: ${apiError.message || String(apiError)}`,
        );

        // Fall back to cached sources
        await this.load();

        if (this.sources.size > 0) {
          // Check staleness
          if (this.lastSynced) {
            const ageMs = Date.now() - this.lastSynced.getTime();
            const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

            if (ageDays > 7) {
              logger.warn(
                `Sources cache is ${ageDays} days old. Please check your internet connection and run extract again to refresh.`,
              );
            }
          }

          logger.info(
            `Using ${this.sources.size} cached sources (API unavailable)`,
          );
          return;
        }

        // No cached sources, propagate error
        throw apiError;
      }
    } catch (error: any) {
      throw new Error(
        `Failed to synchronize sources: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all sources for a project.
   *
   * Returns active (non-archived) sources belonging to the specified project.
   *
   * @param projectId - UUID of the project
   * @returns Array of sources for this project, empty if none found
   */
  getByProjectId(projectId: string): CachedSource[] {
    const sources = Array.from(this.sources.values()).filter(
      (source) => source.projectId === projectId && !source.isArchived,
    );

    return sources;
  }

  /**
   * Get a specific source by ID.
   *
   * @param sourceId - UUID of the source
   * @returns Source object or null if not found
   */
  getById(sourceId: string): CachedSource | null {
    return this.sources.get(sourceId) || null;
  }

  /**
   * Get all sources (for debugging/inspection).
   *
   * @returns Array of all cached sources
   */
  getAll(): CachedSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get number of cached sources.
   *
   * @returns Total count of sources in cache
   */
  count(): number {
    return this.sources.size;
  }

  /**
   * Get cache staleness info.
   *
   * @returns Date of last sync or null if never synced
   */
  getLastSynced(): Date | null {
    return this.lastSynced;
  }
}
