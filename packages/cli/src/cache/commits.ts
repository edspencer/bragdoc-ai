import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { ensureConfigDir } from '../config';
import { getCommitsCacheDir } from '../config/paths';
import logger from '../utils/logger'; // Assuming logger is defined in this file

export class CommitCache {
  private readonly cacheDir: string;
  private cachedHashes: Map<string, Set<string>> = new Map();

  constructor() {
    this.cacheDir = getCommitsCacheDir();
  }

  /**
   * Get cache file path for a source.
   *
   * Phase 2 Update: Changed from repo name to sourceId for multi-source support.
   * sourceId is a UUID and is filesystem-safe, so no sanitization needed.
   *
   * Note: This is a breaking change for cache format but acceptable since
   * the cache rebuilds automatically on first extract with the new format.
   * Old repo-name cache files will be ignored.
   *
   * @param sourceId - UUID of the Source record
   * @returns Path to cache file for this source
   */
  private getCachePath(sourceId: string): string {
    // sourceId is UUID, already filesystem-safe
    return path.join(this.cacheDir, `${sourceId}.txt`);
  }

  /**
   * Initialize cache directory if it doesn't exist
   */
  async init(): Promise<void> {
    try {
      await ensureConfigDir();
    } catch (error: any) {
      throw new Error(`Failed to initialize cache directory: ${error.message}`);
    }
  }

  /**
   * Add commit hashes to cache for a source.
   *
   * Phase 2 Update: Changed from repoName to sourceId for multi-source support.
   *
   * @param sourceId - UUID of the Source record
   * @param commitHashes - Array of commit hash strings to cache
   * @throws Error if cache write fails
   */
  async add(sourceId: string, commitHashes: string[]): Promise<void> {
    if (!commitHashes.length) return;

    const cachePath = this.getCachePath(sourceId);
    try {
      // Ensure cache directory exists
      await this.init();

      // Get existing hashes
      const existing = await this.list(sourceId);
      const newHashes = commitHashes.filter((hash) => !existing.includes(hash));

      if (newHashes.length === 0) return;

      // Update in-memory cache
      const sourceHashes = this.cachedHashes.get(sourceId) || new Set();
      for (const hash of newHashes) {
        sourceHashes.add(hash);
      }
      this.cachedHashes.set(sourceId, sourceHashes);

      logger.debug(`Cache path: ${cachePath}`);
      logger.debug(`Existing hashes: ${existing.length}`);
      logger.debug(`New hashes: ${newHashes.length}`);

      // Append new hashes
      await fs.appendFile(cachePath, `${newHashes.join('\n')}\n`, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to add commits to cache: ${error.message}`);
    }
  }

  /**
   * Check if a commit hash exists in cache for a source.
   *
   * Phase 2 Update: Changed from repoName to sourceId for multi-source support.
   *
   * @param sourceId - UUID of the Source record
   * @param commitHash - Commit hash to check
   * @returns true if commit is cached, false otherwise
   */
  async has(sourceId: string, commitHash: string): Promise<boolean> {
    try {
      // Check in-memory cache first
      const sourceHashes = this.cachedHashes.get(sourceId);
      if (sourceHashes) {
        return sourceHashes.has(commitHash);
      }

      // Load from file if not in memory
      const hashes = await this.list(sourceId);

      // Cache in memory for future lookups
      this.cachedHashes.set(sourceId, new Set(hashes));

      return hashes.includes(commitHash);
    } catch (error: any) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  /**
   * List all cached commit hashes for a source.
   *
   * Phase 2 Update: Changed from repoName to sourceId for multi-source support.
   *
   * @param sourceId - UUID of the Source record
   * @returns Array of commit hashes in cache for this source
   */
  async list(sourceId: string): Promise<string[]> {
    // Check in-memory cache first
    const sourceHashes = this.cachedHashes.get(sourceId);
    if (sourceHashes) {
      return Array.from(sourceHashes);
    }

    const cachePath = this.getCachePath(sourceId);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const hashes = content.split('\n').filter(Boolean);

      // Cache in memory for future lookups
      this.cachedHashes.set(sourceId, new Set(hashes));

      return hashes;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw new Error(
        `Failed to read cache: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Clear cache for a specific source or all sources.
   *
   * Phase 2 Update: Changed from repoName to sourceId for multi-source support.
   *
   * @param sourceId - UUID of the Source record to clear, or undefined to clear all
   * @throws Error if cache clearing fails
   */
  async clear(sourceId?: string): Promise<void> {
    try {
      if (sourceId) {
        // Clear specific source cache
        const cachePath = this.getCachePath(sourceId);
        try {
          logger.debug(`Deleting cache file: ${cachePath}`);
          await fs.unlink(cachePath);
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error;
        }

        // Clear in-memory cache
        this.cachedHashes.delete(sourceId);
      } else {
        // Clear all source caches
        try {
          logger.debug(
            `Clearing all cache files in directory: ${this.cacheDir}`,
          );
          const files = (await fs.readdir(this.cacheDir)) as (
            | string
            | Dirent
          )[];
          await Promise.all(
            files.map((file) =>
              typeof file === 'string'
                ? fs.unlink(path.join(this.cacheDir, file))
                : fs.unlink(path.join(this.cacheDir, file.name)),
            ),
          );
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error;
        }

        // Clear in-memory cache
        this.cachedHashes.clear();
      }
    } catch (error: any) {
      throw new Error(
        `Failed to clear cache: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get statistics about the cache.
   *
   * Phase 2 Update: Changed from repoName to sourceId for multi-source support.
   *
   * @param sourceId - UUID of specific source, or undefined for all sources
   * @returns Statistics about cached commits
   */
  async getStats(sourceId?: string): Promise<{
    sources: number;
    commits: number;
    sourceStats?: { [key: string]: number };
  }> {
    try {
      if (sourceId) {
        const commits = await this.list(sourceId);
        return {
          sources: 1,
          commits: commits.length,
          sourceStats: { [sourceId]: commits.length },
        };
      }

      const sourceStats: { [key: string]: number } = {};
      let totalCommits = 0;

      try {
        logger.debug(
          `Getting stats for all sources in directory: ${this.cacheDir}`,
        );
        const files = (await fs.readdir(this.cacheDir)) as (string | Dirent)[];
        await Promise.all(
          files.map(async (file) => {
            const fileName = typeof file === 'string' ? file : file.name;
            const sourceId = path.basename(fileName, '.txt');
            const commits = await this.list(sourceId);
            sourceStats[sourceId] = commits.length;
            totalCommits += commits.length;
          }),
        );

        return {
          sources: files.length,
          commits: totalCommits,
          sourceStats,
        };
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return { sources: 0, commits: 0, sourceStats: {} };
        }
        throw error;
      }
    } catch (error: any) {
      throw new Error(
        `Failed to get cache stats: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
