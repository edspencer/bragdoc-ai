import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { getCompanyRelatedDataCounts } from '@/database/queries';
import { db } from '@/database/index';

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const counts = await getCompanyRelatedDataCounts({
      companyId: id,
      userId: auth.user.id,
      db,
    });

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching company related counts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
