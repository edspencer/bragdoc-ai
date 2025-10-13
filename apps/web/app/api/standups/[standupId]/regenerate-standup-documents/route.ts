import { type NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getStandupById,
  getRecentAchievementsForStandup,
  getStandupDocumentByDate,
} from '@bragdoc/database';
import { calculateStandupOccurrences } from 'lib/standups/calculate-standup-occurrences';
import { createOrUpdateStandupDocument } from 'lib/standups/create-standup-document';
import { getHistoricalStandupAchievementDateRange } from 'lib/scheduling/nextRun';

/**
 * POST /api/standups/:standupId/regenerate-standup-documents
 * Generate standup documents for a specified date range or the last 7 days
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
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

    // Get date range from query params or default to last 7 days
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const now = new Date();
      startDate = subDays(now, 7);
      endDate = now;
    }

    // Check if at least one achievement exists in the range
    const achievements = await getRecentAchievementsForStandup(
      standup,
      startDate,
      endDate,
    );

    if (achievements.length === 0) {
      return NextResponse.json(
        { error: 'No achievements found in the specified date range' },
        { status: 400 },
      );
    }

    // Calculate all standup occurrences in the date range
    const allOccurrences = calculateStandupOccurrences(
      startDate,
      endDate,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

    // Filter out future dates
    const now = new Date();
    const pastOccurrences = allOccurrences.filter((date) => date <= now);

    if (pastOccurrences.length === 0) {
      return NextResponse.json(
        {
          error:
            'No past standup occurrences found in the specified date range',
        },
        { status: 400 },
      );
    }

    // Generate documents for each occurrence
    const createdDocuments = [];
    const skippedDocuments = [];
    const errors = [];

    for (const occurrenceDate of pastOccurrences) {
      try {
        // Check if document already exists for this date
        const existingDocument = await getStandupDocumentByDate(
          params.standupId,
          occurrenceDate,
        );

        if (existingDocument) {
          console.log(
            `Skipping ${occurrenceDate.toISOString()} - document already exists`,
          );
          skippedDocuments.push({
            date: occurrenceDate.toISOString(),
            reason: 'Document already exists',
          });
          continue;
        }

        // Get the date range for this specific standup occurrence
        // Use historical range to avoid overlap between consecutive standups
        const achievementDateRange = getHistoricalStandupAchievementDateRange(
          occurrenceDate,
          standup.timezone,
          standup.meetingTime,
          standup.daysMask,
        );

        console.log(
          `Date range for ${occurrenceDate.toISOString()}:`,
          achievementDateRange.startDate.toISOString(),
          'to',
          achievementDateRange.endDate.toISOString(),
        );

        // Get achievements for this specific period
        const periodAchievements = await getRecentAchievementsForStandup(
          standup,
          achievementDateRange.startDate,
          achievementDateRange.endDate,
        );

        console.log(
          `Found ${periodAchievements.length} achievements for ${occurrenceDate.toISOString()}`,
        );

        // Skip if no achievements for this period
        if (periodAchievements.length === 0) {
          console.log(
            `Skipping ${occurrenceDate.toISOString()} - no achievements in period`,
          );
          skippedDocuments.push({
            date: occurrenceDate.toISOString(),
            reason: 'No achievements in period',
          });
          continue;
        }

        // Create the document
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
      documentsSkipped: skippedDocuments.length,
      documents: createdDocuments,
      skipped: skippedDocuments.length > 0 ? skippedDocuments : undefined,
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
