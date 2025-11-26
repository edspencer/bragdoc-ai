import { getRepositoryInfo } from '../git/operations';
import { createApiClient } from '../api/client';
import logger from '../utils/logger';

export interface SyncResult {
  projectId?: string;
  success: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
  existed?: boolean;
}

interface ApiProject {
  id: string;
  name: string;
  repoRemoteUrl?: string | null;
}

interface ApiSource {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  type: 'git' | 'github' | 'jira';
  config: Record<string, any>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceSyncResult {
  sourceId?: string;
  success: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
  existed?: boolean;
}

/**
 * Sync project with the API - find existing or create new project
 * Returns result with projectId if successful
 */
export async function syncProjectWithApi(
  repoPath: string,
  repoName: string,
): Promise<SyncResult> {
  try {
    // Get repository info
    const repoInfo = getRepositoryInfo(repoPath);
    const remoteUrl = repoInfo.remoteUrl;

    logger.debug('Repository info:', {
      path: repoPath,
      remoteUrl,
      name: repoName,
    });

    // Create API client
    const apiClient = await createApiClient();

    if (!apiClient.isAuthenticated()) {
      logger.debug('User not authenticated, skipping project sync');
      return {
        success: true,
        message: 'Not logged in. Run `bragdoc login` to sync with the web app.',
        type: 'warning',
      };
    }

    // Get all user projects
    logger.debug('Fetching projects from API...');
    const projects = await apiClient.get<ApiProject[]>('/api/projects');

    // Find project by remoteUrl
    const existingProject = projects.find((p) => p.repoRemoteUrl === remoteUrl);

    if (existingProject) {
      logger.debug('Found existing project:', existingProject.id);
      return {
        projectId: existingProject.id,
        success: true,
        existed: true,
        message: `Found existing project: ${existingProject.name} (${existingProject.id})`,
        type: 'success',
      };
    }

    // Create new project
    logger.debug('Creating new project...');

    const newProject = await apiClient.post<ApiProject>('/api/projects', {
      name: repoName,
      repoRemoteUrl: remoteUrl,
      status: 'active',
      startDate: new Date().toISOString(),
    });

    logger.debug('Created project:', newProject.id);
    return {
      projectId: newProject.id,
      success: true,
      existed: false,
      message: `Created project: ${newProject.name} (${newProject.id})`,
      type: 'success',
    };
  } catch (error: any) {
    logger.error('Failed to sync project with API:', error);
    return {
      success: false,
      message: `Failed to sync with API: ${error.message}`,
      type: 'error',
    };
  }
}

/**
 * Options for syncing a source with the API
 */
export interface SyncSourceOptions {
  /** For Git sources - path to local repository */
  repoPath?: string;
  /** Source type - defaults to 'git' for backward compatibility */
  sourceType?: 'git' | 'github';
  /** Type-specific configuration (e.g., GitHub repo, options) */
  sourceConfig?: Record<string, unknown>;
}

/**
 * Sync source with the API - find existing or create new source for a project
 * Returns result with sourceId if successful
 *
 * @param projectId - ID of the project to sync source for
 * @param sourceName - Human-readable name for the source
 * @param optionsOrRepoPath - Either a string (repoPath for backward compatibility) or SyncSourceOptions
 * @returns SourceSyncResult with success status and optional sourceId
 *
 * @example
 * // Git source (original signature - backward compatible)
 * await syncSourceWithApi(projectId, 'My Repo (Git)', '/path/to/repo');
 *
 * // Git source (new signature)
 * await syncSourceWithApi(projectId, 'My Repo (Git)', {
 *   sourceType: 'git',
 *   repoPath: '/path/to/repo',
 * });
 *
 * // GitHub source
 * await syncSourceWithApi(projectId, 'My Repo (GitHub)', {
 *   sourceType: 'github',
 *   sourceConfig: {
 *     repo: 'owner/repo',
 *     includeCommits: true,
 *     includePRs: true,
 *     includeIssues: false,
 *   },
 * });
 */
export async function syncSourceWithApi(
  projectId: string,
  sourceName: string,
  optionsOrRepoPath?: string | SyncSourceOptions,
): Promise<SourceSyncResult> {
  // Handle backward compatibility - if string passed, it's repoPath
  const options: SyncSourceOptions =
    typeof optionsOrRepoPath === 'string'
      ? { repoPath: optionsOrRepoPath, sourceType: 'git' }
      : optionsOrRepoPath || { sourceType: 'git' };

  const sourceType = options.sourceType || 'git';

  try {
    // Create API client
    const apiClient = await createApiClient();

    if (!apiClient.isAuthenticated()) {
      logger.debug('User not authenticated, skipping source sync');
      return {
        success: true,
        message: 'Not logged in. Run `bragdoc login` to sync sources.',
        type: 'warning',
      };
    }

    // Get all sources for this project
    logger.debug('Fetching sources from API...');
    const response = await apiClient.get<{
      data: ApiSource[];
    }>(`/api/sources?projectId=${projectId}`);

    const sources = response.data || [];

    // Find existing source of same type for this project
    const existingSource = sources.find(
      (s) =>
        s.type === sourceType && s.projectId === projectId && !s.isArchived,
    );

    if (existingSource) {
      logger.debug(`Found existing ${sourceType} source:`, existingSource.id);
      return {
        sourceId: existingSource.id,
        success: true,
        existed: true,
        message: `Found existing ${sourceType} source: ${existingSource.name} (${existingSource.id})`,
        type: 'success',
      };
    }

    // Build config based on source type
    const config =
      sourceType === 'git'
        ? { gitPath: options.repoPath }
        : options.sourceConfig || {};

    // Create new source
    logger.debug(`Creating new ${sourceType} source...`);

    const newSource = await apiClient.post<ApiSource>('/api/sources', {
      projectId,
      name: sourceName,
      type: sourceType,
      config,
    });

    logger.debug(`Created ${sourceType} source:`, newSource.id);
    return {
      sourceId: newSource.id,
      success: true,
      existed: false,
      message: `Created ${sourceType} source: ${newSource.name} (${newSource.id})`,
      type: 'success',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to sync source with API:', error);
    return {
      success: false,
      message: `Failed to sync source with API: ${errorMessage}`,
      type: 'error',
    };
  }
}
