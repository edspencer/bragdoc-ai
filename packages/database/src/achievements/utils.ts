import { db } from '../index';
import { userMessage, achievement } from '../schema';
import { eq, and, notExists, isNull } from 'drizzle-orm';
import type { CreateAchievementRequest } from '../types/achievement';

/**
 * Detects if an error is a unique constraint violation on the achievement table
 * PostgreSQL error code 23505 indicates unique constraint violations
 */
function isUniqueConstraintViolation(error: any): boolean {
  // Check if error is directly a PostgreSQL error
  if (error.code === '23505') {
    return true;
  }
  // Check if error detail mentions our constraint
  if (error.detail?.includes('achievement_project_source_unique')) {
    return true;
  }
  // Check if error is wrapped (e.g., DrizzleQueryError) with cause
  if (error.cause?.code === '23505') {
    return true;
  }
  if (error.cause?.detail?.includes('achievement_project_source_unique')) {
    return true;
  }
  // Check constraint_name in error cause
  if (error.cause?.constraint_name === 'achievement_project_source_unique') {
    return true;
  }
  return false;
}

/**
 * Creates a system user message for manually created achievements
 * This is useful for maintaining a consistent history of achievement creation
 */
export async function createSystemUserMessage(
  userId: string,
  title: string,
  summary?: string,
) {
  const message = `Created achievement: ${title}${summary ? `\n${summary}` : ''}`;

  return await db
    .insert(userMessage)
    .values({
      userId,
      originalText: message,
    })
    .returning()
    .then((rows) => rows[0]);
}

/**
 * Creates a new achievement, or returns existing achievement if duplicate.
 *
 * Supports idempotent creation: submitting the same (projectId, uniqueSourceId) pair
 * multiple times will return the existing achievement instead of throwing an error.
 * This is essential for CLI tools that may retry or replay achievement creation.
 *
 * Only applies partial unique constraint when both projectId and uniqueSourceId
 * are provided. Manual achievements without these fields can be created multiple times.
 *
 * @param userId - User who owns the achievement (always scoped for security)
 * @param data - Achievement creation data (may include projectId, uniqueSourceId)
 * @param source - Achievement source ('manual', 'commit', 'llm')
 * @param userMessageId - Optional reference to original user message
 * @returns Achievement record (newly created or existing if duplicate)
 * @throws Error if database operation fails (non-duplicate errors)
 */
export async function createAchievement(
  userId: string,
  data: CreateAchievementRequest,
  source: 'llm' | 'manual' | 'commit' = 'manual',
  userMessageId?: string,
) {
  // If no userMessageId is provided and it's a manual creation,
  // create a system message
  const messageId =
    userMessageId ||
    (source === 'manual'
      ? (
          await createSystemUserMessage(
            userId,
            data.title,
            data.summary ?? undefined,
          )
        )?.id
      : undefined);

  try {
    return await db
      .insert(achievement)
      .values({
        ...data,
        userId,
        userMessageId: messageId,
        source,
      })
      .returning()
      .then((rows) => rows[0]);
  } catch (error: any) {
    // Check if this is a unique constraint violation on (projectId, uniqueSourceId)
    if (isUniqueConstraintViolation(error)) {
      // Only handle if we have both projectId and uniqueSourceId
      if (data.projectId && data.uniqueSourceId) {
        // Query for the existing achievement
        const existing = await db
          .select()
          .from(achievement)
          .where(
            and(
              eq(achievement.userId, userId),
              eq(achievement.projectId, data.projectId),
              eq(achievement.uniqueSourceId, data.uniqueSourceId),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (existing) {
          // Log the duplicate attempt
          console.log(
            `Duplicate achievement detected for user ${userId} in project ${data.projectId} with uniqueSourceId ${data.uniqueSourceId}`,
          );
          return existing;
        }
      }
    }

    // Re-throw all other errors
    throw error;
  }
}

/**
 * Validates data consistency between achievements and user messages
 */
export async function validateAchievementData(userId: string) {
  // Find achievements with invalid userMessageIds
  const invalidMessageIds = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        eq(achievement.source, 'llm'),
        notExists(
          db
            .select()
            .from(userMessage)
            .where(eq(userMessage.id, achievement.userMessageId)),
        ),
      ),
    );

  return {
    invalidMessageIds: invalidMessageIds.map((b) => b.id),
    total: invalidMessageIds.length,
  };
}

/**
 * Creates missing user messages for existing achievements
 */
export async function createMissingUserMessages(userId: string) {
  const achievements = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        eq(achievement.source, 'manual'),
        isNull(achievement.userMessageId),
      ),
    );

  const results = await Promise.all(
    achievements.map(async (achievementRow) => {
      const message = await createSystemUserMessage(
        userId,
        achievementRow.title,
        achievementRow.summary ?? undefined,
      );

      await db
        .update(achievement)
        .set({ userMessageId: message?.id })
        .where(eq(achievement.id, achievementRow.id));

      return achievementRow.id;
    }),
  );

  return {
    updatedIds: results,
    total: results.length,
  };
}
