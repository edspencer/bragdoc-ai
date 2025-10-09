import { type NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getStandupById,
  getRecentAchievementsForStandup,
} from '@bragdoc/database';
import { getStandupAchievementDateRange } from '@/lib/scheduling/nextRun';

/**
 * GET /api/standups/:standupId/achievements
 * Get achievements for a standup based on its configuration
 * Query params:
 *   - range: 'since-last' (default) | 'last-7-days'
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
) {
  const params = await props.params;
  const { standupId } = params;

  // Authenticate
  const auth = await getAuthUser(req);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify standup belongs to user
    const standup = await getStandupById(standupId, auth.user.id);
    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    // Get range parameter
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'since-last';

    let startDate: Date;
    let endDate: Date;

    if (range === 'last-7-days') {
      // Last 7 days: from 7 days ago to now
      const now = new Date();
      startDate = subDays(now, 7);
      endDate = now;
    } else {
      // Since last standup: default behavior
      const now = new Date();
      const dateRange = getStandupAchievementDateRange(
        now,
        standup.timezone,
        standup.meetingTime,
        standup.daysMask,
      );
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Get achievements
    const achievements = await getRecentAchievementsForStandup(
      standup,
      startDate,
      endDate,
    );

    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Error fetching standup achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 },
    );
  }
}
