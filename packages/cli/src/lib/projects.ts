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

/**
 * Sync project with the API - find existing or create new project
 * Returns result with projectId if successful
 */
export async function syncProjectWithApi(
  repoPath: string,
  repoName: string
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
