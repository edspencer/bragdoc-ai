import { auth } from 'app/(auth)/auth';
import { db } from '@/database/index';
import { document, user, chat } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v3';
import { fetchRenderExecute } from 'lib/ai/generate-document';
import { generateUUID } from '@/lib/utils';

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

    const {
      achievementIds,
      type,
      title,
      userInstructions,
      defaultInstructions,
    } = parsed.data;

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

    // In AI SDK v5, use the text promise to await the complete result
    let content = '';
    try {
      content = await result.text;
    } catch (streamError) {
      console.error('Error generating text:', streamError);
      throw new Error(`Failed to generate document: ${streamError}`);
    }

    if (!content) {
      return Response.json(
        { error: 'Failed to generate document content - no text generated' },
        { status: 500 },
      );
    }

    // Save to database with chat
    // Note: Sequential operations since neon-http doesn't support transactions
    const chatId = generateUUID();
    const documentId = generateUUID();

    try {
      // Create the chat first
      await db.insert(chat).values({
        id: chatId,
        createdAt: new Date(),
        userId: session.user.id,
        title: `Chat for: ${title}`,
      });

      // Create the document with chatId reference
      const [newDocument] = await db
        .insert(document)
        .values({
          id: documentId,
          title,
          content,
          type,
          userId: session.user.id,
          chatId: chatId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Response.json({ document: newDocument });
    } catch (insertError) {
      // If document insert fails, try to clean up the chat
      console.error('Error inserting document, cleaning up chat:', insertError);
      try {
        await db.delete(chat).where(eq(chat.id, chatId));
      } catch (cleanupError) {
        console.error('Error cleaning up chat:', cleanupError);
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Error generating document:', error);
    return Response.json(
      { error: 'Failed to generate document' },
      { status: 500 },
    );
  }
}
