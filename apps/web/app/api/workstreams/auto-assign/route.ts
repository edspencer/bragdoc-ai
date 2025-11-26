import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { db, achievement, workstream } from '@bragdoc/database';
import { eq, isNotNull, isNull, and, count } from 'drizzle-orm';
import { generateMissingEmbeddings } from '@/lib/ai/embeddings';
import {
  incrementalAssignment,
  getAchievementSummaries,
  buildAssignmentBreakdown,
} from '@/lib/ai/workstreams';
import { getClusteringParameters } from '@/lib/ai/clustering';

const MINIMUM_ACHIEVEMENTS = 20;

/**
 * POST /api/workstreams/auto-assign
 *
 * Assigns unassigned achievements to existing workstreams using similarity matching.
 * This endpoint ONLY does incremental assignment - it will NEVER create new workstreams
 * or perform full reclustering.
 *
 * Use this endpoint when you want to assign unassigned achievements to existing workstreams
 * without modifying the workstream structure.
 *
 * Response:
 * - assigned: number of achievements that were assigned
 * - unassigned: number of achievements that couldn't be assigned (no good match)
 * - assignmentsByWorkstream: detailed breakdown of assignments
 * - unassignedAchievements: achievements that weren't assigned
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = auth.user.id;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper to send SSE events
        const sendEvent = (event: any) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        console.log(
          '[Workstreams Auto-Assign] Starting assignment for user:',
          userId,
        );

        // Check that workstreams exist
        const existingWorkstreams = await db
          .select({ count: count() })
          .from(workstream)
          .where(eq(workstream.userId, userId));

        const workstreamCount = existingWorkstreams[0]?.count || 0;

        if (workstreamCount === 0) {
          sendEvent({
            type: 'error',
            message:
              'No workstreams exist. Please generate workstreams first before using auto-assign.',
          });
          controller.close();
          return;
        }

        // Generate missing embeddings for this user's achievements
        sendEvent({
          type: 'progress',
          phase: 'generating_embeddings',
          message: 'Preparing achievements...',
        });

        const embeddingsGenerated = await generateMissingEmbeddings(userId);
        console.log(
          '[Workstreams Auto-Assign] Embeddings generated:',
          embeddingsGenerated,
        );

        // Count unassigned achievements with embeddings
        const unassignedCountResult = await db
          .select({ count: count() })
          .from(achievement)
          .where(
            and(
              eq(achievement.userId, userId),
              isNotNull(achievement.embedding),
              isNull(achievement.workstreamId),
            ),
          );

        const unassignedWithEmbeddings = unassignedCountResult[0]?.count || 0;

        if (unassignedWithEmbeddings === 0) {
          sendEvent({
            type: 'complete',
            result: {
              strategy: 'incremental',
              reason: 'No unassigned achievements to process',
              embeddingsGenerated,
              assigned: 0,
              unassigned: 0,
              assignmentsByWorkstream: [],
              unassignedAchievements: [],
            },
          });
          controller.close();
          return;
        }

        // Count total achievements with embeddings for clustering parameters
        const totalCountResult = await db
          .select({ count: count() })
          .from(achievement)
          .where(
            and(
              eq(achievement.userId, userId),
              isNotNull(achievement.embedding),
            ),
          );

        const totalAchievementCount = totalCountResult[0]?.count || 0;

        // Validate minimum achievements for parameter calculation
        if (totalAchievementCount < MINIMUM_ACHIEVEMENTS) {
          sendEvent({
            type: 'error',
            message: `You need at least ${MINIMUM_ACHIEVEMENTS} achievements to use auto-assign. You currently have ${totalAchievementCount}.`,
          });
          controller.close();
          return;
        }

        // Get clustering parameters (for similarity threshold)
        const params = getClusteringParameters(totalAchievementCount);
        if (!params) {
          sendEvent({
            type: 'error',
            message: 'Invalid achievement count for clustering parameters',
          });
          controller.close();
          return;
        }

        sendEvent({
          type: 'progress',
          phase: 'achievements_assigned',
          message: `Assigning ${unassignedWithEmbeddings} achievement${unassignedWithEmbeddings === 1 ? '' : 's'} to existing workstreams...`,
        });

        // Perform incremental assignment (no filters - assign all unassigned)
        const assignmentResult = await incrementalAssignment(userId, params);

        // Build assignment breakdown with achievement details
        const assignmentsByWorkstream = await buildAssignmentBreakdown(
          assignmentResult.assignments,
          userId,
        );

        // Get unassigned achievement summaries
        const unassignedSummaries = await getAchievementSummaries(
          assignmentResult.unassigned,
          userId,
        );

        const result = {
          strategy: 'incremental' as const,
          reason: 'Auto-assigned to existing workstreams',
          embeddingsGenerated,
          assigned: assignmentResult.assigned.length,
          unassigned: assignmentResult.unassigned.length,
          assignmentsByWorkstream,
          unassignedAchievements: unassignedSummaries,
        };

        console.log(
          '[Workstreams Auto-Assign] Result - Assigned:',
          result.assigned,
          'Unassigned:',
          result.unassigned,
        );

        // Send final complete event
        sendEvent({
          type: 'complete',
          result,
        });

        // Close the stream
        controller.close();
      } catch (error) {
        console.error('Error auto-assigning workstreams:', error);

        // Send error event
        const errorEvent = {
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to auto-assign workstreams',
        };

        const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));

        controller.close();
      }
    },
  });

  // Return SSE response
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
