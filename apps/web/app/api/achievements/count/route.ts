import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { db, achievement } from '@bragdoc/database';
import { eq, and, gte, lte, inArray, count } from 'drizzle-orm';

/**
 * GET /api/achievements/count
 *
 * Returns the count of achievements matching the filter criteria.
 *
 * Query parameters:
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - projectIds: comma-separated list of project UUIDs (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const projectIdsParam = searchParams.get('projectIds');

    // Build WHERE conditions
    const conditions = [eq(achievement.userId, auth.user.id)];

    // Add date filters
    if (startDate) {
      conditions.push(gte(achievement.eventStart, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(achievement.eventStart, new Date(endDate)));
    }

    // Add project filter (supports multiple project IDs)
    if (projectIdsParam) {
      const projectIds = projectIdsParam.split(',').filter(Boolean);
      if (projectIds.length > 0) {
        conditions.push(inArray(achievement.projectId, projectIds));
      }
    }

    // Execute count query
    const result = await db
      .select({ count: count() })
      .from(achievement)
      .where(and(...conditions));

    const totalCount = result[0]?.count ?? 0;

    return NextResponse.json({ count: totalCount });
  } catch (error) {
    console.error('Error counting achievements:', error);
    return NextResponse.json(
      { error: 'Failed to count achievements' },
      { status: 500 },
    );
  }
}
