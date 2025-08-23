"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitCache = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("../config");
const paths_1 = require("../config/paths");
const logger_1 = __importDefault(require("../utils/logger")); // Assuming logger is defined in this file
class CommitCache {
    constructor() {
        this.cachedHashes = new Map();
        this.cacheDir = (0, paths_1.getCommitsCacheDir)();
    }
    getCachePath(repoName) {
        // Sanitize repo name for filesystem
        const safeName = repoName.replace(/[^a-zA-Z0-9-]/g, '_');
        return node_path_1.default.join(this.cacheDir, `${safeName}.txt`);
    }
    /**
     * Initialize cache directory if it doesn't exist
     */
    async init() {
        try {
            await (0, config_1.ensureConfigDir)();
        }
        catch (error) {
            throw new Error(`Failed to initialize cache directory: ${error.message}`);
        }
    }
    /**
     * Add commit hashes to cache for a repository
     */
    async add(repoName, commitHashes) {
        if (!commitHashes.length)
            return;
        const cachePath = this.getCachePath(repoName);
        try {
            // Ensure cache directory exists
            await this.init();
            // Get existing hashes
            const existing = await this.list(repoName);
            const newHashes = commitHashes.filter(hash => !existing.includes(hash));
            if (newHashes.length === 0)
                return;
            // Update in-memory cache
            const repoHashes = this.cachedHashes.get(repoName) || new Set();
            newHashes.forEach(hash => repoHashes.add(hash));
            this.cachedHashes.set(repoName, repoHashes);
            logger_1.default.debug(`Cache path: ${cachePath}`);
            logger_1.default.debug(`Existing hashes: ${existing.length}`);
            logger_1.default.debug(`New hashes: ${newHashes.length}`);
            // Append new hashes
            await promises_1.default.appendFile(cachePath, `${newHashes.join('\n')}\n`, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to add commits to cache: ${error.message}`);
        }
    }
    /**
     * Check if a commit hash exists in cache
     */
    async has(repoName, commitHash) {
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
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return false;
            throw error;
        }
    }
    /**
     * List all cached commit hashes for a repository
     */
    async list(repoName) {
        // Check in-memory cache first
        const repoHashes = this.cachedHashes.get(repoName);
        if (repoHashes) {
            return Array.from(repoHashes);
        }
        const cachePath = this.getCachePath(repoName);
        try {
            const content = await promises_1.default.readFile(cachePath, 'utf-8');
            const hashes = content.split('\n').filter(Boolean);
            // Cache in memory for future lookups
            this.cachedHashes.set(repoName, new Set(hashes));
            return hashes;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return [];
            throw new Error(`Failed to read cache: ${error?.message || 'Unknown error'}`);
        }
    }
    /**
     * Clear cache for a repository or all repositories
     */
    async clear(repoName) {
        try {
            if (repoName) {
                // Clear specific repository cache
                const cachePath = this.getCachePath(repoName);
                try {
                    logger_1.default.debug(`Deleting cache file: ${cachePath}`);
                    await promises_1.default.unlink(cachePath);
                }
                catch (error) {
                    if (error.code !== 'ENOENT')
                        throw error;
                }
                // Clear in-memory cache
                this.cachedHashes.delete(repoName);
            }
            else {
                // Clear all repository caches
                try {
                    logger_1.default.debug(`Clearing all cache files in directory: ${this.cacheDir}`);
                    const files = await promises_1.default.readdir(this.cacheDir);
                    await Promise.all(files.map(file => typeof file === 'string'
                        ? promises_1.default.unlink(node_path_1.default.join(this.cacheDir, file))
                        : promises_1.default.unlink(node_path_1.default.join(this.cacheDir, file.name))));
                }
                catch (error) {
                    if (error.code !== 'ENOENT')
                        throw error;
                }
                // Clear in-memory cache
                this.cachedHashes.clear();
            }
        }
        catch (error) {
            throw new Error(`Failed to clear cache: ${error?.message || 'Unknown error'}`);
        }
    }
    /**
     * Get statistics about the cache
     */
    async getStats(repoName) {
        try {
            if (repoName) {
                const commits = await this.list(repoName);
                return {
                    repositories: 1,
                    commits: commits.length,
                    repoStats: { [repoName]: commits.length }
                };
            }
            const repoStats = {};
            let totalCommits = 0;
            try {
                logger_1.default.debug(`Getting stats for all repositories in directory: ${this.cacheDir}`);
                const files = await promises_1.default.readdir(this.cacheDir);
                await Promise.all(files.map(async (file) => {
                    const fileName = typeof file === 'string' ? file : file.name;
                    const repoName = node_path_1.default.basename(fileName, '.txt');
                    const commits = await this.list(repoName);
                    repoStats[repoName] = commits.length;
                    totalCommits += commits.length;
                }));
                return {
                    repositories: files.length,
                    commits: totalCommits,
                    repoStats
                };
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    return { repositories: 0, commits: 0, repoStats: {} };
                }
                throw error;
            }
        }
        catch (error) {
            throw new Error(`Failed to get cache stats: ${error?.message || 'Unknown error'}`);
        }
    }
}
exports.CommitCache = CommitCache;
