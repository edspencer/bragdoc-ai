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
import { and, eq, isNull, isNotNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { getLLM } from './index';
import {
  clusterEmbeddings,
  calculateCentroid,
  getClusteringParameters,
  cosineDistance,
  type ClusteringParams,
} from './clustering';

const MINIMUM_ACHIEVEMENTS = 20;
const SMALL_DATASET = 100;
const RECLUSTER_PERCENTAGE_THRESHOLD = 0.1; // 10%
const RECLUSTER_ABSOLUTE_THRESHOLD = 50; // 50 achievements
const RECLUSTER_TIME_THRESHOLD_DAYS = 30;

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
  // Optional fields for enhanced API responses
  workstreams?: Workstream[];
  achievementsWithAssignments?: Achievement[];
  outlierAchievements?: Achievement[];
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
 * Returns 'full' if: never clustered, +10% achievements, +50 achievements, or >30 days
 *
 * @param currentAchievementCount - Current number of achievements with embeddings
 * @param metadata - Previous clustering metadata, or null if never clustered
 * @returns Decision with strategy and reason
 */
export function decideShouldReCluster(
  currentAchievementCount: number,
  metadata: WorkstreamMetadata | null,
): UpdateDecision {
  // Never clustered before
  if (!metadata) {
    return {
      strategy: 'full',
      reason: 'Initial clustering',
    };
  }

  // Previous clustering found no workstreams (all outliers)
  // This means we should try different parameters
  if (metadata.workstreamCount === 0) {
    return {
      strategy: 'full',
      reason: 'No workstreams found in previous clustering',
    };
  }

  // Calculate if we have 10% more achievements
  const achievementGrowthPercent =
    (currentAchievementCount - metadata.achievementCountAtLastClustering) /
    metadata.achievementCountAtLastClustering;

  if (achievementGrowthPercent >= RECLUSTER_PERCENTAGE_THRESHOLD) {
    return {
      strategy: 'full',
      reason: `${(achievementGrowthPercent * 100).toFixed(1)}% growth in achievements`,
    };
  }

  // Check if we have 50+ new achievements
  const newAchievementCount =
    currentAchievementCount - metadata.achievementCountAtLastClustering;

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
 * Finds best matching workstream for each achievement using centroid similarity
 *
 * @param userId - User ID to scope operation
 * @param params - Clustering parameters with confidence threshold
 * @returns Assignment result with assigned/unassigned IDs
 */
export async function incrementalAssignment(
  userId: string,
  params: ClusteringParams,
): Promise<AssignmentResult> {
  // Get unassigned achievements with embeddings
  const unassignedAchs = await db
    .select()
    .from(achievement)
    .where(
      and(eq(achievement.userId, userId), isNull(achievement.workstreamId)),
    );

  // Filter to only those with embeddings
  const achievementsToAssign = unassignedAchs.filter((ach) => ach.embedding);

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

/**
 * Generate a name and description for a workstream based on its achievements
 * Uses LLM to analyze sampled achievements and generate descriptive text
 *
 * @param achievements - Achievements in this workstream
 * @param _user - User object (not currently used)
 * @returns Object with name and description
 */
export async function nameWorkstream(
  achievements: Achievement[],
  _user: User,
): Promise<{ name: string; description: string }> {
  // Sample up to 15 achievements
  const sampleSize = Math.min(15, achievements.length);
  const sample = achievements.slice(0, sampleSize);

  // Create prompt with achievement titles and summaries
  const achievementText = sample
    .map((ach) => `- ${ach.title}: ${ach.summary}`)
    .join('\n');

  // Use LLM to generate name and description
  const llm = getLLM('generation');

  try {
    const { text } = await generateText({
      model: llm,
      prompt: `Analyze these achievements and generate a workstream name and description.

Achievements:
${achievementText}

Respond with JSON in this exact format:
{
  "name": "2-5 word workstream name",
  "description": "1-2 sentence description of this workstream theme"
}

Ensure the response is valid JSON only.`,
      temperature: 0.7,
    });

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.name && parsed.description) {
        return {
          name: parsed.name.slice(0, 256), // Enforce max length
          description: parsed.description.slice(0, 1000),
        };
      }
    }
  } catch (error) {
    console.error('Failed to generate workstream name with LLM:', error);
  }

  // Fallback: extract common words from titles
  const titles = sample.map((ach) => ach.title).join(' ');
  const commonWords = extractCommonWords(titles);
  const name = commonWords.slice(0, 3).join(' ') || 'Unnamed Workstream';

  return {
    name: name.slice(0, 256),
    description: `Workstream with ${achievements.length} achievements`,
  };
}

/**
 * Generate names and descriptions for multiple workstreams in a single LLM call
 * This is much more efficient than calling nameWorkstream() sequentially
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
  console.log(
    `[Workstreams Batch] Starting batch naming for ${clusters.length} clusters`,
  );

  if (clusters.length === 0) {
    return [];
  }

  // Use fast model for naming - this is a simple task, doesn't need gpt-4o
  const llm = getLLM('extraction'); // gpt-4o-mini

  // Build single prompt with all clusters
  const promptBuildStart = Date.now();
  const clustersText = clusters
    .map((achievements, idx) => {
      const sample = achievements.slice(0, 15);
      const achievementText = sample
        .map((ach) => `  - ${ach.title}: ${ach.summary}`)
        .join('\n');

      return `Cluster ${idx + 1} (${achievements.length} achievements):
${achievementText}`;
    })
    .join('\n\n');
  const promptBuildDuration = Date.now() - promptBuildStart;
  console.log(`[Workstreams Batch] Prompt built in ${promptBuildDuration}ms`);

  // Define schema for structured output
  const workstreamSchema = z.object({
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
      .length(clusters.length),
  });

  const fullPrompt = `Analyze these achievement clusters and generate a workstream name and description for each.

${clustersText}

IMPORTANT: Generate exactly ${clusters.length} workstreams in the same order as the clusters above.
Each workstream name should be 2-5 words that capture the theme.
Each description should be 1-2 sentences explaining what this workstream represents.`;

  try {
    console.log(
      `[Workstreams Batch] Calling generateObject with ${fullPrompt.length} chars prompt, model: gpt-4o-mini`,
    );

    const llmCallStart = Date.now();
    const { object } = await generateObject({
      model: llm,
      schema: workstreamSchema,
      prompt: fullPrompt,
      temperature: 0.7,
    });
    const llmCallDuration = Date.now() - llmCallStart;

    console.log(
      `[Workstreams Batch] LLM call completed in ${llmCallDuration}ms, generated ${object.workstreams.length} workstreams`,
    );

    // Ensure we got the right number of results
    if (object.workstreams.length === clusters.length) {
      const totalDuration = Date.now() - functionStartTime;
      console.log(
        `[Workstreams Batch] Success! Total function time: ${totalDuration}ms`,
      );
      return object.workstreams.map((ws) => ({
        name: ws.name.slice(0, 256),
        description: ws.description.slice(0, 1000),
      }));
    } else {
      console.warn(
        `[Workstreams Batch] Returned ${object.workstreams.length} results, expected ${clusters.length}`,
      );
    }
  } catch (error) {
    const errorDuration = Date.now() - functionStartTime;
    console.error(
      `[Workstreams Batch] LLM call failed after ${errorDuration}ms:`,
      error,
    );
  }

  // Fallback: generate generic names for all clusters
  const fallbackStart = Date.now();
  console.log(
    '[Workstreams Batch] Using fallback naming for all clusters due to LLM failure',
  );
  const fallbackNames = clusters.map((achievements, idx) => {
    const titles = achievements
      .slice(0, 15)
      .map((ach) => ach.title)
      .join(' ');
    const commonWords = extractCommonWords(titles);
    const name = commonWords.slice(0, 3).join(' ') || `Workstream ${idx + 1}`;

    return {
      name: name.slice(0, 256),
      description: `Workstream with ${achievements.length} achievements`,
    };
  });
  const fallbackDuration = Date.now() - fallbackStart;
  const totalDuration = Date.now() - functionStartTime;
  console.log(
    `[Workstreams Batch] Fallback completed in ${fallbackDuration}ms, total: ${totalDuration}ms`,
  );
  return fallbackNames;
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
 * Perform full re-clustering of all achievements
 * Archives old workstreams, clears assignments, and creates new clusters
 *
 * @param userId - User ID to scope operation
 * @param user - User object for LLM selection in naming
 * @returns Clustering statistics and metadata
 */
export async function fullReclustering(
  userId: string,
  user: User,
): Promise<FullClusteringResult> {
  // Get all achievements with embeddings
  const allAchievements = await db
    .select()
    .from(achievement)
    .where(eq(achievement.userId, userId));

  const achievementsWithEmbeddings = allAchievements.filter(
    (ach) => ach.embedding,
  );

  // Validate minimum count
  if (achievementsWithEmbeddings.length < MINIMUM_ACHIEVEMENTS) {
    throw new Error(
      `Insufficient achievements: need ${MINIMUM_ACHIEVEMENTS}, have ${achievementsWithEmbeddings.length}`,
    );
  }

  // Extract embeddings as vectors
  const embeddings = achievementsWithEmbeddings.map(
    (ach) => ach.embedding as unknown as number[],
  );

  // Get clustering parameters based on dataset size
  const params = getClusteringParameters(achievementsWithEmbeddings.length);
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
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#F97316',
    '#84CC16',
    '#EC4899',
  ];

  // Extract cluster achievements and calculate centroids
  const clusterData = clusteringResult.clusters
    .map((clusterIndices, i) => {
      if (!clusterIndices) return null;

      const clusterAchievements = clusterIndices
        .map((idx) => achievementsWithEmbeddings[idx])
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

  console.log(
    `[Workstreams] Generating names for ${clusterData.length} clusters in batch`,
  );

  // Generate all workstream names in a single LLM call (MAJOR OPTIMIZATION)
  const namingStartTime = Date.now();
  const names = await nameWorkstreamsBatch(
    clusterData.map((c) => c.achievements),
    user,
  );
  const namingDuration = Date.now() - namingStartTime;

  console.log(
    `[Workstreams] Batch naming complete in ${namingDuration}ms, creating workstreams in parallel`,
  );

  // Create all workstreams and assign achievements in parallel (PARALLEL DB OPS)
  const workstreamPromises = clusterData.map(async (cluster, idx) => {
    // Get name/description with fallback if batch naming had issues
    const nameData = names[idx] || {
      name: `Workstream ${idx + 1}`,
      description: `Workstream with ${cluster.achievements.length} achievements`,
    };
    const { name, description } = nameData;
    const wsId = uuidv4();
    const color = workstreamColors[cluster.index % workstreamColors.length];

    // Create workstream record
    const newWs = await db
      .insert(workstream)
      .values({
        id: wsId,
        userId,
        name,
        description,
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
    `[Workstreams] Created ${createdWorkstreams.length} workstreams in parallel`,
  );

  // Automatically assign outliers to nearest workstreams (improves coverage)
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
      `[Workstreams] Auto-assigning ${outlierIds.length} outliers to nearest workstreams`,
    );
    const assignmentResult = await incrementalAssignment(userId, params);
    console.log(
      `[Workstreams] Auto-assigned ${assignmentResult.assigned.length} achievements, ${assignmentResult.unassigned.length} remain unassigned`,
    );
  }

  // Create or update metadata
  const metadata = {
    id: uuidv4(),
    userId,
    lastFullClusteringAt: now,
    achievementCountAtLastClustering: achievementsWithEmbeddings.length,
    epsilon: clusteringResult.epsilon,
    minPts: params.minPts,
    workstreamCount: clusteringResult.clusters.length,
    outlierCount: clusteringResult.outlierCount,
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

  // Get outlier achievements (those with embeddings that weren't assigned to any cluster)
  // Note: Only achievementsWithEmbeddings are processed by clustering
  // Achievements without embeddings are never included in the process
  const outlierAchievements = achievementsWithEmbeddings.filter(
    (ach) => ach.workstreamId === null,
  );

  return {
    workstreamsCreated: createdWorkstreams.length,
    achievementsAssigned:
      achievementsWithEmbeddings.length - clusteringResult.outlierCount,
    outliers: clusteringResult.outlierCount,
    metadata: metadata as unknown as WorkstreamMetadata,
    workstreams: createdWorkstreams,
    achievementsWithAssignments: achievementsWithEmbeddings.filter(
      (ach) => ach.workstreamId !== null,
    ),
    outlierAchievements,
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
  achievementId: string,
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
