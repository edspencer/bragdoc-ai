# Payment Support Implementation Plan

## Summary

This plan outlines the implementation of a simplified two-tier payment system (Free vs Paid) using Stripe subscriptions for BragDoc. The current three-tier system (free/basic/pro) with complex feature gates will be replaced with a single paid tier available at two price points: $5/month or $45/year.

Key changes include:
- Database schema updates to track subscription status via `paidUntil` timestamp
- Simplified Stripe product structure (1 product, 2 prices instead of 2 products, 4 prices)
- Updated webhook handling for subscription lifecycle events
- New helper functions for payment status checks that respect open source mode
- UI components for upgrade prompts, navigation badges, and subscription management
- Integration with Stripe Customer Portal for subscription management

The implementation respects the `PAYMENT_TOKEN_REQUIRED` environment variable, allowing self-hosted open source installations to bypass all payment gates.

## High-Level Overview

1. **Database Migration** - Update User schema to add `paidUntil`, simplify `level` enum, and deprecate old columns
2. **Stripe Configuration** - Create new simplified product structure and update environment variables
3. **Webhook Handler Updates** - Modify callback logic to use new schema and subscription periods
4. **Helper Functions** - Implement payment status checking functions for server and client
5. **Authentication Updates** - Add `paidUntil` to NextAuth session/JWT
6. **UI Components** - Build UpgradeGate, UpgradeDialog, and navigation badges
7. **Account Page Updates** - Add subscription status section
8. **Customer Portal Integration** - Implement Stripe Customer Portal access
9. **Payment Gates** - Add payment checks to LLM-powered API endpoints
10. **Testing** - Update and create tests for new payment flow
11. **Cleanup** - Remove deprecated code and columns
12. **Documentation** - Update project documentation

## Table of Contents

- [Phase 1: Database Schema Migration](#phase-1-database-schema-migration)
- [Phase 2: Stripe Product Configuration](#phase-2-stripe-product-configuration)
- [Phase 3: Webhook Handler Updates](#phase-3-webhook-handler-updates)
- [Phase 4: Helper Functions](#phase-4-helper-functions)
- [Phase 5: Authentication Updates](#phase-5-authentication-updates)
- [Phase 6: Payment Gates Configuration](#phase-6-payment-gates-configuration)
- [Phase 7: UI Components](#phase-7-ui-components)
- [Phase 8: Account Page Updates](#phase-8-account-page-updates)
- [Phase 9: Customer Portal Integration](#phase-9-customer-portal-integration)
- [Phase 10: API Endpoint Payment Checks](#phase-10-api-endpoint-payment-checks)
- [Phase 11: Testing](#phase-11-testing)
- [Phase 12: Cleanup](#phase-12-cleanup)
- [Phase 13: Documentation](#phase-13-documentation)

---

## Phase 1: Database Schema Migration

### Context

The current User table in `packages/database/src/schema.ts` tracks subscription status using:
- `level`: enum with values ['free', 'basic', 'pro'] (lines 26, 61)
- `renewalPeriod`: enum with values ['monthly', 'yearly'] (lines 29, 62-64)
- `lastPayment`: timestamp (line 65)
- `stripeCustomerId`: varchar (line 68)

We need to simplify this to a two-tier system with a single timestamp that indicates when paid access expires. Since there are no paying customers yet (all users have `lastPayment=null`), we can treat this as a clean slate and remove the old columns immediately.

### Tasks

- [ ] 1.1. Update the `userLevelEnum` in `packages/database/src/schema.ts` (line 26) from `['free', 'basic', 'pro']` to `['free', 'paid']`

```typescript
export const userLevelEnum = pgEnum('user_level', ['free', 'paid']);
```

- [ ] 1.2. Remove the `renewalPeriodEnum` definition (lines 29-32) and its type export entirely

- [ ] 1.3. Add `paidUntil` column to User table in `packages/database/src/schema.ts` after line 65:

```typescript
paidUntil: timestamp('paid_until'),
```

- [ ] 1.4. Remove the `renewalPeriod` column definition (lines 62-64) entirely

- [ ] 1.5. Remove the `lastPayment` column definition (line 65) entirely

- [ ] 1.6. Generate a new migration by running `pnpm db:generate` from the root directory

- [ ] 1.7. Review the generated migration file in `packages/database/src/migrations/` to ensure it correctly:
  - Adds the `paidUntil` column as nullable timestamp
  - Drops the `renewalPeriod` column
  - Drops the `lastPayment` column
  - Alters the `level` enum to have only 'free' and 'paid' values
  - Drops the unused `renewalPeriodEnum` type

- [ ] 1.8. Apply the migration to the database: `pnpm db:push`

- [ ] 1.9. Verify migration by checking a few user records in the database to confirm:
  - All users have `level='free'`
  - All users have `paidUntil=null`
  - `renewalPeriod` and `lastPayment` columns are dropped

---

## Phase 2: Stripe Product Configuration

### Context

The current Stripe setup (in `apps/web/scripts/create-stripe-products.ts`) creates:
- Product 1: "Basic Bragger" with basic_monthly ($5) and basic_yearly ($30) prices
- Product 2: "Pro Bragger" with pro_monthly ($9) and pro_yearly ($90) prices

We need to simplify to:
- Single Product: "BragDoc Paid" with paid_monthly ($5) and paid_yearly ($45) prices

The script uses lookup keys to identify prices in webhooks, so we'll use cleaner naming: `paid_monthly` and `paid_yearly`.

### Tasks

- [ ] 2.1. Update `apps/web/scripts/create-stripe-products.ts` to define only one product:

```typescript
const products = [
  {
    id: 'bragdoc_paid',
    name: 'BragDoc Paid',
    description: 'Full access to AI-powered achievement tracking and document generation',
    tax_code: 'txcd_10000000', // Standard tax code for software
  },
];
```

- [ ] 2.2. Update the prices array in the same file:

```typescript
const prices = [
  {
    productId: 'bragdoc_paid',
    unitAmount: 500,        // $5.00 in cents
    interval: 'month',
    lookupKey: 'paid_monthly',
  },
  {
    productId: 'bragdoc_paid',
    unitAmount: 4500,       // $45.00 in cents
    interval: 'year',
    lookupKey: 'paid_yearly',
  },
];
```

- [ ] 2.3. Run the script in test mode to create products in Stripe test environment:
  ```bash
  STRIPE_SECRET_KEY=sk_test_... node apps/web/scripts/create-stripe-products.ts
  ```

- [ ] 2.4. Note the price IDs returned by the script (they'll look like `price_xxxxx`)

- [ ] 2.5. Update environment variables in `.env` (or your deployment environment):
  ```bash
  NEXT_PUBLIC_PAID_MONTHLY_PRICE_ID=price_xxxxx  # From step 2.4
  NEXT_PUBLIC_PAID_YEARLY_PRICE_ID=price_xxxxx   # From step 2.4
  ```

- [ ] 2.6. Remove old environment variables (keep them for now, mark as deprecated):
  - `NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID`
  - `NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID`
  - `NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID`
  - `NEXT_PUBLIC_PRO_YEARLY_PRICE_ID`

- [ ] 2.7. Update `apps/web/lib/plans.ts` to remove the old `stripeLinks` object and replace with:

```typescript
export const stripeLinks = {
  paid_monthly: process.env.NEXT_PUBLIC_PAID_MONTHLY_PRICE_ID!,
  paid_yearly: process.env.NEXT_PUBLIC_PAID_YEARLY_PRICE_ID!,
};

export const stripeDetails = {
  free_monthly: { amount: '$0', stripe_price_id: 'free' },
  free_yearly: { amount: '$0', stripe_price_id: 'free' },
  paid_monthly: { amount: '$5', stripe_price_id: 'paid_monthly' },
  paid_yearly: { amount: '$45', stripe_price_id: 'paid_yearly' },
};
```

- [ ] 2.8. Simplify the `plans` array in `apps/web/lib/plans.ts` to only two plans:

```typescript
export const plans: Plan[] = [
  {
    name: 'Free',
    shortName: 'Free',
    featured: false,
    price: {
      Monthly: { amount: '$0', stripe_price_id: 'free' },
      Yearly: { amount: '$0', stripe_price_id: 'free' },
    },
    description: 'Perfect for trying out BragDoc with basic features.',
    button: {
      label: 'Get started for free',
      href: '/register',
    },
    features: [
      'Manage Projects, Companies, and Achievements',
      'Export all data as JSON',
      'CLI with your own OpenAI key',
      '365-day data retention',
    ],
  },
  {
    name: 'Paid',
    shortName: 'Paid',
    featured: true,
    price: {
      Monthly: { amount: '$5/month', stripe_price_id: 'paid_monthly' },
      Yearly: { amount: '$45/year', stripe_price_id: 'paid_yearly' },
    },
    description: 'Full access to AI-powered features and unlimited retention.',
    button: {
      label: 'Upgrade to Paid',
      href: '/pricing',
    },
    features: [
      'Everything in Free',
      'AI-powered document generation',
      'Standup meeting pages',
      'Workstream analytics',
      'Infinite data retention',
      'All LLM-powered features',
    ],
  },
];
```

---

## Phase 3: Webhook Handler Updates

### Context

The webhook handler at `apps/web/app/api/stripe/callback/route.ts` currently handles 4 events and updates the User table with `level`, `renewalPeriod`, and `lastPayment`. We need to update it to:
1. Set `level` to 'paid' (not 'basic' or 'pro')
2. Set `paidUntil` based on subscription's `current_period_end`
3. Remove `renewalPeriod` and `lastPayment` updates
4. Handle the new `customer.subscription.updated` event

The existing handler has good test coverage in `test/api/stripe/callback/route.test.ts` which we'll update later.

### Tasks

- [ ] 3.1. Create a helper function at the top of `apps/web/app/api/stripe/callback/route.ts` to update user subscription:

```typescript
async function updateUserFromSubscription(
  subscription: Stripe.Subscription,
  customerEmail?: string
) {
  const customerId = subscription.customer as string;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const paidUntil = isActive ? new Date(subscription.current_period_end * 1000) : null;

  // Try to find user by stripeCustomerId first, then by email
  let targetUser;
  if (customerEmail) {
    targetUser = await db.query.user.findFirst({
      where: eq(user.email, customerEmail)
    });
  } else {
    targetUser = await db.query.user.findFirst({
      where: eq(user.stripeCustomerId, customerId)
    });
  }

  if (!targetUser) {
    throw new Error(`User not found for customer ${customerId} or email ${customerEmail}`);
  }

  await db
    .update(user)
    .set({
      level: isActive ? 'paid' : 'free',
      paidUntil,
      stripeCustomerId: customerId,
    })
    .where(eq(user.id, targetUser.id));

  console.log(`Updated user ${targetUser.id}: level=${isActive ? 'paid' : 'free'}, paidUntil=${paidUntil?.toISOString()}`);
}
```

- [ ] 3.2. Update the `checkout.session.completed` case to use the new helper:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!session.customer || !session.customer_email) {
    console.error('No customer information in checkout session');
    break;
  }

  // Fetch the subscription from the session
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    await updateUserFromSubscription(subscription, session.customer_email);
  }

  break;
}
```

- [ ] 3.3. Add a new case for `customer.subscription.updated` (this handles renewals and changes):

```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;
  await updateUserFromSubscription(subscription);
  break;
}
```

- [ ] 3.4. Update the `customer.subscription.deleted` case:

```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  await db
    .update(user)
    .set({
      level: 'free',
      paidUntil: null,
    })
    .where(eq(user.stripeCustomerId, customerId));

  console.log(`Subscription deleted for customer ${customerId}`);
  break;
}
```

- [ ] 3.5. Remove or simplify the `payment_intent.succeeded` case (it's redundant with `customer.subscription.updated`):

```typescript
case 'payment_intent.succeeded': {
  // This event fires for one-time payments, not needed for subscriptions
  // Subscriptions are handled by customer.subscription.updated
  console.log('Payment intent succeeded:', event.data.object.id);
  break;
}
```

- [ ] 3.6. Remove the `payment_intent.payment_failed` case (just logs, not critical):

```typescript
// Remove this case entirely, or leave as a log-only case
```

- [ ] 3.7. Update the event type list in the webhook handler to reflect the events we actually handle:

```typescript
const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

// Later in code:
if (!relevantEvents.has(event.type)) {
  return NextResponse.json({ received: true });
}
```

---

## Phase 4: Helper Functions

### Context

We need to create helper functions to check if a user has an active paid subscription. These helpers must:
1. Respect the `PAYMENT_TOKEN_REQUIRED` environment variable (for open source mode)
2. Check if `paidUntil` is in the future
3. Work on both server and client side
4. Provide convenient error responses for API routes

The existing `packages/config/src/payment-gates.ts` has complex feature gating that we'll simplify.

### Tasks

- [ ] 4.1. Create a new file `apps/web/lib/payments/isUserPaid.ts`:

```typescript
import { isPaymentRequired } from '@bragdoc/config';
import type { User } from '@bragdoc/database';

/**
 * Check if a user has an active paid subscription
 * Returns true if:
 * - PAYMENT_TOKEN_REQUIRED is false (open source mode), OR
 * - User has paidUntil date in the future
 */
export function isUserPaid(user: User | null | undefined): boolean {
  // If payment not required (self-hosted/open source), everyone is "paid"
  if (!isPaymentRequired()) {
    return true;
  }

  // Check if user exists and has valid paidUntil
  if (!user || !user.paidUntil) {
    return false;
  }

  // Check if subscription is still active
  return new Date(user.paidUntil) > new Date();
}
```

- [ ] 4.2. Add a server-side helper to the same file for throwing errors:

```typescript
/**
 * Throw an error if user doesn't have paid access
 * Use in Server Components and Server Actions
 */
export function requirePaidUser(user: User | null | undefined): void {
  if (!isUserPaid(user)) {
    throw new Error('This feature requires a paid account');
  }
}
```

- [ ] 4.3. Add an API route helper to the same file:

```typescript
import { NextResponse } from 'next/server';

/**
 * Return an error response if user doesn't have paid access
 * Use in API routes (returns null if user is paid)
 */
export function requirePaidUserResponse(
  user: User | null | undefined
): NextResponse | null {
  if (!isUserPaid(user)) {
    return NextResponse.json(
      { error: 'This feature requires a paid account' },
      { status: 403 }
    );
  }
  return null; // User is paid, no error
}
```

- [ ] 4.4. Create an export barrel at `apps/web/lib/payments/index.ts`:

```typescript
export { isUserPaid, requirePaidUser, requirePaidUserResponse } from './isUserPaid';
```

- [ ] 4.5. Update `packages/config/src/payment-gates.ts` to simplify it:

```typescript
/**
 * Check if payment is required for the current deployment
 * Returns false for self-hosted open source deployments
 */
export const isPaymentRequired = (): boolean => {
  return process.env.PAYMENT_TOKEN_REQUIRED === 'true';
};

// Remove the old featureGates mapping
// Remove the old requiresPayment function
// Keep only isPaymentRequired()
```

- [ ] 4.6. Export a type from `packages/config/src/payment-gates.ts` for the simplified user levels:

```typescript
export type UserLevel = 'free' | 'paid';
```

---

## Phase 5: Authentication Updates

### Context

NextAuth configuration is in `apps/web/app/(auth)/auth.ts`. Currently it passes `level` and `renewalPeriod` through the JWT and session (lines 164-165, 175-176). We need to:
1. Remove `renewalPeriod` from JWT and session
2. Add `paidUntil` to JWT and session
3. Update TypeScript type declarations

This makes payment status available throughout the app via `const session = await auth()` or `const { data: session } = useSession()`.

### Tasks

- [ ] 5.1. Update the NextAuth type declarations in `apps/web/app/(auth)/auth.ts` (typically near the top or bottom):

```typescript
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    preferences?: {
      hasSeenWelcome: boolean;
      language: string;
      documentInstructions?: string;
    };
    level?: 'free' | 'paid';
    paidUntil?: Date | null;  // ADD THIS
    stripeCustomerId?: string | null;
    // Remove renewalPeriod if it exists
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    preferences?: {
      hasSeenWelcome: boolean;
      language: string;
      documentInstructions?: string;
    };
    level?: 'free' | 'paid';
    paidUntil?: Date | null;  // ADD THIS
    stripeCustomerId?: string | null;
    // Remove renewalPeriod if it exists
  }
}
```

- [ ] 5.2. Find the `jwt` callback in the NextAuth configuration (around line 164) and update it:

```typescript
async jwt({ token, user, account, trigger, session: triggerSession }) {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name;
    token.image = user.image;
    token.preferences = user.preferences;
    token.level = user.level;
    token.paidUntil = user.paidUntil;  // ADD THIS
    token.stripeCustomerId = user.stripeCustomerId;
    // Remove renewalPeriod assignment if it exists
  }

  // Handle session updates (e.g., after webhook updates)
  if (trigger === 'update' && triggerSession) {
    token.level = triggerSession.level;
    token.paidUntil = triggerSession.paidUntil;  // ADD THIS
    // Remove renewalPeriod if it exists
  }

  return token;
}
```

- [ ] 5.3. Find the `session` callback (around line 175) and update it:

```typescript
async session({ session, token }) {
  if (token) {
    session.user.id = token.id;
    session.user.email = token.email;
    session.user.name = token.name;
    session.user.image = token.image;
    session.user.preferences = token.preferences;
    session.user.level = token.level;
    session.user.paidUntil = token.paidUntil;  // ADD THIS
    session.user.stripeCustomerId = token.stripeCustomerId;
    // Remove renewalPeriod assignment if it exists
  }
  return session;
}
```

- [ ] 5.4. Verify that when users are fetched from the database in the `authorize` callback (for credentials provider) or other callbacks, the query includes `paidUntil`:

```typescript
// In the authorize callback or similar
const dbUser = await db.query.user.findFirst({
  where: eq(user.email, credentials.email),
  columns: {
    id: true,
    email: true,
    password: true,
    name: true,
    image: true,
    preferences: true,
    level: true,
    paidUntil: true,  // ENSURE THIS IS INCLUDED
    stripeCustomerId: true,
  },
});
```

---

## Phase 6: Payment Gates Configuration

### Context

The current `packages/config/src/payment-gates.ts` has complex feature gating with specific features mapped to specific tiers. We're simplifying to a binary paid/free check. Most of this file can be removed or simplified.

### Tasks

- [ ] 6.1. Open `packages/config/src/payment-gates.ts` and remove the `FeatureGate` type and `featureGates` object entirely (if they exist)

- [ ] 6.2. Remove the `requiresPayment()` function that checks specific features

- [ ] 6.3. Keep only the `isPaymentRequired()` function:

```typescript
/**
 * Check if payment is required for the current deployment
 * Returns false for self-hosted open source deployments
 */
export const isPaymentRequired = (): boolean => {
  return process.env.PAYMENT_TOKEN_REQUIRED === 'true';
};
```

- [ ] 6.4. Export the simplified types:

```typescript
export type UserLevel = 'free' | 'paid';
```

- [ ] 6.5. The file should now be very simple (approximately 10-15 lines total)

---

## Phase 7: UI Components

### Context

We need to create UI components for the payment system:
1. **UpgradeDialog** - A dialog that prompts free users to upgrade
2. **UpgradeGate** - A wrapper component that intercepts clicks and shows the dialog
3. **Navigation badges** - Show (PRO) badges next to paid features and user status badges

These components need to check both `isPaymentRequired()` (environment) and `isUserPaid()` (user status) to work correctly in both hosted and self-hosted modes.

### Tasks

#### UpgradeDialog Component

- [ ] 7.1. Create `apps/web/components/payments/UpgradeDialog.tsx`:

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
}: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Upgrade to Unlock {feature}</DialogTitle>
          </div>
          <DialogDescription>
            This feature requires a paid subscription to BragDoc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="font-semibold">What you'll get:</div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ AI-powered document generation</li>
              <li>✓ Standup meeting pages</li>
              <li>✓ Workstream analytics</li>
              <li>✓ Infinite data retention</li>
              <li>✓ All LLM-powered features</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">$5</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">$45</span>
              <span className="text-muted-foreground">/year</span>
              <span className="text-sm text-primary">(Save 25%)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/pricing">Upgrade Now</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pricing">Learn More</Link>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Or{' '}
            <a
              href="https://www.bragdoc.ai/open-source"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              self-host for free
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### UpgradeGate Component

- [ ] 7.2. Create `apps/web/components/payments/UpgradeGate.tsx`:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { isPaymentRequired } from '@bragdoc/config';
import { isUserPaid } from '@/lib/payments';
import { UpgradeDialog } from './UpgradeDialog';
import { Slot } from '@radix-ui/react-slot';
import { useState } from 'react';

interface UpgradeGateProps {
  children: React.ReactElement;
  feature: string;
  asChild?: boolean;
}

/**
 * Wrapper component that intercepts clicks for unpaid users
 * Uses the Radix UI Slot pattern (asChild) to merge with any child element
 */
export function UpgradeGate({
  children,
  feature,
  asChild = false,
}: UpgradeGateProps) {
  const { data: session } = useSession();
  const [showDialog, setShowDialog] = useState(false);

  // Check if user needs to upgrade
  const needsUpgrade = isPaymentRequired() && !isUserPaid(session?.user);

  // If payment not required or user is paid, render children normally
  if (!needsUpgrade) {
    return children;
  }

  // Intercept the click and show upgrade dialog
  const Comp = asChild ? Slot : 'div';

  return (
    <>
      <Comp
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setShowDialog(true);
        }}
      >
        {children}
      </Comp>

      <UpgradeDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        feature={feature}
      />
    </>
  );
}
```

#### Navigation Badges

- [ ] 7.3. Create `apps/web/components/payments/ProBadge.tsx` for the (PRO) badge next to nav items:

```typescript
import { Badge } from '@/components/ui/badge';

export function ProBadge() {
  return (
    <Badge
      variant="secondary"
      className="ml-2 text-xs px-1.5 py-0 font-normal"
    >
      PRO
    </Badge>
  );
}
```

- [ ] 7.4. Create `apps/web/components/payments/UserStatusBadge.tsx` for the user menu badge:

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { isPaymentRequired } from '@bragdoc/config';
import { isUserPaid } from '@/lib/payments';

export function UserStatusBadge() {
  const { data: session } = useSession();

  // Don't show badge if payment not required
  if (!isPaymentRequired()) {
    return null;
  }

  const isPaid = isUserPaid(session?.user);

  return (
    <Badge
      className="absolute -bottom-1 -right-1 text-xs px-1 py-0 pointer-events-none"
      variant={isPaid ? 'default' : 'secondary'}
    >
      {isPaid ? 'PRO' : 'FREE'}
    </Badge>
  );
}
```

- [ ] 7.5. Create an export barrel at `apps/web/components/payments/index.ts`:

```typescript
export { UpgradeDialog } from './UpgradeDialog';
export { UpgradeGate } from './UpgradeGate';
export { ProBadge } from './ProBadge';
export { UserStatusBadge } from './UserStatusBadge';
```

- [ ] 7.6. Update the side navigation component (likely in `apps/web/components/sidebar.tsx` or similar) to show ProBadge next to paid features:

```typescript
import { ProBadge } from '@/components/payments';
import { isPaymentRequired } from '@bragdoc/config';
import { isUserPaid } from '@/lib/payments';

// In the component:
const showBadges = isPaymentRequired() && !isUserPaid(session?.user);

// Then in the nav items:
<NavItem href="/reports" icon={FileText}>
  Reports {showBadges && <ProBadge />}
</NavItem>

<NavItem href="/standups" icon={Calendar}>
  Standups {showBadges && <ProBadge />}
</NavItem>
```

- [ ] 7.7. Update the user menu component (likely in `apps/web/components/user-menu.tsx` or bottom nav) to show UserStatusBadge:

```typescript
import { UserStatusBadge } from '@/components/payments';

// In the avatar section:
<div className="relative">
  <Avatar>
    <AvatarImage src={user?.image} />
    <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
  </Avatar>
  <UserStatusBadge />
</div>
```

---

## Phase 8: Account Page Updates

### Context

The existing account page at `apps/web/app/(app)/account/page.tsx` needs a new section to display subscription status and provide management links. This should show:
- Current subscription status (Free or Paid)
- For paid users: renewal date (paidUntil)
- Link to manage subscription (for paid users)
- Link to upgrade (for free users)
- Link to self-hosting docs

### Tasks

- [ ] 8.1. Create a new component `apps/web/components/account/SubscriptionSection.tsx`:

```typescript
import { auth } from '@/app/(auth)/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isPaymentRequired } from '@bragdoc/config';
import { isUserPaid } from '@/lib/payments';
import Link from 'next/link';

export async function SubscriptionSection() {
  const session = await auth();
  const isPaid = isUserPaid(session?.user);

  // Don't show section if payment not required (self-hosted)
  if (!isPaymentRequired()) {
    return null;
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Subscription</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={isPaid ? 'default' : 'secondary'}>
            {isPaid ? 'PAID' : 'FREE'}
          </Badge>
        </div>

        {isPaid && session?.user?.paidUntil && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Renews on</span>
            <span className="text-sm font-medium">
              {new Date(session.user.paidUntil).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        <div className="pt-3 flex gap-2">
          {isPaid ? (
            <ManageSubscriptionButton />
          ) : (
            <Button asChild>
              <Link href="/pricing">Upgrade to Paid</Link>
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Or{' '}
          <a
            href="https://www.bragdoc.ai/open-source"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            self-host for free
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] 8.2. Create a placeholder for `ManageSubscriptionButton` (we'll implement it in Phase 9):

```typescript
// At the top of the file, add this import placeholder:
// import { ManageSubscriptionButton } from '@/components/payments/ManageSubscriptionButton';

// For now, create a simple version:
function ManageSubscriptionButton() {
  return (
    <Button variant="outline" disabled>
      Manage Subscription (Coming Soon)
    </Button>
  );
}
```

- [ ] 8.3. Update `apps/web/app/(app)/account/page.tsx` to include the new section:

```typescript
import { SubscriptionSection } from '@/components/account/SubscriptionSection';

export default async function AccountPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Account Settings</h1>

      {/* Existing sections (profile, preferences, etc.) */}

      {/* Add the new subscription section */}
      <SubscriptionSection />
    </div>
  );
}
```

---

## Phase 9: Customer Portal Integration

### Context

Stripe Customer Portal provides a hosted interface for users to manage their subscriptions (cancel, update payment methods, view invoices). This requires:
1. An API endpoint to create a portal session
2. A client component to redirect users to the portal
3. Configuring the portal in Stripe Dashboard

The portal uses the `stripeCustomerId` we already store on the User model.

### Tasks

#### API Endpoint

- [ ] 9.1. Create `apps/web/app/api/stripe/create-portal-session/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);

  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { stripeCustomerId } = auth.user;

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'No active subscription found' },
      { status: 400 }
    );
  }

  try {
    // Create a Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

- [ ] 9.2. Add CORS handling for the endpoint (OPTIONS method):

```typescript
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

#### Client Component

- [ ] 9.3. Create `apps/web/components/payments/ManageSubscriptionButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to open subscription management. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleManageSubscription}
      disabled={loading}
      variant="outline"
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Manage Subscription
    </Button>
  );
}
```

- [ ] 9.4. Update `apps/web/components/account/SubscriptionSection.tsx` to import and use the real `ManageSubscriptionButton`:

```typescript
// Replace the placeholder with:
import { ManageSubscriptionButton } from '@/components/payments/ManageSubscriptionButton';

// Remove the temporary ManageSubscriptionButton function
```

- [ ] 9.5. Add `ManageSubscriptionButton` to the payments export barrel in `apps/web/components/payments/index.ts`:

```typescript
export { ManageSubscriptionButton } from './ManageSubscriptionButton';
```

#### Stripe Dashboard Configuration

- [ ] 9.6. Configure the Customer Portal in Stripe Dashboard:
  1. Go to **Settings → Customer Portal** in Stripe Dashboard
  2. Click "Activate" if not already active
  3. Enable the following features:
     - ☑ Cancel subscriptions
     - ☑ Update payment methods
     - ☑ View invoice history
     - ☑ Update billing information
  4. Set cancellation behavior to "Cancel at end of period" (recommended)
  5. Add your branding:
     - Upload logo
     - Set brand colors
     - Add business information
  6. Set the default return URL to: `https://yourdomain.com/account`
  7. Save changes

- [ ] 9.7. Test the portal in test mode:
  1. Create a test subscription
  2. Click "Manage Subscription" button
  3. Verify you're redirected to the portal
  4. Try canceling the subscription
  5. Verify the webhook fires and updates the user in the database

---

## Phase 10: API Endpoint Payment Checks

### Context

We need to add payment checks to all API endpoints that perform LLM operations or other paid features.

**Middleware vs. Simple Pattern:**
You might consider using Next.js middleware to check routes centrally. However, for this use case, the simple per-route pattern is better because:
1. Not all API routes need payment checks (only LLM-powered ones)
2. Middleware runs on Edge Runtime, which can complicate database access
3. Co-locating payment checks with route handlers makes it clear which endpoints are protected
4. The session already has `paidUntil`, so the check is fast (no database lookup)
5. The pattern is only 2 lines of code

If you prefer a wrapper approach for elegance, you could create a higher-order function (see Optional Advanced Pattern below).

**Definitive list of routes requiring payment checks** (scanned from codebase):
- `/api/chat` - Chat feature (uses LLM)
- `/api/documents/generate` - AI document generation
- `/api/standups/[standupId]/achievements-summary` - When `regenerate=true` (uses LLM)
- `/api/standups/[standupId]/regenerate-standup-documents` - Regenerates standup documents

**Note:** `/api/cli/commits` uses LLMs but should NOT be payment-gated because it's for CLI users who provide their own OpenAI API key (part of free tier).

### Tasks

- [ ] 10.1. Update `apps/web/app/api/documents/generate/route.ts`:

```typescript
import { getAuthUser } from '@/lib/getAuthUser';
import { requirePaidUserResponse } from '@/lib/payments';

export async function POST(request: Request) {
  // Authenticate user
  const auth = await getAuthUser(request);
  if (!auth?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check payment status
  const paymentError = requirePaidUserResponse(auth.user);
  if (paymentError) {
    return paymentError; // Returns 403 error
  }

  // Proceed with LLM operations...
  // ... existing code ...
}
```

- [ ] 10.2. Update `apps/web/app/api/chat/route.ts` to add payment check after authentication (similar pattern to 10.1)

- [ ] 10.3. Update `apps/web/app/api/standups/[standupId]/achievements-summary/route.ts` to add payment check ONLY when `regenerate=true`:

```typescript
export async function POST(req: NextRequest, props: { params: Promise<{ standupId: string }> }) {
  // ... existing auth code ...

  const body = await req.json();
  const { regenerate, /* ... */ } = summarySchema.parse(body);

  if (regenerate) {
    // This uses LLM, check payment
    const paymentError = requirePaidUserResponse(auth.user);
    if (paymentError) {
      return paymentError;
    }
  }

  // ... rest of code ...
}
```

- [ ] 10.4. Update `apps/web/app/api/standups/[standupId]/regenerate-standup-documents/route.ts` to add payment check after authentication

- [ ] 10.5. Search for server actions that use LLM functionality and add payment checks:
  ```bash
  find apps/web/app -name "*.ts" -o -name "*.tsx" | xargs grep -l "'use server'" | xargs grep -l "generateText\|streamText\|getLLM"
  ```

- [ ] 10.6. Add payment checks to any identified server actions:

```typescript
'use server';

import { auth } from '@/app/(auth)/auth';
import { requirePaidUser } from '@/lib/payments';

export async function generateReport() {
  const session = await auth();

  // Check payment status (throws error if not paid)
  requirePaidUser(session?.user);

  // Proceed with LLM operations...
}
```

- [ ] 10.7. Create `docs/protected-endpoints.md` documenting all endpoints that require payment:

```markdown
# Protected Endpoints (Require Paid Subscription)

This document lists all API endpoints, server actions, and pages that require a paid subscription.

## API Routes

- `POST /api/chat` - Chat feature (uses LLM)
- `POST /api/documents/generate` - AI document generation
- `POST /api/standups/[standupId]/achievements-summary` - When `regenerate=true` (AI generation)
- `POST /api/standups/[standupId]/regenerate-standup-documents` - Standup document regeneration

**NOT payment-gated:**
- `POST /api/cli/commits` - CLI users provide own OpenAI key (free tier feature)

## Server Actions

- Search for any server actions using LLM calls and document here

## UI Components

- Free users can see all UI
- Payment gates are at the action level (via UpgradeGate component)
- No page-level redirects to /pricing

## Adding New Protected Features

When adding a new feature that requires payment:

1. Add payment check at the entry point:
   - API route: Use `requirePaidUserResponse(auth.user)` after authentication
   - Server action: Use `requirePaidUser(session?.user)` after auth check
   - UI: Wrap action with `<UpgradeGate>` component

2. Update this document with the new endpoint

3. Add tests for the payment check

4. Remember: CLI endpoints that allow users to provide their own LLM key should NOT be gated
```

---

## Phase 11: Testing

### Context

The existing webhook tests at `test/api/stripe/callback/route.test.ts` need to be updated for the new schema. We also need to add tests for:
- The new helper functions
- The new API endpoint (create-portal-session)
- Component behavior

### Tasks

#### Update Webhook Tests

- [ ] 11.1. Open `test/api/stripe/callback/route.test.ts` and update the test data to use new schema:

```typescript
// Update mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  level: 'free',
  paidUntil: null,
  stripeCustomerId: 'cus_123',
  // Remove renewalPeriod, lastPayment
};
```

- [ ] 11.2. Update test for `checkout.session.completed` to verify `paidUntil` is set:

```typescript
test('checkout.session.completed updates user with paidUntil', async () => {
  const event = {
    type: 'checkout.session.completed',
    data: {
      object: {
        customer: 'cus_123',
        customer_email: 'test@example.com',
        subscription: 'sub_123',
      },
    },
  };

  // Mock Stripe subscription retrieve
  (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    status: 'active',
    customer: 'cus_123',
  });

  const response = await POST(createRequest(event));

  expect(response.status).toBe(200);
  // Verify paidUntil was set to ~30 days from now
  // Verify level is 'paid'
});
```

- [ ] 11.3. Add test for `customer.subscription.updated`:

```typescript
test('customer.subscription.updated extends paidUntil', async () => {
  const futureDate = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60; // 60 days

  const event = {
    type: 'customer.subscription.updated',
    data: {
      object: {
        customer: 'cus_123',
        current_period_end: futureDate,
        status: 'active',
      },
    },
  };

  const response = await POST(createRequest(event));

  expect(response.status).toBe(200);
  // Verify paidUntil was updated to ~60 days from now
});
```

- [ ] 11.4. Update test for `customer.subscription.deleted` to verify `paidUntil` is set to null:

```typescript
test('customer.subscription.deleted reverts user to free', async () => {
  const event = {
    type: 'customer.subscription.deleted',
    data: {
      object: {
        customer: 'cus_123',
      },
    },
  };

  const response = await POST(createRequest(event));

  expect(response.status).toBe(200);
  // Verify level is 'free'
  // Verify paidUntil is null
});
```

#### Helper Function Tests

- [ ] 11.5. Create `test/lib/payments/isUserPaid.test.ts`:

```typescript
import { isUserPaid } from '@/lib/payments';
import { isPaymentRequired } from '@bragdoc/config';

jest.mock('@bragdoc/config', () => ({
  isPaymentRequired: jest.fn(),
}));

describe('isUserPaid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when PAYMENT_TOKEN_REQUIRED is false', () => {
    (isPaymentRequired as jest.Mock).mockReturnValue(false);

    const result = isUserPaid(null);

    expect(result).toBe(true);
  });

  it('returns false when user is null and payment required', () => {
    (isPaymentRequired as jest.Mock).mockReturnValue(true);

    const result = isUserPaid(null);

    expect(result).toBe(false);
  });

  it('returns false when paidUntil is null and payment required', () => {
    (isPaymentRequired as jest.Mock).mockReturnValue(true);

    const user = { id: '1', paidUntil: null };
    const result = isUserPaid(user as any);

    expect(result).toBe(false);
  });

  it('returns false when paidUntil is in the past', () => {
    (isPaymentRequired as jest.Mock).mockReturnValue(true);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const user = { id: '1', paidUntil: yesterday };
    const result = isUserPaid(user as any);

    expect(result).toBe(false);
  });

  it('returns true when paidUntil is in the future', () => {
    (isPaymentRequired as jest.Mock).mockReturnValue(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const user = { id: '1', paidUntil: tomorrow };
    const result = isUserPaid(user as any);

    expect(result).toBe(true);
  });
});
```

#### Portal Session Tests

- [ ] 11.6. Create `test/api/stripe/create-portal-session/route.test.ts`:

```typescript
import { POST } from '@/app/api/stripe/create-portal-session/route';
import { getAuthUser } from '@/lib/getAuthUser';
import { stripe } from '@/lib/stripe/stripe';

jest.mock('@/lib/getAuthUser');
jest.mock('@/lib/stripe/stripe', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

describe('POST /api/stripe/create-portal-session', () => {
  it('returns 401 when user not authenticated', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/stripe/create-portal-session', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 when user has no stripeCustomerId', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: '1', stripeCustomerId: null },
    });

    const request = new Request('http://localhost/api/stripe/create-portal-session', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('creates portal session and returns URL', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: '1', stripeCustomerId: 'cus_123' },
    });

    (stripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue({
      url: 'https://billing.stripe.com/session/xxx',
    });

    const request = new Request('http://localhost/api/stripe/create-portal-session', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe('https://billing.stripe.com/session/xxx');
  });
});
```

#### Run All Tests

- [ ] 11.7. Run the full test suite and fix any failures:
  ```bash
  pnpm test
  ```

- [ ] 11.8. Run type checking to ensure no TypeScript errors:
  ```bash
  pnpm --filter=@bragdoc/web exec tsc --noEmit --skipLibCheck
  ```

---

## Phase 12: Cleanup

### Context

After verifying everything works correctly, we can remove deprecated columns and code. This phase should only be done after the system has been running successfully in production for at least a week to ensure no rollback is needed.

### Tasks

- [ ] 12.1. Remove the commented-out `renewalPeriod` and `lastPayment` column definitions from `packages/database/src/schema.ts`

- [ ] 12.2. Remove the `renewalPeriodEnum` definition and type export from `packages/database/src/schema.ts`

- [ ] 12.3. Generate a migration to drop the columns:
  ```bash
  pnpm db:generate
  ```

- [ ] 12.4. Review the migration file to ensure it only drops the deprecated columns

- [ ] 12.5. Apply the migration:
  ```bash
  pnpm db:push
  ```

- [ ] 12.6. Remove any remaining references to `renewalPeriod` in the codebase:
  ```bash
  grep -r "renewalPeriod" apps/ packages/
  ```

- [ ] 12.7. Remove any remaining references to `lastPayment`:
  ```bash
  grep -r "lastPayment" apps/ packages/
  ```

- [ ] 12.8. Delete or archive old Stripe products in Stripe Dashboard:
  1. Go to **Products** in Stripe Dashboard
  2. Find "Basic Bragger" and "Pro Bragger" products
  3. Archive them (don't delete - keep for historical data)

- [ ] 12.9. Remove old environment variables from all deployment environments:
  - `NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID`
  - `NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID`
  - `NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID`
  - `NEXT_PUBLIC_PRO_YEARLY_PRICE_ID`

- [ ] 12.10. Update `.env.example` to remove old variables and document new ones:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
NEXT_PUBLIC_PAID_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_PAID_YEARLY_PRICE_ID=price_...

# Payment Control
PAYMENT_TOKEN_REQUIRED=true  # Set to false for self-hosted deployments
```

- [ ] 12.11. Delete the data migration script `packages/database/src/migrate-subscriptions.ts` (or move to archive)

---

## Phase 13: Documentation

### Context

We need to update internal documentation to reflect the new payment system. This includes feature documentation, README files, and CLAUDE.md.

### Tasks

#### Feature Documentation

- [ ] 13.1. Create `docs/payments.md` with comprehensive documentation:

```markdown
# Payment System

BragDoc uses a two-tier payment system: Free and Paid.

## Overview

- **Free Tier**: Basic features without LLM costs (manual data entry, CLI with own key, 365-day retention)
- **Paid Tier**: Full AI-powered features ($5/month or $45/year)

## Implementation

### Database Schema

The User table tracks subscription status via:
- `level`: enum ['free', 'paid']
- `paidUntil`: timestamp (null for free users, future date for paid users)
- `stripeCustomerId`: used for subscription management

### Payment Checks

Use the helper functions in `apps/web/lib/payments/isUserPaid.ts`:

\`\`\`typescript
import { isUserPaid, requirePaidUser, requirePaidUserResponse } from '@/lib/payments';

// In server components:
if (!isUserPaid(session?.user)) {
  return <UpgradePrompt />;
}

// In server actions:
requirePaidUser(session?.user); // Throws if not paid

// In API routes:
const error = requirePaidUserResponse(auth.user);
if (error) return error;
\`\`\`

### Open Source Mode

Set `PAYMENT_TOKEN_REQUIRED=false` to disable all payment gates (for self-hosted deployments).

### Stripe Integration

- Product: "BragDoc Paid"
- Prices: $5/month (paid_monthly), $45/year (paid_yearly)
- Webhooks handle subscription lifecycle
- Customer Portal for subscription management

## Testing

See tests in:
- `test/api/stripe/callback/route.test.ts`
- `test/lib/payments/isUserPaid.test.ts`
- `test/api/stripe/create-portal-session/route.test.ts`
```

- [ ] 13.2. Update `docs/FEATURES.md` to reflect the new payment tiers (if this file exists):
  - Update feature list for Free tier
  - Update feature list for Paid tier
  - Remove Basic and Pro tier sections

- [ ] 13.3. Create `docs/protected-endpoints.md` to document all endpoints that require payment:

```markdown
# Protected Endpoints

This document lists all API endpoints, server actions, and pages that require a paid subscription.

## API Routes

- `POST /api/documents/generate` - AI document generation
- `POST /api/standups/*` - Standup-related endpoints
- (Update as more are added)

## Server Actions

- `generateReport()` - Report generation
- (Update as more are added)

## Pages

- `/reports` - Reports page
- `/standups` - Standups page
- (Update as more are added)

## Adding New Protected Features

When adding a new feature that requires payment:

1. Add payment check at the entry point:
   - API route: Use `requirePaidUserResponse()`
   - Server action: Use `requirePaidUser()`
   - Page: Check `isUserPaid()` and redirect or show upgrade prompt

2. Update this document with the new endpoint/page

3. Add tests for the payment check
```

#### README Updates

- [ ] 13.4. Update `README.md` in the root to mention payment features:

```markdown
## Payment System

BragDoc operates on a freemium model:

- **Free**: Manual data entry, CLI with your own API key, 365-day retention
- **Paid** ($5/month or $45/year): AI-powered features, unlimited retention

For self-hosted deployments, set `PAYMENT_TOKEN_REQUIRED=false` to disable payment gates.

See [docs/payments.md](docs/payments.md) for implementation details.
```

- [ ] 13.5. Update `packages/cli/README.md` to clarify CLI payment model:

```markdown
## Payments

The CLI is free to use with your own OpenAI API key. Paid subscription is only required for:

- Web-based AI features (document generation, standup pages)
- Using the hosted version's LLM endpoints

When using the CLI with a self-hosted instance (where `PAYMENT_TOKEN_REQUIRED=false`), all features are available.
```

#### CLAUDE.md Updates

- [ ] 13.6. Update `CLAUDE.md` to document the new payment system:

Add a new section "Payment System" after the "Authentication" section:

```markdown
## Payment System

### Overview

BragDoc uses a simplified two-tier payment system:
- **Free**: Basic CRUD operations, CLI with own key, 365-day retention
- **Paid**: AI-powered features, unlimited retention ($5/month or $45/year)

### Database Schema

**Location**: `packages/database/src/schema.ts`

Payment-related columns on User table:
- `level`: enum ['free', 'paid'] (line 35)
- `paidUntil`: timestamp, null for free users (line 66)
- `stripeCustomerId`: varchar for subscription management (line 69)

### Helper Functions

**Location**: `apps/web/lib/payments/isUserPaid.ts`

```typescript
isUserPaid(user): boolean          // Check if user has active paid subscription
requirePaidUser(user): void        // Throw error if not paid (server actions)
requirePaidUserResponse(user)      // Return 403 response if not paid (API routes)
```

### Payment Gates

All payment checks respect the `PAYMENT_TOKEN_REQUIRED` environment variable:
- `true`: Payment required (hosted version)
- `false`: All features available (self-hosted)

### Stripe Integration

**Webhook Handler**: `apps/web/app/api/stripe/callback/route.ts`

Handles subscription lifecycle:
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Renewals and changes
- `customer.subscription.deleted` - Cancellation

**Customer Portal**: `apps/web/app/api/stripe/create-portal-session/route.ts`

Creates Stripe portal session for subscription management.

### UI Components

**Location**: `apps/web/components/payments/`

- `UpgradeGate` - Wrapper to intercept actions for free users
- `UpgradeDialog` - Upgrade prompt dialog
- `ProBadge` - Badge for paid features in navigation
- `UserStatusBadge` - User's subscription status badge

### Protected Endpoints

See `docs/protected-endpoints.md` for a complete list of endpoints requiring payment.

When adding new paid features:
1. Add payment check using helper functions
2. Update protected-endpoints.md
3. Add tests for the payment gate
```

- [ ] 13.7. Update the "Database Layer" section in CLAUDE.md to reference the new User schema fields

- [ ] 13.8. Update the "API Conventions" section in CLAUDE.md to include payment check pattern:

```markdown
### Payment Protection

For paid features (typically LLM operations), add payment check after authentication:

```typescript
import { requirePaidUserResponse } from '@/lib/payments';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check payment status
  const paymentError = requirePaidUserResponse(auth.user);
  if (paymentError) return paymentError;

  // Proceed with operations...
}
```
```

---

## Instructions for Implementation

### For the Programmer

1. **Follow the phases in order** - Each phase builds on the previous one. Do not skip ahead unless explicitly safe to do so.

2. **Mark tasks as completed** - Update this document as you go. Add an `x` to the checkbox when a task is done:
   ```markdown
   - [x] 1.1. Completed task
   ```

3. **Test incrementally** - Don't wait until the end to test. After each phase, verify that:
   - The code compiles (`pnpm build`)
   - Tests pass (`pnpm test`)
   - Type checking passes (`pnpm exec tsc --noEmit`)

4. **Read CLAUDE.md** - Familiarize yourself with the project structure, conventions, and existing patterns in `/Users/ed/Code/brag-ai/CLAUDE.md`

5. **Commit frequently** - Make small, atomic commits after each task or small group of related tasks:
   ```bash
   git add -A
   git commit -m "feat(payments): add paidUntil column to User schema"
   ```

6. **Environment variables** - Don't forget to update environment variables in both:
   - Local `.env` file
   - Deployment environment (Cloudflare, Vercel, etc.)

7. **Database migrations** - Be especially careful with Phase 1:
   - Back up the database before running migrations
   - Test migrations in development first
   - Verify data migration script results before proceeding

8. **Stripe test mode** - Use Stripe test keys for Phase 2 and all testing. Only switch to live keys when deploying to production.

9. **Open source considerations** - Remember that `PAYMENT_TOKEN_REQUIRED` must work in both states:
   - `true`: Hosted version with payment gates
   - `false`: Self-hosted version with all features unlocked

10. **Customer Portal setup** - Phase 9 requires one-time configuration in Stripe Dashboard. Don't forget this step.

11. **Cleanup timing** - Phase 12 should only be done after the system runs successfully in production for at least a week.

12. **Documentation** - Phase 13 is important! Keep documentation up-to-date for future developers.

### Key Files Reference

**Database:**
- Schema: `packages/database/src/schema.ts`
- Queries: `packages/database/src/queries.ts`

**Stripe:**
- Client: `apps/web/lib/stripe/stripe.ts`
- Webhook: `apps/web/app/api/stripe/callback/route.ts`
- Products script: `apps/web/scripts/create-stripe-products.ts`

**Authentication:**
- NextAuth config: `apps/web/app/(auth)/auth.ts`
- Auth helper: `apps/web/lib/getAuthUser.ts`

**Payments:**
- Helper functions: `apps/web/lib/payments/isUserPaid.ts`
- Configuration: `packages/config/src/payment-gates.ts`

**Components:**
- Payments: `apps/web/components/payments/`
- Account: `apps/web/components/account/`

**Tests:**
- Webhook: `test/api/stripe/callback/route.test.ts`
- Payments: `test/lib/payments/`

### Common Pitfalls to Avoid

1. **Don't delete columns immediately** - Comment them out first, only remove after verification
2. **Don't skip data migration** - Existing users must have their data converted
3. **Don't forget PAYMENT_TOKEN_REQUIRED** - All payment checks must respect this variable
4. **Don't hardcode dates** - Use Stripe's `current_period_end` for accuracy
5. **Don't skip webhook testing** - Use Stripe CLI to test webhooks locally
6. **Don't forget to update session** - Add `paidUntil` to NextAuth session/JWT
7. **Don't skip cleanup** - Remove deprecated code after successful deployment

### Getting Help

- Review existing code patterns in similar features
- Check test files for usage examples
- Read Stripe API documentation: https://stripe.com/docs/api
- Check CLAUDE.md for project conventions

### Success Criteria

The implementation is complete when:

- [ ] All checkboxes in all phases are marked complete
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Users can successfully subscribe via Stripe
- [ ] Webhook events properly update user records
- [ ] Free users see upgrade prompts for paid features
- [ ] Paid users can access all features
- [ ] Customer Portal allows subscription management
- [ ] Self-hosted mode (PAYMENT_TOKEN_REQUIRED=false) bypasses all payment gates
- [ ] Documentation is complete and accurate
