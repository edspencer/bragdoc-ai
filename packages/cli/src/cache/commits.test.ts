import {
  readFile,
  writeFile,
  unlink,
  readdir,
  mkdir,
  chmod,
  appendFile,
} from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import { CommitCache } from './commits';

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn(),
  chmod: jest.fn(),
  appendFile: jest.fn(),
}));

describe('CommitCache', () => {
  const mockFs = {
    readFile: jest.mocked(readFile),
    writeFile: jest.mocked(writeFile),
    unlink: jest.mocked(unlink),
    readdir: jest.mocked(readdir),
    mkdir: jest.mocked(mkdir),
    chmod: jest.mocked(chmod),
    appendFile: jest.mocked(appendFile),
  };

  const TEST_CACHE_DIR = '/test/cache/dir';
  let cache: CommitCache;

  beforeEach(() => {
    jest.resetAllMocks();
    // Create a new instance and set its cache directory
    cache = new CommitCache();
    Object.defineProperty(cache, 'cacheDir', {
      value: TEST_CACHE_DIR,
      writable: false,
      configurable: true,
    });

    // Mock successful directory creation
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.chmod.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
  });

  describe('add', () => {
    it('should add new commit hashes to cache file', async () => {
      const repoName = 'test-repo';
      const hashes = ['hash1', 'hash2'];
      const cachePath = join(
        TEST_CACHE_DIR,
        `${repoName.replace(/[^a-zA-Z0-9-]/g, '_')}.txt`,
      );

      // Mock empty cache file
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

      await cache.add(repoName, hashes);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        cachePath,
        `${hashes.join('\n')}\n`,
        'utf-8',
      );
    });

    it('should only add new unique hashes', async () => {
      const repoName = 'test-repo';
      const existingHashes = ['hash1', 'hash2'];
      const newHashes = ['hash2', 'hash3'];
      const cachePath = join(
        TEST_CACHE_DIR,
        `${repoName.replace(/[^a-zA-Z0-9-]/g, '_')}.txt`,
      );

      // Mock existing cache file
      mockFs.readFile.mockResolvedValueOnce('hash1\nhash2\n');

      await cache.add(repoName, newHashes);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        cachePath,
        'hash3\n',
        'utf-8',
      );
    });
  });

  describe('has', () => {
    it('should return true if hash exists in cache', async () => {
      const repoName = 'test-repo';
      const hash = 'hash1';

      mockFs.readFile.mockResolvedValueOnce('hash1\nhash2\n');

      const result = await cache.has(repoName, hash);
      expect(result).toBe(true);
    });

    it('should return false if hash does not exist', async () => {
      const repoName = 'test-repo';
      const hash = 'hash3';

      mockFs.readFile.mockResolvedValueOnce('hash1\nhash2\n');

      const result = await cache.has(repoName, hash);
      expect(result).toBe(false);
    });

    it('should return false if cache file does not exist', async () => {
      const repoName = 'test-repo';
      const hash = 'hash1';

      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await cache.has(repoName, hash);
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all cached hashes', async () => {
      const repoName = 'test-repo';
      const hashes = ['hash1', 'hash2'];

      mockFs.readFile.mockResolvedValueOnce(hashes.join('\n'));

      const result = await cache.list(repoName);
      expect(result).toEqual(hashes);
    });

    it('should return empty array if cache file does not exist', async () => {
      const repoName = 'test-repo';

      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await cache.list(repoName);
      expect(result).toEqual([]);
    });

    it('should filter out empty lines', async () => {
      const repoName = 'test-repo';
      const hashes = ['hash1', '', 'hash2', ''];

      mockFs.readFile.mockResolvedValueOnce(hashes.join('\n'));

      const result = await cache.list(repoName);
      expect(result).toEqual(['hash1', 'hash2']);
    });
  });

  describe('clear', () => {
    it('should clear specific repository cache', async () => {
      const repoName = 'test-repo';
      const cachePath = join(
        TEST_CACHE_DIR,
        `${repoName.replace(/[^a-zA-Z0-9-]/g, '_')}.txt`,
      );

      await cache.clear(repoName);

      expect(mockFs.unlink).toHaveBeenCalledWith(cachePath);
    });

    it('should clear all repository caches', async () => {
      const files = [
        createMockDirent('test-repo1.txt'),
        createMockDirent('test-repo2.txt'),
      ];
      (mockFs.readdir as jest.Mock).mockResolvedValueOnce(files);

      await cache.clear();

      for (const file of files) {
        expect(mockFs.unlink).toHaveBeenCalledWith(
          join(TEST_CACHE_DIR, file.name),
        );
      }
    });

    it('should handle non-existent cache file', async () => {
      const repoName = 'test-repo';

      mockFs.unlink.mockRejectedValueOnce({ code: 'ENOENT' });

      await expect(cache.clear(repoName)).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return stats for specific repository', async () => {
      const repoName = 'test-repo';
      const hashes = ['hash1', 'hash2', 'hash3'];

      mockFs.readFile.mockResolvedValueOnce(hashes.join('\n'));

      const stats = await cache.getStats(repoName);
      expect(stats).toEqual({
        repositories: 1,
        commits: hashes.length,
        repoStats: {
          [repoName]: hashes.length,
        },
      });
    });

    it('should return stats for all repositories', async () => {
      const files = [
        createMockDirent('repo1.txt'),
        createMockDirent('repo2.txt'),
      ];
      (mockFs.readdir as jest.Mock).mockResolvedValueOnce(files);

      const repos = {
        repo1: ['hash1', 'hash2'],
        repo2: ['hash3', 'hash4', 'hash5'],
      };

      for (const [name, hashes] of Object.entries(repos)) {
        mockFs.readFile.mockResolvedValueOnce(hashes.join('\n'));
      }

      const stats = await cache.getStats();
      expect(stats).toEqual({
        repositories: 2,
        commits: 5,
        repoStats: {
          repo1: 2,
          repo2: 3,
        },
      });
    });

    it('should handle non-existent cache directory', async () => {
      mockFs.readdir.mockRejectedValueOnce({ code: 'ENOENT' });

      const stats = await cache.getStats();
      expect(stats).toEqual({
        repositories: 0,
        commits: 0,
        repoStats: {},
      });
    });
  });
});

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
