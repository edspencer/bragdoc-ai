/**
 * Atomic Credit Operations
 *
 * Race-condition-safe credit deduction and refund functions.
 * Uses Drizzle's sql template with conditional WHERE and RETURNING
 * to ensure atomic updates that prevent double-spending.
 */

import { sql, eq, and, gte } from 'drizzle-orm';
import { db, user } from '@bragdoc/database';
import type { UserLevel } from '@bragdoc/database';
import { InsufficientCreditsError } from './errors';

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
 * Atomically refund credits to a user's balance
 *
 * Used when a credit-consuming operation fails after deduction.
 * Refunds always succeed - there's no condition to fail.
 *
 * @param userId - The user's ID
 * @param amount - Number of credits to refund
 * @returns Object with success status and new balance
 */
export async function refundCredits(
  userId: string,
  amount: number,
): Promise<{ success: boolean; remaining: number }> {
  const [updated] = await db
    .update(user)
    .set({
      freeCredits: sql`COALESCE(${user.freeCredits}, 0) + ${amount}`,
    })
    .where(eq(user.id, userId))
    .returning();

  if (!updated) {
    // User not found - shouldn't happen in practice
    return { success: false, remaining: 0 };
  }

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

/**
 * Execute an operation with credit reservation
 *
 * Implements the reserve-execute-refund pattern for streaming LLM operations:
 * 1. Deduct credits upfront (atomic)
 * 2. Execute the operation
 * 3. If operation fails, refund credits and rethrow error
 *
 * @param userId - The user's ID
 * @param creditCost - Number of credits to reserve
 * @param operation - Async operation to execute
 * @returns The result of the operation
 * @throws InsufficientCreditsError if user lacks credits
 * @throws The original error if operation fails (after refunding credits)
 */
export async function withCreditReservation<T>(
  userId: string,
  creditCost: number,
  operation: () => Promise<T>,
): Promise<T> {
  // 1. Reserve credits (atomic deduct)
  const reservation = await deductCredits(userId, creditCost);
  if (!reservation.success) {
    throw new InsufficientCreditsError(creditCost, reservation.remaining ?? 0);
  }

  try {
    // 2. Execute the operation
    return await operation();
  } catch (error) {
    // 3. Refund credits on failure
    await refundCredits(userId, creditCost);
    throw error;
  }
}
