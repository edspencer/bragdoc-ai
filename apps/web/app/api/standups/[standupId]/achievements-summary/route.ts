import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getStandupById,
  updateStandupDocumentAchievementsSummary,
  createStandupDocument,
} from '@bragdoc/database';
import { createOrUpdateStandupDocument } from 'lib/standups/create-standup-document';
import { computeNextRunUTC } from 'lib/scheduling';
import type { StandupDocument } from '@bragdoc/database';

const summarySchema = z.object({
  achievementsSummary: z.string().optional(),
  regenerate: z.boolean().optional(), // If true, generate from achievements (LLM)
  source: z.enum(['manual', 'llm']).optional().default('manual'), // Track who created the content
  documentId: z.string().optional(), // ID of document to update (if it exists)
  achievementIds: z.array(z.string()).optional(), // Optional list of achievement IDs to include
});

/**
 * POST /api/standups/:standupId/achievements-summary
 * Update or generate the achievements summary for the current standup document
 *
 * Two modes:
 * 1. Manual save: Pass achievementsSummary, source='manual', and optional documentId
 * 2. Regenerate (LLM): Pass regenerate=true (uses existing createOrUpdateStandupDocument)
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> }
) {
  try {
    const params = await props.params;
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify standup exists and belongs to user
    const standup = await getStandupById(params.standupId, auth.user.id);
    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    // Validate request body
    const body = await req.json();
    const { regenerate, achievementsSummary, source, documentId, achievementIds } =
      summarySchema.parse(body);

    let document: StandupDocument;

    if (regenerate) {
      // Mode 1: Regenerate from achievements using AI (source will be 'llm')
      document = await createOrUpdateStandupDocument(
        params.standupId,
        auth.user.id,
        standup,
        undefined, // No target date - uses next scheduled date
        true, // regenerate = true
        achievementIds // Pass selected achievement IDs
      );
    } else {
      // Mode 2: Direct save of user-provided text
      if (achievementsSummary === undefined) {
        return NextResponse.json(
          { error: 'achievementsSummary is required when not regenerating' },
          { status: 400 }
        );
      }

      if (documentId) {
        // Update existing document
        document = await updateStandupDocumentAchievementsSummary(
          documentId,
          achievementsSummary,
          source
        );
      } else {
        // Create new document if none exists - calculate next scheduled standup date
        const nextStandupDate = computeNextRunUTC(
          new Date(),
          standup.timezone,
          standup.meetingTime,
          standup.daysMask
        );

        const newDoc = await createStandupDocument({
          standupId: params.standupId,
          userId: auth.user.id,
          date: nextStandupDate,
          achievementsSummary,
        });

        // Update with proper source
        document = await updateStandupDocumentAchievementsSummary(
          newDoc.id,
          achievementsSummary,
          source
        );
      }
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating achievements summary:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update achievements summary' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId/achievements-summary
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
