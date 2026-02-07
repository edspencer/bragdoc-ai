'use client';

import { Button, type buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { useCreditStatus } from './credit-status-provider';
import type { VariantProps } from 'class-variance-authority';

/**
 * CreditGatedButton Props
 *
 * Extends standard button props with credit gating options.
 */
interface CreditGatedButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Number of credits required to enable the button (default: 1) */
  creditsRequired?: number;
  /** Whether this action requires a chat message (default: false) */
  requiresChatMessage?: boolean;
  /** Content to render inside the button */
  children: React.ReactNode;
  /** Whether to use Radix Slot for composition (passed to Button) */
  asChild?: boolean;
}

/**
 * CreditGatedButton Component
 *
 * A button that disables with a tooltip when the user has insufficient
 * credits or chat messages. Clicking the disabled button opens the upgrade modal.
 *
 * For unlimited (paid/demo) users, renders as a normal button.
 *
 * @example
 * ```tsx
 * // Credit-gated generate button
 * <CreditGatedButton creditsRequired={1} onClick={handleGenerate}>
 *   Generate Document
 * </CreditGatedButton>
 *
 * // Chat message gated
 * <CreditGatedButton requiresChatMessage onClick={handleSend}>
 *   Send Message
 * </CreditGatedButton>
 * ```
 */
export function CreditGatedButton({
  creditsRequired = 1,
  requiresChatMessage = false,
  children,
  disabled,
  onClick,
  ...props
}: CreditGatedButtonProps) {
  const { status, showUpgradeModal } = useCreditStatus();

  // For unlimited users, render normal button
  if (status?.isUnlimited) {
    return (
      <Button disabled={disabled} onClick={onClick} {...props}>
        {children}
      </Button>
    );
  }

  // Calculate if user is blocked
  const hasSufficientCredits =
    !creditsRequired || (status?.freeCredits ?? 0) >= creditsRequired;
  const hasSufficientMessages =
    !requiresChatMessage || (status?.freeChatMessages ?? 0) > 0;
  const isBlocked = !hasSufficientCredits || !hasSufficientMessages;

  // If not blocked, render normal button
  if (!isBlocked) {
    return (
      <Button disabled={disabled} onClick={onClick} {...props}>
        {children}
      </Button>
    );
  }

  // Blocked state - show tooltip and open upgrade modal on click
  const tooltipText = !hasSufficientCredits
    ? `Requires ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''}. Upgrade for unlimited access.`
    : 'No chat messages remaining. Upgrade for unlimited access.';

  const handleBlockedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    showUpgradeModal(!hasSufficientCredits ? 'credits' : 'messages');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            disabled={true}
            onClick={handleBlockedClick}
            aria-disabled="true"
            {...props}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
