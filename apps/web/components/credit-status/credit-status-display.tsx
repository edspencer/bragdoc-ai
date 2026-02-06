'use client';

import { useCreditStatus } from './credit-status-provider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SidebarGroup, SidebarGroupContent } from '@/components/ui/sidebar';

/**
 * Credit Status Display Component
 *
 * Shows credit/message counters for free users or "Unlimited Access" badge for paid/demo users.
 * Designed to be placed in the sidebar footer.
 */
export function CreditStatusDisplay() {
  const { status, isLoading, showUpgradeModal } = useCreditStatus();

  // Don't show loading skeleton in sidebar
  if (isLoading) {
    return null;
  }

  // No status available
  if (!status) {
    return null;
  }

  // Paid/demo users see "Unlimited Access" badge
  if (status.isUnlimited) {
    return (
      <SidebarGroup>
        <SidebarGroupContent className="flex justify-center px-2">
          <Badge variant="secondary">Unlimited Access</Badge>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Free users see credit/message counters
  const isLowCredits = status.freeCredits <= 2;
  const isLowMessages = status.freeChatMessages <= 3;
  const showUpgradeLink = isLowCredits || isLowMessages;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="space-y-3 px-2">
        {/* Credits section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Credits</span>
            <span className="font-medium">{status.freeCredits}/10</span>
          </div>
          <Progress value={(status.freeCredits / 10) * 100} className="h-1.5" />
        </div>

        {/* Messages section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Chat Messages</span>
            <span className="font-medium">{status.freeChatMessages}/20</span>
          </div>
          <Progress
            value={(status.freeChatMessages / 20) * 100}
            className="h-1.5"
          />
        </div>

        {/* Upgrade link when low */}
        {showUpgradeLink && (
          <button
            type="button"
            onClick={() => showUpgradeModal('credits')}
            className="w-full text-center text-xs text-primary hover:underline"
          >
            Upgrade for unlimited
          </button>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
