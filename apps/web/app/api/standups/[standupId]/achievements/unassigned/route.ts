import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getStandupById,
  getUnassignedAchievementsForStandup,
  getPreviousStandupDocument,
} from '@bragdoc/database';
import { subDays } from 'date-fns';

/**
 * GET /api/standups/[standupId]/achievements/unassigned
 *
 * Returns unassigned achievements for the current standup period.
 * Unassigned means achievements where standupDocumentId IS NULL.
 *
 * Algorithm for determining date range:
 * 1. Find the most recent past StandupDocument (before now)
 * 2. Use that document's meeting date as the start date
 * 3. If no past document exists, use 7 days ago as fallback
 * 4. Return all achievements with eventStart >= startDate that are unassigned
 *
 * IMPORTANT: Filters by Achievement.eventStart (when achievement happened),
 * NOT Achievement.createdAt (when it was recorded).
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> }
) {
  const params = await props.params;

  try {
    const auth = await getAuthUser(req);

    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify standup ownership
    const standup = await getStandupById(params.standupId, auth.user.id);
    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    // Find the most recent past standup document
    const previousDocument = await getPreviousStandupDocument(params.standupId);

    // Determine start date:
    // - If there's a previous document, use its meeting date
    // - Otherwise, use 7 days ago as fallback
    const startDate = previousDocument
      ? previousDocument.date
      : subDays(new Date(), 7);

    // End date is now (or could be the next standup date)
    const endDate = new Date();

    // Fetch unassigned achievements in the date range
    // Uses eventStart for date filtering, not createdAt
    const achievements = await getUnassignedAchievementsForStandup(
      standup,
      startDate,
      endDate
    );

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching unassigned achievements:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
