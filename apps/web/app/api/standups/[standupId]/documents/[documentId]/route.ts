import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getStandupById, deleteStandupDocument } from '@bragdoc/database';

/**
 * DELETE /api/standups/:standupId/documents/:documentId
 * Delete a standup document
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ standupId: string; documentId: string }> },
) {
  try {
    const params = await props.params;
    const { standupId, documentId } = params;

    // Authenticate
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify standup belongs to user
    const standup = await getStandupById(standupId, auth.user.id);
    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    // Delete the document
    await deleteStandupDocument(documentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting standup document:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete standup document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId/documents/:documentId
 * CORS preflight handler
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
