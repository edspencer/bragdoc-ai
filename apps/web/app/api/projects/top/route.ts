import { type NextRequest, NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { getTopProjectsByImpact } from '@/database/projects/queries';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const limit = Number.parseInt(searchParams.get('limit') ?? '5');

    const projects = await getTopProjectsByImpact(session.user.id, limit);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching top projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top projects' },
      { status: 500 },
    );
  }
}
