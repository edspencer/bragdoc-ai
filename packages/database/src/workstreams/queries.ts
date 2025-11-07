/**
 * Database queries for workstreams feature
 *
 * Reusable query functions for workstream and achievement management.
 */

import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../index';
import {
  workstream,
  workstreamMetadata,
  achievement,
  type Workstream,
  type WorkstreamMetadata,
  type Achievement,
} from '../schema';

/**
 * Get all workstreams for a user
 * Optionally filters out archived workstreams
 *
 * @param userId - User ID to scope query
 * @param includeArchived - Whether to include archived workstreams (default: false)
 * @returns Array of workstreams ordered by achievement count
 */
export async function getWorkstreamsByUserId(
  userId: string,
  includeArchived = false,
): Promise<Workstream[]> {
  const conditions = [eq(workstream.userId, userId)];

  if (!includeArchived) {
    conditions.push(eq(workstream.isArchived, false));
  }

  const results = await db
    .select()
    .from(workstream)
    .where(and(...conditions))
    .orderBy(desc(workstream.achievementCount));

  return results;
}

/**
 * Get a single workstream by ID
 *
 * @param workstreamId - Workstream ID
 * @returns Workstream or null if not found
 */
export async function getWorkstreamById(
  workstreamId: string,
): Promise<Workstream | null> {
  const result = await db
    .select()
    .from(workstream)
    .where(eq(workstream.id, workstreamId));

  return result[0] || null;
}

/**
 * Get all achievements in a workstream
 * Orders by event start date descending
 *
 * @param workstreamId - Workstream ID
 * @returns Array of achievements in this workstream
 */
export async function getAchievementsByWorkstreamId(
  workstreamId: string,
): Promise<Achievement[]> {
  const results = await db
    .select()
    .from(achievement)
    .where(eq(achievement.workstreamId, workstreamId))
    .orderBy(desc(achievement.eventStart));

  return results;
}

/**
 * Get achievements that haven't been assigned to any workstream
 * Must have embeddings to be eligible
 *
 * @param userId - User ID to scope query
 * @returns Array of unassigned achievements with embeddings
 */
export async function getUnassignedAchievements(
  userId: string,
): Promise<Achievement[]> {
  const results = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        isNull(achievement.workstreamId),
        // Note: isNull for vector type may not work properly in all Drizzle versions
        // The calling code should filter for embeddings in application layer
      ),
    )
    .orderBy(desc(achievement.eventStart));

  // Filter in application to ensure we only get achievements with embeddings
  return results.filter((ach) => ach.embedding);
}

/**
 * Get clustering metadata for a user
 *
 * @param userId - User ID
 * @returns Metadata record or null if never clustered
 */
export async function getWorkstreamMetadata(
  userId: string,
): Promise<WorkstreamMetadata | null> {
  const result = await db
    .select()
    .from(workstreamMetadata)
    .where(eq(workstreamMetadata.userId, userId));

  return result[0] || null;
}

/**
 * Update a workstream with partial data
 * Automatically updates the `updatedAt` timestamp
 *
 * @param workstreamId - Workstream ID to update
 * @param updates - Partial workstream data
 * @returns Updated workstream record
 */
export async function updateWorkstream(
  workstreamId: string,
  updates: Partial<Workstream>,
): Promise<Workstream> {
  const now = new Date();

  const result = await db
    .update(workstream)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(eq(workstream.id, workstreamId))
    .returning();

  if (!result[0]) {
    throw new Error(`Workstream not found: ${workstreamId}`);
  }

  return result[0];
}

/**
 * Archive a workstream
 * Sets isArchived = true, which hides it from normal queries
 *
 * @param workstreamId - Workstream ID to archive
 */
export async function archiveWorkstream(workstreamId: string): Promise<void> {
  const now = new Date();

  await db
    .update(workstream)
    .set({
      isArchived: true,
      updatedAt: now,
    })
    .where(eq(workstream.id, workstreamId));
}

/**
 * Get count of all achievements for a user (regardless of embeddings)
 * Used to determine if clustering is possible
 *
 * Note: Embeddings will be generated automatically during clustering if missing
 *
 * @param userId - User ID
 * @returns Count of all achievements
 */
export async function getAchievementCountWithEmbeddings(
  userId: string,
): Promise<number> {
  const results = await db
    .select()
    .from(achievement)
    .where(eq(achievement.userId, userId));

  // Return total count - embeddings will be generated during workstream generation
  return results.length;
}

/**
 * Unassign all achievements from a workstream
 * Used when deleting a workstream
 *
 * @param workstreamId - Workstream ID
 */
export async function unassignAchievementsFromWorkstream(
  workstreamId: string,
): Promise<void> {
  const now = new Date();

  await db
    .update(achievement)
    .set({
      workstreamId: null,
      workstreamSource: null,
      updatedAt: now,
    })
    .where(eq(achievement.workstreamId, workstreamId));
}
