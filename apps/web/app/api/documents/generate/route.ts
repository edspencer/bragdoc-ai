import { getAuthUser } from '@/lib/getAuthUser';
import { db } from '@/database/index';
import { document, user, chat } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v3';
import { fetchRenderExecute } from 'lib/ai/generate-document';
import { generateUUID } from '@/lib/utils';
import { captureServerEvent } from '@/lib/posthog-server';
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import {
  checkUserCredits,
  deductCredits,
  CREDIT_COSTS,
  logCreditTransaction,
} from '@/lib/credits';

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
  const authResult = await getAuthUser(request);

  if (!authResult) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { user: authUser } = authResult;

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

    // Credit gate - skip for paid/demo users
    if (!hasUnlimitedAccess(authUser)) {
      const cost =
        CREDIT_COSTS.document_generation[
          type as keyof typeof CREDIT_COSTS.document_generation
        ] ?? 1;
      const { hasCredits, remainingCredits } = checkUserCredits(authUser, cost);

      if (!hasCredits) {
        return Response.json(
          {
            error: 'insufficient_credits',
            message: `Document generation requires ${cost} credits. You have ${remainingCredits} remaining.`,
            required: cost,
            available: remainingCredits,
            upgradeUrl: '/pricing',
          },
          { status: 402 },
        );
      }

      // Atomic deduction
      const { success } = await deductCredits(authUser.id, cost);
      if (!success) {
        return Response.json(
          {
            error: 'insufficient_credits',
            message:
              'Credits consumed by concurrent request. Please try again.',
            upgradeUrl: '/pricing',
          },
          { status: 402 },
        );
      }

      // Log the transaction (non-blocking)
      logCreditTransaction({
        userId: authUser.id,
        operation: 'deduct',
        featureType: 'document_generation',
        amount: cost,
        metadata: { documentType: type, title },
      }).catch((err) =>
        console.error('Failed to log credit transaction:', err),
      );
    }

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
      userInstructions !== authUser.preferences?.documentInstructions
    ) {
      await db
        .update(user)
        .set({
          preferences: {
            ...authUser.preferences,
            documentInstructions: userInstructions,
          },
        })
        .where(eq(user.id, authUser.id));
    }

    // Generate the document using the full pipeline
    const result = await fetchRenderExecute({
      title,
      user: authUser,
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
        userId: authUser.id,
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
          userId: authUser.id,
          chatId: chatId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Track document generation
      try {
        await captureServerEvent(authUser.id, 'document_generated', {
          type,
          achievement_count: achievementIds.length,
          user_id: authUser.id,
        });
      } catch (error) {
        console.error('Failed to track document generation:', error);
        // Don't fail the request if tracking fails
      }

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
