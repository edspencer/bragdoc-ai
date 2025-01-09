import { execSync } from 'child_process';
import { collectGitCommits } from '../operations';
import fs from 'fs';
import path from 'path';
import os from 'os';

jest.mock('child_process');

describe('git operations', () => {
  describe('collectGitCommits', () => {
    const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
    let tempDir: string;
    const separator = '|||<<COMMIT_SEPARATOR>>|||';

    beforeEach(() => {
      // Create a temporary directory for each test
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
      process.chdir(tempDir);

      // Reset all mocks before each test
      jest.resetAllMocks();
    });

    afterEach(() => {
      // Clean up temporary directory after each test
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should parse git log output correctly', () => {
      // Mock git log output
      const mockGitLog = [
        `abc123${separator}Initial commit${separator}John Doe${separator}2024-01-09 10:00:00 -0500`,
        `def456${separator}Add feature${separator}Jane Smith${separator}2024-01-09 11:00:00 -0500`
      ].join(separator + '\n');

      mockExecSync.mockReturnValue(Buffer.from(mockGitLog));

      const commits = collectGitCommits('main', 2, 'test-repo');

      // Verify the git command
      expect(mockExecSync).toHaveBeenCalledWith(
        `git log main --pretty=format:"%H${separator}%B${separator}%an${separator}%ai" --max-count=2`
      );

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

      const commits = collectGitCommits('main', 10, 'test-repo');

      expect(commits).toHaveLength(0);
    });

    it('should handle git log with empty lines', () => {
      const mockGitLog = `\n\nabc123${separator}Initial commit${separator}John Doe${separator}2024-01-09 10:00:00 -0500\n\n`;
      mockExecSync.mockReturnValue(Buffer.from(mockGitLog));

      const commits = collectGitCommits('main', 1, 'test-repo');

      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('abc123');
    });

    it('should handle multiline commit messages', () => {
      const mockGitLog = `abc123${separator}First line\nSecond line\nThird line${separator}John Doe${separator}2024-01-09 10:00:00 -0500`;
      mockExecSync.mockReturnValue(Buffer.from(mockGitLog));

      const commits = collectGitCommits('main', 1, 'test-repo');

      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('First line\nSecond line\nThird line');
    });

    it('should handle special characters in commit messages', () => {
      const mockGitLog = `abc123${separator}Message with "quotes" and 'apostrophes'${separator}John Doe${separator}2024-01-09 10:00:00 -0500`;
      mockExecSync.mockReturnValue(Buffer.from(mockGitLog));

      const commits = collectGitCommits('main', 1, 'test-repo');

      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Message with "quotes" and \'apostrophes\'');
    });

    it('should throw error when git command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      expect(() => {
        collectGitCommits('main', 1, 'test-repo');
      }).toThrow('fatal: not a git repository');
    });

    it('should throw error on malformed git log entry', () => {
      const mockGitLog = `abc123${separator}Incomplete entry`;
      mockExecSync.mockReturnValue(Buffer.from(mockGitLog));

      expect(() => {
        collectGitCommits('main', 1, 'test-repo');
      }).toThrow('Invalid git log entry format');
    });
  });
});
