import { auth } from 'app/(auth)/auth';
import { db } from '@/database/index';
import { document } from '@/database/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const documentSchema = z.object({
  content: z.string(),
  title: z.string(),
  type: z
    .enum([
      'weekly_report',
      'monthly_report',
      'quarterly_report',
      'performance_review',
      'custom',
    ])
    .optional(),
  companyId: z.string().uuid().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    const [doc] = await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), eq(document.userId, session.user.id)));

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ document: doc });
  } catch (error) {
    console.error('Error fetching document:', error);
    return Response.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
        { status: 400 }
      );
    }

    const { content, title, type, companyId } = parsed.data;

    const [updated] = await db
      .update(document)
      .set({
        title,
        content,
        type,
        companyId,
        updatedAt: new Date(),
      })
      .where(and(eq(document.id, id), eq(document.userId, session.user.id)))
      .returning();

    if (!updated) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ document: updated });
  } catch (error) {
    console.error('Error updating document:', error);
    return Response.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      .where(and(eq(document.id, id), eq(document.userId, session.user.id)));

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    await db
      .delete(document)
      .where(and(eq(document.id, id), eq(document.userId, session.user.id)));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return Response.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      .where(and(eq(document.id, id), eq(document.userId, session.user.id)))
      .returning();

    if (!deleted) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return Response.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
