import { insertCreditTransaction } from '@bragdoc/database';
import type { OperationType, FeatureType } from '@bragdoc/database/schema';

export interface LogCreditTransactionInput {
  userId: string;
  amount: number;
  operation: OperationType;
  featureType: FeatureType;
  metadata?: {
    documentId?: string;
    documentType?: string;
    errorMessage?: string;
    refundReason?: string;
    [key: string]: unknown;
  };
}

/**
 * Log a credit transaction to the database for audit trail.
 *
 * IMPORTANT: Never include PII (email, name, password) in metadata.
 * Only include IDs and operation context.
 */
export async function logCreditTransaction(
  input: LogCreditTransactionInput,
): Promise<void> {
  try {
    await insertCreditTransaction({
      userId: input.userId,
      amount: input.amount,
      operation: input.operation,
      featureType: input.featureType,
      metadata: input.metadata,
    });
  } catch (error) {
    // Log to console but don't fail the operation
    // Credit logging is secondary to the actual feature
    console.error('Failed to log credit transaction:', {
      userId: input.userId,
      operation: input.operation,
      featureType: input.featureType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
