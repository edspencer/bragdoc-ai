import { Octokit } from '@octokit/rest';
import type { GitHubRepository } from '../db/schema';

export interface GitHubClientConfig {
  accessToken: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(config: GitHubClientConfig) {
    this.octokit = new Octokit({
      auth: config.accessToken,
    });
  }

  async listRepositories(
    page = 1,
    perPage = 30,
  ): Promise<{
    repositories: Omit<
      GitHubRepository,
      'id' | 'userId' | 'lastSynced' | 'createdAt' | 'updatedAt'
    >[];
    hasNextPage: boolean;
  }> {
    const response = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    });

    return {
      repositories: response.data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || null,
        private: repo.private,
      })),
      hasNextPage: page * perPage < response.data.length,
    };
  }

  async getPullRequests(owner: string, repo: string, page = 1, perPage = 30) {
    const response = await this.octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    });

    return {
      pullRequests: response.data.map((pr) => ({
        prNumber: pr.number,
        title: pr.title,
        description: pr.body || null,
        state: pr.merged_at ? 'merged' : pr.state,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      })),
      hasNextPage: page * perPage < response.data.length,
    };
  }

  async getRepository(owner: string, repo: string) {
    const response = await this.octokit.repos.get({
      owner,
      repo,
    });

    return {
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description || null,
      private: response.data.private,
    };
  }
}
