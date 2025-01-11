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

  private getCachePath(repoName: string): string {
    // Sanitize repo name for filesystem
    const safeName = repoName.replace(/[^a-zA-Z0-9-]/g, '_');
    return path.join(this.cacheDir, `${safeName}.txt`);
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
   * Add commit hashes to cache for a repository
   */
  async add(repoName: string, commitHashes: string[]): Promise<void> {
    if (!commitHashes.length) return;

    const cachePath = this.getCachePath(repoName);
    try {
      // Ensure cache directory exists
      await this.init();

      // Get existing hashes
      const existing = await this.list(repoName);
      const newHashes = commitHashes.filter(hash => !existing.includes(hash));

      if (newHashes.length === 0) return;

      // Update in-memory cache
      const repoHashes = this.cachedHashes.get(repoName) || new Set();
      newHashes.forEach(hash => repoHashes.add(hash));
      this.cachedHashes.set(repoName, repoHashes);

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
   * Check if a commit hash exists in cache
   */
  async has(repoName: string, commitHash: string): Promise<boolean> {
    try {
      // Check in-memory cache first
      const repoHashes = this.cachedHashes.get(repoName);
      if (repoHashes) {
        return repoHashes.has(commitHash);
      }

      // Load from file if not in memory
      const hashes = await this.list(repoName);
      
      // Cache in memory for future lookups
      this.cachedHashes.set(repoName, new Set(hashes));
      
      return hashes.includes(commitHash);
    } catch (error: any) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  /**
   * List all cached commit hashes for a repository
   */
  async list(repoName: string): Promise<string[]> {
    // Check in-memory cache first
    const repoHashes = this.cachedHashes.get(repoName);
    if (repoHashes) {
      return Array.from(repoHashes);
    }

    const cachePath = this.getCachePath(repoName);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const hashes = content.split('\n').filter(Boolean);
      
      // Cache in memory for future lookups
      this.cachedHashes.set(repoName, new Set(hashes));
      
      return hashes;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`Failed to read cache: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Clear cache for a repository or all repositories
   */
  async clear(repoName?: string): Promise<void> {
    try {
      if (repoName) {
        // Clear specific repository cache
        const cachePath = this.getCachePath(repoName);
        try {
          logger.debug(`Deleting cache file: ${cachePath}`);
          await fs.unlink(cachePath);
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error;
        }
        
        // Clear in-memory cache
        this.cachedHashes.delete(repoName);
      } else {
        // Clear all repository caches
        try {
          logger.debug(`Clearing all cache files in directory: ${this.cacheDir}`);
          const files = await fs.readdir(this.cacheDir) as (string | Dirent)[];
          await Promise.all(
            files.map(file => 
              typeof file === 'string' 
                ? fs.unlink(path.join(this.cacheDir, file))
                : fs.unlink(path.join(this.cacheDir, file.name))
            )
          );
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error;
        }
        
        // Clear in-memory cache
        this.cachedHashes.clear();
      }
    } catch (error: any) {
      throw new Error(`Failed to clear cache: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get statistics about the cache
   */
  async getStats(repoName?: string): Promise<{
    repositories: number;
    commits: number;
    repoStats?: { [key: string]: number };
  }> {
    try {
      if (repoName) {
        const commits = await this.list(repoName);
        return {
          repositories: 1,
          commits: commits.length,
          repoStats: { [repoName]: commits.length }
        };
      }

      const repoStats: { [key: string]: number } = {};
      let totalCommits = 0;

      try {
        logger.debug(`Getting stats for all repositories in directory: ${this.cacheDir}`);
        const files = await fs.readdir(this.cacheDir) as (string | Dirent)[];
        await Promise.all(
          files.map(async file => {
            const fileName = typeof file === 'string' ? file : file.name;
            const repoName = path.basename(fileName, '.txt');
            const commits = await this.list(repoName);
            repoStats[repoName] = commits.length;
            totalCommits += commits.length;
          })
        );

        return {
          repositories: files.length,
          commits: totalCommits,
          repoStats
        };
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return { repositories: 0, commits: 0, repoStats: {} };
        }
        throw error;
      }
    } catch (error: any) {
      throw new Error(`Failed to get cache stats: ${error?.message || 'Unknown error'}`);
    }
  }
}
