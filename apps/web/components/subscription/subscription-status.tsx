'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCreditStatus } from '@/components/credit-status';
import { IconCrown, IconCalendar } from '@tabler/icons-react';

/**
 * SubscriptionStatus Component
 *
 * Displays the user's current subscription status on the account page.
 * Shows different content based on subscription type:
 * - Lifetime: Crown badge, "set forever" message
 * - Yearly: Annual Plan badge, days until renewal, manage link
 * - Free: Free Plan badge, credits/messages remaining, upgrade button
 * - Demo: Demo Mode badge, full access message
 *
 * @example
 * ```tsx
 * // In account page
 * <SubscriptionStatus />
 * ```
 */
export function SubscriptionStatus() {
  const { status, isLoading } = useCreditStatus();

  // Loading state
  if (isLoading || !status) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  // Lifetime subscription
  if (status.subscriptionType === 'lifetime') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
              <IconCrown className="size-3 mr-1" />
              Lifetime Access
            </Badge>
            <span className="text-sm text-muted-foreground">
              No renewal needed - you're set forever!
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Yearly subscription
  if (status.subscriptionType === 'yearly') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Annual Plan</Badge>
            <span className="text-sm text-muted-foreground">
              <IconCalendar className="inline size-3 mr-1" />
              {status.daysRemaining} days until renewal
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/stripe/portal">Manage Subscription</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Demo mode
  if (status.subscriptionType === 'demo') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline">Demo Mode</Badge>
            <span className="text-sm text-muted-foreground">
              Full access for demonstration
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Free plan (default)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Your current plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Free Plan</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>{status.freeCredits} credits remaining</p>
          <p>{status.freeChatMessages} chat messages remaining</p>
        </div>
        <Button asChild>
          <a href="/upgrade">Upgrade to Unlimited</a>
        </Button>
      </CardContent>
    </Card>
  );
}
