import { processInBatches, type BatchConfig } from './batching';
import type { GitCommit, RepositoryInfo } from './types';
import logger from '../utils/logger';

// Mock logger
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Batching Logic', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Reset all logger mock functions
    (logger.debug as jest.Mock).mockReset();
    (logger.info as jest.Mock).mockReset();
    (logger.warn as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  const mockRepo: RepositoryInfo = {
    path: '/test/path',
    remoteUrl: 'git@github.com:test/repo.git',
    currentBranch: 'main',
  };

  const mockCommits: GitCommit[] = Array.from({ length: 5 }, (_, i) => ({
    repository: 'test-repo',
    hash: `hash${i}`,
    message: `commit message ${i}`,
    author: 'Test User <test@example.com>',
    date: new Date().toISOString(),
    branch: 'main'
  }));

  const mockConfig: BatchConfig = {
    maxCommitsPerBatch: 2,
    maxRetries: 3,
    retryDelayMs: 1000,
    // Use immediate delay for testing
    delayFn: async () => Promise.resolve(),
  };

  const mockApiUrl = 'http://api.test';
  const mockToken = 'test-token';

  it('processes commits in correct batch sizes', async () => {
    // Mock successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        processedCount: 2,
        achievements: [
          {
            id: '1',
            description: 'Achievement 1',
            date: new Date().toISOString(),
            source: { type: 'commit', hash: 'hash1' },
          },
        ],
      }),
    });

    const generator = processInBatches(
      mockRepo,
      mockCommits,
      mockConfig,
      mockApiUrl,
      mockToken,
    );

    const results = [];
    for await (const result of generator) {
      results.push(result);
    }

    // Should have 3 batches (2 commits, 2 commits, 1 commit)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);

    // Check batch sizes in API calls
    const calls = mockFetch.mock.calls;
    const firstBatchBody = JSON.parse(calls[0][1].body);
    const lastBatchBody = JSON.parse(calls[2][1].body);
    expect(firstBatchBody.commits).toHaveLength(2);
    expect(lastBatchBody.commits).toHaveLength(1);

    // Verify debug logs
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Processing 5 commits in 3 batches')
    );
  });

  it('retries on failure and succeeds eventually', async () => {
    // Fail twice, succeed on third try
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          processedCount: 2,
          achievements: [],
        }),
      });

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockApiUrl,
      mockToken,
    );

    const results = [];
    for await (const result of generator) {
      results.push(result);
    }

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(1);

    // Check retry messaging
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 1/3)')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retry attempt 1/2 for batch 1')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 2/3)')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retry attempt 2/2 for batch 1')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully processed batch 1 after 3 attempts')
    );
  });

  it('fails after max retries', async () => {
    // Always fail
    mockFetch.mockRejectedValue(new Error('Persistent error'));

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockApiUrl,
      mockToken,
    );

    await expect(async () => {
      for await (const result of generator) {
        // Should throw before yielding any results
      }
    }).rejects.toThrow('Maximum retries (3) exceeded for batch 1');

    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Check error messaging
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 1/3)')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 2/3)')
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process batch 1/1 after 3 attempts')
    );
  });

  it('handles API errors with error responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Invalid request'),
    });

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockApiUrl,
      mockToken,
    );

    await expect(async () => {
      for await (const result of generator) {
        // Should throw before yielding any results
      }
    }).rejects.toThrow('API error (status 400)');
  });

  it('sends correct authorization headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ processedCount: 2, achievements: [] }),
    });

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockApiUrl,
      mockToken,
    );

    for await (const result of generator) {
      // Process results
    }

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });
});
