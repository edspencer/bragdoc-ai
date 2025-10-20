# Payment Support for Bragdoc

We need to add Stripe payment support for the hosted version of Bragdoc at bragdoc.ai.

## Analysis of Existing Stripe Integration

### What Currently Exists

#### 1. Database Schema (`packages/database/src/schema.ts`)

**Current columns on User table:**
- `level`: enum with values 'free', 'basic', 'pro' (line 26, 61)
- `renewalPeriod`: enum with values 'monthly', 'yearly' (line 29, 62-64)
- `lastPayment`: timestamp (line 65)
- `stripeCustomerId`: varchar (line 68)
- `status`: enum with values 'active', 'banned', 'deleted' (line 35, 67)

**Session/Auth Integration:**
The user's `level` and `renewalPeriod` are passed through NextAuth JWT tokens and sessions (`apps/web/app/(auth)/auth.ts:164-165, 175-176`), making them available throughout the app.

#### 2. Stripe Infrastructure

**Files:**
- `apps/web/lib/stripe/stripe.ts` - Basic Stripe client initialization
- `apps/web/lib/stripe/formatters.ts` - Currency formatting utilities
- `apps/web/scripts/create-stripe-products.ts` - Script to create products/prices in Stripe
- `apps/web/app/api/stripe/callback/route.ts` - Webhook handler

**Current Stripe Products & Prices:**
From `scripts/create-stripe-products.ts`:
- **Product 1:** "Basic Bragger" (`bragger_basic`)
  - `basic_monthly`: $5/month
  - `basic_yearly`: $30/year
- **Product 2:** "Pro Bragger" (`bragger_pro`)
  - `pro_monthly`: $9/month
  - `pro_yearly`: $90/year

**Lookup Keys:**
The webhook handler uses Stripe price `lookup_key` (e.g., "basic_monthly") to parse plan details:
- Splits on underscore: `basic_monthly` → level='basic', renewalPeriod='monthly'
- Updates user table with these values

#### 3. Webhook Handler (`apps/web/app/api/stripe/callback/route.ts`)

**Currently handles 4 events:**
1. `checkout.session.completed` - User completes checkout
   - Retrieves session with line items
   - Extracts lookup_key from price
   - Updates user: level, renewalPeriod, lastPayment, stripeCustomerId

2. `payment_intent.succeeded` - Recurring payment succeeds
   - Similar logic, updates user subscription details
   - Uses metadata.planId if available

3. `payment_intent.payment_failed` - Payment fails
   - Only logs, no user updates

4. `customer.subscription.deleted` - Subscription cancelled
   - Reverts user to level='free', clears lastPayment

**Good news:** Has comprehensive test coverage in `test/api/stripe/callback/route.test.ts`

#### 4. Plans Configuration (`apps/web/lib/plans.ts`)

Defines three tiers with detailed feature lists:
- **Free**: $0 with basic features
- **Basic Achiever**: $5/month or $30/year
- **Pro Achiever**: $9/month or $90/year

Uses environment variables for Stripe price IDs:
- `NEXT_PUBLIC_PRO_YEARLY_PRICE_ID`
- `NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID`
- `NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID`
- `NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID`

#### 5. Payment Gates System (`packages/config/src/payment-gates.ts`)

**Feature gates defined:**
- `unlimited_documents`: requires basic or pro
- `ai_assistant`: requires pro only
- `advanced_analytics`: requires pro only
- `team_collaboration`: requires pro only
- `api_access`: requires pro only

**Helper functions:**
- `isPaymentRequired()`: checks if PAYMENT_TOKEN_REQUIRED env var is 'true'
- `requiresPayment(userLevel, feature)`: returns true if user doesn't have access

**Important:** If `PAYMENT_TOKEN_REQUIRED=false`, all features are available to everyone (open source mode)

#### 6. Middleware (`apps/web/middleware.ts`)

Currently just checks `isPaymentRequired()` but has a TODO comment saying payment checks should be at page/API route level due to Edge Runtime limitations.

---

## New Pricing Model (from Notion docs)

**From Notion pages "Pricing model" and "Feature List":**

### Free Tier
- Manage Projects, Companies, Achievements via UI
- Extract Achievements via CLI (user provides own OpenAI key)
- Export all data as JSON
- **365-day data retention limit**
- Cannot use AI features (costs LLM tokens)

### Paid Tier (Single Level)
- All free tier features
- **AI-powered document generation** (weekly/monthly reports, performance reviews)
- **Standup meeting pages**
- **Workstream analytics** (AI-detected mini-projects)
- **Infinite data retention**
- Access to all LLM-powered features

**Pricing:**
- $5/month or $45/year ($3.75/month)
- Per Notion "Expenses per user" doc: LLM costs ~$1-2/year per user

**Key insight:** Only ONE paid tier, not two. Just "free" vs "paid".

---

## Alignment Analysis

### What Works ✅

1. **Webhook handler structure** - Well-designed with good test coverage
2. **Stripe client setup** - Simple and correct
3. **stripeCustomerId tracking** - Good for managing subscriptions
4. **Payment gates concept** - The `isPaymentRequired()` check for open source mode
5. **Formatter utilities** - Useful, keep these

### What Needs to Change 🔄

#### 1. User Schema Changes

**Remove:**
- `renewalPeriod` column - Not needed if we just track expiration
- `lastPayment` timestamp - Doesn't tell us if subscription is active

**Add:**
- `paidUntil` timestamp - When their paid access expires
  - For monthly: set to 30 days from payment
  - For yearly: set to 365 days from payment
  - NULL for free users
  - Check if `paidUntil > now()` to see if paid

**Simplify:**
- `level` enum: Change from `['free', 'basic', 'pro']` to `['free', 'paid']`

#### 2. Stripe Products & Prices

**Current:** 2 products, 4 prices
**Needed:** 1 product, 2 prices

```typescript
// In create-stripe-products.ts
const products = [
  { id: 'bragdoc_paid', name: 'BragDoc Paid', tax_code: 'txcd_10000000' }
];

const prices = [
  {
    productId: 'bragdoc_paid',
    unitAmount: 500,        // $5.00
    interval: 'month',
    lookupKey: 'paid_monthly',  // Simpler naming
  },
  {
    productId: 'bragdoc_paid',
    unitAmount: 4500,       // $45.00
    interval: 'year',
    lookupKey: 'paid_yearly',
  },
];
```

#### 3. Webhook Handler Updates

**New logic for `checkout.session.completed` and `payment_intent.succeeded`:**

```typescript
async function updateUserSubscription(
  customerId: string,
  lookupKey: string,  // 'paid_monthly' or 'paid_yearly'
  email: string,
) {
  // Calculate paidUntil based on subscription period
  const now = new Date();
  const isYearly = lookupKey.includes('yearly');
  const paidUntil = new Date(now);

  if (isYearly) {
    paidUntil.setFullYear(paidUntil.getFullYear() + 1);
  } else {
    paidUntil.setMonth(paidUntil.getMonth() + 1);
  }

  await db
    .update(user)
    .set({
      level: 'paid',
      paidUntil,
      stripeCustomerId: customerId,
    })
    .where(eq(user.email, email));
}
```

**Better: Use Stripe subscription object directly**
Instead of calculating dates ourselves, we should use the subscription's `current_period_end` timestamp from Stripe. This is more accurate and handles edge cases.

**Additional webhook to handle:**
- `customer.subscription.updated` - When subscription renews, update paidUntil

**Updated `customer.subscription.deleted`:**
```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;
  await db
    .update(user)
    .set({
      level: 'free',
      paidUntil: null,
    })
    .where(eq(user.stripeCustomerId, subscription.customer as string));
  break;
}
```

#### 4. Helper Functions

**Create new helper:** `lib/payments/isUserPaid.ts`

```typescript
import { isPaymentRequired } from '@bragdoc/config';
import type { User } from '@/database/schema';

export function isUserPaid(user: User | null | undefined): boolean {
  // If payment not required (open source mode), everyone is "paid"
  if (!isPaymentRequired()) {
    return true;
  }

  if (!user || !user.paidUntil) {
    return false;
  }

  // Check if subscription is still active
  return new Date(user.paidUntil) > new Date();
}

// For server components
export async function requirePaidUser(user: User | null | undefined) {
  if (!isUserPaid(user)) {
    throw new Error('This feature requires a paid account');
  }
}

// For API routes
export function requirePaidUserResponse(user: User | null | undefined) {
  if (!isUserPaid(user)) {
    return NextResponse.json(
      { error: 'This feature requires a paid account' },
      { status: 403 }
    );
  }
  return null; // No error
}
```

**Use in API routes:**
```typescript
// Example: apps/web/app/api/documents/generate/route.ts
export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has paid access
  const paymentError = requirePaidUserResponse(auth.user);
  if (paymentError) return paymentError;

  // Proceed with LLM operations...
}
```

**Use in server components:**
```typescript
// Example: apps/web/app/(app)/reports/page.tsx
export default async function ReportsPage() {
  const session = await auth();

  if (!isUserPaid(session?.user)) {
    return <UpgradePrompt feature="Reports" />;
  }

  // Render reports page...
}
```

#### 5. Feature Gates Simplification

**Current:** Complex mapping of features to specific tiers
**Needed:** Simple paid/free check

**Update `packages/config/src/payment-gates.ts`:**

```typescript
// Remove the complex featureGates mapping
// Remove the requiresPayment function

// Just export these two functions:
export const isPaymentRequired = (): boolean => {
  return process.env.PAYMENT_TOKEN_REQUIRED === 'true';
};

// Simple check - do they have ANY paid plan?
export const isPaidUser = (paidUntil: Date | null | undefined): boolean => {
  if (!isPaymentRequired()) return true;
  if (!paidUntil) return false;
  return new Date(paidUntil) > new Date();
};
```

The `UserLevel` type and enum can be simplified, but the feature gate concept goes away.

#### 6. Plans Configuration Updates

**Simplify `lib/plans.ts`:**
- Remove three-tier structure
- Just need Free vs Paid
- Remove the complex feature lists (can be in marketing site)
- Focus on the Stripe price IDs and checkout links

#### 7. Auth Session Updates

**Update `apps/web/app/(auth)/auth.ts`:**
- Remove `renewalPeriod` from JWT/session
- Add `paidUntil` to JWT/session
- Update callbacks to include paidUntil

```typescript
declare module 'next-auth' {
  interface User {
    // ... existing fields
    level?: 'free' | 'paid';
    paidUntil?: Date | null;
  }
}

// In jwt callback:
if (user) {
  token.level = user.level;
  token.paidUntil = user.paidUntil;
}

// In session callback:
session.user.level = token.level as 'free' | 'paid';
session.user.paidUntil = token.paidUntil as Date | null;
```

---

## What Can Be Deleted 🗑️

### Definitely Delete
1. **Three-tier logic throughout codebase**
   - The 'basic' and 'pro' distinction
   - Complex feature gates mapping in `payment-gates.ts`

2. **`renewalPeriod` column and all references**
   - Not needed with `paidUntil` approach

3. **Complex plans.ts structure**
   - The detailed three-tier feature lists belong on marketing site
   - App just needs Stripe price IDs

### Consider Deleting
1. **`payment_intent.payment_failed` webhook handler**
   - Currently just logs, doesn't update user
   - Could add back later if needed for customer support

2. **`lastPayment` column**
   - Replaced by `paidUntil`
   - Could keep for analytics but not needed for functionality

3. **Payment links in create-stripe-products script**
   - If you're building custom checkout UI, may not need these
   - But they're useful for testing

---

## Recommended Implementation Plan

### Phase 1: Database Migration ✅

1. Add `paidUntil` timestamp column to User table
2. Migrate existing data:
   - Users with `level='basic'` or `level='pro'` and recent `lastPayment`: set `paidUntil`
   - Calculate based on `lastPayment` + 30 days (monthly) or 365 days (yearly)
3. Create migration to change `level` enum from 3 values to 2
4. Remove `renewalPeriod` column (or keep as deprecated, remove later)
5. Mark `lastPayment` as deprecated (can remove after migration verified)

### Phase 2: Stripe Products Update ✅

1. Run modified `create-stripe-products.ts` to create new product
2. Update environment variables for new price IDs
3. Keep old products/prices in Stripe (don't delete yet)
4. Update webhook handler to recognize both old and new lookup keys during transition

### Phase 3: Code Updates ✅

1. Create `isUserPaid()` helper function
2. Update webhook handler to use new logic
3. Update auth.ts to pass `paidUntil` through session
4. Add `requirePaidUser()` checks to all LLM-using endpoints:
   - `/api/documents/generate`
   - `/api/standups/*` (when created)
   - Any other AI features
5. Update UI to show upgrade prompts where needed

### Phase 4: UI for Stripe Checkout 🚧

This is the part you're still ideating on. Key considerations:

**Options:**
1. **Stripe Checkout (Hosted)** - Redirect to Stripe-hosted page
   - Pros: Stripe handles everything, PCI compliant, mobile optimized
   - Cons: Leaves your site
   - Best for: Open source transparency, quickest to implement

2. **Stripe Pricing Table (Embedded)** - Drop-in component
   - Pros: Stay on your site, Stripe handles form
   - Cons: Limited customization
   - Best for: Middle ground

3. **Stripe Elements (Custom)** - Full custom UI
   - Pros: Complete control, best UX
   - Cons: More code to maintain
   - Best for: When you want complete brand control

**Recommendation for open source project:** Start with Stripe Checkout or Pricing Table. They're fully functional, require minimal code, and are easier for self-hosters to understand and modify.

**Where to trigger checkout:**
- Upgrade button in navbar (when PAYMENT_TOKEN_REQUIRED=true and user not paid)
- Interstitial when trying to use paid features
- Settings/billing page
- Banner for free users

### Phase 5: Testing ✅

1. Update existing webhook tests for new schema
2. Test subscription creation
3. Test subscription renewal (using Stripe test clock)
4. Test subscription cancellation
5. Test grace period handling
6. Test both open source mode (PAYMENT_TOKEN_REQUIRED=false) and paid mode

### Phase 6: Cleanup 🧹

After everything is working:
1. Remove old Stripe products/prices (or archive them)
2. Remove `renewalPeriod` column
3. Remove `lastPayment` column
4. Delete unused code from `payment-gates.ts`
5. Simplify `plans.ts`
6. Update documentation

---

## Key Architectural Decisions

### Why `paidUntil` instead of checking Stripe API?

**Pros:**
- Single source of truth in our database
- Fast checks (no API call latency)
- Works even if Stripe is down
- Simple to implement and test
- Works in open source mode without Stripe

**Cons:**
- Must keep in sync via webhooks
- Could get out of sync if webhooks fail

**Mitigation:**
- Webhook reliability is high
- Can add a background job to sync from Stripe periodically
- Can add a "refresh subscription" button for users

### Why single paid tier instead of multiple?

**From your Notion docs:** The main split is "costs us LLM tokens" vs "doesn't cost us tokens". There's no strong reason for multiple paid tiers when the marginal cost per user is ~$1-2/year and you're charging $45-60/year.

**Advantages:**
- Simpler to explain: "Free (no AI) vs Paid (with AI)"
- Simpler to implement
- Easier pricing page
- Better for open source (less complexity)
- Can always add tiers later if needed

### How to handle grace periods?

**Recommendation:**
- Don't immediately revoke access when subscription ends
- Keep `paidUntil` date accurate
- Show warning banner when `paidUntil` is within 7 days
- Allow 3-day grace period before blocking features

This provides better UX and handles edge cases (payment failures, bank delays, etc.)

---

## Environment Variables Needed

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe dashboard or create-stripe-products script)
NEXT_PUBLIC_PAID_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_PAID_YEARLY_PRICE_ID=price_...

# Payment control
PAYMENT_TOKEN_REQUIRED=true  # false for open source mode
```

---

## UI Design Decisions

### 1. Where Subscription Status is Shown

**Answer:** Display subscription status on the existing `/account` page.

**What to show:**
- Current subscription status (Free or Paid)
- For paid users: Expiration date (`paidUntil`)
- Link to "Manage Subscription" (opens Stripe Customer Portal)
- Option to upgrade (for free users)

**Note:** Also show on marketing site, but that's a separate task.

### 2. Showing Paid Features to Free Users

**Answer:** YES - Free users should see the entire UI, as much as possible.

**Approach:**
- Don't hide features in the UI
- Let them navigate to paid feature pages
- Intercept actions with an "Upgrade Required" dialog when they try to use paid functionality
- This way, expired paid users naturally downgrade to free user experience

**Implementation needed:**
- Standard `<UpgradeDialog>` component
- Wrapper component with "asChild" pattern that can wrap any button/action
- Wrapper checks both:
  - User's paid status (`isUserPaid()`)
  - Whether payment is required (`PAYMENT_TOKEN_REQUIRED` env var)
- Open source self-hosters bypass the gate entirely

**Example usage:**
```tsx
<UpgradeGate feature="AI Reports">
  <Button>Generate Report</Button>
</UpgradeGate>

// Or in a click handler:
<Button onClick={() => {
  if (!isUserPaid && isPaymentRequired()) {
    showUpgradeDialog();
    return;
  }
  // Proceed with action
}}>
  Generate Report
</Button>
```

### 3. What Happens When Subscription Expires

**Answer:** User retains access to all data but loses paid feature functionality.

**Behavior:**
- All achievements, projects, companies remain accessible (view/edit)
- LLM-powered features become locked behind upgrade dialog
- User reverts to free tier experience seamlessly
- No data loss, no read-only mode
- Can re-subscribe at any time to regain access

**Grace period:** Not initially implemented, but `paidUntil` timestamp allows for this later if needed.

### 4. Subscription Management

**Answer:** Use Stripe Customer Portal (documented above in "Subscription Management & Cancellation" section).

### 5. Trial Period

**Answer:** No trial offer.

**Rationale:** The free tier is already generous and lets users do significant work (all CRUD operations, CLI with their own LLM key, data export). This serves as the trial.

### 6. Annual Discount Messaging

**Answer:** YES - Show savings badge and recommend annual plan.

**Implementation:**
- Pricing page should highlight "Save 25%" on yearly plan
- $5/month vs $45/year ($3.75/month) - saving $15/year
- Make yearly plan the default/recommended choice
- Use visual emphasis (badges, highlighting, "Most Popular" label)

### 7. Self-Hosted Version

**Answer:** YES - Prominently mention self-hosting option.

**Implementation:**
- Link to `https://www.bragdoc.ai/open-source` from pricing page
- Clear messaging: "Or run your own instance for free"
- Emphasize open source nature
- No hidden fees or gotchas

---

## Additional UI Requirements

### Navigation Badges

#### 1. Side Navigation - PRO Feature Badges

Free users should see a `(PRO)` badge next to navigation items that require a subscription.

**Examples:**
```
📊 Dashboard
✨ Achievements
📁 Projects
📊 Reports (PRO)        ← Badge for paid feature
🎯 Standups (PRO)       ← Badge for paid feature
⚙️  Settings
```

**Implementation:**
```tsx
// In side nav component
<NavItem
  href="/reports"
  icon={FileText}
  requiresPaid={true}  // Shows (PRO) badge if user is free
>
  Reports
</NavItem>
```

#### 2. Bottom Navigation - User Status Badge

In the bottom nav component (where logged-in user's name/avatar is shown), display a "FREE" or "PRO" badge.

**Visual design:**
- Badge overlaps bottom-right corner of avatar
- Small, subtle badge
- "FREE" badge: gray/muted
- "PRO" badge: accent color (blue/purple)

**Example:**
```tsx
// In bottom nav user menu
<div className="relative">
  <Avatar>
    <AvatarImage src={user.image} />
    <AvatarFallback>{user.name[0]}</AvatarFallback>
  </Avatar>
  <Badge
    className="absolute -bottom-1 -right-1 text-xs px-1 py-0"
    variant={isPaid ? "default" : "secondary"}
  >
    {isPaid ? "PRO" : "FREE"}
  </Badge>
</div>
```

### Upgrade Dialog Component

Need a reusable dialog component for upgrade prompts.

**Features:**
- Explains the feature being locked
- Shows pricing ($5/month or $45/year)
- "Upgrade Now" CTA button
- "Learn More" link to pricing page
- Link to self-hosting docs
- Only shows if `PAYMENT_TOKEN_REQUIRED=true`

**Wrapper component with asChild pattern:**

```tsx
// components/payments/UpgradeGate.tsx
'use client';

import { useSession } from 'next-auth/react';
import { isPaymentRequired } from '@bragdoc/config';
import { isUserPaid } from '@/lib/payments/isUserPaid';
import { UpgradeDialog } from './UpgradeDialog';
import { Slot } from '@radix-ui/react-slot';
import { useState } from 'react';

interface UpgradeGateProps {
  children: React.ReactElement;
  feature: string;
  asChild?: boolean;
}

export function UpgradeGate({
  children,
  feature,
  asChild = false
}: UpgradeGateProps) {
  const { data: session } = useSession();
  const [showDialog, setShowDialog] = useState(false);

  const needsUpgrade =
    isPaymentRequired() && !isUserPaid(session?.user);

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

**Usage examples:**

```tsx
// Wrap a button
<UpgradeGate feature="AI-Powered Reports" asChild>
  <Button>Generate Report</Button>
</UpgradeGate>

// Wrap a nav link
<UpgradeGate feature="Standup Documents" asChild>
  <Link href="/standups">View Standups</Link>
</UpgradeGate>

// Wrap any clickable element
<UpgradeGate feature="Advanced Analytics">
  <div className="cursor-pointer">
    View Analytics
  </div>
</UpgradeGate>
```

### Account Page Updates

The existing `/account` page needs to show subscription information:

```tsx
// apps/web/app/(app)/account/page.tsx (additions)

export default async function AccountPage() {
  const session = await auth();
  const isPaid = isUserPaid(session?.user);

  return (
    <div className="space-y-6">
      {/* Existing account info sections... */}

      {/* New: Subscription Status Section */}
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Subscription</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={isPaid ? "default" : "secondary"}>
              {isPaid ? "PRO" : "FREE"}
            </Badge>
          </div>

          {isPaid && session?.user?.paidUntil && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Renews on
              </span>
              <span className="text-sm font-medium">
                {new Date(session.user.paidUntil).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="pt-3 flex gap-2">
            {isPaid ? (
              <ManageSubscriptionButton />
            ) : (
              <Button asChild>
                <Link href="/pricing">Upgrade to PRO</Link>
              </Button>
            )}
          </div>

          {isPaymentRequired() && (
            <p className="text-xs text-muted-foreground">
              Or <a
                href="https://www.bragdoc.ai/open-source"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                self-host for free
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Subscription Management & Cancellation

**Decision:** Use **Stripe Customer Portal** for subscription management (cancellation, payment method updates, invoice viewing, etc.).

### Why Customer Portal?

**Advantages:**
- ✅ Minimal code to maintain (just one API endpoint)
- ✅ Stripe handles all the edge cases
- ✅ PCI compliant for payment method updates
- ✅ Professional UI that Stripe keeps updated
- ✅ Mobile responsive
- ✅ Perfect for open source (simple, transparent code)
- ✅ Only requires the `stripeCustomerId` we already have
- ✅ Handles cancellations, reactivations, payment methods, invoices automatically

**The only downside:** Users briefly leave your site, but return via the `return_url` you specify.

### Implementation

#### 1. API Endpoint for Portal Session

Create: `apps/web/app/api/stripe/create-portal-session/route.ts`

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
      return_url: `${process.env.NEXTAUTH_URL}/settings/billing`,
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

#### 2. UI Component for Settings Page

```typescript
// apps/web/components/settings/ManageSubscriptionButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

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
      setLoading(false);
      // Show error toast/notification
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

#### 3. Settings Page Integration

```typescript
// apps/web/app/(app)/settings/billing/page.tsx
import { auth } from '@/app/(auth)/auth';
import { ManageSubscriptionButton } from '@/components/settings/ManageSubscriptionButton';
import { isUserPaid } from '@/lib/payments/isUserPaid';

export default async function BillingSettingsPage() {
  const session = await auth();
  const isPaid = isUserPaid(session?.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isPaid ? 'Paid Account' : 'Free Account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isPaid
                ? `Your subscription is active until ${new Date(session?.user?.paidUntil).toLocaleDateString()}`
                : 'Upgrade to unlock AI-powered features'
              }
            </p>
          </div>

          <div>
            {isPaid ? (
              <ManageSubscriptionButton />
            ) : (
              <Button asChild>
                <a href="/pricing">Upgrade</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 4. Webhook Handling

The Customer Portal actions (cancellations, updates, etc.) trigger webhooks that your existing handler already partially supports. Ensure these events are handled:

```typescript
// In apps/web/app/api/stripe/callback/route.ts

case 'customer.subscription.updated': {
  // Handle subscription updates (renewals, reactivations, etc.)
  const subscription = event.data.object as Stripe.Subscription;

  // Get the subscription status and period end
  const isActive = subscription.status === 'active';
  const paidUntil = new Date(subscription.current_period_end * 1000);

  await db
    .update(user)
    .set({
      level: isActive ? 'paid' : 'free',
      paidUntil: isActive ? paidUntil : null,
    })
    .where(eq(user.stripeCustomerId, subscription.customer as string));
  break;
}

case 'customer.subscription.deleted': {
  // Already handled - revert to free
  const subscription = event.data.object as Stripe.Subscription;
  await db
    .update(user)
    .set({
      level: 'free',
      paidUntil: null,
    })
    .where(eq(user.stripeCustomerId, subscription.customer as string));
  break;
}
```

#### 5. Configure Customer Portal in Stripe

Before this works, configure the portal once in Stripe Dashboard:

1. Go to **Settings → Customer Portal**
2. **Enable** the portal
3. Configure allowed actions:
   - ✅ Cancel subscriptions
   - ✅ Update payment methods
   - ✅ View invoice history
   - ✅ Update billing information
4. Set cancellation behavior:
   - "Cancel at end of period" (recommended)
   - Or "Cancel immediately"
5. Add your branding (logo, colors)
6. Set business information

### Alternative: Custom Cancellation (Not Recommended)

If you wanted full control and to keep users on your site, you'd need to:

1. Store `stripeSubscriptionId` in User schema
2. Capture it in webhooks from `session.subscription`
3. Create cancel endpoint that calls `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
4. Build UI for payment method updates, invoice viewing, etc.

**But this is significantly more work** for little benefit. The Customer Portal is battle-tested and handles all edge cases.

---

## Summary

**Current state:** You have a working Stripe integration with a three-tier system (free/basic/pro) using level + renewalPeriod to track subscriptions and lastPayment timestamp.

**Desired state:** Simplified two-tier system (free/paid) with a single paid plan at two price points (monthly/yearly), using paidUntil timestamp to track subscription expiration.

**Main changes needed:**
1. Schema: Add `paidUntil`, simplify `level` enum, remove `renewalPeriod`
2. Stripe: One product instead of two, update lookup keys
3. Webhook: Calculate `paidUntil` from subscription dates
4. Code: Replace complex feature gates with simple `isUserPaid()` check
5. Auth: Pass `paidUntil` through sessions
6. UI: Build checkout flow (still in planning)

**What's good to keep:**
- Webhook handler structure
- Test coverage approach
- `stripeCustomerId` tracking
- `PAYMENT_TOKEN_REQUIRED` concept for open source mode

**What should be deleted:**
- Three-tier logic
- Complex feature gate mappings
- `renewalPeriod` column
- Overly complex plans.ts

**Next steps:**
1. Implement database migration (add `paidUntil`, update `level` enum)
2. Create Stripe products/prices
3. Update webhook handler
4. Build helper functions (`isUserPaid`, etc.)
5. Create UI components (`UpgradeGate`, `UpgradeDialog`, navigation badges)
6. Add subscription status to account page
7. Integrate Stripe Customer Portal
8. Add payment checks to LLM-using endpoints
