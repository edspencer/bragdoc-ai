import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db as defaultDb } from '../index';
import {
  standup,
  standupDocument,
  type Standup,
  type StandupDocument,
  achievement,
  type Achievement,
} from '../schema';

/**
 * Get all standups for a user
 */
export async function getStandupsByUserId(
  userId: string,
  dbInstance = defaultDb,
): Promise<Standup[]> {
  try {
    return await dbInstance
      .select()
      .from(standup)
      .where(eq(standup.userId, userId))
      .orderBy(desc(standup.createdAt));
  } catch (error) {
    console.error('Error in getStandupsByUserId:', error);
    throw error;
  }
}

/**
 * Get a single standup by ID (with user verification)
 */
export async function getStandupById(
  id: string,
  userId: string,
  dbInstance = defaultDb,
): Promise<Standup | null> {
  try {
    const standups = await dbInstance
      .select()
      .from(standup)
      .where(and(eq(standup.id, id), eq(standup.userId, userId)));

    return standups[0] || null;
  } catch (error) {
    console.error('Error in getStandupById:', error);
    throw error;
  }
}

/**
 * Create a new standup
 */
export async function createStandup(
  data: {
    userId: string;
    name: string;
    companyId?: string | null;
    projectIds?: string[];
    daysMask: number;
    meetingTime: string;
    timezone: string;
    startDate?: string;
    enabled?: boolean;
    description?: string;
    instructions?: string;
  },
  dbInstance = defaultDb,
): Promise<Standup> {
  try {
    const [newStandup] = await dbInstance
      .insert(standup)
      .values({
        userId: data.userId,
        name: data.name,
        companyId: data.companyId || null,
        projectIds: data.projectIds || null,
        daysMask: data.daysMask,
        meetingTime: data.meetingTime,
        timezone: data.timezone,
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        enabled: data.enabled !== undefined ? data.enabled : true,
        description: data.description || null,
        instructions: data.instructions || null,
      })
      .returning();

    if (!newStandup) {
      throw new Error('Failed to create standup');
    }

    return newStandup;
  } catch (error) {
    console.error('Error in createStandup:', error);
    throw error;
  }
}

/**
 * Update a standup
 */
export async function updateStandup(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    companyId: string | null;
    projectIds: string[];
    daysMask: number;
    meetingTime: string;
    timezone: string;
    startDate: string;
    enabled: boolean;
    description: string;
    instructions: string;
  }>,
  dbInstance = defaultDb,
): Promise<Standup> {
  try {
    const [updatedStandup] = await dbInstance
      .update(standup)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(standup.id, id), eq(standup.userId, userId)))
      .returning();

    if (!updatedStandup) {
      throw new Error('Standup not found or unauthorized');
    }

    return updatedStandup;
  } catch (error) {
    console.error('Error in updateStandup:', error);
    throw error;
  }
}

/**
 * Delete a standup
 */
export async function deleteStandup(
  id: string,
  userId: string,
  dbInstance = defaultDb,
): Promise<void> {
  try {
    const result = await dbInstance
      .delete(standup)
      .where(and(eq(standup.id, id), eq(standup.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error('Standup not found or unauthorized');
    }
  } catch (error) {
    console.error('Error in deleteStandup:', error);
    throw error;
  }
}

/**
 * Get standup documents for a standup
 */
export async function getStandupDocumentsByStandupId(
  standupId: string,
  limit = 10,
  dbInstance = defaultDb,
): Promise<StandupDocument[]> {
  try {
    return await dbInstance
      .select()
      .from(standupDocument)
      .where(eq(standupDocument.standupId, standupId))
      .orderBy(desc(standupDocument.date))
      .limit(limit);
  } catch (error) {
    console.error('Error in getStandupDocumentsByStandupId:', error);
    throw error;
  }
}

/**
 * Get the most recent standup document for a standup
 */
export async function getCurrentStandupDocument(
  standupId: string,
  dbInstance = defaultDb,
): Promise<StandupDocument | null> {
  try {
    const now = new Date();
    const docs = await dbInstance
      .select()
      .from(standupDocument)
      .where(
        and(
          eq(standupDocument.standupId, standupId),
          gte(standupDocument.date, now),
        ),
      )
      .orderBy(desc(standupDocument.date))
      .limit(1);

    return docs[0] || null;
  } catch (error) {
    console.error('Error in getCurrentStandupDocument:', error);
    throw error;
  }
}

/**
 * Create a new standup document
 */
export async function createStandupDocument(
  data: {
    standupId: string;
    userId: string;
    date: Date;
    wip?: string;
    achievementsSummary?: string;
  },
  dbInstance = defaultDb,
): Promise<StandupDocument> {
  try {
    const [doc] = await dbInstance
      .insert(standupDocument)
      .values({
        standupId: data.standupId,
        userId: data.userId,
        date: data.date,
        wip: data.wip || null,
        achievementsSummary: data.achievementsSummary || null,
      })
      .returning();

    if (!doc) {
      throw new Error('Failed to create standup document');
    }

    return doc;
  } catch (error) {
    console.error('Error in createStandupDocument:', error);
    throw error;
  }
}

/**
 * Update standup document WIP
 */
export async function updateStandupDocumentWip(
  documentId: string,
  wip: string,
  dbInstance = defaultDb,
): Promise<StandupDocument> {
  try {
    const [updated] = await dbInstance
      .update(standupDocument)
      .set({
        wip,
        updatedAt: new Date(),
      })
      .where(eq(standupDocument.id, documentId))
      .returning();

    if (!updated) {
      throw new Error('Standup document not found');
    }

    return updated;
  } catch (error) {
    console.error('Error in updateStandupDocumentWip:', error);
    throw error;
  }
}

/**
 * Update standup document achievements summary
 */
export async function updateStandupDocumentAchievementsSummary(
  documentId: string,
  achievementsSummary: string,
  dbInstance = defaultDb,
): Promise<StandupDocument> {
  try {
    const [updated] = await dbInstance
      .update(standupDocument)
      .set({
        achievementsSummary,
        updatedAt: new Date(),
      })
      .where(eq(standupDocument.id, documentId))
      .returning();

    if (!updated) {
      throw new Error('Standup document not found');
    }

    return updated;
  } catch (error) {
    console.error('Error in updateStandupDocumentAchievementsSummary:', error);
    throw error;
  }
}

/**
 * Get recent achievements for a standup based on its configuration
 * Filters by eventStart within the date range and by the standup's configured projects
 */
export async function getRecentAchievementsForStandup(
  standupConfig: Standup,
  startDate: Date,
  endDate: Date,
  dbInstance = defaultDb,
): Promise<Achievement[]> {
  try {
    // Build where conditions based on standup config
    const conditions = [
      eq(achievement.userId, standupConfig.userId),
      gte(achievement.eventStart, startDate),
      lte(achievement.eventStart, endDate),
    ];

    // Filter by company or projects
    if (standupConfig.companyId) {
      conditions.push(eq(achievement.companyId, standupConfig.companyId));
    } else if (
      standupConfig.projectIds &&
      standupConfig.projectIds.length > 0
    ) {
      // For project filtering, we need to use SQL's IN operator
      // This is a bit complex with drizzle, so we'll use a workaround
      // We'll fetch all and filter in memory (for now)
      const allAchievements = await dbInstance
        .select()
        .from(achievement)
        .where(and(...conditions))
        .orderBy(desc(achievement.eventStart));

      return allAchievements.filter((a) =>
        standupConfig.projectIds?.includes(a.projectId || ''),
      );
    }

    // Fetch achievements
    return await dbInstance
      .select()
      .from(achievement)
      .where(and(...conditions))
      .orderBy(desc(achievement.eventStart));
  } catch (error) {
    console.error('Error in getRecentAchievementsForStandup:', error);
    throw error;
  }
}
