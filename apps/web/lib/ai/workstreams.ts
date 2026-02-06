/**
 * Workstreams Orchestration Module
 *
 * High-level management of workstreams including clustering decisions,
 * incremental assignment, full re-clustering, and centroid updates.
 */

import {
  db,
  achievement,
  workstream,
  workstreamMetadata,
  project,
  company,
  type Achievement,
  type User,
  type Workstream,
  type WorkstreamMetadata,
} from '@bragdoc/database';
import { and, eq, isNull, isNotNull, inArray, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateObject } from 'ai';
import { z } from 'zod';
import pLimit from 'p-limit';
import { getLLM } from './index';
import {
  clusterEmbeddings,
  calculateCentroid,
  getClusteringParameters,
  cosineDistance,
  type ClusteringParams,
} from './clustering';

const MINIMUM_ACHIEVEMENTS = 20;
const _SMALL_DATASET = 100;
const RECLUSTER_PERCENTAGE_THRESHOLD = 0.1; // 10%
const RECLUSTER_ABSOLUTE_THRESHOLD = 50; // 50 achievements
const RECLUSTER_TIME_THRESHOLD_DAYS = 30;

/**
 * Progress callback for streaming updates during workstream generation
 */
export type ProgressCallback = (event: {
  type: 'progress' | 'complete' | 'error';
  phase?:
    | 'workstreams_created'
    | 'achievements_assigned'
    | 'generating_names'
    | 'refreshing';
  message: string;
  data?: any;
}) => void;

/**
 * Lightweight achievement summary for API responses
 * Includes only fields needed for UI display with project/company context
 */
export interface AchievementSummary {
  id: string;
  title: string;
  eventStart: Date | null;
  impact: number | null;
  summary: string | null;
  projectId: string | null;
  projectName: string | null;
  companyId: string | null;
  companyName: string | null;
}

/**
 * Decision on whether to do incremental assignment or full re-clustering
 */
export interface UpdateDecision {
  strategy: 'incremental' | 'full';
  reason: string;
}

/**
 * Result of incremental assignment operation
 */
export interface AssignmentResult {
  assigned: string[];
  unassigned: string[];
  assignments: Map<string, string>;
}

/**
 * Result of full re-clustering operation
 * Includes optional fields for enhanced API responses with detailed achievement data
 */
export interface FullClusteringResult {
  workstreamsCreated: number;
  achievementsAssigned: number;
  outliers: number;
  metadata: WorkstreamMetadata;
  autoAssignedOutsideFilters?: number;
  // Optional fields for enhanced API responses
  workstreams?: Workstream[];
  achievementsWithAssignments?: Achievement[];
  outlierAchievements?: { id: string }[];
  appliedFilters?: {
    timeRange?: { startDate: string; endDate: string };
    projectIds?: string[];
  };
  filteredAchievementCount?: number;
}

/**
 * Fetch achievement summaries with project/company context using LEFT JOINs
 * Filters to only requested achievement IDs
 *
 * @param achievementIds - Array of achievement IDs to fetch
 * @param userId - User ID to scope query for security
 * @returns Array of AchievementSummary objects
 */
export async function getAchievementSummaries(
  achievementIds: string[],
  userId: string,
): Promise<AchievementSummary[]> {
  if (achievementIds.length === 0) {
    return [];
  }

  const results = await db
    .select({
      id: achievement.id,
      title: achievement.title,
      eventStart: achievement.eventStart,
      impact: achievement.impact,
      summary: achievement.summary,
      projectId: achievement.projectId,
      projectName: project.name,
      companyId: achievement.companyId,
      companyName: company.name,
    })
    .from(achievement)
    .leftJoin(project, eq(achievement.projectId, project.id))
    .leftJoin(company, eq(achievement.companyId, company.id))
    .where(
      and(
        eq(achievement.userId, userId),
        inArray(achievement.id, achievementIds),
      ),
    );

  return results as AchievementSummary[];
}

/**
 * Build assignment breakdown for incremental strategy response
 * Groups achievements by workstream and fetches workstream details
 *
 * @param assignments - Map of achievementId -> workstreamId from incrementalAssignment
 * @param userId - User ID to scope query
 * @returns Array of assignment groups sorted by achievement count (descending)
 */
export async function buildAssignmentBreakdown(
  assignments: Map<string, string>,
  userId: string,
): Promise<
  Array<{
    workstreamId: string;
    workstreamName: string;
    workstreamColor: string | null;
    achievements: AchievementSummary[];
  }>
> {
  // Group achievement IDs by workstream
  const achievementsByWorkstream = new Map<string, string[]>();

  for (const [achId, wsId] of assignments) {
    if (!achievementsByWorkstream.has(wsId)) {
      achievementsByWorkstream.set(wsId, []);
    }
    achievementsByWorkstream.get(wsId)!.push(achId);
  }

  // Fetch workstream details
  const workstreamIds = Array.from(achievementsByWorkstream.keys());
  const workstreams = await db
    .select()
    .from(workstream)
    .where(inArray(workstream.id, workstreamIds));

  // Build result array with achievement summaries for each workstream
  const result = [];

  for (const ws of workstreams) {
    const achIds = achievementsByWorkstream.get(ws.id) || [];
    const achievements = await getAchievementSummaries(achIds, userId);

    result.push({
      workstreamId: ws.id,
      workstreamName: ws.name,
      workstreamColor: ws.color,
      achievements,
    });
  }

  // Sort by achievement count (descending)
  result.sort((a, b) => b.achievements.length - a.achievements.length);

  return result;
}

/**
 * Build workstream breakdown for full clustering strategy response
 * Takes newly created workstreams and formats with their achievements
 *
 * @param createdWorkstreams - Array of newly created Workstream records
 * @param userId - User ID to scope query
 * @returns Array of workstream details sorted by achievement count (descending)
 */
export async function buildWorkstreamBreakdown(
  createdWorkstreams: Workstream[],
  userId: string,
): Promise<
  Array<{
    workstreamId: string;
    workstreamName: string;
    workstreamColor: string | null;
    isNew: boolean;
    achievements: AchievementSummary[];
  }>
> {
  const result = [];

  // For each workstream, fetch its achievements
  for (const ws of createdWorkstreams) {
    const achievements = await db
      .select()
      .from(achievement)
      .where(eq(achievement.workstreamId, ws.id));

    const achIds = achievements.map((a) => a.id);
    const summaries = await getAchievementSummaries(achIds, userId);

    result.push({
      workstreamId: ws.id,
      workstreamName: ws.name,
      workstreamColor: ws.color,
      isNew: true, // Always true for full clustering (all workstreams are new)
      achievements: summaries,
    });
  }

  // Sort by achievement count (descending)
  result.sort((a, b) => b.achievements.length - a.achievements.length);

  return result;
}

/**
 * Decide whether to do incremental assignment or full re-clustering
 * Uses multiple factors to determine the best strategy:
 * - Detects filter changes from previous clustering (triggers full re-clustering)
 * - Checks growth thresholds (10% growth OR 50+ new achievements in filtered set)
 * - Checks time-based threshold (30+ days since last clustering)
 * - Defaults to incremental assignment for small, frequent updates
 *
 * Filter change detection: Compares current filter parameters against stored generation params.
 * Growth calculations use filtered achievement counts, not total counts, enabling optimal clustering
 * for user-selected subsets.
 *
 * @param currentFilteredCount - Current number of achievements in the filtered set with embeddings
 * @param metadata - Previous clustering metadata, or null if never clustered
 * @param currentFilters - Current filter parameters for change detection:
 *   - timeRange: Use Date objects (JS native). Compared against stored generation params.
 *   - projectIds: Array of project UUIDs. Compared against stored generation params.
 * @returns UpdateDecision with strategy ('full' or 'incremental') and human-readable reason
 */
export function decideShouldReCluster(
  currentFilteredCount: number,
  metadata: WorkstreamMetadata | null,
  currentFilters?: {
    timeRange?: { startDate: Date; endDate: Date };
    projectIds?: string[];
  },
): UpdateDecision {
  // Never clustered before
  if (!metadata) {
    return {
      strategy: 'full',
      reason: 'Initial clustering',
    };
  }

  // Check if filters changed from previous clustering
  if (metadata && currentFilters) {
    const previousFilters = metadata.generationParams || {};

    // Compare timeRange
    const currentStartDate = currentFilters.timeRange?.startDate
      ?.toISOString()
      .split('T')[0];
    const currentEndDate = currentFilters.timeRange?.endDate
      ?.toISOString()
      .split('T')[0];
    const previousStartDate = previousFilters.timeRange?.startDate;
    const previousEndDate = previousFilters.timeRange?.endDate;

    const timeRangeChanged =
      previousStartDate !== currentStartDate ||
      previousEndDate !== currentEndDate;

    // Compare projectIds
    const projectIdsChanged =
      JSON.stringify((previousFilters.projectIds || []).sort()) !==
      JSON.stringify((currentFilters.projectIds || []).sort());

    if (timeRangeChanged || projectIdsChanged) {
      return {
        strategy: 'full',
        reason: 'Filter parameters changed from previous clustering',
      };
    }
  }

  // Previous clustering found no workstreams (all outliers)
  // This means we should try different parameters
  if (metadata.workstreamCount === 0) {
    return {
      strategy: 'full',
      reason: 'No workstreams found in previous clustering',
    };
  }

  // Calculate if we have 10% more achievements in the filtered set
  // Use filteredAchievementCount for comparison, with backward compatibility
  const previousCount =
    metadata.filteredAchievementCount ||
    metadata.achievementCountAtLastClustering ||
    0;
  const achievementGrowthPercent =
    previousCount > 0
      ? (currentFilteredCount - previousCount) / previousCount
      : 0;

  if (achievementGrowthPercent >= RECLUSTER_PERCENTAGE_THRESHOLD) {
    return {
      strategy: 'full',
      reason: `${(achievementGrowthPercent * 100).toFixed(1)}% growth in achievements`,
    };
  }

  // Calculate if we have 50+ more achievements in the filtered set
  // Use filteredAchievementCount for comparison, with backward compatibility
  const newAchievementCount = currentFilteredCount - previousCount;

  if (newAchievementCount >= RECLUSTER_ABSOLUTE_THRESHOLD) {
    return {
      strategy: 'full',
      reason: `${newAchievementCount} new achievements since last clustering`,
    };
  }

  // Check if it's been more than 30 days
  const lastClusteringTime = new Date(metadata.lastFullClusteringAt);
  const daysSinceLastClustering =
    (Date.now() - lastClusteringTime.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastClustering > RECLUSTER_TIME_THRESHOLD_DAYS) {
    return {
      strategy: 'full',
      reason: `${Math.floor(daysSinceLastClustering)} days since last clustering`,
    };
  }

  // Default to incremental assignment
  return {
    strategy: 'incremental',
    reason: 'Small number of new achievements',
  };
}

/**
 * Assign unassigned achievements to existing workstreams
 * Finds best matching workstream for each achievement using centroid similarity.
 * Only unassigned achievements matching the current filters are assigned.
 * Achievements outside the current filters are excluded from assignment.
 *
 * @param userId - User ID to scope operation
 * @param params - Clustering parameters with confidence threshold for assignment
 * @param filters - Optional filter parameters for assignment:
 *   - timeRange: Use Date objects (JS native). Only achievements in this range are assigned.
 *     If omitted, all time periods are included (no filtering).
 *   - projectIds: Array of project UUIDs to include. If omitted, all projects are included.
 * @returns AssignmentResult with arrays of assigned and unassigned achievement IDs
 */
export async function incrementalAssignment(
  userId: string,
  params: ClusteringParams,
  filters?: {
    timeRange?: { startDate: Date; endDate: Date };
    projectIds?: string[];
  },
): Promise<AssignmentResult> {
  // Get unassigned achievements with embeddings
  const unassignedAchs = await db
    .select()
    .from(achievement)
    .where(
      and(eq(achievement.userId, userId), isNull(achievement.workstreamId)),
    );

  // Filter to only those with embeddings
  let achievementsToAssign = unassignedAchs.filter((ach) => ach.embedding);

  // Apply filters if provided
  if (filters?.timeRange) {
    achievementsToAssign = achievementsToAssign.filter(
      (ach) =>
        ach.eventStart &&
        ach.eventStart >= filters.timeRange!.startDate &&
        ach.eventStart <= filters.timeRange!.endDate,
    );
  }

  if (filters?.projectIds && filters.projectIds.length > 0) {
    achievementsToAssign = achievementsToAssign.filter((ach) =>
      filters.projectIds!.includes(ach.projectId || ''),
    );
  }

  if (achievementsToAssign.length === 0) {
    return {
      assigned: [],
      unassigned: [],
      assignments: new Map(),
    };
  }

  // Get workstreams with cached centroids
  const workstreams_ = await db
    .select()
    .from(workstream)
    .where(
      and(eq(workstream.userId, userId), eq(workstream.isArchived, false)),
    );

  const assignments = new Map<string, string>();
  const assigned: string[] = [];
  const unassigned: string[] = [];

  // For each achievement, find best matching workstream
  for (const ach of achievementsToAssign) {
    let bestWorkstreamId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    // Compare against each workstream centroid
    for (const ws of workstreams_) {
      if (!ws.centroidEmbedding) {
        continue;
      }

      // Cast to number[] (centroid is stored as vector)
      const centroid = ws.centroidEmbedding as unknown as number[];
      const achEmbedding = ach.embedding as unknown as number[];
      const distance = cosineDistance(achEmbedding, centroid);

      // Lower distance = better match
      if (distance < bestDistance) {
        bestDistance = distance;
        bestWorkstreamId = ws.id;
      }
    }

    // Assign if confidence is high enough (low distance)
    // outlierThreshold is confidence, so good match means distance is low
    if (bestWorkstreamId && bestDistance < 1 - params.outlierThreshold) {
      assignments.set(ach.id, bestWorkstreamId);
      assigned.push(ach.id);
    } else {
      unassigned.push(ach.id);
    }
  }

  // Update achievements with assignments
  if (assigned.length > 0) {
    const now = new Date();
    for (const achId of assigned) {
      const wsId = assignments.get(achId);
      if (wsId) {
        await db
          .update(achievement)
          .set({
            workstreamId: wsId,
            workstreamSource: 'ai',
            updatedAt: now,
          })
          .where(eq(achievement.id, achId));
      }
    }

    // Update workstream achievement counts
    for (const ws of workstreams_) {
      const countInWs = assigned.filter(
        (id) => assignments.get(id) === ws.id,
      ).length;
      if (countInWs > 0) {
        const newCount = (ws.achievementCount || 0) + countInWs;
        await db
          .update(workstream)
          .set({
            achievementCount: newCount,
            updatedAt: new Date(),
          })
          .where(eq(workstream.id, ws.id));
      }
    }
  }

  return {
    assigned,
    unassigned,
    assignments,
  };
}

// Number of workstreams to name per LLM request
const NAMING_BATCH_SIZE = 5;
// Maximum concurrent LLM requests for naming workstreams
const NAMING_CONCURRENCY_LIMIT = 5;

/**
 * Schema for naming multiple workstreams in a single LLM call
 */
function createBatchSchema(count: number) {
  return z.object({
    workstreams: z
      .array(
        z.object({
          name: z
            .string()
            .max(256)
            .describe('2-5 word workstream name summarizing the theme'),
          description: z
            .string()
            .max(1000)
            .describe('1-2 sentence description of this workstream theme'),
        }),
      )
      .length(count),
  });
}

/**
 * Generate names and descriptions for a batch of workstream clusters in a single LLM call
 *
 * @param clusterBatch - Array of achievement arrays (batch of clusters to name together)
 * @param startIndex - Starting index for logging purposes
 * @returns Array of objects with name and description (same order as input)
 */
async function nameWorkstreamBatch(
  clusterBatch: Achievement[][],
  startIndex: number,
): Promise<Array<{ name: string; description: string }>> {
  const startTime = Date.now();
  const llm = getLLM('extraction'); // gpt-4o-mini
  const batchSize = clusterBatch.length;

  // Build prompt for this batch of clusters
  const clustersText = clusterBatch
    .map((achievements, idx) => {
      const sample = achievements.slice(0, 15);
      const achievementText = sample
        .map((ach) => `  - ${ach.title}: ${ach.summary}`)
        .join('\n');

      return `Cluster ${idx + 1} (${achievements.length} achievements):
${achievementText}`;
    })
    .join('\n\n');

  const prompt = `Analyze these achievement clusters and generate a workstream name and description for each.

${clustersText}

IMPORTANT: Generate exactly ${batchSize} workstreams in the same order as the clusters above.
Each workstream name should be 2-5 words that capture the theme.
Each description should be 1-2 sentences explaining what this workstream represents.`;

  try {
    const { object } = await generateObject({
      model: llm,
      schema: createBatchSchema(batchSize),
      prompt,
      temperature: 0.7,
    });

    const duration = Date.now() - startTime;
    const clusterRange = `${startIndex + 1}-${startIndex + batchSize}`;
    const names = object.workstreams.map((ws) => `"${ws.name}"`).join(', ');
    console.log(
      `[Workstreams Batch] Clusters ${clusterRange} named in ${duration}ms: ${names}`,
    );

    // Validate we got the right number of results
    if (object.workstreams.length === batchSize) {
      return object.workstreams.map((ws) => ({
        name: ws.name.slice(0, 256),
        description: ws.description.slice(0, 1000),
      }));
    }

    console.warn(
      `[Workstreams Batch] Expected ${batchSize} results, got ${object.workstreams.length}`,
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Workstreams Batch] Clusters ${startIndex + 1}-${startIndex + batchSize} naming failed after ${duration}ms:`,
      error,
    );
  }

  // Fallback: generate generic names for this batch
  return clusterBatch.map((achievements, idx) => {
    const titles = achievements
      .slice(0, 15)
      .map((ach) => ach.title)
      .join(' ');
    const commonWords = extractCommonWords(titles);
    const name =
      commonWords.slice(0, 3).join(' ') || `Workstream ${startIndex + idx + 1}`;

    return {
      name: name.slice(0, 256),
      description: `Workstream with ${achievements.length} achievements`,
    };
  });
}

/**
 * Split an array into chunks of a specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Generate names and descriptions for multiple workstreams in parallel batches
 * Uses batching (multiple workstreams per LLM call) and p-limit for concurrency control
 *
 * @param clusters - Array of achievement arrays (one per cluster)
 * @param _user - User object (not currently used)
 * @returns Array of objects with name and description (same order as input clusters)
 */
export async function nameWorkstreamsBatch(
  clusters: Achievement[][],
  _user: User,
): Promise<Array<{ name: string; description: string }>> {
  const functionStartTime = Date.now();
  const numBatches = Math.ceil(clusters.length / NAMING_BATCH_SIZE);
  console.log(
    `[Workstreams Batch] Starting naming for ${clusters.length} clusters in ${numBatches} batches (batch size: ${NAMING_BATCH_SIZE}, concurrency: ${NAMING_CONCURRENCY_LIMIT})`,
  );

  if (clusters.length === 0) {
    return [];
  }

  // Split clusters into batches
  const clusterBatches = chunkArray(clusters, NAMING_BATCH_SIZE);

  // Create concurrency limiter
  const limit = pLimit(NAMING_CONCURRENCY_LIMIT);

  // Create naming tasks for each batch with concurrency limit
  const namingTasks = clusterBatches.map((batch, batchIdx) => {
    const startIndex = batchIdx * NAMING_BATCH_SIZE;
    return limit(() => nameWorkstreamBatch(batch, startIndex));
  });

  // Run all batch tasks in parallel (limited by p-limit)
  const batchResults = await Promise.all(namingTasks);

  // Flatten results back into single array
  const results = batchResults.flat();

  const totalDuration = Date.now() - functionStartTime;
  console.log(
    `[Workstreams Batch] All ${clusters.length} clusters named in ${totalDuration}ms (${numBatches} LLM calls, ${Math.round(totalDuration / clusters.length)}ms avg per cluster)`,
  );

  return results;
}

/**
 * Extract common words from text (simple heuristic)
 */
function extractCommonWords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  // Filter out common words and short words
  return words
    .filter(
      (w) =>
        w.length > 3 &&
        ![
          'the',
          'and',
          'that',
          'this',
          'from',
          'with',
          'were',
          'been',
          'have',
        ].includes(w),
    )
    .slice(0, 5);
}

/**
 * Perform full re-clustering of achievements
 * Archives old workstreams, clears assignments, and creates new clusters from filtered achievements.
 * Embeddings are generated for ALL achievements (cost optimization), but only filtered achievements
 * are used for clustering. Achievements outside the current filters are auto-assigned to nearest workstreams.
 *
 * @param userId - User ID to scope operation
 * @param user - User object for LLM selection in naming
 * @param onProgress - Optional callback for progress updates
 * @param filters - Optional filter parameters for clustering:
 *   - timeRange: Use Date objects (JS native). startDate and endDate define the range (inclusive).
 *     If omitted, defaults to last 12 months. Must not exceed 24 months.
 *   - projectIds: Array of project UUIDs to include. If omitted, all projects are included.
 * @returns FullClusteringResult with clustering statistics, metadata, and applied filter info
 */
export async function fullReclustering(
  userId: string,
  user: User,
  onProgress?: ProgressCallback,
  filters?: {
    timeRange?: { startDate: Date; endDate: Date };
    projectIds?: string[];
  },
): Promise<FullClusteringResult> {
  // Get all achievements with embeddings
  const allAchievements = await db
    .select()
    .from(achievement)
    .where(eq(achievement.userId, userId));

  const achievementsWithEmbeddings = allAchievements.filter(
    (ach) => ach.embedding,
  );

  // Default to 12 months if no timeRange provided (backward compatible)
  const effectiveTimeRange = filters?.timeRange || {
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };

  let filteredAchievements = achievementsWithEmbeddings.filter(
    (ach) =>
      ach.eventStart &&
      ach.eventStart >= effectiveTimeRange.startDate &&
      ach.eventStart <= effectiveTimeRange.endDate,
  );

  if (filters?.projectIds && filters.projectIds.length > 0) {
    filteredAchievements = filteredAchievements.filter((ach) =>
      filters.projectIds!.includes(ach.projectId || ''),
    );
  }

  // Validate minimum count based on filtered achievements
  if (filteredAchievements.length < MINIMUM_ACHIEVEMENTS) {
    const filterDescription = filters?.timeRange
      ? 'selected time range'
      : 'last 12 months';
    throw new Error(
      `Insufficient achievements in ${filterDescription}: need ${MINIMUM_ACHIEVEMENTS}, have ${filteredAchievements.length}`,
    );
  }

  // Extract embeddings as vectors from filtered achievements
  const embeddings = filteredAchievements.map(
    (ach) => ach.embedding as unknown as number[],
  );

  // Get clustering parameters based on filtered dataset size
  const params = getClusteringParameters(filteredAchievements.length);
  if (!params) {
    throw new Error('Insufficient achievements for clustering');
  }

  // Run DBSCAN clustering
  const clusteringResult = clusterEmbeddings(embeddings, params);

  // Archive existing workstreams
  const now = new Date();
  await db
    .update(workstream)
    .set({
      isArchived: true,
      updatedAt: now,
    })
    .where(eq(workstream.userId, userId));

  // Clear workstream assignments (only AI-assigned ones)
  await db
    .update(achievement)
    .set({
      workstreamId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(achievement.userId, userId),
        eq(achievement.workstreamSource, 'ai'),
      ),
    );

  // Prepare cluster data for batch processing
  const workstreamColors = [
    '#16A34A', // green-600
    '#F97316', // orange-500
    '#0284C7', // sky-600
    '#9333EA', // purple-600
    '#E11D48', // rose-500
    '#0D9488', // teal-600
    '#4F46E5', // indigo-600
    '#DB2777', // pink-600
    '#65A30D', // lime-600
    '#EA580C', // orange-600
    '#0891B2', // cyan-600
    '#7C3AED', // violet-600
    '#DC2626', // red-600
    '#D97706', // amber-600
    '#059669', // emerald-600
    '#2563EB', // blue-600
  ];

  // Extract cluster achievements and calculate centroids
  const clusterData = clusteringResult.clusters
    .map((clusterIndices, i) => {
      if (!clusterIndices) return null;

      const clusterAchievements = clusterIndices
        .map((idx) => filteredAchievements[idx])
        .filter((ach): ach is Achievement => ach !== undefined);

      const clusterEmbeddings = clusterIndices
        .map((idx) => embeddings[idx])
        .filter((emb): emb is number[] => emb !== undefined);

      const centroid = calculateCentroid(clusterEmbeddings);

      return {
        index: i,
        achievements: clusterAchievements,
        centroid,
      };
    })
    .filter((cluster) => cluster !== null);

  // PHASE 1: Create workstreams with temporary names (no LLM call yet)
  console.log(
    `[Workstreams] Creating ${clusterData.length} workstreams with temporary names`,
  );

  // Create all workstreams and assign initial achievements in parallel
  const workstreamPromises = clusterData.map(async (cluster, idx) => {
    const wsId = uuidv4();
    const color = workstreamColors[cluster.index % workstreamColors.length];

    // Create workstream record with temporary name
    const newWs = await db
      .insert(workstream)
      .values({
        id: wsId,
        userId,
        name: `Workstream ${idx + 1}`, // Temporary name
        description: `Temporary workstream`, // Temporary description
        color,
        centroidEmbedding: cluster.centroid as unknown as any,
        centroidUpdatedAt: now,
        achievementCount: cluster.achievements.length,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Assign achievements to this workstream
    // BUT: exclude user-assigned achievements (workstreamSource='user')
    // We only want to assign achievements that are either unassigned or AI-assigned
    const achIds = cluster.achievements
      .filter((ach) => ach.workstreamSource !== 'user')
      .map((ach) => ach.id);

    if (achIds.length > 0) {
      await db
        .update(achievement)
        .set({
          workstreamId: wsId,
          workstreamSource: 'ai',
          updatedAt: now,
        })
        .where(inArray(achievement.id, achIds));
    }

    return newWs[0];
  });

  const createdWorkstreams = (await Promise.all(workstreamPromises)).filter(
    (ws): ws is Workstream => ws !== undefined,
  );

  console.log(
    `[Workstreams] Created ${createdWorkstreams.length} workstreams with temporary names`,
  );

  // Emit progress for Phase 1 completion
  onProgress?.({
    type: 'progress',
    phase: 'workstreams_created',
    message: `Created ${createdWorkstreams.length} workstreams`,
    data: { workstreamsCount: createdWorkstreams.length },
  });

  // PHASE 2: Automatically assign outliers to nearest workstreams (improves coverage)
  // This combines the benefits of conservative clustering (quality workstreams)
  // with permissive assignment (high coverage)
  // Re-fetch achievements to get updated workstreamId values
  const achievementsAfterClustering = await db
    .select({
      id: achievement.id,
      workstreamId: achievement.workstreamId,
    })
    .from(achievement)
    .where(
      and(eq(achievement.userId, userId), isNotNull(achievement.embedding)),
    );

  const outlierIds = achievementsAfterClustering
    .filter((ach) => !ach.workstreamId)
    .map((ach) => ach.id);

  if (outlierIds.length > 0 && createdWorkstreams.length > 0) {
    console.log(
      `[Workstreams] Phase 2: Auto-assigning ${outlierIds.length} outliers to nearest workstreams`,
    );
    const assignmentResult = await incrementalAssignment(userId, params);
    console.log(
      `[Workstreams] Auto-assigned ${assignmentResult.assigned.length} achievements, ${assignmentResult.unassigned.length} remain unassigned`,
    );
  }

  // Get total assigned achievements count for progress update
  const totalAssignedCount = await db
    .select({ count: count() })
    .from(achievement)
    .where(
      and(eq(achievement.userId, userId), isNotNull(achievement.workstreamId)),
    );
  const totalAssigned = totalAssignedCount[0]?.count || 0;

  // Emit progress for Phase 2 completion
  onProgress?.({
    type: 'progress',
    phase: 'achievements_assigned',
    message: `Assigned ${totalAssigned} achievements`,
    data: {
      totalAssigned,
      unassigned:
        outlierIds.length > 0
          ? outlierIds.length -
            (totalAssigned - clusteringResult.clusters.flat().length)
          : 0,
    },
  });

  // PHASE 3: Generate names based on COMPLETE workstream content (after outlier assignment)
  console.log(
    `[Workstreams] Phase 3: Generating names for ${createdWorkstreams.length} workstreams based on complete achievement sets`,
  );

  // Emit progress for Phase 3 start
  onProgress?.({
    type: 'progress',
    phase: 'generating_names',
    message: 'Generating names...',
    data: {},
  });

  // Fetch all achievements for each workstream (including newly assigned outliers)
  const workstreamAchievements = await Promise.all(
    createdWorkstreams.map(async (ws) => {
      const achievements = await db
        .select()
        .from(achievement)
        .where(eq(achievement.workstreamId, ws.id));
      return { workstream: ws, achievements };
    }),
  );

  // Generate names in batch for all workstreams with their complete achievement sets
  const namingStartTime = Date.now();
  const names = await nameWorkstreamsBatch(
    workstreamAchievements.map((wa) => wa.achievements),
    user,
  );
  const namingDuration = Date.now() - namingStartTime;

  console.log(
    `[Workstreams] Batch naming complete in ${namingDuration}ms, updating workstream names`,
  );

  // Update workstreams with proper names and updated centroids
  const updatePromises = workstreamAchievements.map(async (wa, idx) => {
    const nameData = names[idx] || {
      name: `Workstream ${idx + 1}`,
      description: `Workstream with ${wa.achievements.length} achievements`,
    };

    // Recalculate centroid with all achievements (including outliers)
    const achievementEmbeddings = wa.achievements
      .filter((ach) => ach.embedding)
      .map((ach) => ach.embedding as unknown as number[]);

    const updatedCentroid =
      achievementEmbeddings.length > 0
        ? calculateCentroid(achievementEmbeddings)
        : wa.workstream.centroidEmbedding;

    // Update workstream with proper name and updated centroid
    await db
      .update(workstream)
      .set({
        name: nameData.name,
        description: nameData.description,
        centroidEmbedding: updatedCentroid as unknown as any,
        centroidUpdatedAt: now,
        achievementCount: wa.achievements.length,
        updatedAt: now,
      })
      .where(eq(workstream.id, wa.workstream.id));
  });

  await Promise.all(updatePromises);

  console.log(
    `[Workstreams] Updated ${createdWorkstreams.length} workstreams with proper names and centroids`,
  );

  // Auto-assign excluded achievements (those outside current filters)
  // Achievements in achievementsWithEmbeddings but NOT in filteredAchievements
  const excludedAchievements = achievementsWithEmbeddings.filter(
    (ach) => !filteredAchievements.some((fa) => fa.id === ach.id),
  );

  let autoAssignedOutsideFilters = 0;
  if (excludedAchievements.length > 0 && createdWorkstreams.length > 0) {
    console.log(
      `[Workstreams] Auto-assigning ${excludedAchievements.length} achievements outside current filters`,
    );

    for (const ach of excludedAchievements) {
      if (!ach.embedding) continue;

      let bestWorkstreamId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      const achEmbedding = ach.embedding as unknown as number[];

      // Find nearest workstream centroid
      for (const ws of createdWorkstreams) {
        if (!ws.centroidEmbedding) continue;
        const centroid = ws.centroidEmbedding as unknown as number[];
        const distance = cosineDistance(achEmbedding, centroid);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestWorkstreamId = ws.id;
        }
      }

      // Assign if confidence is high enough (low distance)
      // Use same threshold as incremental assignment
      if (bestWorkstreamId && bestDistance < 1 - params.outlierThreshold) {
        const achNow = new Date();
        await db
          .update(achievement)
          .set({
            workstreamId: bestWorkstreamId,
            workstreamSource: 'ai',
            updatedAt: achNow,
          })
          .where(eq(achievement.id, ach.id));
        autoAssignedOutsideFilters++;
      }
    }
    console.log(
      `[Workstreams] Auto-assigned ${autoAssignedOutsideFilters} achievements outside filters`,
    );
  }

  // Create or update metadata
  // Build generationParams with proper typing
  type GenerationParams = {
    timeRange?: { startDate: string; endDate: string };
    projectIds?: string[];
  };

  const generationParams: GenerationParams = {};
  if (filters?.timeRange) {
    const startDate = filters.timeRange.startDate.toISOString().split('T')[0];
    const endDate = filters.timeRange.endDate.toISOString().split('T')[0];
    if (startDate && endDate) {
      generationParams.timeRange = { startDate, endDate };
    }
  }
  if (filters?.projectIds) {
    generationParams.projectIds = filters.projectIds;
  }

  const metadata = {
    id: uuidv4(),
    userId,
    lastFullClusteringAt: now,
    achievementCountAtLastClustering: filteredAchievements.length,
    epsilon: clusteringResult.epsilon,
    minPts: params.minPts,
    workstreamCount: clusteringResult.clusters.length,
    outlierCount: clusteringResult.outlierCount,
    generationParams,
    filteredAchievementCount: filteredAchievements.length,
    createdAt: now,
    updatedAt: now,
  };

  // Check if metadata exists
  const existingMetadata = await db
    .select()
    .from(workstreamMetadata)
    .where(eq(workstreamMetadata.userId, userId));

  if (existingMetadata.length > 0) {
    await db
      .update(workstreamMetadata)
      .set(metadata)
      .where(eq(workstreamMetadata.userId, userId));
  } else {
    await db.insert(workstreamMetadata).values(metadata);
  }

  // Get final counts from database (after all phases including auto-assignment)
  // The in-memory filteredAchievements array is stale after Phase 2 updates the DB
  const finalAssignedCount = await db
    .select({ count: count() })
    .from(achievement)
    .where(
      and(eq(achievement.userId, userId), isNotNull(achievement.workstreamId)),
    );
  const finalAssigned = finalAssignedCount[0]?.count || 0;

  // Get outlier achievement IDs fresh from database (only IDs needed - API fetches full summaries separately)
  const outlierAchievements = await db
    .select({ id: achievement.id })
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        isNotNull(achievement.embedding),
        isNull(achievement.workstreamId),
      ),
    );

  return {
    workstreamsCreated: createdWorkstreams.length,
    achievementsAssigned: finalAssigned,
    outliers: outlierAchievements.length,
    metadata: metadata as unknown as WorkstreamMetadata,
    workstreams: createdWorkstreams,
    achievementsWithAssignments: filteredAchievements.filter(
      (ach) => ach.workstreamId !== null,
    ),
    outlierAchievements,
    autoAssignedOutsideFilters,
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
    filteredAchievementCount: filteredAchievements.length,
  };
}

/**
 * Update centroid for a workstream based on current achievements
 * Archives workstream if no achievements remain
 *
 * @param workstreamId - Workstream ID to update
 */
export async function updateWorkstreamCentroid(
  workstreamId: string,
): Promise<void> {
  // Get all achievements in this workstream
  const achievementsInWs = await db
    .select()
    .from(achievement)
    .where(eq(achievement.workstreamId, workstreamId));

  // Filter to those with embeddings
  const withEmbeddings = achievementsInWs.filter((ach) => ach.embedding);

  const now = new Date();

  if (withEmbeddings.length === 0) {
    // Archive workstream if no achievements
    await db
      .update(workstream)
      .set({
        isArchived: true,
        updatedAt: now,
      })
      .where(eq(workstream.id, workstreamId));
  } else {
    // Recalculate centroid
    const embeddings = withEmbeddings.map(
      (ach) => ach.embedding as unknown as number[],
    );
    const centroid = calculateCentroid(embeddings);

    // Update workstream
    await db
      .update(workstream)
      .set({
        centroidEmbedding: centroid as unknown as any,
        centroidUpdatedAt: now,
        achievementCount: withEmbeddings.length,
        updatedAt: now,
      })
      .where(eq(workstream.id, workstreamId));
  }
}

/**
 * Hook called when an achievement's workstream assignment changes
 * Updates centroids for both old and new workstreams
 *
 * @param achievementId - Achievement ID that changed
 * @param oldWorkstreamId - Previous workstream ID (null if unassigned)
 * @param newWorkstreamId - New workstream ID (null if unassigned)
 */
export async function onAchievementWorkstreamChange(
  _achievementId: string,
  oldWorkstreamId: string | null,
  newWorkstreamId: string | null,
): Promise<void> {
  // Update old workstream centroid if it existed
  if (oldWorkstreamId) {
    await updateWorkstreamCentroid(oldWorkstreamId);
  }

  // Update new workstream centroid if it exists
  if (newWorkstreamId) {
    await updateWorkstreamCentroid(newWorkstreamId);
  }
}
