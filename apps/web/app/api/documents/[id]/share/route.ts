import { getAuthUser } from '@/lib/getAuthUser';
import { db } from '@/database/index';
import { document } from '@/database/schema';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getAuthUser(request);

  try {
    if (!authResult) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = authResult;

    const { id } = await params;

    // Generate a secure random token
    const shareToken = Buffer.from(randomUUID()).toString('base64url');

    const [updated] = await db
      .update(document)
      .set({ shareToken })
      .where(and(eq(document.id, id), eq(document.userId, user.id)))
      .returning();

    if (!updated) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ shareToken: updated.shareToken });
  } catch (error) {
    console.error('Error sharing document:', error);
    return Response.json(
      { error: 'Failed to share document' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getAuthUser(request);

  try {
    if (!authResult) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = authResult;

    const { id } = await params;

    const [updated] = await db
      .update(document)
      .set({ shareToken: null })
      .where(and(eq(document.id, id), eq(document.userId, user.id)))
      .returning();

    if (!updated) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error unsharing document:', error);
    return Response.json(
      { error: 'Failed to unshare document' },
      { status: 500 },
    );
  }
}
