import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { exportDataSchema } from '@/lib/export-import-schema';
import { importUserData } from '@/lib/import-user-data';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;
    const body = await req.json();

    // Validate the import data
    const result = exportDataSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid import data format',
          details: result.error.errors,
        },
        { status: 400 },
      );
    }

    // Use shared import function with duplicate checking
    const stats = await importUserData({
      userId,
      data: result.data,
      checkDuplicates: true, // Check for duplicates in normal imports
    });

    return NextResponse.json({
      message: 'Data imported successfully',
      stats,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 },
    );
  }
}
