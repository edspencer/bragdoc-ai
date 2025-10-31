import {
  addProject,
  updateProject,
  listProjects,
  promptForBranchWhitelist,
} from '../../src/commands/projects';
import * as configModule from '../../src/config';
import * as gitModule from '../../src/utils/git';
import * as gitOpsModule from '../../src/git/operations';
import * as projectsLibModule from '../../src/lib/projects';
import inquirer from 'inquirer';

// Mock modules
jest.mock('../../src/config');
jest.mock('../../src/utils/git');
jest.mock('../../src/git/operations');
jest.mock('../../src/lib/projects');
jest.mock('inquirer');
jest.mock('node:child_process', () => ({
  exec: jest.fn((cmd, callback) => callback(null, '', '')),
}));

describe('Projects Command - Branch Whitelist Management', () => {
  let mockLoadConfig: any;
  let mockSaveConfig: any;
  let testConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default test config
    testConfig = {
      auth: { token: 'test-token' },
      projects: [],
      settings: { defaultMaxCommits: 300 },
      llm: { provider: 'openai', apiKey: 'test-key' },
    };

    mockLoadConfig = configModule.loadConfig as jest.Mock;
    mockSaveConfig = configModule.saveConfig as jest.Mock;

    mockLoadConfig.mockResolvedValue(testConfig);
    mockSaveConfig.mockResolvedValue(undefined);

    // Setup git mocks
    (gitModule.validateRepository as jest.Mock).mockResolvedValue(undefined);
    (gitOpsModule.getRepositoryInfo as jest.Mock).mockReturnValue({
      path: '/test/repo',
      currentBranch: 'main',
      remoteUrl: 'https://github.com/test/repo.git',
    });
    (gitOpsModule.getRepositoryName as jest.Mock).mockReturnValue('test-repo');

    // Setup project sync mock
    (projectsLibModule.syncProjectWithApi as jest.Mock).mockResolvedValue({
      projectId: 'sync-project-123',
      created: false,
    });

    // Mock console methods to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore();
  });

  test('adds project with --branch-whitelist CLI option', async () => {
    // Setup: Call addProject with branchWhitelist option
    const options = {
      branchWhitelist: 'main,develop,release-*',
      skipLlmConfig: true,
      skipApiSync: true,
      schedule: false,
    };

    // Execute: Complete project creation
    // Mock the prompts that would normally be called
    (inquirer.prompt as any).mockImplementation(async (questions: any) => {
      if (questions[0]?.name === 'detailLevel') {
        return { detailLevel: 'standard' };
      }
      if (questions[0]?.name === 'frequency') {
        return { frequency: 'no' };
      }
      return {};
    });

    await addProject('/test/repo', options);

    // Assert: Project config should include branchWhitelist array
    expect(mockSaveConfig).toHaveBeenCalled();
    const savedConfig = mockSaveConfig.mock.calls[0][0];
    const addedProject = savedConfig.projects[0];

    expect(addedProject).toBeDefined();
    expect(addedProject.branchWhitelist).toBeDefined();
    expect(Array.isArray(addedProject.branchWhitelist)).toBe(true);
    expect(addedProject.branchWhitelist).toEqual([
      'main',
      'develop',
      'release-*',
    ]);
  });

  test('adds project without whitelist (all branches allowed)', async () => {
    // Setup: Call addProject without branchWhitelist option
    const options = {
      skipLlmConfig: true,
      skipApiSync: true,
      schedule: false,
    };

    // Mock the prompts - need to match the sequence of prompts in addProject
    (inquirer.prompt as any).mockImplementation(async (questions: any) => {
      // First call is for extraction detail level
      if (questions[0]?.name === 'detailLevel') {
        return { detailLevel: 'standard' };
      }
      // Second call is for cron schedule frequency
      if (questions[0]?.name === 'frequency') {
        return { frequency: 'no' };
      }
      // Third call is for branch whitelist
      if (questions[0]?.name === 'branches') {
        return { branches: '' };
      }
      return {};
    });

    await addProject('/test/repo', options);

    // Assert: Project config should have undefined branchWhitelist
    expect(mockSaveConfig).toHaveBeenCalled();
    const savedConfig = mockSaveConfig.mock.calls[0][0];
    const addedProject = savedConfig.projects[0];

    expect(addedProject).toBeDefined();
    // branchWhitelist should be undefined when no whitelist is specified
    expect(addedProject.branchWhitelist).toBeUndefined();
  });

  test('parses comma-separated branch whitelist correctly', async () => {
    // Setup: Call addProject with comma-separated branches
    const options = {
      branchWhitelist: 'main, develop, feature-xyz',
      skipLlmConfig: true,
      skipApiSync: true,
      schedule: false,
    };

    (inquirer.prompt as any).mockImplementation(async (questions: any) => {
      if (questions[0]?.name === 'detailLevel') {
        return { detailLevel: 'standard' };
      }
      if (questions[0]?.name === 'frequency') {
        return { frequency: 'no' };
      }
      return {};
    });

    await addProject('/test/repo', options);

    // Assert: Branches should be parsed correctly with whitespace trimmed
    expect(mockSaveConfig).toHaveBeenCalled();
    const savedConfig = mockSaveConfig.mock.calls[0][0];
    const addedProject = savedConfig.projects[0];

    expect(addedProject.branchWhitelist).toEqual([
      'main',
      'develop',
      'feature-xyz',
    ]);
  });

  test('updates project branch whitelist with --branch-whitelist option', async () => {
    // Setup: Load project with existing branchWhitelist
    testConfig.projects = [
      {
        path: '/test/repo',
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        branchWhitelist: ['main'],
      },
    ];

    mockLoadConfig.mockResolvedValue(testConfig);

    // Execute: updateProject with --branch-whitelist option
    const options = {
      branchWhitelist: 'main,develop',
    };

    await updateProject('/test/repo', options);

    // Assert: Project config should be updated with new branches
    expect(mockSaveConfig).toHaveBeenCalled();
    const savedConfig = mockSaveConfig.mock.calls[0][0];
    const updatedProject = savedConfig.projects[0];

    expect(updatedProject.branchWhitelist).toEqual(['main', 'develop']);
  });

  test('clears branch whitelist when updating with empty string', async () => {
    // Setup: Load project with existing branchWhitelist
    testConfig.projects = [
      {
        path: '/test/repo',
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        branchWhitelist: ['main', 'develop'],
      },
    ];

    mockLoadConfig.mockResolvedValue(testConfig);

    // Execute: updateProject with empty --branch-whitelist option
    const options = {
      branchWhitelist: '',
    };

    await updateProject('/test/repo', options);

    // Assert: Project config should have undefined branchWhitelist
    expect(mockSaveConfig).toHaveBeenCalled();
    const savedConfig = mockSaveConfig.mock.calls[0][0];
    const updatedProject = savedConfig.projects[0];

    expect(updatedProject.branchWhitelist).toBeUndefined();
  });

  test('displays branch whitelist in projects list output', async () => {
    // Setup: Create project with branchWhitelist
    testConfig.projects = [
      {
        path: '/test/repo',
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        branchWhitelist: ['main', 'develop'],
        maxCommits: 300,
        cronSchedule: null,
      },
    ];

    mockLoadConfig.mockResolvedValue(testConfig);

    const consoleSpy = jest.spyOn(console, 'log');

    // Execute: listProjects()
    await listProjects();

    // Assert: Output should contain formatted branch whitelist
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((call) => call[0]).join('\n');

    // Should contain the branch information
    expect(output).toContain('branches');
  });

  test('displays "all branches" when no whitelist configured', async () => {
    // Setup: Create project without branchWhitelist
    testConfig.projects = [
      {
        path: '/test/repo',
        id: 'project-123',
        name: 'Test Project',
        enabled: true,
        // No branchWhitelist property
        maxCommits: 300,
        cronSchedule: null,
      },
    ];

    mockLoadConfig.mockResolvedValue(testConfig);

    const consoleSpy = jest.spyOn(console, 'log');

    // Execute: listProjects()
    await listProjects();

    // Assert: Output should indicate all branches are allowed
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((call) => call[0]).join('\n');

    // The output should contain branch information
    expect(output).toContain('branches');
  });

  test('promptForBranchWhitelist returns parsed array from user input', async () => {
    // Setup: Mock inquirer to return comma-separated branches
    (inquirer.prompt as any).mockResolvedValue({
      branches: 'main, develop, staging',
    });

    // Execute: Call promptForBranchWhitelist
    const result = await promptForBranchWhitelist();

    // Assert: Result should be array with trimmed branch names
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(['main', 'develop', 'staging']);
  });

  test('promptForBranchWhitelist returns null when user leaves blank', async () => {
    // Setup: Mock inquirer to return empty string
    (inquirer.prompt as any).mockResolvedValue({
      branches: '',
    });

    // Execute: Call promptForBranchWhitelist
    const result = await promptForBranchWhitelist();

    // Assert: Result should be null
    expect(result).toBeNull();
  });

  test('promptForBranchWhitelist trims whitespace from branches', async () => {
    // Setup: Mock inquirer with branches containing extra spaces
    (inquirer.prompt as any).mockResolvedValue({
      branches: '  main  ,  develop  ,  release-1.0  ',
    });

    // Execute: Call promptForBranchWhitelist
    const result = await promptForBranchWhitelist();

    // Assert: Whitespace should be trimmed
    expect(result).toEqual(['main', 'develop', 'release-1.0']);
  });
});
