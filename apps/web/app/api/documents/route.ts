import { auth } from 'app/(auth)/auth';
import { db } from 'lib/db';
import { document } from 'lib/db/schema';
import { eq } from 'drizzle-orm';
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

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.userId, session.user.id))
      .orderBy(document.createdAt);

    return Response.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return Response.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

    const [doc] = await db
      .insert(document)
      .values({
        title,
        content,
        type,
        companyId,
        userId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return Response.json({ document: doc });
  } catch (error) {
    console.error('Error creating document:', error);
    return Response.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
