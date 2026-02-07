/**
 * Atomic Credit Operations
 *
 * Race-condition-safe credit deduction functions.
 * Uses Drizzle's sql template with conditional WHERE and RETURNING
 * to ensure atomic updates that prevent double-spending.
 */

import { sql, eq, and, gte } from 'drizzle-orm';
import { db, user } from '@bragdoc/database';
import type { UserLevel } from '@bragdoc/database';

/**
 * Atomically deduct credits from a user's balance
 *
 * Uses a single UPDATE with WHERE condition to ensure atomic operation.
 * If the user has insufficient credits, no update occurs and success is false.
 *
 * @param userId - The user's ID
 * @param amount - Number of credits to deduct
 * @returns Object with success status and remaining credits (null if failed)
 */
export async function deductCredits(
  userId: string,
  amount: number,
): Promise<{ success: boolean; remaining: number | null }> {
  const [updated] = await db
    .update(user)
    .set({
      freeCredits: sql`${user.freeCredits} - ${amount}`,
    })
    .where(and(eq(user.id, userId), gte(user.freeCredits, amount)))
    .returning();

  if (!updated) {
    // WHERE condition not met - insufficient credits
    return { success: false, remaining: null };
  }

  // freeCredits can be null for legacy users, but after deduction it should always have a value
  return { success: true, remaining: updated.freeCredits ?? 0 };
}

/**
 * Atomically deduct a chat message from a free user's allowance
 *
 * Paid and demo users bypass this check entirely - they have unlimited messages.
 * For free users, uses atomic decrement with WHERE condition.
 *
 * @param userId - The user's ID
 * @param userLevel - The user's subscription level
 * @returns Object with success status and remaining messages (null = unlimited)
 */
export async function deductChatMessage(
  userId: string,
  userLevel: UserLevel,
): Promise<{ success: boolean; remaining: number | null }> {
  // Paid and demo users have unlimited messages
  if (userLevel === 'paid' || userLevel === 'demo') {
    return { success: true, remaining: null };
  }

  const [updated] = await db
    .update(user)
    .set({
      freeChatMessages: sql`${user.freeChatMessages} - 1`,
    })
    .where(and(eq(user.id, userId), gte(user.freeChatMessages, 1)))
    .returning();

  if (!updated) {
    // No free messages remaining
    return { success: false, remaining: 0 };
  }

  // freeChatMessages can be null for legacy users, but after deduction it should always have a value
  return { success: true, remaining: updated.freeChatMessages ?? 0 };
}
