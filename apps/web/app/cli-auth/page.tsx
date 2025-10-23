import { auth } from '@/app/(auth)/auth';
import { CLIAuthContent } from './CLIAuthContent';

type Params = Promise<{ state?: string; port?: string }>;

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const session = await auth();

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
