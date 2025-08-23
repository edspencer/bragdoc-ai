import { auth } from '@/app/(auth)/auth';
import { syncGitHubData } from '@/lib/github/sync';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { repositoryId } = await request.json();

    await syncGitHubData({
      userId: session.user.id,
      repositoryId,
    });

    return new NextResponse('Sync completed successfully', { status: 200 });
  } catch (error) {
    console.error('Failed to sync GitHub data:', error);
    return new NextResponse('Failed to sync GitHub data', { status: 500 });
  }
}
