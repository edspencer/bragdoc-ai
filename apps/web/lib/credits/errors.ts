/**
 * Credit-Related Error Classes
 *
 * Custom error types for credit-gated operations.
 * These errors are caught by feature gates to provide user-friendly messages.
 */

/**
 * Thrown when a user attempts an operation requiring more credits than available
 */
export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available?: number,
  ) {
    super(
      `Insufficient credits. Required: ${required}${available !== undefined ? `, Available: ${available}` : ''}`,
    );
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * Thrown when a free user has exhausted their 20 free chat messages
 */
export class InsufficientChatMessagesError extends Error {
  constructor() {
    super("You've used all 20 free messages. Upgrade for unlimited chat.");
    this.name = 'InsufficientChatMessagesError';
  }
}
