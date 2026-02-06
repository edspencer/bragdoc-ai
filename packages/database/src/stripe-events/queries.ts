import { db } from '../index';
import { stripeEvent } from '../schema';
import { eq } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';

type DrizzleTx = PgTransaction<any, any, any>;

/**
 * Check if a Stripe event has already been processed.
 * Use this BEFORE processing any webhook to prevent duplicate handling.
 */
export async function checkEventProcessed(eventId: string): Promise<boolean> {
  const existing = await db
    .select({ id: stripeEvent.id })
    .from(stripeEvent)
    .where(eq(stripeEvent.id, eventId))
    .limit(1);

  return existing.length > 0;
}

/**
 * Record a processed Stripe event within a transaction.
 * Call this at the START of the transaction (before business logic)
 * so the insert acts as an idempotency lock.
 */
export async function recordProcessedEvent(
  tx: DrizzleTx,
  eventId: string,
  eventType: string,
): Promise<void> {
  await tx.insert(stripeEvent).values({
    id: eventId,
    type: eventType,
  });
}
