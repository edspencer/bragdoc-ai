"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const operations_1 = require("../operations");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = require("node:path");
const node_os_1 = __importDefault(require("node:os"));
jest.mock('node:child_process', () => ({
    execSync: jest.fn(),
}));
describe('git operations', () => {
    const mockExecSync = jest.mocked(node_child_process_1.execSync);
    let tempDir;
    let originalCwd;
    beforeEach(() => {
        // Save original working directory
        originalCwd = process.cwd();
        // Create a temporary directory for each test
        tempDir = node_fs_1.default.mkdtempSync((0, node_path_1.join)(node_os_1.default.tmpdir(), 'git-test-'));
        // Reset all mocks before each test
        jest.resetAllMocks();
    });
    afterEach(() => {
        // Restore original working directory
        process.chdir(originalCwd);
        // Clean up temporary directory after each test
        node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    describe('getRepositoryInfo', () => {
        it('should return repository information', () => {
            // Mock git command outputs
            mockExecSync
                .mockImplementationOnce(() => Buffer.from('git@github.com:user/repo.git')) // remote url
                .mockImplementationOnce(() => Buffer.from('feature/test')); // current branch
            const info = (0, operations_1.getRepositoryInfo)(tempDir);
            expect(mockExecSync).toHaveBeenCalledTimes(2);
            expect(mockExecSync).toHaveBeenNthCalledWith(1, 'git config --get remote.origin.url', { cwd: tempDir });
            expect(mockExecSync).toHaveBeenNthCalledWith(2, 'git rev-parse --abbrev-ref HEAD', { cwd: tempDir });
            expect(info).toEqual({
                remoteUrl: 'git@github.com:user/repo.git',
                currentBranch: 'feature/test',
                path: tempDir
            });
        });
        it('should handle HTTPS remote URLs', () => {
            mockExecSync
                .mockImplementationOnce(() => Buffer.from('https://github.com/user/repo.git'))
                .mockImplementationOnce(() => Buffer.from('main'));
            const info = (0, operations_1.getRepositoryInfo)(tempDir);
            expect(info.remoteUrl).toBe('https://github.com/user/repo.git');
        });
        it('should handle missing remote', () => {
            mockExecSync
                .mockImplementationOnce(() => { throw new Error('No remote configured'); })
                .mockImplementationOnce(() => Buffer.from('main'));
            expect(() => {
                (0, operations_1.getRepositoryInfo)(tempDir);
            }).toThrow('Failed to get repository info: No remote configured');
        });
    });
    describe('collectGitCommits', () => {
        it('should parse git log output correctly', () => {
            // Mock git log output with null and unit separators
            const mockGitLog = [
                `abc123\x1fInitial commit\x1fJohn Doe\x1f2024-01-09 10:00:00 -0500\0`,
                `def456\x1fAdd feature\x1fJane Smith\x1f2024-01-09 11:00:00 -0500\0`
            ].join('');
            mockExecSync.mockReturnValue(Buffer.from(mockGitLog));
            const commits = (0, operations_1.collectGitCommits)('main', 2, 'test-repo');
            // Verify the git command
            expect(mockExecSync).toHaveBeenCalledWith('git log main --reverse --pretty=format:\"%H%x1f%B%x1f%an%x1f%ai%x00\" --max-count=2');
            // Verify parsed commits
            expect(commits).toHaveLength(2);
            expect(commits[0]).toEqual({
                repository: 'test-repo',
                hash: 'abc123',
                message: 'Initial commit',
                author: 'John Doe',
                date: '2024-01-09 10:00:00 -0500',
                branch: 'main'
            });
            expect(commits[1]).toEqual({
                repository: 'test-repo',
                hash: 'def456',
                message: 'Add feature',
                author: 'Jane Smith',
                date: '2024-01-09 11:00:00 -0500',
                branch: 'main'
            });
        });
        it('should handle empty git log output', () => {
            mockExecSync.mockReturnValue(Buffer.from(''));
            const commits = (0, operations_1.collectGitCommits)('main', 10, 'test-repo');
            expect(commits).toHaveLength(0);
        });
        it('should handle git log with empty lines', () => {
            const mockGitLog = `\0\0abc123\x1fInitial commit\x1fJohn Doe\x1f2024-01-09 10:00:00 -0500\0\0`;
            mockExecSync.mockReturnValue(Buffer.from(mockGitLog));
            const commits = (0, operations_1.collectGitCommits)('main', 1, 'test-repo');
            expect(commits).toHaveLength(1);
            expect(commits[0].hash).toBe('abc123');
        });
        it('should handle multiline commit messages', () => {
            const mockGitLog = `abc123\x1fFirst line\nSecond line\nThird line\x1fJohn Doe\x1f2024-01-09 10:00:00 -0500\0`;
            mockExecSync.mockReturnValue(Buffer.from(mockGitLog));
            const commits = (0, operations_1.collectGitCommits)('main', 1, 'test-repo');
            expect(commits).toHaveLength(1);
            expect(commits[0].message).toBe('First line\nSecond line\nThird line');
        });
        it('should handle special characters in commit messages', () => {
            const mockGitLog = `abc123\x1fMessage with "quotes" and 'apostrophes'\x1fJohn Doe\x1f2024-01-09 10:00:00 -0500\0`;
            mockExecSync.mockReturnValue(Buffer.from(mockGitLog));
            const commits = (0, operations_1.collectGitCommits)('main', 1, 'test-repo');
            expect(commits).toHaveLength(1);
            expect(commits[0].message).toBe('Message with "quotes" and \'apostrophes\'');
        });
        it('should throw error when git command fails', () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('fatal: not a git repository');
            });
            expect(() => {
                (0, operations_1.collectGitCommits)('main', 1, 'test-repo');
            }).toThrow('Failed to extract commits: fatal: not a git repository');
        });
        it('should throw error on malformed git log entry', () => {
            const mockGitLog = `abc123\x1fIncomplete entry\0`;
            mockExecSync.mockReturnValue(Buffer.from(mockGitLog));
            expect(() => {
                (0, operations_1.collectGitCommits)('main', 1, 'test-repo');
            }).toThrow('Failed to extract commits: Invalid git log entry format');
        });
    });
});
