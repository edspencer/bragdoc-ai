"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const repos_1 = require("../repos");
const config_1 = require("../../config");
const git_1 = require("../../utils/git");
const types_1 = require("../../config/types");
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
describe('Repository Management', () => {
    const mockFs = {
        access: jest.mocked(promises_1.access),
    };
    const mockLoadConfig = jest.mocked(config_1.loadConfig);
    const mockSaveConfig = jest.mocked(config_1.saveConfig);
    const mockValidateRepository = jest.mocked(git_1.validateRepository);
    const TEST_REPO_PATH = '/test/repo';
    const TEST_REPO2_PATH = '/test/repo2';
    beforeEach(() => {
        // Reset mocks
        jest.resetAllMocks();
        console.log = jest.fn();
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
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [],
            });
            await (0, repos_1.listRepos)();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No repositories configured'));
        });
        it('lists configured repositories', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [{
                        path: TEST_REPO_PATH,
                        name: 'Test Repo',
                        enabled: true,
                    }],
            });
            await (0, repos_1.listRepos)();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test Repo'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(TEST_REPO_PATH));
        });
    });
    describe('addRepo', () => {
        it('adds a repository with custom settings', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [],
            });
            mockSaveConfig.mockResolvedValueOnce();
            await (0, repos_1.addRepo)(TEST_REPO_PATH, { name: 'Test Repo', maxCommits: 500 });
            expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({
                repositories: [
                    expect.objectContaining({
                        path: TEST_REPO_PATH,
                        name: 'Test Repo',
                        maxCommits: 500,
                        enabled: true,
                    }),
                ],
            }));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Added repository'));
        });
        it('prevents adding duplicate repositories', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [{
                        path: TEST_REPO_PATH,
                        name: 'Test Repo',
                        enabled: true,
                    }],
            });
            await expect((0, repos_1.addRepo)(TEST_REPO_PATH)).rejects.toThrow('Repository already exists');
        });
    });
    describe('removeRepo', () => {
        it('removes an existing repository', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [{
                        path: TEST_REPO_PATH,
                        name: 'Test Repo',
                        enabled: true,
                    }],
            });
            await (0, repos_1.removeRepo)(TEST_REPO_PATH);
            expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({
                repositories: [],
            }));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed repository'));
        });
        it('fails gracefully when removing non-existent repository', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [],
            });
            await expect((0, repos_1.removeRepo)('/non/existent/repo')).rejects.toThrow('Repository not found');
        });
    });
    describe('updateRepo', () => {
        it('updates repository settings', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [{
                        path: TEST_REPO_PATH,
                        name: 'Old Name',
                        enabled: true,
                    }],
            });
            await (0, repos_1.updateRepo)(TEST_REPO_PATH, { name: 'New Name', maxCommits: 1000 });
            expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({
                repositories: [
                    expect.objectContaining({
                        path: TEST_REPO_PATH,
                        name: 'New Name',
                        maxCommits: 1000,
                        enabled: true,
                    }),
                ],
            }));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Updated repository'));
        });
        it('fails gracefully when updating non-existent repository', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [],
            });
            await expect((0, repos_1.updateRepo)('/non/existent/repo')).rejects.toThrow('Repository not found');
        });
    });
    describe('toggleRepo', () => {
        it('enables a repository', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [{
                        path: TEST_REPO_PATH,
                        name: 'Test Repo',
                        enabled: false,
                    }],
            });
            await (0, repos_1.toggleRepo)(TEST_REPO_PATH, true);
            expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({
                repositories: [
                    expect.objectContaining({
                        path: TEST_REPO_PATH,
                        enabled: true,
                    }),
                ],
            }));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Enabled repository'));
        });
        it('disables a repository', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [{
                        path: TEST_REPO_PATH,
                        name: 'Test Repo',
                        enabled: true,
                    }],
            });
            await (0, repos_1.toggleRepo)(TEST_REPO_PATH, false);
            expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({
                repositories: [
                    expect.objectContaining({
                        path: TEST_REPO_PATH,
                        enabled: false,
                    }),
                ],
            }));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Disabled repository'));
        });
        it('fails gracefully when toggling non-existent repository', async () => {
            mockLoadConfig.mockResolvedValueOnce({
                ...types_1.DEFAULT_CONFIG,
                repositories: [],
            });
            await expect((0, repos_1.toggleRepo)('/non/existent/repo', true)).rejects.toThrow('Repository not found');
        });
    });
});
