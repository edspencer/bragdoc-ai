import { getAuthUser } from '@/lib/getAuthUser';
import { db, document } from '@bragdoc/database';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const documentSchema = z.object({
  content: z.string().optional(),
  title: z.string().optional(),
  type: z
    .enum([
      'weekly_report',
      'monthly_report',
      'quarterly_report',
      'performance_review',
      'custom',
    ])
    .optional(),
  companyId: z.string().uuid().optional().nullable(),
  chatId: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser(request);

  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = auth;

  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    const docs = await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), eq(document.userId, user.id)))
      .orderBy(desc(document.createdAt));

    if (!docs || docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Return the latest version (first one since ordered by desc)
    return Response.json({ document: docs[0] });
  } catch (error) {
    console.error('Error fetching document:', error);
    return Response.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getAuthUser(request);

  if (!authResult) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { user } = authResult;

  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    const json = await request.json();
    const parsed = documentSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error },
        { status: 400 },
      );
    }

    const { content, title, type, companyId, chatId } = parsed.data;

    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() };
    if (content !== undefined) updateData.content = content;
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (companyId !== undefined) updateData.companyId = companyId;
    if (chatId !== undefined) updateData.chatId = chatId;

    // Update all versions of the document (important for versioned documents)
    const updated = await db
      .update(document)
      .set(updateData)
      .where(and(eq(document.id, id), eq(document.userId, user.id)))
      .returning();

    if (!updated || updated.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Return the latest version
    const latest = updated.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];

    return Response.json({ document: latest });
  } catch (error) {
    console.error('Error updating document:', error);
    return Response.json(
      { error: 'Failed to update document' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getAuthUser(request);

  if (!authResult) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { user } = authResult;

  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    const { timestamp }: { timestamp: string } = await request.json();

    const [doc] = await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), eq(document.userId, user.id)));

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    await db
      .delete(document)
      .where(and(eq(document.id, id), eq(document.userId, user.id)));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return Response.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getAuthUser(request);

  if (!authResult) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { user } = authResult;

  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    const [deleted] = await db
      .delete(document)
      .where(and(eq(document.id, id), eq(document.userId, user.id)))
      .returning();

    if (!deleted) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return Response.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}
