import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { db } from '@/lib/db';
import { achievement } from '@/lib/db/schema';
import { eq, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date 8 weeks ago
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7);

    // Get achievements from the last 8 weeks
    const weeklyData = await db
      .select({
        week: sql<string>`DATE_TRUNC('week', ${achievement.eventStart})::date`,
        totalImpact: sql<number>`SUM(${achievement.impact})`,
        achievementCount: sql<number>`COUNT(*)`,
      })
      .from(achievement)
      .where(
        eq(achievement.userId, userId) &&
        gte(achievement.eventStart, eightWeeksAgo) &&
        eq(achievement.isArchived, false)
      )
      .groupBy(sql`DATE_TRUNC('week', ${achievement.eventStart})`)
      .orderBy(sql`DATE_TRUNC('week', ${achievement.eventStart}) DESC`)
      .limit(8);

    // Fill in missing weeks with zero values
    const result = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      // Set to start of week (Monday)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);

      const weekString = weekStart.toISOString().split('T')[0];

      const existingData = weeklyData.find(
        (data) => data.week === weekString
      );

      result.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalImpact: existingData ? Number(existingData.totalImpact) : 0,
        achievementCount: existingData ? Number(existingData.achievementCount) : 0,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching weekly impact data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}