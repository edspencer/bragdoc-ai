import {
  processInBatches,
  type BatchConfig,
  type ExtractionContext,
} from './batching';
import type { GitCommit, RepositoryInfo } from './types';
import logger from '../utils/logger';
import * as extractModule from '../ai/extract-commit-achievements';
import type { ApiClient } from '../api/client';

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

// Mock the extraction module
jest.mock('../ai/extract-commit-achievements');

describe('Batching Logic', () => {
  let mockRenderExecute: jest.Mock;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // Reset all logger mock functions
    (logger.debug as jest.Mock).mockReset();
    (logger.info as jest.Mock).mockReset();
    (logger.warn as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();

    // Mock renderExecute
    mockRenderExecute = jest.fn();
    (extractModule.renderExecute as jest.Mock) = mockRenderExecute;

    // Mock API client
    mockApiClient = {
      createAchievements: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      isAuthenticated: jest.fn(),
    } as any;
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
    branch: 'main',
  }));

  const mockConfig: BatchConfig = {
    maxCommitsPerBatch: 2,
    maxRetries: 3,
    retryDelayMs: 1000,
    // Use immediate delay for testing
    delayFn: async () => Promise.resolve(),
  };

  const mockExtractionContext: ExtractionContext = {
    projectId: 'project-123',
    companies: [
      {
        id: 'company-1',
        name: 'Test Company',
        role: 'Engineer',
        startDate: '2020-01-01',
        endDate: null,
      },
    ],
    projects: [
      {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        companyId: 'company-1',
        startDate: '2020-01-01',
        endDate: null,
        repoRemoteUrl: 'git@github.com:test/repo.git',
      },
    ],
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      preferences: null,
    },
  };

  it('processes commits in correct batch sizes', async () => {
    // Mock LLM extraction
    mockRenderExecute.mockResolvedValue([
      {
        title: 'Achievement 1',
        summary: 'Summary 1',
        details: 'Details 1',
        eventDuration: 'week',
        eventStart: new Date(),
        eventEnd: null,
        companyId: 'company-1',
        projectId: 'project-123',
        impact: 5,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
      },
    ]);

    // Mock API client
    mockApiClient.createAchievements.mockResolvedValue([
      {
        id: 'achievement-1',
        title: 'Achievement 1',
        createdAt: new Date().toISOString(),
        source: 'llm',
      },
    ]);

    const generator = processInBatches(
      mockRepo,
      mockCommits,
      mockConfig,
      mockExtractionContext,
      mockApiClient,
    );

    const results = [];
    for await (const result of generator) {
      results.push(result);
    }

    // Should have 3 batches (2 commits, 2 commits, 1 commit)
    expect(mockRenderExecute).toHaveBeenCalledTimes(3);
    expect(mockApiClient.createAchievements).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);

    // Verify debug logs
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Processing 5 commits in 3 batches'),
    );
  });

  it('retries on failure and succeeds eventually', async () => {
    // Fail twice, succeed on third try
    mockRenderExecute
      .mockRejectedValueOnce(new Error('LLM API error'))
      .mockRejectedValueOnce(new Error('LLM API error'))
      .mockResolvedValueOnce([
        {
          title: 'Achievement 1',
          summary: 'Summary 1',
          details: 'Details 1',
          eventDuration: 'week',
          eventStart: new Date(),
          eventEnd: null,
          companyId: 'company-1',
          projectId: 'project-123',
          impact: 5,
          impactSource: 'llm',
          impactUpdatedAt: new Date(),
        },
      ]);

    mockApiClient.createAchievements.mockResolvedValue([
      {
        id: 'achievement-1',
        title: 'Achievement 1',
        createdAt: new Date().toISOString(),
        source: 'llm',
      },
    ]);

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockExtractionContext,
      mockApiClient,
    );

    const results = [];
    for await (const result of generator) {
      results.push(result);
    }

    expect(mockRenderExecute).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(1);

    // Check retry messaging
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 1/3)'),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retry attempt 1/2 for batch 1'),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 2/3)'),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retry attempt 2/2 for batch 1'),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully processed batch 1 after 3 attempts'),
    );
  });

  it('fails after max retries', async () => {
    // Always fail
    mockRenderExecute.mockRejectedValue(new Error('Persistent LLM error'));

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockExtractionContext,
      mockApiClient,
    );

    await expect(async () => {
      for await (const result of generator) {
        // Should throw before yielding any results
      }
    }).rejects.toThrow('Maximum retries (3) exceeded for batch 1');

    expect(mockRenderExecute).toHaveBeenCalledTimes(3);

    // Check error messaging
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 1/3)'),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error processing batch 1 (attempt 2/3)'),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process batch 1/1 after 3 attempts'),
    );
  });

  it('handles API client errors', async () => {
    mockRenderExecute.mockResolvedValue([
      {
        title: 'Achievement 1',
        summary: 'Summary 1',
        details: 'Details 1',
        eventDuration: 'week',
        eventStart: new Date(),
        eventEnd: null,
        companyId: 'company-1',
        projectId: 'project-123',
        impact: 5,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
      },
    ]);

    // API client fails
    mockApiClient.createAchievements.mockRejectedValue(
      new Error('API error: Invalid request'),
    );

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockExtractionContext,
      mockApiClient,
    );

    await expect(async () => {
      for await (const result of generator) {
        // Should throw before yielding any results
      }
    }).rejects.toThrow('Maximum retries (3) exceeded for batch 1');
  });

  it('passes correct context to LLM extraction', async () => {
    mockRenderExecute.mockResolvedValue([]);
    mockApiClient.createAchievements.mockResolvedValue([]);

    const generator = processInBatches(
      mockRepo,
      mockCommits.slice(0, 2),
      mockConfig,
      mockExtractionContext,
      mockApiClient,
    );

    for await (const result of generator) {
      // Process results
    }

    // Verify LLM was called with correct context
    expect(mockRenderExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        companies: mockExtractionContext.companies,
        projects: mockExtractionContext.projects,
        user: mockExtractionContext.user,
        repository: expect.objectContaining({
          path: mockRepo.path,
          remoteUrl: mockRepo.remoteUrl,
        }),
        commits: expect.arrayContaining([
          expect.objectContaining({
            hash: 'hash0',
            message: 'commit message 0',
          }),
        ]),
      }),
    );
  });
});
