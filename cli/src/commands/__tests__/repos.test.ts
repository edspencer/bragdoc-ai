import { homedir } from 'os';
import { join } from 'path';
import { loadConfig, saveConfig } from '../../config';
import { listRepos, addRepo, removeRepo, updateRepo, toggleRepo } from '../repos';
import { DEFAULT_CONFIG } from '../../config/types';
import * as fs from 'fs/promises';
import { validateRepository } from '../../utils/git';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

// Mock config module
jest.mock('../../config', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

// Mock git utils
jest.mock('../../utils/git', () => ({
  validateRepository: jest.fn().mockResolvedValue(undefined),
}));

// Mock console.log to capture output
const mockLog = jest.fn();
console.log = mockLog;

describe('Repository Management', () => {
  const TEST_REPO_PATH = '/test/repo';
  const TEST_REPO2_PATH = '/test/repo2';
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
  const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>;
  const mockValidateRepository = validateRepository as jest.MockedFunction<typeof validateRepository>;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    mockLog.mockReset();

    // Mock successful validation for test paths
    mockValidateRepository.mockImplementation(async (path) => {
      if (path === TEST_REPO_PATH || path === TEST_REPO2_PATH) {
        return;
      }
      throw new Error('Not a git repository');
    });

    // Mock successful access to git directories
    mockFs.access.mockImplementation((path) => {
      if (path === TEST_REPO_PATH || path === TEST_REPO2_PATH || path.toString().endsWith('.git')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('ENOENT'));
    });
  });

  describe('listRepos', () => {
    it('shows message when no repositories configured', async () => {
      mockLoadConfig.mockResolvedValueOnce({ ...DEFAULT_CONFIG, repositories: [] });

      await listRepos();

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('No repositories configured')
      );
    });

    it('lists configured repositories', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        repositories: [{
          path: TEST_REPO_PATH,
          name: 'Test Repo',
          enabled: true,
        }],
      });

      await listRepos();

      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Test Repo'));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(TEST_REPO_PATH));
    });
  });

  describe('addRepo', () => {
    it('adds a repository with custom settings', async () => {
      mockLoadConfig.mockResolvedValueOnce({ ...DEFAULT_CONFIG, repositories: [] });
      mockSaveConfig.mockResolvedValueOnce();

      await addRepo(TEST_REPO_PATH, { name: 'Test Repo', maxCommits: 500 });

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: [
            expect.objectContaining({
              path: TEST_REPO_PATH,
              name: 'Test Repo',
              maxCommits: 500,
              enabled: true,
            }),
          ],
        })
      );
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Added repository'));
    });

    it('prevents adding duplicate repositories', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        repositories: [{
          path: TEST_REPO_PATH,
          name: 'Test Repo',
          enabled: true,
        }],
      });

      await expect(addRepo(TEST_REPO_PATH)).rejects.toThrow('Repository already exists');
    });
  });

  describe('removeRepo', () => {
    it('removes an existing repository', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        repositories: [{
          path: TEST_REPO_PATH,
          name: 'Test Repo',
          enabled: true,
        }],
      });
      mockSaveConfig.mockResolvedValueOnce();

      await removeRepo(TEST_REPO_PATH);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: [],
        })
      );
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Removed repository'));
    });

    it('fails gracefully when removing non-existent repository', async () => {
      mockLoadConfig.mockResolvedValueOnce({ ...DEFAULT_CONFIG, repositories: [] });

      await expect(removeRepo('/non/existent/repo')).rejects.toThrow('Repository not found');
    });
  });

  describe('updateRepo', () => {
    it('updates repository settings', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        repositories: [{
          path: TEST_REPO_PATH,
          name: 'Old Name',
          enabled: true,
        }],
      });
      mockSaveConfig.mockResolvedValueOnce();

      await updateRepo(TEST_REPO_PATH, { name: 'New Name', maxCommits: 1000 });

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: [
            expect.objectContaining({
              path: TEST_REPO_PATH,
              name: 'New Name',
              maxCommits: 1000,
              enabled: true,
            }),
          ],
        })
      );
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Updated repository'));
    });

    it('fails gracefully when updating non-existent repository', async () => {
      mockLoadConfig.mockResolvedValueOnce({ ...DEFAULT_CONFIG, repositories: [] });

      await expect(updateRepo('/non/existent/repo')).rejects.toThrow('Repository not found');
    });
  });

  describe('toggleRepo', () => {
    it('enables a repository', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        repositories: [{
          path: TEST_REPO_PATH,
          name: 'Test Repo',
          enabled: false,
        }],
      });
      mockSaveConfig.mockResolvedValueOnce();

      await toggleRepo(TEST_REPO_PATH, true);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: [
            expect.objectContaining({
              path: TEST_REPO_PATH,
              enabled: true,
            }),
          ],
        })
      );
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Enabled repository'));
    });

    it('disables a repository', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        repositories: [{
          path: TEST_REPO_PATH,
          name: 'Test Repo',
          enabled: true,
        }],
      });
      mockSaveConfig.mockResolvedValueOnce();

      await toggleRepo(TEST_REPO_PATH, false);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: [
            expect.objectContaining({
              path: TEST_REPO_PATH,
              enabled: false,
            }),
          ],
        })
      );
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Disabled repository'));
    });

    it('fails gracefully when toggling non-existent repository', async () => {
      mockLoadConfig.mockResolvedValueOnce({ ...DEFAULT_CONFIG, repositories: [] });

      await expect(toggleRepo('/non/existent/repo', true)).rejects.toThrow('Repository not found');
    });
  });
});
