import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getStandupById,
  getUnassignedAchievementsForStandup,
} from '@bragdoc/database';
import { getStandupAchievementDateRange } from '@/lib/scheduling/nextRun';

/**
 * GET /api/standups/[standupId]/achievements/unassigned
 *
 * Returns unassigned achievements for the current standup period.
 * Unassigned means achievements where standupDocumentId IS NULL.
 *
 * Algorithm for determining date range:
 * 1. Use getStandupAchievementDateRange to calculate the proper date range
 *    for the current standup period based on the standup schedule
 * 2. This ensures we only show achievements that fall within the actual
 *    current standup period (from previous standup to next standup)
 * 3. Return all achievements with eventStart in that range that are unassigned
 *
 * IMPORTANT: Filters by Achievement.eventStart (when achievement happened),
 * NOT Achievement.createdAt (when it was recorded).
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
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

    // Calculate the proper date range for the current standup period
    // This uses the standup schedule to determine when the current period
    // actually starts (previous standup) and ends (next standup)
    const now = new Date();
    const { startDate, endDate } = getStandupAchievementDateRange(
      now,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

    // Fetch unassigned achievements in the date range
    // Uses eventStart for date filtering, not createdAt
    const achievements = await getUnassignedAchievementsForStandup(
      standup,
      startDate,
      endDate,
    );

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching unassigned achievements:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
