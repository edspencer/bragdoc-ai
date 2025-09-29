import { GitHubClient } from './client';
import { db } from '@/database/index';
import { githubPullRequest, githubRepository, user } from '@/database/schema';
import { eq } from 'drizzle-orm';

interface SyncOptions {
  userId: string;
  repositoryId?: string; // If provided, only sync this repository
}

export async function syncGitHubData({ userId, repositoryId }: SyncOptions) {
  // Get user's GitHub access token
  const users = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userRecord = users[0];
  if (!userRecord?.githubAccessToken) {
    throw new Error('GitHub access token not found');
  }

  const client = new GitHubClient({
    accessToken: userRecord.githubAccessToken,
  });

  // Get repositories to sync
  const repositories = await db
    .select()
    .from(githubRepository)
    .where(
      repositoryId
        ? eq(githubRepository.id, repositoryId)
        : eq(githubRepository.userId, userId)
    );

  for (const repo of repositories) {
    try {
      const [owner, repoName] = repo.fullName.split('/');

      // Sync pull requests
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const { pullRequests, hasNextPage } = await client.getPullRequests(
          owner!,
          repoName!,
          page,
          perPage
        );

        // Upsert pull requests
        for (const pr of pullRequests) {
          await db
            .insert(githubPullRequest)
            .values({
              repositoryId: repo.id,
              prNumber: pr.prNumber,
              title: pr.title,
              description: pr.description || '',
              state: pr.state,
              createdAt: new Date(pr.createdAt),
              updatedAt: new Date(pr.updatedAt),
              mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
            })
            .onConflictDoUpdate({
              target: [
                githubPullRequest.repositoryId,
                githubPullRequest.prNumber,
              ],
              set: {
                title: pr.title,
                description: pr.description || '',
                state: pr.state,
                updatedAt: new Date(pr.updatedAt),
                mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
              },
            });
        }

        hasMore = hasNextPage;
        page++;
      }

      // Update repository last synced time
      await db
        .update(githubRepository)
        .set({ lastSynced: new Date() })
        .where(eq(githubRepository.id, repo.id));
    } catch (error) {
      console.error(`Failed to sync repository ${repo.fullName}:`, error);
      // Continue with next repository
    }
  }
}
