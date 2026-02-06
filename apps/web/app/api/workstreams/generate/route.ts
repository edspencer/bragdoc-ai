import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  db,
  achievement,
  getWorkstreamMetadata,
  getProjectsByUserId,
} from '@bragdoc/database';
import { eq, isNotNull, count, and, gte, lte, inArray } from 'drizzle-orm';
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
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import {
  checkUserCredits,
  deductCredits,
  CREDIT_COSTS,
  logCreditTransaction,
} from '@/lib/credits';

const MINIMUM_ACHIEVEMENTS = 20;

/**
 * Zod schema for validating workstreams generation request body
 * Validates optional filter parameters:
 * - timeRange: startDate and endDate (ISO 8601 or YYYY-MM-DD format)
 * - projectIds: array of project UUIDs
 *
 * Ensures:
 * - Both timeRange properties present together (or neither)
 * - startDate ≤ endDate
 * - Time range does not exceed 24 months
 */
const generateWithFiltersSchema = z
  .object({
    filters: z.optional(
      z.object({
        timeRange: z.optional(
          z.object({
            startDate: z
              .string()
              .datetime()
              .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
            endDate: z
              .string()
              .datetime()
              .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
          }),
        ),
        projectIds: z.optional(z.array(z.string().uuid())),
      }),
    ),
  })
  .refine(
    (data) => {
      // Require both timeRange properties together or neither
      if (data.filters?.timeRange) {
        return (
          data.filters.timeRange.startDate && data.filters.timeRange.endDate
        );
      }
      return true;
    },
    {
      message:
        'Both startDate and endDate must be provided together for timeRange',
      path: ['filters', 'timeRange'],
    },
  )
  .refine(
    (data) => {
      // Validate startDate ≤ endDate
      if (
        data.filters?.timeRange?.startDate &&
        data.filters.timeRange.endDate
      ) {
        const startDate = new Date(data.filters.timeRange.startDate);
        const endDate = new Date(data.filters.timeRange.endDate);
        return startDate <= endDate;
      }
      return true;
    },
    {
      message: 'startDate must be less than or equal to endDate',
      path: ['filters', 'timeRange'],
    },
  )
  .refine(
    (data) => {
      // Validate time range does not exceed 24 months
      if (
        data.filters?.timeRange?.startDate &&
        data.filters.timeRange.endDate
      ) {
        const startDate = new Date(data.filters.timeRange.startDate);
        const endDate = new Date(data.filters.timeRange.endDate);
        const monthsDiff =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());
        return monthsDiff <= 24;
      }
      return true;
    },
    {
      message: 'Time range cannot exceed 24 months',
      path: ['filters', 'timeRange'],
    },
  );

/**
 * Helper function to validate and parse date range
 * Converts ISO 8601 or YYYY-MM-DD strings to Date objects
 */
function validateDateRange(timeRange?: { startDate: string; endDate: string }) {
  if (!timeRange) {
    return undefined;
  }

  const startDate = new Date(timeRange.startDate);
  const endDate = new Date(timeRange.endDate);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid startDate: ${timeRange.startDate}`);
  }
  if (Number.isNaN(endDate.getTime())) {
    throw new Error(`Invalid endDate: ${timeRange.endDate}`);
  }

  if (startDate > endDate) {
    throw new Error('startDate must be less than or equal to endDate');
  }

  return { startDate, endDate };
}

/**
 * POST /api/workstreams/generate
 *
 * Generates or updates workstreams for a user.
 * - Parses and validates filter parameters from request body
 * - Validates project ownership
 * - Generates missing embeddings
 * - Validates minimum achievement count
 * - Decides between full clustering or incremental assignment
 * - Streams progress updates via Server-Sent Events
 *
 * Request body (optional):
 * ```json
 * {
 *   "filters": {
 *     "timeRange": {
 *       "startDate": "2025-05-10",
 *       "endDate": "2025-11-10"
 *     },
 *     "projectIds": ["project-id-1", "project-id-2"]
 *   }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = auth.user.id;

  // Credit gate - BEFORE creating ReadableStream (cannot return 402 after stream starts)
  if (!hasUnlimitedAccess(auth.user)) {
    const cost = CREDIT_COSTS.workstream_clustering; // 2 credits
    const { hasCredits, remainingCredits } = checkUserCredits(auth.user, cost);

    if (!hasCredits) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          message: `Workstream generation requires ${cost} credits. You have ${remainingCredits} remaining.`,
          required: cost,
          available: remainingCredits,
          upgradeUrl: '/pricing',
        },
        { status: 402 },
      );
    }

    // Atomic deduction - must happen before stream
    const { success } = await deductCredits(userId, cost);
    if (!success) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          message: 'Credits consumed by concurrent request. Please try again.',
          upgradeUrl: '/pricing',
        },
        { status: 402 },
      );
    }

    // Log the transaction (non-blocking)
    logCreditTransaction({
      userId,
      operation: 'deduct',
      featureType: 'workstream_clustering',
      amount: cost,
      metadata: {},
    }).catch((err) => console.error('Failed to log credit transaction:', err));
  }

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

        // Parse and validate request body
        let filters: {
          timeRange?: { startDate: Date; endDate: Date };
          projectIds?: string[];
        };

        try {
          const body = await request.json().catch(() => ({}));
          const validated = generateWithFiltersSchema.parse(body);

          // Extract and convert filters from validated body
          const timeRange = validated.filters?.timeRange
            ? validateDateRange(validated.filters.timeRange)
            : undefined;

          filters = {
            timeRange,
            projectIds: validated.filters?.projectIds,
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            sendEvent({
              type: 'error',
              message: 'Invalid request parameters',
              details: error.errors,
            });
          } else {
            sendEvent({
              type: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to parse request',
            });
          }
          controller.close();
          return;
        }

        // Validate project ownership if projectIds provided
        if (filters.projectIds && filters.projectIds.length > 0) {
          try {
            const userProjects = await getProjectsByUserId(userId);
            const userProjectIds = new Set(userProjects.map((p) => p.id));

            const invalidProjectIds = filters.projectIds.filter(
              (id) => !userProjectIds.has(id),
            );

            if (invalidProjectIds.length > 0) {
              sendEvent({
                type: 'error',
                message: 'Invalid project selection',
                details: `Projects not found or not owned by user: ${invalidProjectIds.join(', ')}`,
              });
              controller.close();
              return;
            }
          } catch (error) {
            console.error(
              '[Workstreams Generate] Error validating projects:',
              error,
            );
            sendEvent({
              type: 'error',
              message: 'Failed to validate project ownership',
            });
            controller.close();
            return;
          }
        }

        // Generate missing embeddings for this user's achievements
        // NOTE: Filters are validated but not yet used for embedding generation (Phase 3)
        // Embeddings are generated for ALL achievements to optimize cost
        const embeddingsGenerated = await generateMissingEmbeddings(userId);
        console.log(
          '[Workstreams Generate] Embeddings generated:',
          embeddingsGenerated,
        );

        // Default to 12 months if no timeRange provided (backward compatible)
        const effectiveTimeRange = filters?.timeRange || {
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        };

        // Build count query conditions
        const countConditions = [
          eq(achievement.userId, userId),
          isNotNull(achievement.embedding),
          gte(achievement.eventStart, effectiveTimeRange.startDate),
          lte(achievement.eventStart, effectiveTimeRange.endDate),
        ];

        // Add project filter if specified
        if (filters?.projectIds && filters.projectIds.length > 0) {
          countConditions.push(
            inArray(achievement.projectId, filters.projectIds),
          );
        }

        // Count achievements with embeddings matching filters
        const achievementCountResult = await db
          .select({ count: count() })
          .from(achievement)
          .where(and(...countConditions));

        const achievementCount = achievementCountResult[0]?.count || 0;
        const filterDescription = filters?.projectIds
          ? 'selected projects and time range'
          : filters?.timeRange
            ? 'selected time range'
            : 'last 12 months';
        console.log(
          `[Workstreams Generate] Achievement count with embeddings in ${filterDescription}:`,
          achievementCount,
        );

        // Validate minimum achievements
        if (achievementCount < MINIMUM_ACHIEVEMENTS) {
          sendEvent({
            type: 'error',
            message: `You need at least ${MINIMUM_ACHIEVEMENTS} achievements in the ${filterDescription} to generate workstreams. You currently have ${achievementCount}.`,
          });
          controller.close();
          return;
        }

        // Get existing metadata (if any)
        const metadata = await getWorkstreamMetadata(userId);
        console.log('[Workstreams Generate] Existing metadata:', metadata);

        // Decide whether to do full clustering or incremental assignment
        // Pass filters to detect filter changes
        const decision = decideShouldReCluster(
          achievementCount,
          metadata,
          filters,
        );
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
              appliedFilters?: {
                timeRange?: { startDate: string; endDate: string };
                projectIds?: string[];
              };
              filteredAchievementCount?: number;
              autoAssignedOutsideFilters?: number;
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
              appliedFilters?: {
                timeRange?: { startDate: string; endDate: string };
                projectIds?: string[];
              };
              filteredAchievementCount?: number;
              autoAssignedOutsideFilters?: number;
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
            filters,
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
            appliedFilters: clusteringResult.appliedFilters,
            filteredAchievementCount: clusteringResult.filteredAchievementCount,
            autoAssignedOutsideFilters:
              clusteringResult.autoAssignedOutsideFilters,
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

          const assignmentResult = await incrementalAssignment(
            userId,
            params,
            filters,
          );

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
            appliedFilters: filters?.timeRange
              ? {
                  timeRange: {
                    startDate: filters.timeRange.startDate
                      .toISOString()
                      .split('T')[0] as string,
                    endDate: filters.timeRange.endDate
                      .toISOString()
                      .split('T')[0] as string,
                  },
                  projectIds: filters.projectIds,
                }
              : undefined,
            filteredAchievementCount: achievementCount,
            autoAssignedOutsideFilters: 0,
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
