import {
  collectGitCommits,
  getRepositoryInfo,
  getRepositoryName,
} from '../git/operations';
import type { BatchConfig, ExtractionContext } from '../git/batching';
import { processInBatches } from '../git/batching';
import { CommitCache } from '../cache/commits';
import { loadConfig } from '../config';
import { createApiClient } from '../api/client';

/**
 * Extract achievements from a project path
 * @param projectPath - Absolute path to the project directory
 * @param options - Extraction options
 * @returns Result indicating success/failure and achievement count
 */
export async function extractAchievementsFromProject(
  projectPath: string,
  options?: { maxCommits?: number; dryRun?: boolean }
): Promise<{ success: boolean; count?: number; error?: Error }> {
  try {
    const config = await loadConfig();

    // Check for auth token
    if (!config.auth?.token) {
      throw new Error('Not authenticated. Please run "bragdoc login" first.');
    }

    // Check token expiration
    if (config.auth.expiresAt && config.auth.expiresAt < Date.now()) {
      throw new Error(
        'Authentication token has expired. Please run "bragdoc login" to get a new token.'
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required.');
    }

    const repoInfo = getRepositoryInfo(projectPath);

    // Find project config
    const repoConfig = config.projects.find(
      (p) =>
        p.path === projectPath ||
        p.path === repoInfo.path ||
        repoInfo.path.startsWith(p.path)
    );

    if (!repoConfig?.id) {
      throw new Error('This project is not linked to a Bragdoc project.');
    }

    const branchToUse = repoInfo.currentBranch;
    const repository = getRepositoryName(repoInfo.remoteUrl);
    const maxCommits = options?.maxCommits || repoConfig.maxCommits || 300;

    // Collect commits
    const commits = collectGitCommits(branchToUse, maxCommits, repository);

    if (commits.length === 0) {
      return { success: true, count: 0 };
    }

    if (options?.dryRun) {
      // For dry run, just return the count without processing
      return { success: true, count: commits.length };
    }

    // Initialize commit cache
    const cache = new CommitCache();

    // Filter out cached commits
    const uncachedCommits = [];
    for (const commit of commits) {
      if (!(await cache.has(repository, commit.hash))) {
        uncachedCommits.push(commit);
      }
    }

    if (uncachedCommits.length === 0) {
      return { success: true, count: 0 };
    }

    const apiClient = await createApiClient();

    // Fetch user context
    const [companies, projects, userProfile] = await Promise.all([
      apiClient.get<any[]>('/api/companies'),
      apiClient.get<any[]>('/api/projects'),
      apiClient.get<any>('/api/user'),
    ]);

    const extractionContext: ExtractionContext = {
      projectId: repoConfig.id!,
      companies,
      projects,
      user: userProfile,
    };

    // Process commits in batches
    const batchConfig: BatchConfig = {
      maxCommitsPerBatch: 10,
    };

    let totalAchievements = 0;
    let processedSoFar = 0;
    for await (const result of processInBatches(
      repoInfo,
      uncachedCommits,
      batchConfig,
      extractionContext,
      apiClient
    )) {
      // Add successfully processed commits to cache
      const processedHashes = uncachedCommits
        .slice(processedSoFar, processedSoFar + result.processedCount)
        .map((c) => c.hash);
      processedSoFar += result.processedCount;
      await cache.add(repository, processedHashes);

      totalAchievements += result.achievements.length;
    }

    return { success: true, count: totalAchievements };
  } catch (error: any) {
    return { success: false, error };
  }
}
