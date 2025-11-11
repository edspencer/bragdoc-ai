/**
 * Database queries for workstreams feature
 *
 * Reusable query functions for workstream and achievement management.
 */

import {
  and,
  desc,
  eq,
  isNull,
  isNotNull,
  gte,
  lte,
  inArray,
  count,
  sql,
} from 'drizzle-orm';
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
 *
 * @param userId - User ID to scope query
 * @returns Array of unassigned achievements (embeddings will be generated on demand)
 */
export async function getUnassignedAchievements(
  userId: string,
): Promise<Achievement[]> {
  const results = await db
    .select()
    .from(achievement)
    .where(
      and(eq(achievement.userId, userId), isNull(achievement.workstreamId)),
    )
    .orderBy(desc(achievement.eventStart));

  // Return all unassigned achievements - embeddings will be generated when needed
  return results;
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
 * Get total count of all achievements for a user
 * Used to determine if clustering is possible
 *
 * Note: Embeddings will be generated automatically during clustering if missing
 *
 * @param userId - User ID
 * @returns Count of all achievements (embeddings will be generated on demand)
 */
export async function getTotalAchievementCount(
  userId: string,
): Promise<number> {
  const results = await db
    .select()
    .from(achievement)
    .where(eq(achievement.userId, userId));

  return results.length;
}

/**
 * Get achievements for a user filtered by date range
 * Returns all achievements in the specified date range (embeddings will be generated on demand)
 *
 * @param userId - User ID to scope query
 * @param startDate - Start date for filtering (inclusive), optional
 * @param endDate - End date for filtering (inclusive), optional
 * @returns Array of achievements in date range, ordered by eventStart descending
 */
export async function getAchievementsByUserIdWithDates(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<Achievement[]> {
  const conditions = [eq(achievement.userId, userId)];

  // Add date filtering if provided
  if (startDate) {
    conditions.push(gte(achievement.eventStart, startDate));
  }
  if (endDate) {
    conditions.push(lte(achievement.eventStart, endDate));
  }

  const results = await db
    .select()
    .from(achievement)
    .where(and(...conditions))
    .orderBy(desc(achievement.eventStart));

  // Return all achievements - embeddings will be generated when needed
  return results;
}

/**
 * Get achievement counts for a user with optional date filtering
 * Uses SQL COUNT for performance - returns only counts, not full records
 *
 * @param userId - User ID to scope query
 * @param startDate - Start date for filtering (inclusive), optional
 * @param endDate - End date for filtering (inclusive), optional
 * @returns Object with total count and unassigned count
 */
export async function getAchievementCounts(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  total: number;
  unassigned: number;
}> {
  const conditions = [eq(achievement.userId, userId)];

  // Add date filtering if provided
  if (startDate) {
    conditions.push(gte(achievement.eventStart, startDate));
  }
  if (endDate) {
    conditions.push(lte(achievement.eventStart, endDate));
  }

  // Single SQL query to get both counts efficiently
  const result = await db
    .select({
      total: count(),
      unassigned: sql<number>`count(*) filter (where ${achievement.workstreamId} is null)`,
    })
    .from(achievement)
    .where(and(...conditions));

  return {
    total: result[0]?.total ?? 0,
    unassigned: result[0]?.unassigned ?? 0,
  };
}

/**
 * Calculate counts for achievements in a date range
 * Returns total count, unassigned count, and workstream IDs with achievements in range
 * Uses SQL COUNT and selectDistinct for optimal performance
 *
 * @param userId - User ID to scope query
 * @param startDate - Start date for filtering (inclusive), optional
 * @param endDate - End date for filtering (inclusive), optional
 * @returns Object with achievementCount, unassignedCount, and workstreamIds array
 */
export async function getWorkstreamCountsWithDateFilter(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  achievementCount: number;
  unassignedCount: number;
  workstreamIds: string[];
}> {
  const conditions = [eq(achievement.userId, userId)];

  // Add date filtering if provided
  if (startDate) {
    conditions.push(gte(achievement.eventStart, startDate));
  }
  if (endDate) {
    conditions.push(lte(achievement.eventStart, endDate));
  }

  // Run both queries in parallel for optimal performance
  const [countsResult, workstreamIdsResult] = await Promise.all([
    // Query 1: Get counts using SQL COUNT
    db
      .select({
        total: count(),
        unassigned: sql<number>`count(*) filter (where ${achievement.workstreamId} is null)`,
      })
      .from(achievement)
      .where(and(...conditions)),

    // Query 2: Get distinct workstream IDs (only non-null)
    db
      .selectDistinct({ id: achievement.workstreamId })
      .from(achievement)
      .where(and(...conditions, isNotNull(achievement.workstreamId))),
  ]);

  // Extract workstream IDs, filtering out any nulls
  const workstreamIds = workstreamIdsResult
    .map((r) => r.id)
    .filter((id): id is string => id !== null);

  return {
    achievementCount: countsResult[0]?.total ?? 0,
    unassignedCount: countsResult[0]?.unassigned ?? 0,
    workstreamIds,
  };
}

/**
 * Get workstreams for a user, optionally filtered by date range
 * When no dates provided, returns all workstreams (backward compatible)
 * When dates provided, returns only workstreams with achievements in the range
 *
 * @param userId - User ID to scope query
 * @param startDate - Start date for filtering (inclusive), optional
 * @param endDate - End date for filtering (inclusive), optional
 * @param includeArchived - Whether to include archived workstreams (default: false)
 * @returns Array of workstreams, optionally filtered by date range
 */
export async function getWorkstreamsByUserIdWithDateFilter(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  includeArchived = false,
): Promise<Workstream[]> {
  // If no dates provided, return all workstreams (backward compatible)
  if (!startDate && !endDate) {
    return getWorkstreamsByUserId(userId, includeArchived);
  }

  // Get filtered workstream IDs and counts
  const { workstreamIds } = await getWorkstreamCountsWithDateFilter(
    userId,
    startDate,
    endDate,
  );

  // If no workstreams have achievements in range, return empty array
  if (workstreamIds.length === 0) {
    return [];
  }

  // Fetch workstreams matching the IDs
  const conditions = [
    eq(workstream.userId, userId),
    inArray(workstream.id, workstreamIds),
  ];

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
