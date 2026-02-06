import type { User } from '@bragdoc/database/schema';

export interface CreditCheckResult {
  hasCredits: boolean;
  remainingCredits: number;
  isUnlimited: boolean;
}

export interface ChatMessageCheckResult {
  hasMessages: boolean;
  remainingMessages: number;
  isUnlimited: boolean;
}

/**
 * Check if user has sufficient credits for an operation.
 * Paid and demo users always have unlimited credits.
 */
export function checkUserCredits(
  user: User,
  requiredCredits: number,
): CreditCheckResult {
  // Paid and demo users have unlimited credits
  if (user.level === 'paid' || user.level === 'demo') {
    return {
      hasCredits: true,
      remainingCredits: Infinity,
      isUnlimited: true,
    };
  }

  // Free users: check actual balance
  // Use nullish coalescing for existing users (NULL means never initialized = default 10)
  const credits = user.freeCredits ?? 10;

  return {
    hasCredits: credits >= requiredCredits,
    remainingCredits: credits,
    isUnlimited: false,
  };
}

/**
 * Check if user has remaining chat messages.
 * Paid and demo users always have unlimited messages.
 */
export function checkUserChatMessages(user: User): ChatMessageCheckResult {
  // Paid and demo users have unlimited messages
  if (user.level === 'paid' || user.level === 'demo') {
    return {
      hasMessages: true,
      remainingMessages: Infinity,
      isUnlimited: true,
    };
  }

  // Free users: check actual balance
  // Use nullish coalescing for existing users (NULL means never initialized = default 20)
  const messages = user.freeChatMessages ?? 20;

  return {
    hasMessages: messages > 0,
    remainingMessages: messages,
    isUnlimited: false,
  };
}
