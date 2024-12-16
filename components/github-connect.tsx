'use client';

import { useSession } from 'next-auth/react';
import { RepositorySelector } from './github/RepositorySelector';

export function GitHubConnect() {
  const { data: session } = useSession();
  const githubToken = session?.user?.githubAccessToken;

  if (!githubToken) {
    return null;
  }

  return (
    <div className="mb-4">
      <RepositorySelector
        accessToken={githubToken}
        onRepositorySelect={async (repo) => {
          // TODO: Implement repository connection
          console.log('Selected repository:', repo);
        }}
      />
    </div>
  );
}
