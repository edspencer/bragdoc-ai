import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getWorkstreamsByUserId,
  getUnassignedAchievements,
  getAchievementCountWithEmbeddings,
} from '@bragdoc/database';

/**
 * GET /api/workstreams
 *
 * Fetches all workstreams for the authenticated user.
 * Returns list of active (non-archived) workstreams along with achievement counts.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    // Fetch user's workstreams (excluding archived by default)
    const workstreams = await getWorkstreamsByUserId(userId, false);

    // Get unassigned achievements count
    const unassignedAchievements = await getUnassignedAchievements(userId);
    const unassignedCount = unassignedAchievements.length;

    // Get total achievement count with embeddings
    const achievementCount = await getAchievementCountWithEmbeddings(userId);

    return NextResponse.json({
      workstreams,
      unassignedCount,
      achievementCount,
    });
  } catch (error) {
    console.error('Error fetching workstreams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workstreams' },
      { status: 500 },
    );
  }
}
