# Phase 3: Subscription Management - Research

**Researched:** 2026-02-06
**Domain:** Stripe webhook handling, subscription management, one-time payments, idempotency
**Confidence:** HIGH

## Summary

This phase updates the existing Stripe integration to support the simplified pricing model ($45/year and $99 lifetime) with robust webhook handling. The research focused on four key areas: (1) webhook handler updates for new plan types including one-time lifetime payments, (2) idempotency implementation to prevent duplicate processing, (3) stripeCustomerId-first lookup strategy for reliability, and (4) subscription status helper functions.

The existing webhook handler at `apps/web/app/api/stripe/callback/route.ts` provides a solid foundation but requires several updates: removing the old `planId.split('_')` parsing in favor of lookup_key-based detection, adding a StripeEvent table for idempotency, prioritizing stripeCustomerId lookup over email, and wrapping all updates in database transactions. The handler must also distinguish between one-time payments (lifetime) and subscriptions (yearly) in checkout.session.completed events.

Key insight: Stripe's Price object has a `type` field (`one_time` vs `recurring`) that determines whether a checkout was for a subscription or one-time purchase. The lookup_key allows plan identification without parsing structured strings.

**Primary recommendation:** Add StripeEvent table for idempotency, parse lookup_key directly (not split by underscore), check price.type for payment mode, and use stripeCustomerId as primary user lookup with email fallback.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 19.1.0+ | Stripe API client | Already in use, mature SDK |
| drizzle-orm | 0.44.6 | Database operations | Already in use, supports transactions |
| @bragdoc/database | - | Centralized database layer | Houses schema, queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pino | 9.x | Structured logging | Replace console.log in payment paths |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate StripeEvent table | Processed flag on user | StripeEvent allows audit trail and scales better |
| lookup_key parsing | Price ID hardcoding | lookup_key is more maintainable |

**Installation:** No new packages needed - stripe and drizzle already present.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/api/stripe/callback/
│   └── route.ts           # Webhook handler (update existing)
├── lib/stripe/
│   ├── stripe.ts          # Stripe client (existing)
│   ├── webhook-handler.ts # NEW: Business logic extraction
│   └── subscription.ts    # NEW: Subscription status helpers
packages/database/src/
├── schema.ts              # Add StripeEvent table
└── stripe-events/
    └── queries.ts         # Idempotency check functions
```

### Pattern 1: Webhook Idempotency Check
**What:** Store and check Stripe event IDs before processing
**When to use:** Every webhook handler, before any business logic
**Example:**
```typescript
// Source: https://docs.stripe.com/webhooks (Stripe best practices)
// Store processed events to handle retries safely

export const stripeEvent = pgTable('StripeEvent', {
  id: varchar('id', { length: 64 }).primaryKey(), // Stripe event ID (evt_xxx)
  type: varchar('type', { length: 64 }).notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
});

// In webhook handler:
async function processWebhook(event: Stripe.Event) {
  // Check if already processed
  const existing = await db
    .select()
    .from(stripeEvent)
    .where(eq(stripeEvent.id, event.id))
    .limit(1);

  if (existing.length > 0) {
    return { status: 200, message: 'Already processed' };
  }

  // Process and record
  await db.transaction(async (tx) => {
    // Insert event record first (idempotency key)
    await tx.insert(stripeEvent).values({
      id: event.id,
      type: event.type,
    });

    // Then process business logic
    await handleEvent(event, tx);
  });
}
```

### Pattern 2: Lookup Key Plan Detection
**What:** Use lookup_key from Price object to identify plan type
**When to use:** checkout.session.completed event handling
**Example:**
```typescript
// Source: https://docs.stripe.com/api/prices/object
// lookup_key identifies the plan without parsing structured strings

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price'],
  });

  const price = expandedSession.line_items?.data[0]?.price;
  if (!price) return;

  const lookupKey = price.lookup_key; // 'yearly' or 'lifetime'
  const isOneTime = price.type === 'one_time'; // true for lifetime

  // Map lookup_key to user fields
  const updates = {
    level: 'paid',
    renewalPeriod: lookupKey === 'lifetime' ? 'lifetime' : 'yearly',
    lastPayment: new Date(),
    stripeCustomerId: session.customer as string,
  };
}
```

### Pattern 3: stripeCustomerId-First Lookup
**What:** Look up user by stripeCustomerId, fall back to email
**When to use:** All webhook handlers that update user state
**Example:**
```typescript
// Source: Phase requirements SUBSCRIPTION-03
// Primary lookup by stripeCustomerId, email as fallback

async function findUserForWebhook(
  customerId: string,
  email: string | null,
  tx: DrizzleTx,
): Promise<{ userId: string; lookupMethod: 'customerId' | 'email' } | null> {
  // Try stripeCustomerId first (reliable)
  if (customerId) {
    const byCustomerId = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.stripeCustomerId, customerId))
      .limit(1);

    if (byCustomerId.length > 0) {
      return { userId: byCustomerId[0].id, lookupMethod: 'customerId' };
    }
  }

  // Fallback to email (log warning when used)
  if (email) {
    const byEmail = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (byEmail.length > 0) {
      // Log for monitoring - indicates stripeCustomerId not set
      console.warn(`Webhook lookup by email fallback for ${email}`);
      return { userId: byEmail[0].id, lookupMethod: 'email' };
    }
  }

  return null;
}
```

### Pattern 4: Lifetime User Handling in Cancellation
**What:** Skip subscription deletion for lifetime users
**When to use:** customer.subscription.deleted event handler
**Example:**
```typescript
// Source: Phase requirements SUBSCRIPTION-02
// Lifetime purchases are one-time payments, not subscriptions

case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  // Check if this is a lifetime user (they shouldn't have subscriptions,
  // but handle edge case if webhook arrives out of order)
  const userRecord = await tx
    .select({ renewalPeriod: user.renewalPeriod })
    .from(user)
    .where(eq(user.stripeCustomerId, customerId))
    .limit(1);

  // Skip if user is lifetime (one-time purchase, not a subscription)
  if (userRecord[0]?.renewalPeriod === 'lifetime') {
    break;
  }

  // Revert to free tier
  await tx
    .update(user)
    .set({
      level: 'free',
      lastPayment: null,
    })
    .where(eq(user.stripeCustomerId, customerId));
  break;
}
```

### Pattern 5: Subscription Status Helper
**What:** Determine if user has active paid access
**When to use:** Feature gating, UI display
**Example:**
```typescript
// Source: Phase requirements SUBSCRIPTION-06
// Centralized subscription status check

export type SubscriptionStatus = {
  isActive: boolean;
  type: 'free' | 'yearly' | 'lifetime' | 'demo';
  expiresAt?: Date;
};

export function getSubscriptionStatus(user: User): SubscriptionStatus {
  // Demo users always have unlimited access
  if (user.level === 'demo') {
    return { isActive: true, type: 'demo' };
  }

  // Free users have credit-limited access
  if (user.level === 'free') {
    return { isActive: false, type: 'free' };
  }

  // Paid users: check renewal period
  if (user.level === 'paid') {
    // Lifetime never expires
    if (user.renewalPeriod === 'lifetime') {
      return { isActive: true, type: 'lifetime' };
    }

    // Yearly: check if within renewal window
    if (user.renewalPeriod === 'yearly' && user.lastPayment) {
      const lastPayment = new Date(user.lastPayment);
      const expiresAt = new Date(lastPayment);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const isActive = expiresAt > new Date();
      return { isActive, type: 'yearly', expiresAt };
    }
  }

  // Default to free (handles legacy basic/pro values)
  return { isActive: false, type: 'free' };
}
```

### Anti-Patterns to Avoid
- **Parsing lookup_key with split('_'):** The old `planId.split('_')` pattern assumes a structure that doesn't exist for the new plans. Use lookup_key directly.
- **User lookup by email only:** Email can change, leading to orphaned payments. Always try stripeCustomerId first.
- **Processing without idempotency check:** Stripe retries webhooks. Without idempotency, duplicate processing occurs.
- **Console.log in production payment code:** Exposes PII. Use structured logger with redaction.
- **Multiple UPDATE statements:** Risk of partial state. Use single UPDATE or transaction.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature verification | Custom HMAC | `stripe.webhooks.constructEvent()` | Edge cases, timing attacks |
| Event deduplication | In-memory set | Database StripeEvent table | Survives restarts, multi-instance |
| Subscription expiry check | Manual date math | `getSubscriptionStatus()` helper | Centralized, handles edge cases |
| Price lookup | Hardcoded price IDs | lookup_key from Price object | Maintainable, env-independent |

**Key insight:** Stripe webhooks retry for up to 3 days. Any stateful operation must be idempotent. The simplest reliable approach is a database table of processed event IDs.

## Common Pitfalls

### Pitfall 1: Duplicate Webhook Processing
**What goes wrong:** Stripe retries webhooks, user gets double credits or duplicate state updates
**Why it happens:** No idempotency check, webhook handler assumes single delivery
**How to avoid:** Store event.id in StripeEvent table before processing, check existence first
**Warning signs:** Users report credits jumping, audit logs show duplicate timestamps

### Pitfall 2: Email-Based User Lookup Failure
**What goes wrong:** Payment succeeds in Stripe, but user record not updated
**Why it happens:** User changed email after creating Stripe customer, lookup by email fails
**How to avoid:** Use stripeCustomerId as primary lookup, email as fallback with logging
**Warning signs:** 0 rows updated in webhook logs, customer complaints "payment went through but still free"

### Pitfall 3: Lifetime User Downgraded on Cancellation
**What goes wrong:** Lifetime user reverted to free when subscription.deleted fires
**Why it happens:** Handler doesn't check renewalPeriod before downgrading
**How to avoid:** Check `renewalPeriod === 'lifetime'` and skip downgrade logic
**Warning signs:** Lifetime users complaining about lost access

### Pitfall 4: Partial Payment State
**What goes wrong:** User has `level: 'paid'` but `lastPayment: null`
**Why it happens:** Multiple UPDATE statements, crash between them
**How to avoid:** Single UPDATE with all fields, or use database transaction
**Warning signs:** Database inconsistencies, users with paid level but missing payment date

### Pitfall 5: PII in Production Logs
**What goes wrong:** Customer email, payment amounts appear in CloudWatch/logging service
**Why it happens:** console.log statements in payment code paths (existing code has many)
**How to avoid:** Remove all console.log from payment paths, use Pino with redaction
**Warning signs:** Compliance audit failures, PII in log exports

### Pitfall 6: Webhook Signature Timeout
**What goes wrong:** Signature verification fails intermittently
**Why it happens:** Stripe enforces 5-minute tolerance for replay attack prevention
**How to avoid:** Process webhooks immediately, don't queue for later signature verification
**Warning signs:** Intermittent signature verification errors in production logs

## Code Examples

Verified patterns from official sources:

### Complete Webhook Handler Structure
```typescript
// Source: Stripe docs + project patterns
export async function POST(req: Request) {
  let event: Stripe.Event;

  // 1. Verify signature immediately
  try {
    event = stripe.webhooks.constructEvent(
      await (await req.blob()).text(),
      req.headers.get('stripe-signature') as string,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Check idempotency
  const existing = await db
    .select()
    .from(stripeEvent)
    .where(eq(stripeEvent.id, event.id));

  if (existing.length > 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 3. Process in transaction
  try {
    await db.transaction(async (tx) => {
      // Record event first (idempotency key)
      await tx.insert(stripeEvent).values({
        id: event.id,
        type: event.type,
      });

      // Handle event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutComplete(event, tx);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(event, tx);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event, tx);
          break;
      }
    });
  } catch (error) {
    // Return 500 to trigger Stripe retry
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

### checkout.session.completed Handler
```typescript
// Source: Stripe docs for checkout.session.completed
async function handleCheckoutComplete(
  event: Stripe.Event,
  tx: DrizzleTx,
) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Skip if not paid
  if (session.payment_status !== 'paid') return;

  // Get line items with price
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price'],
  });

  const price = expandedSession.line_items?.data[0]?.price;
  if (!price?.lookup_key) return;

  // Determine plan type
  const isLifetime = price.type === 'one_time';
  const renewalPeriod = isLifetime ? 'lifetime' : 'yearly';

  // Find user
  const userLookup = await findUserForWebhook(
    session.customer as string,
    session.customer_details?.email ?? null,
    tx,
  );

  if (!userLookup) {
    throw new Error(`User not found for customer ${session.customer}`);
  }

  // Update user
  await tx
    .update(user)
    .set({
      level: 'paid',
      renewalPeriod,
      lastPayment: new Date(),
      stripeCustomerId: session.customer as string,
    })
    .where(eq(user.id, userLookup.userId));
}
```

### invoice.paid Handler (Renewals)
```typescript
// Source: Stripe subscription webhook docs
async function handleInvoicePaid(
  event: Stripe.Event,
  tx: DrizzleTx,
) {
  const invoice = event.data.object as Stripe.Invoice;

  // Only handle subscription invoices
  if (!invoice.subscription) return;

  const customerId = invoice.customer as string;

  // Update last payment date for yearly renewals
  await tx
    .update(user)
    .set({
      lastPayment: new Date(),
    })
    .where(eq(user.stripeCustomerId, customerId));
}
```

### StripeEvent Table Schema
```typescript
// Add to packages/database/src/schema.ts
export const stripeEvent = pgTable('StripeEvent', {
  id: varchar('id', { length: 64 }).primaryKey(), // evt_xxx format
  type: varchar('type', { length: 64 }).notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
});

export type StripeEvent = InferSelectModel<typeof stripeEvent>;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `planId.split('_')` parsing | lookup_key direct use | Current | More flexible, no string format dependency |
| Email-only user lookup | stripeCustomerId + email fallback | Current | Reliable even if user changes email |
| No idempotency | StripeEvent table | Current | Handles Stripe retries safely |
| Multiple UPDATE calls | Single UPDATE or transaction | Current | Prevents partial state |

**Deprecated/outdated:**
- The old `basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly` lookup keys are being replaced with `yearly` and `lifetime`
- Usage Records API deprecated in Stripe 2025-03-31.basil

## Open Questions

Things that couldn't be fully resolved:

1. **Stripe Dashboard Product Creation**
   - What we know: SUBSCRIPTION-01 requires manual dashboard setup for products
   - What's unclear: Exact steps for archiving old products vs creating new ones
   - Recommendation: Document in implementation notes, not automated

2. **Payment Links client_reference_id**
   - What we know: Payment Links can include client_reference_id for user association
   - What's unclear: Whether BragDoc uses Payment Links or Checkout Sessions
   - Recommendation: If using Payment Links, ensure client_reference_id is passed

3. **Grace Period for Yearly Renewals**
   - What we know: getSubscriptionStatus checks if within 1 year of lastPayment
   - What's unclear: Should there be a grace period before access revocation?
   - Recommendation: Start with strict 1-year check, add grace period if needed

## Sources

### Primary (HIGH confidence)
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) - Best practices, idempotency, signature verification
- [Stripe Checkout Session Object](https://docs.stripe.com/api/checkout/sessions/object) - Mode field, customer_details
- [Stripe Price Object](https://docs.stripe.com/api/prices/object) - lookup_key, type field (one_time vs recurring)
- [Stripe Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) - Lifecycle events

### Secondary (MEDIUM confidence)
- [Stigg Blog: Stripe Webhook Best Practices](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) - Event ordering, idempotency patterns
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) - Database idempotency patterns

### Tertiary (LOW confidence)
- Project files: `apps/web/app/api/stripe/callback/route.ts` - Existing patterns
- Project files: `apps/web/lib/credits/check.ts` - Level checking patterns

## Metadata

**Confidence breakdown:**
- Webhook handler patterns: HIGH - Official Stripe docs verified
- Idempotency implementation: HIGH - Standard pattern, multiple sources agree
- stripeCustomerId lookup: HIGH - Based on existing schema and requirements
- Subscription status helper: MEDIUM - Based on project patterns, needs validation
- Lifetime handling: HIGH - Stripe Price.type distinguishes one_time vs recurring

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain)
