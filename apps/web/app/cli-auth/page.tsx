import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { CLIAuthContent } from './CLIAuthContent';

type Params = Promise<{ state?: string; port?: string }>;

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  // Get Better Auth session
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  const { state, port } = await searchParams;

  // If not logged in, show login prompt (middleware handles redirect)
  if (!session) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">
            Please log in to continue with CLI authentication.
          </p>
        </div>
      </div>
    );
  }

  return <CLIAuthContent state={state} port={port} />;
}
