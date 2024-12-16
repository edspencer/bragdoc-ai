import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { githubRepository } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { RepositorySelector } from '@/components/github/RepositorySelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function GitHubSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  const repositories = await db.query.githubRepository.findMany({
    where: eq(githubRepository.userId, session.user.id),
  });

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">GitHub Settings</h1>
        <p className="text-muted-foreground">
          Connect your GitHub repositories to automatically generate brags from your pull requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Repositories</CardTitle>
          <CardDescription>
            Select repositories to sync. Free accounts can connect one repository,
            while Pro accounts can connect unlimited repositories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-medium">{repo.name}</h3>
                  {repo.description && (
                    <p className="text-sm text-muted-foreground">{repo.description}</p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last synced: {repo.lastSynced ? new Date(repo.lastSynced).toLocaleDateString() : 'Never'}
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
                    userId: session.user.id,
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
