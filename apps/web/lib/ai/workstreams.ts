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
  type Achievement,
  type User,
  type Workstream,
  type WorkstreamMetadata,
} from '@bragdoc/database';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateText } from 'ai';
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
 */
export interface FullClusteringResult {
  workstreamsCreated: number;
  achievementsAssigned: number;
  outliers: number;
  metadata: WorkstreamMetadata;
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

  // Create new workstreams for each cluster
  const createdWorkstreams: Workstream[] = [];
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

  for (let i = 0; i < clusteringResult.clusters.length; i++) {
    const clusterIndices = clusteringResult.clusters[i];
    if (!clusterIndices) continue;
    const clusterAchievements = clusterIndices
      .map((idx) => achievementsWithEmbeddings[idx])
      .filter((ach): ach is Achievement => ach !== undefined);

    // Calculate centroid for this cluster
    const clusterEmbeddings = clusterIndices
      .map((idx) => embeddings[idx])
      .filter((emb): emb is number[] => emb !== undefined);
    const centroid = calculateCentroid(clusterEmbeddings);

    // Generate name and description
    const { name, description } = await nameWorkstream(
      clusterAchievements,
      user,
    );

    // Create workstream record
    const wsId = uuidv4();
    const color = workstreamColors[i % workstreamColors.length];

    const newWs = await db
      .insert(workstream)
      .values({
        id: wsId,
        userId,
        name,
        description,
        color,
        centroidEmbedding: centroid as unknown as any,
        centroidUpdatedAt: now,
        achievementCount: clusterAchievements.length,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (newWs[0]) {
      createdWorkstreams.push(newWs[0]);
    }

    // Assign achievements to this workstream
    const achIds = clusterAchievements.map((ach) => ach.id);
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

  return {
    workstreamsCreated: createdWorkstreams.length,
    achievementsAssigned:
      achievementsWithEmbeddings.length - clusteringResult.outlierCount,
    outliers: clusteringResult.outlierCount,
    metadata: metadata as unknown as WorkstreamMetadata,
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
