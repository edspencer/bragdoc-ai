import { type NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { getAuthUser } from 'lib/getAuthUser';
import { getStandupById, getRecentAchievementsForStandup } from '@bragdoc/database';
import { calculateStandupOccurrences } from 'lib/standups/calculate-standup-occurrences';
import { createOrUpdateStandupDocument } from 'lib/standups/create-standup-document';

/**
 * POST /api/standups/:standupId/regenerate-standup-documents
 * Generate standup documents for the last 7 days
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

    // Calculate 7-day date range
    const now = new Date();
    const startDate = subDays(now, 7);
    const endDate = now;

    // Check if at least one achievement exists in the range
    const achievements = await getRecentAchievementsForStandup(
      standup,
      startDate,
      endDate,
    );

    if (achievements.length === 0) {
      return NextResponse.json(
        { error: 'No achievements found in the last 7 days' },
        { status: 400 },
      );
    }

    // Calculate all standup occurrences in the last 7 days
    const allOccurrences = calculateStandupOccurrences(
      startDate,
      endDate,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

    // Filter out future dates
    const pastOccurrences = allOccurrences.filter((date) => date <= now);

    if (pastOccurrences.length === 0) {
      return NextResponse.json(
        { error: 'No past standup occurrences found in the last 7 days' },
        { status: 400 },
      );
    }

    // Generate documents for each occurrence
    const createdDocuments = [];
    const errors = [];

    for (const occurrenceDate of pastOccurrences) {
      try {
        const document = await createOrUpdateStandupDocument(
          params.standupId,
          auth.user.id,
          standup,
          occurrenceDate,
          true, // Force regeneration
        );
        createdDocuments.push(document);
      } catch (error) {
        console.error(
          `Error creating document for ${occurrenceDate.toISOString()}:`,
          error,
        );
        errors.push({
          date: occurrenceDate.toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      documentsCreated: createdDocuments.length,
      documents: createdDocuments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error regenerating standup documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate standup documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId/regenerate-standup-documents
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
