import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getStandupById,
  getRecentAchievementsForStandup,
} from '@bragdoc/database';
import { getStandupAchievementDateRange } from '@/lib/scheduling/nextRun';

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

    // Calculate date range based on standup schedule
    const now = new Date();
    const { startDate, endDate } = getStandupAchievementDateRange(
      now,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

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
