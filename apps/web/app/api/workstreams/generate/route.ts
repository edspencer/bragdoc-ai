import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { db, achievement, getWorkstreamMetadata } from '@bragdoc/database';
import { eq, isNotNull, count, and } from 'drizzle-orm';
import { generateMissingEmbeddings } from '@/lib/ai/embeddings';
import {
  decideShouldReCluster,
  incrementalAssignment,
  fullReclustering,
} from '@/lib/ai/workstreams';
import { getClusteringParameters } from '@/lib/ai/clustering';

const MINIMUM_ACHIEVEMENTS = 20;

/**
 * POST /api/workstreams/generate
 *
 * Generates or updates workstreams for a user.
 * - Generates missing embeddings
 * - Validates minimum achievement count
 * - Decides between full clustering or incremental assignment
 * - Returns clustering results
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    console.log('[Workstreams Generate] Starting generation for user:', userId);

    // Generate missing embeddings for this user's achievements
    const embeddingsGenerated = await generateMissingEmbeddings(userId);
    console.log(
      '[Workstreams Generate] Embeddings generated:',
      embeddingsGenerated,
    );

    // Count achievements with embeddings
    const achievementCountResult = await db
      .select({ count: count() })
      .from(achievement)
      .where(
        and(eq(achievement.userId, userId), isNotNull(achievement.embedding)),
      );

    const achievementCount = achievementCountResult[0]?.count || 0;
    console.log(
      '[Workstreams Generate] Achievement count with embeddings:',
      achievementCount,
    );

    // Validate minimum achievements
    if (achievementCount < MINIMUM_ACHIEVEMENTS) {
      return NextResponse.json(
        {
          error: 'Insufficient achievements',
          message: `You need at least ${MINIMUM_ACHIEVEMENTS} achievements to generate workstreams. You currently have ${achievementCount}.`,
        },
        { status: 400 },
      );
    }

    // Get existing metadata (if any)
    const metadata = await getWorkstreamMetadata(userId);
    console.log('[Workstreams Generate] Existing metadata:', metadata);

    // Decide whether to do full clustering or incremental assignment
    const decision = decideShouldReCluster(achievementCount, metadata);
    console.log('[Workstreams Generate] Decision:', decision);

    type ResponseData =
      | {
          strategy: 'full';
          reason: string;
          embeddingsGenerated: number;
          workstreamsCreated: number;
          achievementsAssigned: number;
          outliers: number;
          metadata: any;
        }
      | {
          strategy: 'incremental';
          reason: string;
          embeddingsGenerated: number;
          assigned: number;
          unassigned: number;
        };

    let result: ResponseData;

    if (decision.strategy === 'full') {
      // Perform full re-clustering
      const clusteringResult = await fullReclustering(userId, auth.user);
      result = {
        strategy: 'full' as const,
        reason: decision.reason,
        embeddingsGenerated,
        workstreamsCreated: clusteringResult.workstreamsCreated,
        achievementsAssigned: clusteringResult.achievementsAssigned,
        outliers: clusteringResult.outliers,
        metadata: clusteringResult.metadata,
      };
    } else {
      // Perform incremental assignment
      const params = getClusteringParameters(achievementCount);
      if (!params) {
        throw new Error('Invalid achievement count for clustering');
      }

      const assignmentResult = await incrementalAssignment(userId, params);

      result = {
        strategy: 'incremental' as const,
        reason: decision.reason,
        embeddingsGenerated,
        assigned: assignmentResult.assigned.length,
        unassigned: assignmentResult.unassigned.length,
      };
    }

    console.log(
      '[Workstreams Generate] Result:',
      JSON.stringify(result, null, 2),
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error generating workstreams:', error);
    return NextResponse.json(
      { error: 'Failed to generate workstreams' },
      { status: 500 },
    );
  }
}
