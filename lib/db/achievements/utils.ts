import { db } from '@/lib/db';
import { userMessage, brag } from '@/lib/db/schema';
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

  return await db.insert(brag).values({
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
    .from(brag)
    .where(
      and(
        eq(brag.userId, userId),
        eq(brag.source, 'llm'),
        notExists(
          db.select()
            .from(userMessage)
            .where(eq(userMessage.id, brag.userMessageId))
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
    .from(brag)
    .where(
      and(
        eq(brag.userId, userId),
        eq(brag.source, 'manual'),
        isNull(brag.userMessageId)
      )
    );

  const results = await Promise.all(
    achievements.map(async (achievement) => {
      const message = await createSystemUserMessage(
        userId,
        achievement.title,
        achievement.summary ?? undefined
      );

      await db.update(brag)
        .set({ userMessageId: message.id })
        .where(eq(brag.id, achievement.id));

      return achievement.id;
    })
  );

  return {
    updated: results,
    total: results.length,
  };
}
