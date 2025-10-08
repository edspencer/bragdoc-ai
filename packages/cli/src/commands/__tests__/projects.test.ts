import { access } from 'node:fs/promises';
import { loadConfig, saveConfig } from '../../config';
import { validateRepository } from '../../utils/git';
import { DEFAULT_CONFIG } from '../../config/types';

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
}));

// Mock config functions
jest.mock('../../config', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

// Mock git utilities
jest.mock('../../utils/git', () => ({
  validateRepository: jest.fn(),
}));

// Mock git operations
jest.mock('../../git/operations', () => ({
  getRepositoryInfo: jest.fn(),
  getRepositoryName: jest.fn(),
}));

// Mock project sync
jest.mock('../../lib/projects', () => ({
  syncProjectWithApi: jest.fn(),
}));

// Mock inquirer to avoid interactive prompts in tests
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ frequency: 'no' }),
}));

// Import functions after mocking
import {
  addProject,
  listProjects,
  removeProject,
  updateProject,
  toggleProject,
} from '../projects';
import { getRepositoryInfo, getRepositoryName } from '../../git/operations';
import { syncProjectWithApi as syncProjectWithApiLib } from '../../lib/projects';

describe('Project Management', () => {
  const mockFs = {
    access: jest.mocked(access),
  };
  const mockLoadConfig = jest.mocked(loadConfig);
  const mockSaveConfig = jest.mocked(saveConfig);
  const mockValidateRepository = jest.mocked(validateRepository);
  const mockGetRepositoryInfo = jest.mocked(getRepositoryInfo);
  const mockGetRepositoryName = jest.mocked(getRepositoryName);
  const mockSyncProjectWithApi = jest.mocked(syncProjectWithApiLib);

  const TEST_PROJECT_PATH = '/test/project';
  const TEST_PROJECT2_PATH = '/test/project2';

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    console.log = jest.fn();

    // Mock successful validation for test paths
    mockValidateRepository.mockImplementation(async (path) => {
      if (path === TEST_PROJECT_PATH || path === TEST_PROJECT2_PATH) {
        return;
      }
      throw new Error('Not a git repository');
    });

    // Mock git repository info
    mockGetRepositoryInfo.mockReturnValue({
      remoteUrl: 'https://github.com/test/repo.git',
      currentBranch: 'main',
      path: TEST_PROJECT_PATH,
    });

    mockGetRepositoryName.mockReturnValue('test-repo');

    // Mock API sync - return undefined (not authenticated) by default
    mockSyncProjectWithApi.mockResolvedValue({
      type: 'warning',
      message: 'Not authenticated',
      success: false,
      projectId: undefined,
    });

    // Mock successful access to git directories
    mockFs.access.mockImplementation((path) => {
      if (
        path === TEST_PROJECT_PATH ||
        path === TEST_PROJECT2_PATH ||
        path.toString().endsWith('.git')
      ) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('ENOENT'));
    });
  });

  describe('listProjects', () => {
    it('shows message when no projects configured', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [],
      });

      await listProjects();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No projects configured'),
      );
    });

    it('lists configured projects', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [
          {
            path: TEST_PROJECT_PATH,
            name: 'Test Project',
            enabled: true,
          },
        ],
      });

      await listProjects();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test Project'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(TEST_PROJECT_PATH),
      );
    });
  });

  describe('addProject', () => {
    it.skip('adds a project with custom settings', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [],
      });
      mockSaveConfig.mockResolvedValueOnce();

      await addProject(TEST_PROJECT_PATH, {
        name: 'Test Project',
        maxCommits: 500,
      });

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: [
            expect.objectContaining({
              path: TEST_PROJECT_PATH,
              name: 'Test Project',
              maxCommits: 500,
              enabled: true,
            }),
          ],
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Added project'),
      );
    });

    it('handles adding duplicate projects gracefully', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [
          {
            path: TEST_PROJECT_PATH,
            name: 'Test Project',
            enabled: true,
            id: 'existing-project-id',
          },
        ],
      });

      // Should not throw, just return early
      await addProject(TEST_PROJECT_PATH);

      // Should not save config (no changes)
      expect(mockSaveConfig).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
      );
    });
  });

  describe('removeProject', () => {
    it('removes an existing project', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [
          {
            path: TEST_PROJECT_PATH,
            name: 'Test Project',
            enabled: true,
          },
        ],
      });

      await removeProject(TEST_PROJECT_PATH);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: [],
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Removed project'),
      );
    });

    it('fails gracefully when removing non-existent project', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [],
      });

      await expect(removeProject('/non/existent/project')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('updateProject', () => {
    it('updates project settings', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [
          {
            path: TEST_PROJECT_PATH,
            name: 'Old Name',
            enabled: true,
          },
        ],
      });

      await updateProject(TEST_PROJECT_PATH, {
        name: 'New Name',
        maxCommits: 1000,
      });

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: [
            expect.objectContaining({
              path: TEST_PROJECT_PATH,
              name: 'New Name',
              maxCommits: 1000,
              enabled: true,
            }),
          ],
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Updated project'),
      );
    });

    it('fails gracefully when updating non-existent project', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [],
      });

      await expect(updateProject('/non/existent/project')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('toggleProject', () => {
    it('enables a project', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [
          {
            path: TEST_PROJECT_PATH,
            name: 'Test Project',
            enabled: false,
          },
        ],
      });

      await toggleProject(TEST_PROJECT_PATH, true);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: [
            expect.objectContaining({
              path: TEST_PROJECT_PATH,
              enabled: true,
            }),
          ],
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Enabled project'),
      );
    });

    it('disables a project', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [
          {
            path: TEST_PROJECT_PATH,
            name: 'Test Project',
            enabled: true,
          },
        ],
      });

      await toggleProject(TEST_PROJECT_PATH, false);

      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: [
            expect.objectContaining({
              path: TEST_PROJECT_PATH,
              enabled: false,
            }),
          ],
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Disabled project'),
      );
    });

    it('fails gracefully when toggling non-existent project', async () => {
      mockLoadConfig.mockResolvedValueOnce({
        ...DEFAULT_CONFIG,
        projects: [],
      });

      await expect(
        toggleProject('/non/existent/project', true),
      ).rejects.toThrow('Project not found');
    });
  });
});
