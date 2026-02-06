import { db } from '../index';
import { creditTransaction } from '../schema';
import type { OperationType, FeatureType } from '../schema';
import { eq, desc } from 'drizzle-orm';

export interface CreditTransactionInput {
  userId: string;
  amount: number;
  operation: OperationType;
  featureType: FeatureType;
  metadata?: Record<string, unknown>;
}

export async function insertCreditTransaction(input: CreditTransactionInput) {
  const [result] = await db
    .insert(creditTransaction)
    .values({
      userId: input.userId,
      amount: input.amount,
      operation: input.operation,
      featureType: input.featureType,
      metadata: input.metadata ?? null,
    })
    .returning();
  return result;
}

export async function getCreditTransactionsByUser(userId: string, limit = 50) {
  return db
    .select()
    .from(creditTransaction)
    .where(eq(creditTransaction.userId, userId))
    .orderBy(desc(creditTransaction.createdAt))
    .limit(limit);
}
