import fs from 'fs/promises';
import { Dirent } from 'fs';
import path from 'path';
import { CommitCache } from './commits';
import { ensureConfigDir } from '../config';
import { getCommitsCacheDir } from '../config/paths';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock config functions
jest.mock('../config', () => ({
  ensureConfigDir: jest.fn(),
}));

jest.mock('../config/paths', () => ({
  getCommitsCacheDir: jest.fn(() => '/mock/.bragdoc/cache/commits'),
}));

// Helper to create mock Dirent objects
function createMockDirent(name: string, isFile = true): Dirent {
  return {
    name,
    isFile: () => isFile,
    isDirectory: () => !isFile,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  } as Dirent;
}

describe('CommitCache', () => {
  let cache: CommitCache;
  const mockCacheDir = '/mock/.bragdoc/cache/commits';

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new CommitCache();
  });

  describe('init', () => {
    it('should ensure config directory exists', async () => {
      await cache.init();
      expect(ensureConfigDir).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Failed to create directory');
      (ensureConfigDir as jest.Mock).mockRejectedValueOnce(error);

      await expect(cache.init()).rejects.toThrow('Failed to initialize cache directory');
    });
  });

  describe('add', () => {
    it('should add new commit hashes to cache file', async () => {
      const repoName = 'test-repo';
      const hashes = ['hash1', 'hash2'];
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' }); // File doesn't exist yet
      
      await cache.add(repoName, hashes);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-repo.txt'),
        'hash1\nhash2\n',
        'utf-8'
      );
    });

    it('should only add new unique hashes', async () => {
      const repoName = 'test-repo';
      const existingContent = 'hash1\nhash3\n';
      mockFs.readFile.mockResolvedValueOnce(existingContent);

      await cache.add(repoName, ['hash1', 'hash2']);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-repo.txt'),
        'hash2\n',
        'utf-8'
      );
    });

    it('should handle empty hash array', async () => {
      await cache.add('test-repo', []);
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true if hash exists in cache', async () => {
      mockFs.readFile.mockResolvedValueOnce('hash1\nhash2\nhash3\n');
      
      const result = await cache.has('test-repo', 'hash2');
      expect(result).toBe(true);
    });

    it('should return false if hash does not exist', async () => {
      mockFs.readFile.mockResolvedValueOnce('hash1\nhash3\n');
      
      const result = await cache.has('test-repo', 'hash2');
      expect(result).toBe(false);
    });

    it('should return false if cache file does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });
      
      const result = await cache.has('test-repo', 'hash1');
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all cached hashes', async () => {
      const content = 'hash1\nhash2\nhash3\n';
      mockFs.readFile.mockResolvedValueOnce(content);

      const hashes = await cache.list('test-repo');
      expect(hashes).toEqual(['hash1', 'hash2', 'hash3']);
    });

    it('should return empty array if cache file does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

      const hashes = await cache.list('test-repo');
      expect(hashes).toEqual([]);
    });

    it('should filter out empty lines', async () => {
      const content = 'hash1\n\nhash2\n\n';
      mockFs.readFile.mockResolvedValueOnce(content);

      const hashes = await cache.list('test-repo');
      expect(hashes).toEqual(['hash1', 'hash2']);
    });
  });

  describe('clear', () => {
    it('should clear specific repository cache', async () => {
      await cache.clear('test-repo');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockCacheDir, 'test-repo.txt')
      );
    });

    it('should clear all repository caches', async () => {
      const files = [
        createMockDirent('repo1.txt'),
        createMockDirent('repo2.txt')
      ];
      mockFs.readdir.mockResolvedValueOnce(files);

      await cache.clear();

      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(mockCacheDir, 'repo1.txt'));
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(mockCacheDir, 'repo2.txt'));
    });

    it('should handle non-existent cache file', async () => {
      mockFs.unlink.mockRejectedValueOnce({ code: 'ENOENT' });
      
      await expect(cache.clear('test-repo')).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return stats for specific repository', async () => {
      const content = 'hash1\nhash2\nhash3\n';
      mockFs.readFile.mockResolvedValueOnce(content);

      const stats = await cache.getStats('test-repo');
      expect(stats).toEqual({
        repositories: 1,
        commits: 3,
        repoStats: { 'test-repo': 3 }
      });
    });

    it('should return stats for all repositories', async () => {
      const files = [
        createMockDirent('repo1.txt'),
        createMockDirent('repo2.txt')
      ];
      mockFs.readdir.mockResolvedValueOnce(files);
      mockFs.readFile.mockResolvedValueOnce('hash1\nhash2\n');
      mockFs.readFile.mockResolvedValueOnce('hash3\nhash4\nhash5\n');

      const stats = await cache.getStats();
      expect(stats).toEqual({
        repositories: 2,
        commits: 5,
        repoStats: {
          'repo1': 2,
          'repo2': 3
        }
      });
    });

    it('should handle empty cache directory', async () => {
      mockFs.readdir.mockRejectedValueOnce({ code: 'ENOENT' });

      const stats = await cache.getStats();
      expect(stats).toEqual({
        repositories: 0,
        commits: 0,
        repoStats: {}
      });
    });
  });
});
