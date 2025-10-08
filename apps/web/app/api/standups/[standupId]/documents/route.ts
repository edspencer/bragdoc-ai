import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getStandupById,
  getStandupDocumentsByStandupId,
} from '@bragdoc/database';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
) {
  const params = await props.params;
  const { standupId } = params;

  // Authenticate
  const auth = await getAuthUser(req);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify standup belongs to user
    const standup = await getStandupById(standupId, auth.user.id);
    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    // Get query params
    const searchParams = req.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;

    // Get documents
    const documents = await getStandupDocumentsByStandupId(standupId, limit);

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching standup documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}
