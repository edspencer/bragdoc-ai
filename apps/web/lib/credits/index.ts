/**
 * Credit System Module
 *
 * Provides atomic credit deduction and reservation utilities for
 * race-condition-safe credit operations in LLM-powered features.
 *
 * @example
 * ```typescript
 * import {
 *   CREDIT_COSTS,
 *   getDocumentCost,
 *   withCreditReservation,
 *   InsufficientCreditsError
 * } from '@/lib/credits';
 *
 * // Get cost for a document type
 * const cost = getDocumentCost('performance_review'); // 2
 *
 * // Execute operation with credit reservation
 * try {
 *   const result = await withCreditReservation(userId, cost, async () => {
 *     return await generateDocument();
 *   });
 * } catch (error) {
 *   if (error instanceof InsufficientCreditsError) {
 *     // Handle insufficient credits
 *   }
 * }
 * ```
 */

// Credit cost configuration
export { CREDIT_COSTS, getDocumentCost, type DocumentType } from './costs';

// Atomic credit operations
export {
  deductCredits,
  refundCredits,
  deductChatMessage,
  withCreditReservation,
} from './operations';

// Credit checking utilities
export {
  checkUserCredits,
  checkUserChatMessages,
  type CreditCheckResult,
  type ChatMessageCheckResult,
} from './check';

// Transaction logging
export { logCreditTransaction, type LogCreditTransactionInput } from './logger';

// Error classes
export {
  InsufficientCreditsError,
  InsufficientChatMessagesError,
} from './errors';
