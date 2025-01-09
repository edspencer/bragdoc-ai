import fs from 'fs/promises';
import { Dirent } from 'fs';
import path from 'path';
import { getCommitsCacheDir, ensureConfigDir } from '../config';

export class CommitCache {
  private readonly cacheDir: string;

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

      // Append new hashes
      await fs.appendFile(cachePath, newHashes.join('\n') + '\n', 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to add commits to cache: ${error.message}`);
    }
  }

  /**
   * Check if a commit hash exists in cache
   */
  async has(repoName: string, commitHash: string): Promise<boolean> {
    try {
      const hashes = await this.list(repoName);
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
    const cachePath = this.getCachePath(repoName);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      return content.split('\n').filter(Boolean); // Filter out empty lines
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
          await fs.unlink(cachePath);
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error;
        }
      } else {
        // Clear all repository caches
        try {
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
