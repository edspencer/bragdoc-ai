import { type NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte } from 'drizzle-orm';
import { getAuthUser } from '@/lib/getAuthUser';
import { getStandupById } from '@bragdoc/database';
import { db } from '@bragdoc/database';
import { standupDocument } from '@bragdoc/database/schema';
import { computeNextRunUTC } from '@/lib/scheduling/nextRun';

/**
 * GET /api/standups/[standupId]/documents/current
 *
 * Returns the current (future) standup document for the given standup.
 * "Current" means the nearest future standup meeting date.
 *
 * Query: Load all StandupDocuments for this standup with a meeting date >= now,
 * ordered by date ascending (nearest first), and return the first result or null.
 *
 * Response:
 * {
 *   document: StandupDocument | null,  // null if no future document exists
 *   nextStandupDate: string            // calculated next standup date
 * }
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

    // Get current document (meeting date in future, ordered by date ASC)
    const now = new Date();
    const documents = await db
      .select()
      .from(standupDocument)
      .where(
        and(
          eq(standupDocument.standupId, params.standupId),
          gte(standupDocument.date, now),
        ),
      )
      .orderBy(asc(standupDocument.date)) // IMPORTANT: asc() to get nearest future date first
      .limit(1);

    const document = documents[0] || null;

    // Calculate next standup date based on schedule
    const nextStandupDate = computeNextRunUTC(
      now,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

    return NextResponse.json({
      document,
      nextStandupDate: nextStandupDate.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching current standup document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
