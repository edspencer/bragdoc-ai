'use client';

import { Badge } from '@/components/ui/badge';
import { useCreditStatus } from './credit-status-provider';

/**
 * ChatMessageCounter Component
 *
 * Displays the remaining chat message count for free users.
 * Hidden for unlimited (paid/demo) users.
 *
 * @example
 * ```tsx
 * <CardTitle>Refine with AI</CardTitle>
 * <ChatMessageCounter />
 * ```
 */
export function ChatMessageCounter() {
  const { status } = useCreditStatus();

  // Don't show counter for unlimited users or while loading
  if (!status || status.isUnlimited) {
    return null;
  }

  const remaining = status.freeChatMessages;
  const isLow = remaining <= 3;

  return (
    <Badge variant={isLow ? 'destructive' : 'secondary'} className="text-xs">
      {remaining}/20 messages
    </Badge>
  );
}
