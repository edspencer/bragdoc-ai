import { db } from '@/lib/db';
import { userMessage, achievement } from '@/lib/db/schema';
import { eq, and, notExists, isNull } from 'drizzle-orm';
import type { CreateAchievementRequest } from '@/lib/types/achievement';

/**
 * Creates a system user message for manually created achievements
 * This is useful for maintaining a consistent history of achievement creation
 */
export async function createSystemUserMessage(
  userId: string,
  title: string,
  summary?: string
) {
  const message = `Created achievement: ${title}${summary ? `\n${summary}` : ''}`;
  
  return await db.insert(userMessage).values({
    userId,
    originalText: message,
  }).returning().then(rows => rows[0]);
}

/**
 * Creates a new achievement with proper source tracking
 */
export async function createAchievement(
  userId: string,
  data: CreateAchievementRequest,
  source: 'llm' | 'manual' = 'manual',
  userMessageId?: string
) {
  // If no userMessageId is provided and it's a manual creation,
  // create a system message
  const messageId = userMessageId || (source === 'manual' 
    ? (await createSystemUserMessage(userId, data.title, data.summary ?? undefined))?.id 
    : undefined);

  return await db.insert(achievement).values({
    ...data,
    userId,
    userMessageId: messageId,
    source,
  }).returning().then(rows => rows[0]);
}

/**
 * Validates data consistency between achievements and user messages
 */
export async function validateAchievementData(userId: string) {
  // Find achievements with invalid userMessageIds
  const invalidMessageIds = await db.select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        eq(achievement.source, 'llm'),
        notExists(
          db.select()
            .from(userMessage)
            .where(eq(userMessage.id, achievement.userMessageId))
        )
      )
    );

  return {
    invalidMessageIds: invalidMessageIds.map(b => b.id),
    total: invalidMessageIds.length,
  };
}

/**
 * Creates missing user messages for existing achievements
 */
export async function createMissingUserMessages(userId: string) {
  const achievements = await db.select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        eq(achievement.source, 'manual'),
        isNull(achievement.userMessageId)
      )
    );

  const results = await Promise.all(
    achievements.map(async (achievementRow) => {
      const message = await createSystemUserMessage(
        userId,
        achievementRow.title,
        achievementRow.summary ?? undefined
      );

      await db
        .update(achievement)
        .set({ userMessageId: message.id })
        .where(eq(achievement.id, achievementRow.id));

      return achievementRow.id;
    })
  );

  return {
    updatedIds: results,
    total: results.length,
  };
}
