import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { isGitRepository, validateRepository } from '../git';

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
}));

// Mock child_process
jest.mock('node:child_process', () => ({
  exec: jest.fn(),
}));

describe('Git Utilities', () => {
  const mockAccess = jest.mocked(access);
  const mockExec = jest.mocked(exec);
  const TEST_PATH = '/test/repo';
  const GIT_DIR = join(TEST_PATH, '.git');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isGitRepository', () => {
    it('returns true for valid git repository', async () => {
      // Mock successful .git directory access
      mockAccess.mockResolvedValueOnce(undefined);

      // Mock successful git status
      mockExec.mockImplementationOnce((cmd, opts, callback) => {
        callback?.(null, Buffer.from(''), Buffer.from(''));
        return undefined as any;
      });

      const result = await isGitRepository(TEST_PATH);
      expect(result).toBe(true);

      // Verify .git directory was checked
      expect(mockAccess).toHaveBeenCalledWith(GIT_DIR);

      // Verify git status was run
      expect(mockExec).toHaveBeenCalledWith(
        'git status',
        { cwd: TEST_PATH },
        expect.any(Function),
      );
    });

    it('returns false if .git directory does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await isGitRepository(TEST_PATH);
      expect(result).toBe(false);
    });

    it('returns false if git status fails', async () => {
      // .git directory exists
      mockAccess.mockResolvedValueOnce(undefined);

      // but git status fails
      mockExec.mockImplementationOnce((cmd, opts, callback) => {
        callback?.(
          new Error('not a git repository'),
          Buffer.from(''),
          Buffer.from(''),
        );
        return undefined as any;
      });

      const result = await isGitRepository(TEST_PATH);
      expect(result).toBe(false);
    });
  });

  describe('validateRepository', () => {
    it('succeeds for valid git repository', async () => {
      // Path exists
      mockAccess.mockResolvedValueOnce(undefined);

      // .git directory exists
      mockAccess.mockResolvedValueOnce(undefined);

      // git status succeeds
      mockExec.mockImplementationOnce((cmd, opts, callback) => {
        callback?.(null, Buffer.from(''), Buffer.from(''));
        return undefined as any;
      });

      await expect(validateRepository(TEST_PATH)).resolves.toBeUndefined();
    });

    it('throws if path does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(validateRepository(TEST_PATH)).rejects.toThrow(
        'Path does not exist or is not accessible',
      );
    });

    it('throws if path exists but is not a git repository', async () => {
      // Path exists
      mockAccess.mockResolvedValueOnce(undefined);

      // But .git directory does not
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(validateRepository(TEST_PATH)).rejects.toThrow(
        'Path is not a git repository',
      );
    });

    it('throws if path and .git exist but git status fails', async () => {
      // Path exists
      mockAccess.mockResolvedValueOnce(undefined);

      // .git directory exists
      mockAccess.mockResolvedValueOnce(undefined);

      // But git status fails
      mockExec.mockImplementationOnce((cmd, opts, callback) => {
        callback?.(
          new Error('not a git repository'),
          Buffer.from(''),
          Buffer.from(''),
        );
        return undefined as any;
      });

      await expect(validateRepository(TEST_PATH)).rejects.toThrow(
        'Path is not a git repository',
      );
    });
  });
});
