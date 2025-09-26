import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { CLIAuthContent } from './CLIAuthContent';

type Params = Promise<{ state?: string; port?: string }>;

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const session = await auth();

  const { state, port } = await searchParams;

  // If not logged in, redirect to login
  if (!session) {
    redirect(`/login?callbackUrl=/cli-auth?state=${state}&port=${port}`);
  }

  return <CLIAuthContent state={state} port={port} />;
}
