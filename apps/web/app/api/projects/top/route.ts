import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getTopProjectsByImpact } from '@/database/projects/queries';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthUser(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = authResult;

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const limit = Number.parseInt(searchParams.get('limit') ?? '5', 10);

    const projects = await getTopProjectsByImpact(user.id, limit);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching top projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top projects' },
      { status: 500 },
    );
  }
}
