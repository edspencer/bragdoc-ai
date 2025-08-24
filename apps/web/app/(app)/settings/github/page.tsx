import { auth } from 'app/(auth)/auth';

import { db } from 'lib/db';
import { githubRepository } from 'lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { RepositorySelector } from 'components/github/RepositorySelector';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { Lock } from 'lucide-react';
import { SyncRepositoryButton } from 'components/github/SyncRepositoryButton';

export default async function GitHubSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const repositories = await db
    .select()
    .from(githubRepository)
    .limit(30)
    .orderBy(desc(githubRepository.lastSynced))
    .where(eq(githubRepository.userId, session.user.id));

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">GitHub Settings</h1>
        <p className="text-muted-foreground">
          Connect your GitHub repositories to automatically generate
          Achievements from your pull requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Repositories</CardTitle>
          <CardDescription>
            Select repositories to sync. Free accounts can connect one
            repository, while Pro accounts can connect unlimited repositories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <div className="flex items-center gap-2">
                  <span>{repo.fullName}</span>
                  {repo.private && (
                    <Lock className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SyncRepositoryButton repositoryId={repo.id} />
                  <span className="text-xs text-muted-foreground">
                    {repo.lastSynced
                      ? `Last synced: ${new Date(repo.lastSynced).toLocaleDateString()}`
                      : 'Never synced'}
                  </span>
                </div>
              </div>
            ))}

            {repositories.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No repositories connected yet.
              </p>
            )}

            <div className="mt-4">
              <RepositorySelector
                accessToken={session.user.githubAccessToken || ''}
                selectedRepositoryId={repositories[0]?.fullName}
                onRepositorySelect={async (repo) => {
                  'use server';
                  await db.insert(githubRepository).values({
                    userId: session.user.id as any,
                    name: repo.name,
                    fullName: repo.fullName,
                    description: repo.description,
                    private: repo.private,
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
