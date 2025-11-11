import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { db, achievement, getWorkstreamMetadata } from '@bragdoc/database';
import { eq, isNotNull, count, and, gte } from 'drizzle-orm';
import { generateMissingEmbeddings } from '@/lib/ai/embeddings';
import {
  decideShouldReCluster,
  incrementalAssignment,
  fullReclustering,
  getAchievementSummaries,
  buildAssignmentBreakdown,
  buildWorkstreamBreakdown,
  type ProgressCallback,
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
 * - Streams progress updates via Server-Sent Events
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
          '[Workstreams Generate] Starting generation for user:',
          userId,
        );

        // Generate missing embeddings for this user's achievements
        const embeddingsGenerated = await generateMissingEmbeddings(userId);
        console.log(
          '[Workstreams Generate] Embeddings generated:',
          embeddingsGenerated,
        );

        // Calculate 12 months ago
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

        // Count achievements with embeddings in last 12 months
        const achievementCountResult = await db
          .select({ count: count() })
          .from(achievement)
          .where(
            and(
              eq(achievement.userId, userId),
              isNotNull(achievement.embedding),
              gte(achievement.eventStart, twelveMonthsAgo),
            ),
          );

        const achievementCount = achievementCountResult[0]?.count || 0;
        console.log(
          '[Workstreams Generate] Achievement count with embeddings in last 12 months:',
          achievementCount,
        );

        // Validate minimum achievements
        if (achievementCount < MINIMUM_ACHIEVEMENTS) {
          sendEvent({
            type: 'error',
            message: `You need at least ${MINIMUM_ACHIEVEMENTS} achievements in the last 12 months to generate workstreams. You currently have ${achievementCount}.`,
          });
          controller.close();
          return;
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
              // New fields for detailed breakdown
              workstreamDetails: Array<{
                workstreamId: string;
                workstreamName: string;
                workstreamColor: string | null;
                isNew: boolean;
                achievements: Array<{
                  id: string;
                  title: string;
                  eventStart: Date | null;
                  impact: number | null;
                  summary: string | null;
                  projectId: string | null;
                  projectName: string | null;
                  companyId: string | null;
                  companyName: string | null;
                }>;
              }>;
              outlierAchievements: Array<{
                id: string;
                title: string;
                eventStart: Date | null;
                impact: number | null;
                summary: string | null;
                projectId: string | null;
                projectName: string | null;
                companyId: string | null;
                companyName: string | null;
              }>;
            }
          | {
              strategy: 'incremental';
              reason: string;
              embeddingsGenerated: number;
              assigned: number;
              unassigned: number;
              // New fields for detailed breakdown
              assignmentsByWorkstream: Array<{
                workstreamId: string;
                workstreamName: string;
                workstreamColor: string | null;
                achievements: Array<{
                  id: string;
                  title: string;
                  eventStart: Date | null;
                  impact: number | null;
                  summary: string | null;
                  projectId: string | null;
                  projectName: string | null;
                  companyId: string | null;
                  companyName: string | null;
                }>;
              }>;
              unassignedAchievements: Array<{
                id: string;
                title: string;
                eventStart: Date | null;
                impact: number | null;
                summary: string | null;
                projectId: string | null;
                projectName: string | null;
                companyId: string | null;
                companyName: string | null;
              }>;
            };

        let result: ResponseData;

        if (decision.strategy === 'full') {
          // Create progress callback for fullReclustering
          const progressCallback: ProgressCallback = (event) => {
            sendEvent(event);
          };

          // Perform full re-clustering with progress callback
          const clusteringResult = await fullReclustering(
            userId,
            auth.user,
            progressCallback,
          );

          // Build workstream breakdown with achievement details
          const workstreamDetails = await buildWorkstreamBreakdown(
            clusteringResult.workstreams || [],
            userId,
          );

          // Get outlier achievements
          const outlierIds = (clusteringResult.outlierAchievements || []).map(
            (a) => a.id,
          );
          const outlierAchievements = await getAchievementSummaries(
            outlierIds,
            userId,
          );

          result = {
            strategy: 'full' as const,
            reason: decision.reason,
            embeddingsGenerated,
            workstreamsCreated: clusteringResult.workstreamsCreated,
            achievementsAssigned: clusteringResult.achievementsAssigned,
            outliers: clusteringResult.outliers,
            metadata: clusteringResult.metadata,
            workstreamDetails,
            outlierAchievements,
          };
        } else {
          // Perform incremental assignment
          const params = getClusteringParameters(achievementCount);
          if (!params) {
            throw new Error('Invalid achievement count for clustering');
          }

          sendEvent({
            type: 'progress',
            phase: 'achievements_assigned',
            message: 'Assigning achievements to existing workstreams...',
            data: {},
          });

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

          result = {
            strategy: 'incremental' as const,
            reason: decision.reason,
            embeddingsGenerated,
            assigned: assignmentResult.assigned.length,
            unassigned: assignmentResult.unassigned.length,
            assignmentsByWorkstream,
            unassignedAchievements: unassignedSummaries,
          };
        }

        console.log(
          '[Workstreams Generate] Result - Strategy:',
          result.strategy,
          'Reason:',
          result.reason,
          'Embeddings:',
          embeddingsGenerated,
          result.strategy === 'full'
            ? `Workstreams: ${result.workstreamsCreated}, Achievements: ${result.achievementsAssigned}, Outliers: ${result.outliers}`
            : `Assigned: ${result.assigned}, Unassigned: ${result.unassigned}`,
        );

        // Send final complete event
        sendEvent({
          type: 'complete',
          result,
        });

        // Close the stream
        controller.close();
      } catch (error) {
        console.error('Error generating workstreams:', error);

        // Send error event
        const errorEvent = {
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate workstreams',
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
