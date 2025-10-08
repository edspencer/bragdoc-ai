import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getStandupById,
  getCurrentStandupDocument,
  createStandupDocument,
  updateStandupDocumentAchievementsSummary,
  getRecentAchievementsForStandup,
} from '@bragdoc/database';
import { computeNextRunUTC, computePreviousRunUTC } from 'lib/scheduling';
import { generateStandupSummary } from 'lib/ai/standup-summary';

const summarySchema = z.object({
  achievementsSummary: z.string().optional(),
  regenerate: z.boolean().optional(), // If true, generate from achievements
});

/**
 * POST /api/standups/:standupId/achievements-summary
 * Update or generate the achievements summary for the current standup document
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
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
    const { achievementsSummary, regenerate } = summarySchema.parse(body);

    // Get or create current standup document
    let document = await getCurrentStandupDocument(params.standupId);
    const nextRunDate = computeNextRunUTC(
      new Date(),
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

    if (!document) {
      // Create a new document
      document = await createStandupDocument({
        standupId: params.standupId,
        userId: auth.user.id,
        date: nextRunDate,
      });
    }

    let summary = achievementsSummary;

    // If regenerate is requested or no summary provided, generate from achievements
    if (regenerate || !summary) {
      // Get the previous standup date to determine which achievements to include
      const previousRunDate = computePreviousRunUTC(
        new Date(),
        standup.timezone,
        standup.meetingTime,
        standup.daysMask,
      );

      // Fetch achievements since the previous standup
      const achievements = await getRecentAchievementsForStandup(
        standup,
        previousRunDate,
      );

      // Generate summary using AI
      summary = await generateStandupSummary(
        achievements,
        standup.instructions || undefined,
      );
    }

    // Update document with summary
    if (summary) {
      document = await updateStandupDocumentAchievementsSummary(
        document.id,
        summary,
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating achievements summary:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update achievements summary' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId/achievements-summary
 * CORS preflight handler
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
