import { auth } from 'app/(auth)/auth';
import { db } from '@/database/index';
import { document, user } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { fetchRenderExecute } from 'lib/ai/generate-document';

const generateSchema = z.object({
  achievementIds: z.array(z.string().uuid()),
  type: z.enum([
    'weekly_report',
    'monthly_report',
    'custom_report',
    'quarterly_report',
    'performance_review',
  ]),
  title: z.string().min(1),
  userInstructions: z.string().optional(),
  defaultInstructions: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = generateSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error },
        { status: 400 },
      );
    }

    const { achievementIds, type, title, userInstructions, defaultInstructions } = parsed.data;

    if (achievementIds.length === 0) {
      return Response.json(
        { error: 'At least one achievement must be selected' },
        { status: 400 },
      );
    }

    // If user provided custom instructions different from defaults, save to preferences
    if (
      userInstructions !== undefined &&
      defaultInstructions !== undefined &&
      userInstructions !== defaultInstructions &&
      userInstructions !== session.user.preferences?.documentInstructions
    ) {
      await db
        .update(user)
        .set({
          preferences: {
            ...session.user.preferences,
            documentInstructions: userInstructions,
          },
        })
        .where(eq(user.id, session.user.id));
    }

    // Generate the document using the full pipeline
    const result = await fetchRenderExecute({
      title,
      user: session.user,
      achievementIds,
      userInstructions,
    });

    // Stream the result and collect it
    let content = '';
    for await (const chunk of result.textStream) {
      content += chunk;
    }

    if (!content) {
      return Response.json(
        { error: 'Failed to generate document content' },
        { status: 500 },
      );
    }

    // Save to database
    const [newDocument] = await db
      .insert(document)
      .values({
        title,
        content,
        type,
        userId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return Response.json({ document: newDocument });
  } catch (error) {
    console.error('Error generating document:', error);
    return Response.json(
      { error: 'Failed to generate document' },
      { status: 500 },
    );
  }
}
