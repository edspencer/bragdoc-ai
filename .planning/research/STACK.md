# Stack Research: Credit Systems and Subscription Management

**Research Type:** Stack dimension for Stripe payment integration
**Date:** 2026-02-06
**Milestone Context:** Subsequent - Adding to existing Stripe integration

## Executive Summary

This research addresses what's needed to add simplified pricing ($45/year, $99 lifetime) and a credit system to BragDoc's existing Next.js app with Stripe v19.1.0 already integrated. The focus is on incremental additions, not rebuilding what exists.

**Core Recommendations:**
1. **Database-level credit tracking** (not Stripe Billing Credits) for simplicity and offline operation
2. **Simple integer fields on User table** for credit/message counters
3. **Add 'lifetime' value to renewalPeriod enum** (single enum change, minimal migration risk)
4. **Consolidate user level enum** from 4 tiers to 2 ('free', 'paid')
5. **Pino for audit logging** (existing Next.js ecosystem fit, structured JSON)

---

## 1. Credit System Approach

### Recommendation: Database-Level Credit Tracking

**Confidence: HIGH (95%)**

For BragDoc's simple credit model (10 LLM credits, 20 chat messages for free users), use database fields on the User table rather than Stripe Billing Credits.

#### Why NOT Stripe Billing Credits:
- Stripe Billing Credits require Billing Meters (new in 2025) which add complexity
- Credits only apply to metered subscription prices, not one-time purchases
- Overkill for simple "X free uses" gating
- Stripe's legacy Usage Records API deprecated in version 2025-03-31.basil
- Adds external dependency for feature gating decisions

#### Recommended Schema Addition:

```typescript
// Add to user table in packages/database/src/schema.ts
// Credit fields for free tier usage limits
freeCredits: integer('free_credits').notNull().default(10),
freeChatMessages: integer('free_chat_messages').notNull().default(20),
creditsResetAt: timestamp('credits_reset_at'),  // Optional: if credits refresh periodically
```

**Rationale:**
- Simple integer decrement operations are atomic and fast
- No external API calls during feature gating
- Works offline (important for CLI usage tracking)
- Trivially queryable for analytics
- Matches existing pattern in schema (simple fields on User table)

#### Alternative Considered: Separate Credits Table

```typescript
// NOT RECOMMENDED for this use case
export const creditTransaction = pgTable('CreditTransaction', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => user.id),
  amount: integer('amount').notNull(),  // positive = grant, negative = usage
  reason: varchar('reason', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Why not:** Append-only ledger pattern is appropriate for billing reconciliation (e.g., if using Stripe Credits), but adds unnecessary complexity for simple usage counting. The codebase doesn't have existing ledger patterns.

---

## 2. Subscription Model Changes

### 2.1 Yearly Subscription ($45/year)

**Confidence: HIGH (95%)**

Modify existing subscription flow minimally:

1. **Create new Stripe Price** for $45/year with lookup_key `paid_yearly`
2. **Update webhook handler** to parse new lookup_key format
3. **renewalPeriod enum already supports 'yearly'** - no change needed

The existing `updateUserSubscription()` function in `/apps/web/app/api/stripe/callback/route.ts` already parses `planId.split('_')` and handles yearly periods.

### 2.2 Lifetime Purchase ($99)

**Confidence: HIGH (90%)**

Use Stripe one-time Payment (PaymentIntent), not Subscription:

```typescript
// Add 'lifetime' to renewalPeriod enum
export const renewalPeriodEnum = pgEnum('renewal_period', [
  'monthly',
  'yearly',
  'lifetime',  // NEW
]);
```

**Stripe Setup:**
- Create one-time Price (not recurring) with lookup_key `paid_lifetime`
- Use Checkout Session with `mode: 'payment'` (not 'subscription')

**Webhook Changes:**
Update handler to detect lifetime purchase and set:
```typescript
{
  level: 'paid',           // New simplified level
  renewalPeriod: 'lifetime',
  lastPayment: new Date(),  // Tracks purchase date
  // Note: isActiveSubscription() logic needs update - lifetime never expires
}
```

### 2.3 User Level Simplification

**Confidence: MEDIUM (85%)**

Consolidate from 4 tiers to 2:

```typescript
// Current
export const userLevelEnum = pgEnum('user_level', ['free', 'basic', 'pro', 'demo']);

// Proposed
export const userLevelEnum = pgEnum('user_level', ['free', 'paid', 'demo']);
```

**Migration Strategy for Enum Changes (Critical):**

PostgreSQL doesn't support removing enum values directly. Drizzle-kit 0.26.2+ handles this with a workaround:

1. Alter columns from enum to text
2. Drop existing enum
3. Create new enum with updated values
4. Alter columns back to enum

**IMPORTANT:** Per [Drizzle enum migration guidance](https://github.com/drizzle-team/drizzle-orm/pull/4831), if columns have DEFAULT values using the enum, you must:
1. Drop the default first
2. Perform the enum migration
3. Re-add the default

**Recommended Approach:**
```sql
-- Migration file
ALTER TABLE "User" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "level" TYPE text;
DROP TYPE IF EXISTS "public"."user_level";
CREATE TYPE "public"."user_level" AS ENUM('free', 'paid', 'demo');
ALTER TABLE "User" ALTER COLUMN "level" TYPE user_level USING level::user_level;
ALTER TABLE "User" ALTER COLUMN "level" SET DEFAULT 'free';
```

**Data Migration:**
```sql
UPDATE "User" SET level = 'paid' WHERE level IN ('basic', 'pro');
```

---

## 3. Webhook Security for Open Source

**Confidence: HIGH (95%)**

### Current Implementation Analysis

The existing webhook handler at `/apps/web/app/api/stripe/callback/route.ts` already implements proper signature verification:

```typescript
event = stripe.webhooks.constructEvent(
  await (await req.blob()).text(),
  req.headers.get('stripe-signature') as string,
  process.env.STRIPE_WEBHOOK_SECRET as string,
);
```

### Security Best Practices for Open Source

1. **Secret Management (Already in place)**
   - Webhook secret stored in `STRIPE_WEBHOOK_SECRET` env var
   - Not committed to source control
   - Document in `.env.example` without actual values

2. **Signature Verification Enhancements**

```typescript
// Add timestamp validation (replay attack prevention)
const WEBHOOK_TOLERANCE = 300; // 5 minutes in seconds

event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET as string,
  WEBHOOK_TOLERANCE, // Stricter tolerance than default
);
```

3. **Idempotency (ADD THIS)**
   - Store processed event IDs to prevent duplicate processing
   - Stripe retries failed webhooks up to 3 days

```typescript
// Add to schema
export const stripeEvent = pgTable('StripeEvent', {
  id: varchar('id', { length: 64 }).primaryKey(), // Stripe event ID
  type: varchar('type', { length: 64 }).notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
});
```

4. **Rate Limiting**
   - Add rate limiting middleware to webhook endpoint
   - Protects against DDoS attempts

### What NOT to Do (Open Source Considerations)

- **Never hardcode webhook secrets** - the codebase is public
- **Never log full event payloads** - may contain PII
- **Never disable signature verification** for testing in production
- **Always use HTTPS** - Stripe requires it for live mode

---

## 4. Audit Logging

**Confidence: HIGH (90%)**

### Recommendation: Pino Logger

[Pino](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) is the recommended choice for Node.js audit logging:

**Why Pino:**
- 5-10x faster than Winston (critical for webhook processing)
- Structured JSON output by default
- Built-in log redaction for PII
- Native OpenTelemetry support for future observability
- Works well with Next.js and Cloudflare Workers deployment

**Installation:**
```bash
pnpm add pino pino-pretty
```

**Implementation Pattern for Payment Events:**

```typescript
// lib/logger.ts
import pino from 'pino';

export const paymentLogger = pino({
  name: 'payment-audit',
  level: process.env.LOG_LEVEL || 'info',
  redact: ['customer.email', 'payment_method'], // Redact PII
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Usage in webhook handler
paymentLogger.info({
  event: 'subscription_created',
  userId: user.id,
  plan: 'paid_yearly',
  stripeEventId: event.id,
  timestamp: new Date().toISOString(),
});
```

### Alternative: Winston

If complex routing needed (multiple destinations, different formats), [Winston](https://www.dash0.com/faq/the-top-5-best-node-js-and-javascript-logging-frameworks-in-2025-a-complete-guide) is viable but slower.

### What NOT to Use

- **Console.log** - No structure, no levels, no redaction
- **Bunyan** - Less maintained, Pino is its spiritual successor
- **Custom solutions** - Reinventing the wheel

---

## 5. Feature Gating Implementation

### Credit Check Pattern

```typescript
// lib/credits.ts
import type { User } from '@bragdoc/database';

export function canUseLLMFeature(user: User): boolean {
  // Paid users have unlimited access
  if (user.level === 'paid') {
    return true;
  }
  // Free users check credits
  return user.freeCredits > 0;
}

export function canUseChatbot(user: User): boolean {
  if (user.level === 'paid') {
    return true;
  }
  return user.freeChatMessages > 0;
}

export async function deductLLMCredit(userId: string, db: DrizzleDb): Promise<boolean> {
  const result = await db
    .update(user)
    .set({
      freeCredits: sql`${user.freeCredits} - 1`,
    })
    .where(
      and(
        eq(user.id, userId),
        gt(user.freeCredits, 0),
      )
    )
    .returning({ newCredits: user.freeCredits });

  return result.length > 0;
}
```

### isActiveSubscription Update

Update `/packages/database/src/models/user.ts`:

```typescript
export function isActiveSubscription(user: User): boolean {
  if (user.level === 'free') {
    return false;
  }

  // Lifetime purchases never expire
  if (user.renewalPeriod === 'lifetime') {
    return true;
  }

  if (!user.lastPayment) {
    return false;
  }

  const now = new Date();
  const lastPayment = new Date(user.lastPayment);

  if (user.renewalPeriod === 'monthly') {
    const nextPaymentDue = addMonths(lastPayment, 1);
    return isAfter(nextPaymentDue, now);
  } else {
    const nextPaymentDue = addYears(lastPayment, 1);
    return isAfter(nextPaymentDue, now);
  }
}
```

---

## 6. Migration Checklist

### Database Changes Required

1. **Add credit fields to User table**
   - `freeCredits` integer DEFAULT 10
   - `freeChatMessages` integer DEFAULT 20

2. **Add 'lifetime' to renewalPeriod enum**
   - Simple addition, no data migration needed

3. **Simplify userLevel enum** (Optional, can defer)
   - Migrate 'basic'/'pro' to 'paid'
   - Handle enum change per Drizzle best practices

4. **Add StripeEvent table for idempotency**
   - Simple varchar primary key table

### Stripe Dashboard Changes

1. Create new Price: $45/year with lookup_key `paid_yearly`
2. Create new Price: $99 lifetime (one-time) with lookup_key `paid_lifetime`
3. Update webhook to listen for both subscription and payment events

### Code Changes

1. Update webhook handler for new lookup keys
2. Add credit deduction logic to LLM/chat endpoints
3. Update `isActiveSubscription()` for lifetime handling
4. Add Pino logger for audit trail
5. Update plans.ts with new pricing structure

---

## 7. Quality Gate Verification

- [x] Recommendations specific to ADDING to existing Stripe integration
- [x] Security considerations for open source payment code (webhook secrets, signature verification, idempotency)
- [x] Database schema patterns validated against Drizzle ORM best practices (enum migrations, simple fields)
- [x] Confidence levels assigned to each recommendation

---

## Sources

### Stripe Documentation
- [Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=elements)
- [Billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits)
- [Set up a credit-based pricing model](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model)
- [One-time payment guide](https://stripe.com/resources/more/what-is-a-one-time-payment-a-guide-for-businesses)
- [Webhook signature verification](https://docs.stripe.com/webhooks/signature)
- [Receive Stripe webhook events](https://docs.stripe.com/webhooks)

### Drizzle ORM
- [Drizzle ORM PostgreSQL Best Practices Guide (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)
- [The Ultimate Guide to Drizzle ORM + PostgreSQL (2025)](https://dev.to/sameer_saleem/the-ultimate-guide-to-drizzle-orm-postgresql-2025-edition-22b)
- [Enum migration discussion](https://github.com/drizzle-team/drizzle-orm/discussions/3192)
- [Fix enum migration when dropping values](https://github.com/drizzle-team/drizzle-orm/pull/4831)

### Logging
- [Pino vs Winston comparison](https://dev.to/wallacefreitas/pino-vs-winston-choosing-the-right-logger-for-your-nodejs-application-369n)
- [Complete Guide to Pino Logging](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [Top 5 Node.js Logging Frameworks in 2025](https://www.dash0.com/faq/the-top-5-best-node-js-and-javascript-logging-frameworks-in-2025-a-complete-guide)

### Webhook Security
- [Stripe Webhooks Implementation Guide 2025](https://www.hooklistener.com/learn/stripe-webhooks-implementation)
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)
- [Ultimate Guide to Securely Handling Stripe Webhooks](https://moldstud.com/articles/p-ultimate-guide-to-securely-handling-stripe-webhooks-in-your-application)

### Credit Systems
- [Stripe Metered Billing & SaaS Credits System Integration](https://colorwhistle.com/stripe-saas-credits-billing/)
- [Credit-Based Billing for AI SaaS Apps](https://makerkit.dev/docs/next-supabase-turbo/billing/credit-based-billing)
- [What is a credits subscription model?](https://stripe.com/resources/more/what-is-a-credits-based-subscription-model-and-how-does-it-work)
