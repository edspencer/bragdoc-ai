/**
 * Credit System Module
 *
 * Provides atomic credit deduction utilities for race-condition-safe
 * credit operations in LLM-powered features.
 *
 * @example
 * ```typescript
 * import {
 *   CREDIT_COSTS,
 *   checkUserCredits,
 *   deductCredits,
 * } from '@/lib/credits';
 *
 * // Check credits before operation
 * const { hasCredits } = checkUserCredits(user, CREDIT_COSTS.document_generation);
 * if (!hasCredits) {
 *   return Response.json({ error: 'insufficient_credits' }, { status: 402 });
 * }
 *
 * // Atomically deduct credits
 * const { success } = await deductCredits(userId, CREDIT_COSTS.document_generation);
 * ```
 */

// Credit cost configuration
export { CREDIT_COSTS, getDocumentCost, type DocumentType } from './costs';

// Atomic credit operations
export { deductCredits, deductChatMessage } from './operations';

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
