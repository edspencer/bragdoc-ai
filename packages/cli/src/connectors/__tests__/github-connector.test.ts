import { GitHubConnector } from '../github-connector';
import { execSync } from 'node:child_process';

jest.mock('node:child_process');
jest.mock('../../cache/commits');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHubConnector', () => {
  let connector: GitHubConnector;

  beforeEach(() => {
    connector = new GitHubConnector();
    jest.clearAllMocks();
  });

  describe('type', () => {
    it('returns "github"', () => {
      expect(connector.type).toBe('github');
    });
  });

  describe('initialize', () => {
    it('throws if type is not github', async () => {
      await expect(
        connector.initialize({
          type: 'git',
          sourceId: 'test-source',
          projectId: 'test-project',
        }),
      ).rejects.toThrow("GitHubConnector expects type='github'");
    });

    it('throws if repo is not provided', async () => {
      await expect(
        connector.initialize({
          type: 'github',
          sourceId: 'test-source',
          projectId: 'test-project',
        }),
      ).rejects.toThrow('GitHub repository (repo) not configured');
    });

    it('throws if repo format is invalid - missing owner', async () => {
      await expect(
        connector.initialize({
          type: 'github',
          sourceId: 'test-source',
          projectId: 'test-project',
          repo: 'invalid-repo',
        }),
      ).rejects.toThrow('Invalid repository format');
    });

    it('throws if repo format is invalid - too many slashes', async () => {
      await expect(
        connector.initialize({
          type: 'github',
          sourceId: 'test-source',
          projectId: 'test-project',
          repo: 'owner/repo/extra',
        }),
      ).rejects.toThrow('Invalid repository format');
    });

    it('initializes successfully with valid config', async () => {
      await expect(
        connector.initialize({
          type: 'github',
          sourceId: 'test-source',
          projectId: 'test-project',
          repo: 'owner/repo',
        }),
      ).resolves.not.toThrow();
    });

    it('initializes successfully with hyphenated owner/repo names', async () => {
      await expect(
        connector.initialize({
          type: 'github',
          sourceId: 'test-source',
          projectId: 'test-project',
          repo: 'my-org/my-repo-name',
        }),
      ).resolves.not.toThrow();
    });

    it('initializes successfully with dotted names', async () => {
      await expect(
        connector.initialize({
          type: 'github',
          sourceId: 'test-source',
          projectId: 'test-project',
          repo: 'my.org/my.repo',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      await connector.initialize({
        type: 'github',
        sourceId: 'test-source',
        projectId: 'test-project',
        repo: 'owner/repo',
      });
    });

    it('returns false if gh is not installed', async () => {
      mockExecSync.mockImplementation((cmd: any, _options?: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.startsWith('gh --version')) {
          throw new Error('command not found');
        }
        return Buffer.from('');
      });

      expect(await connector.validate()).toBe(false);
    });

    it('returns false if not authenticated', async () => {
      mockExecSync.mockImplementation((cmd: any, options?: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.startsWith('gh --version'))
          return Buffer.from('gh version 2.0');
        if (cmdStr.includes('gh auth status')) {
          // When encoding is utf-8, return string directly
          if (options?.encoding === 'utf-8') return 'not logged in';
          return Buffer.from('not logged in');
        }
        return Buffer.from('');
      });

      expect(await connector.validate()).toBe(false);
    });

    it('returns false if repository is not accessible', async () => {
      mockExecSync.mockImplementation((cmd: any, options?: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.startsWith('gh --version'))
          return Buffer.from('gh version 2.0');
        if (cmdStr.includes('gh auth status')) {
          if (options?.encoding === 'utf-8') return 'Logged in to github.com';
          return Buffer.from('Logged in to github.com');
        }
        if (cmdStr.includes('gh repo view')) {
          throw new Error('Could not resolve to a Repository');
        }
        return Buffer.from('');
      });

      expect(await connector.validate()).toBe(false);
    });

    it('returns true when fully configured', async () => {
      mockExecSync.mockImplementation((cmd: any, options?: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.startsWith('gh --version'))
          return Buffer.from('gh version 2.0');
        if (cmdStr.includes('gh auth status')) {
          if (options?.encoding === 'utf-8') return 'Logged in to github.com';
          return Buffer.from('Logged in to github.com');
        }
        if (cmdStr.includes('gh repo view'))
          return Buffer.from('{"name":"repo"}');
        return Buffer.from('');
      });

      expect(await connector.validate()).toBe(true);
    });
  });

  describe('fetch', () => {
    beforeEach(async () => {
      await connector.initialize({
        type: 'github',
        sourceId: 'test-source',
        projectId: 'test-project',
        repo: 'owner/repo',
        includeCommits: true,
        includePRs: true,
        includeIssues: false,
      });
    });

    it('throws if not initialized', async () => {
      const uninitializedConnector = new GitHubConnector();
      await expect(uninitializedConnector.fetch()).rejects.toThrow(
        'Connector not initialized',
      );
    });

    it('fetches commits from GitHub API', async () => {
      const mockCommits = [
        {
          sha: 'abc123def456',
          commit: {
            message: 'Add feature\n\nDetailed description',
            author: {
              name: 'John Doe',
              email: 'john@example.com',
              date: '2025-11-20T10:00:00Z',
            },
          },
        },
        {
          sha: 'def789ghi012',
          commit: {
            message: 'Fix bug',
            author: {
              name: 'Jane Smith',
              email: 'jane@example.com',
              date: '2025-11-21T11:00:00Z',
            },
          },
        },
      ];

      const mockCommitWithStats = {
        ...mockCommits[0],
        stats: { additions: 10, deletions: 5, total: 15 },
        files: [{ filename: 'src/app.ts', additions: 10, deletions: 5 }],
      };

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('gh api repos/owner/repo/commits?')) {
          return Buffer.from(JSON.stringify(mockCommits));
        }
        if (cmd.includes('gh api repos/owner/repo/commits/abc123def456')) {
          return Buffer.from(JSON.stringify(mockCommitWithStats));
        }
        if (cmd.includes('gh api repos/owner/repo/commits/def789ghi012')) {
          return Buffer.from(
            JSON.stringify({
              ...mockCommits[1],
              stats: { additions: 1, deletions: 0, total: 1 },
            }),
          );
        }
        if (cmd.includes('gh pr list')) {
          return Buffer.from('[]');
        }
        return Buffer.from('');
      });

      const data = await connector.fetch({ skipCache: true });

      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data[0].id).toBe('abc123def456');
      expect(data[0].title).toBe('Add feature');
      expect(data[0].author).toBe('John Doe');
      expect(data[0].raw.type).toBe('commit');
      expect(data[0].raw.stats).toBeDefined();
    });

    it('fetches merged PRs from GitHub', async () => {
      const mockPRs = [
        {
          number: 123,
          title: 'Add awesome feature',
          body: 'This PR adds an awesome feature',
          mergedAt: '2025-11-20T15:00:00Z',
          additions: 100,
          deletions: 20,
          changedFiles: 5,
          headRefName: 'feature-branch',
          baseRefName: 'main',
          url: 'https://github.com/owner/repo/pull/123',
        },
      ];

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('gh api repos/owner/repo/commits?')) {
          return Buffer.from('[]');
        }
        if (cmd.includes('gh pr list')) {
          return Buffer.from(JSON.stringify(mockPRs));
        }
        return Buffer.from('');
      });

      // Initialize with only PRs enabled
      const prConnector = new GitHubConnector();
      await prConnector.initialize({
        type: 'github',
        sourceId: 'test-source',
        projectId: 'test-project',
        repo: 'owner/repo',
        includeCommits: false,
        includePRs: true,
      });

      const data = await prConnector.fetch({ skipCache: true });

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('123');
      expect(data[0].title).toBe('Add awesome feature');
      expect(data[0].raw.type).toBe('pr');
      expect(data[0].raw.additions).toBe(100);
      expect(data[0].raw.deletions).toBe(20);
    });

    it('filters data by until date', async () => {
      const mockCommits = [
        {
          sha: 'old-commit',
          commit: {
            message: 'Old commit',
            author: {
              name: 'John',
              email: 'john@example.com',
              date: '2025-11-01T10:00:00Z',
            },
          },
        },
        {
          sha: 'new-commit',
          commit: {
            message: 'New commit',
            author: {
              name: 'John',
              email: 'john@example.com',
              date: '2025-11-25T10:00:00Z',
            },
          },
        },
      ];

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('gh api repos/owner/repo/commits?')) {
          return Buffer.from(JSON.stringify(mockCommits));
        }
        if (cmd.includes('gh api repos/owner/repo/commits/')) {
          return Buffer.from(
            JSON.stringify({ stats: { additions: 1, deletions: 0, total: 1 } }),
          );
        }
        if (cmd.includes('gh pr list')) {
          return Buffer.from('[]');
        }
        return Buffer.from('');
      });

      const data = await connector.fetch({
        until: new Date('2025-11-15T00:00:00Z'),
        skipCache: true,
      });

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('old-commit');
    });

    it('handles rate limit errors gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('rate limit exceeded');
      });

      await expect(connector.fetch({ skipCache: true })).rejects.toThrow(
        'rate limit',
      );
    });
  });

  describe('clearCache', () => {
    it('clears cache successfully', async () => {
      await connector.initialize({
        type: 'github',
        sourceId: 'test-source',
        projectId: 'test-project',
        repo: 'owner/repo',
      });

      // Should not throw
      await expect(connector.clearCache()).resolves.not.toThrow();
    });
  });
});
