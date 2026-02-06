# Architecture Research: Credit Systems and Simplified Subscription Management

**Analysis Date:** 2026-02-06
**Research Dimension:** Architecture for credit tracking and simplified subscription model
**Context:** Subsequent milestone - integration with existing Next.js + Stripe architecture

---

## Executive Summary

This document defines the architecture for BragDoc's simplified pricing model: credit-based access control for LLM features with two subscription options ($45/year or $99 lifetime). The architecture integrates with the existing Next.js 16 + Stripe + Drizzle ORM stack, leveraging established patterns while introducing minimal new abstractions.

**Key Architectural Decisions:**
- Credit tracking as simple database counters (not a ledger)
- Feature gates check subscription status OR credit balance
- Webhook-driven subscription state management
- UI components for credit display and upgrade prompts

---

## Component Boundaries

### 1. Credit Tracking System

**Purpose:** Track and decrement credits for free users consuming LLM features.

**Boundary:** Database fields + deduction helper functions. No separate service or microservice.

**Location:**
- Schema: `packages/database/src/schema.ts` (User table)
- Deduction logic: `apps/web/lib/credits.ts` (new file)
- Query helpers: `packages/database/src/models/user.ts`

**Responsibilities:**
- Store credit balances (`freeCredits`, `freeChatMessages`)
- Provide atomic decrement operations
- Check credit availability before LLM operations
- Never go below zero (fail gracefully)

**Does NOT handle:**
- Credit purchasing or refills
- Credit history/audit trail (separate concern)
- Rate limiting (separate middleware)

### 2. Feature Gate System (Enhanced)

**Purpose:** Control access to LLM-powered features based on subscription status or credit balance.

**Boundary:** Extends existing `packages/config/src/payment-gates.ts` pattern.

**Location:**
- Config: `packages/config/src/payment-gates.ts` (update)
- Gate check: `apps/web/lib/feature-access.ts` (new file)

**Responsibilities:**
- Define which features require payment or credits
- Check user eligibility (paid OR has credits)
- Return actionable result (allowed, upgrade_required, credits_exhausted)

**Integration Points:**
- API routes call gate check before LLM operations
- Server components check gates for UI rendering
- CLI validates access before expensive operations

### 3. Subscription Management (Simplified)

**Purpose:** Track user subscription status (free/paid/lifetime).

**Boundary:** Database fields + Stripe webhook handler.

**Location:**
- Schema: `packages/database/src/schema.ts` (User table enums)
- Webhook: `apps/web/app/api/stripe/callback/route.ts`
- Status helpers: `packages/database/src/models/user.ts`

**Responsibilities:**
- Update user level on successful payment
- Handle subscription cancellation (revert to free)
- Recognize lifetime purchases (no expiry checks)
- Store Stripe customer ID for portal access

### 4. Upgrade Prompt System

**Purpose:** Guide users to upgrade when credits exhausted or feature requires payment.

**Boundary:** React components + context provider.

**Location:**
- Context: `apps/web/contexts/upgrade-prompt-context.tsx` (new)
- Modal: `apps/web/components/upgrade-prompt-modal.tsx` (new)
- Banner: `apps/web/components/credit-status-banner.tsx` (new)

**Responsibilities:**
- Display credit balance in UI
- Show contextual upgrade prompts
- Provide direct links to Stripe payment

### 5. Audit Logging (Security)

**Purpose:** Track credit usage for security review and debugging.

**Boundary:** Database table with write-only inserts.

**Location:**
- Schema: `packages/database/src/schema.ts` (CreditLog table)
- Logger: `apps/web/lib/credits.ts` (integrated with deduction)

**Responsibilities:**
- Record every credit deduction with timestamp, user, operation
- Enable security audits of credit consumption patterns
- Support debugging of unexpected credit usage

---

## Data Flow Diagrams

### Credit Deduction Flow

```
User Action (e.g., "Generate Document")
         │
         ▼
┌─────────────────────────────┐
│  API Route Handler          │
│  /api/documents/generate    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  checkFeatureAccess()       │
│  - Is user paid? → ALLOW    │
│  - Has credits? → ALLOW     │
│  - Neither → DENY           │
└──────────┬──────────────────┘
           │
           ▼ (if allowed)
┌─────────────────────────────┐
│  deductCredit()             │
│  - Atomic UPDATE user       │
│  - SET freeCredits = -1     │
│  - WHERE freeCredits > 0    │
│  - Insert CreditLog         │
└──────────┬──────────────────┘
           │
           ▼ (if successful)
┌─────────────────────────────┐
│  Execute LLM Operation      │
│  - Generate document        │
│  - Stream response          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Return Result              │
│  - Include credit balance   │
│  - Trigger UI update        │
└─────────────────────────────┘
```

### Stripe Webhook Flow

```
Stripe Event (checkout.session.completed)
         │
         ▼
┌─────────────────────────────┐
│  /api/stripe/callback       │
│  - Verify webhook signature │
│  - Parse event type         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Extract Plan from Price    │
│  - lookup_key: "yearly"     │
│  - lookup_key: "lifetime"   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Update User Record         │
│  - level: "paid"            │
│  - renewalPeriod: "yearly"  │
│  - lastPayment: now()       │
│  - stripeCustomerId: id     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Return 200 to Stripe       │
└─────────────────────────────┘
```

### Feature Gate Check Flow

```
                    ┌───────────────────────┐
                    │ checkFeatureAccess()  │
                    │ (feature, userId)     │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │ Is user.level │   │ Is user.level │   │ Has credits?  │
    │ === 'paid'?   │   │ === 'demo'?   │   │ freeCredits>0 │
    └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
            │ yes               │ yes               │ yes
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │ ALLOW         │   │ ALLOW         │   │ ALLOW         │
    │ (no deduct)   │   │ (no deduct)   │   │ (will deduct) │
    └───────────────┘   └───────────────┘   └───────────────┘
            │ no                │ no                │ no
            └───────────────────┼───────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │ DENY                  │
                    │ return upgrade_needed │
                    └───────────────────────┘
```

### UI Credit Display Flow

```
Page Load (Server Component)
         │
         ▼
┌─────────────────────────────┐
│  getSession() + getUser()   │
│  - Fetch user.freeCredits   │
│  - Fetch user.level         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Pass to Client Component   │
│  <CreditStatusProvider>     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  CreditStatusBanner         │
│  - Show "X credits left"    │
│  - Hide if paid user        │
└──────────┬──────────────────┘
           │
           ▼ (credits exhausted)
┌─────────────────────────────┐
│  UpgradePromptModal         │
│  - Show pricing options     │
│  - Link to Stripe payment   │
└─────────────────────────────┘
```

---

## Data Model Changes

### User Table Extensions

```sql
-- Modify existing enum (requires migration)
ALTER TYPE user_level RENAME VALUE 'basic' TO 'paid';
DROP TYPE IF EXISTS user_level CASCADE;
CREATE TYPE user_level AS ENUM ('free', 'paid', 'demo');

-- Add renewal period for lifetime
ALTER TYPE renewal_period ADD VALUE IF NOT EXISTS 'lifetime';

-- Add credit tracking fields
ALTER TABLE "User" ADD COLUMN free_credits INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "User" ADD COLUMN free_chat_messages INTEGER NOT NULL DEFAULT 20;
```

### Credit Log Table (New)

```sql
CREATE TABLE "CreditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  operation VARCHAR(64) NOT NULL,  -- 'document_generation', 'workstream_clustering', etc.
  credits_used INTEGER NOT NULL DEFAULT 1,
  credits_remaining INTEGER NOT NULL,
  metadata JSONB,  -- Optional: store context (document_id, feature_name, etc.)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX credit_log_user_id_idx ON "CreditLog"(user_id);
CREATE INDEX credit_log_created_at_idx ON "CreditLog"(created_at);
```

### Drizzle Schema Additions

```typescript
// packages/database/src/schema.ts

// Update enum values
export const userLevelEnum = pgEnum('user_level', ['free', 'paid', 'demo']);
export const renewalPeriodEnum = pgEnum('renewal_period', ['monthly', 'yearly', 'lifetime']);

// Add fields to user table
export const user = pgTable('User', {
  // ... existing fields ...

  // Credit tracking
  freeCredits: integer('free_credits').notNull().default(10),
  freeChatMessages: integer('free_chat_messages').notNull().default(20),
});

// New credit log table
export const creditLog = pgTable('CreditLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  operation: varchar('operation', { length: 64 }).notNull(),
  creditsUsed: integer('credits_used').notNull().default(1),
  creditsRemaining: integer('credits_remaining').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('credit_log_user_id_idx').on(table.userId),
  createdAtIdx: index('credit_log_created_at_idx').on(table.createdAt),
}));
```

---

## Build Order Recommendations

The following build order minimizes dependencies and enables incremental testing:

### Phase 1: Database Foundation

1. **Schema migration** - Add new fields to User table, create CreditLog table
2. **Enum updates** - Update userLevelEnum and renewalPeriodEnum values
3. **Query helpers** - Add credit-related functions to user model

**Why first:** All other components depend on the data model being correct.

**Testing:** Unit tests for new queries, migration verification on dev database.

### Phase 2: Credit Deduction System

1. **Credit service** - `apps/web/lib/credits.ts` with deduct/check functions
2. **Atomic operations** - Ensure thread-safe credit decrements
3. **Audit logging** - Insert CreditLog on every deduction

**Why second:** Feature gates need to call credit checks; can't build gates without this.

**Testing:** Unit tests for deduction logic, integration tests for atomicity.

### Phase 3: Feature Gate Integration

1. **Update payment-gates.ts** - Add credit-based gate type
2. **Create feature-access.ts** - Unified access check combining subscription + credits
3. **Integrate with API routes** - Add gate checks to LLM-powered endpoints

**Why third:** Depends on credit system; blocks LLM operations until implemented.

**Testing:** Integration tests for each gated endpoint, manual testing of upgrade flows.

### Phase 4: Stripe Webhook Updates

1. **Update webhook handler** - Handle new plan types (yearly, lifetime)
2. **Update user on payment** - Set level to 'paid', appropriate renewalPeriod
3. **Handle cancellation** - Revert to 'free' level

**Why fourth:** Independent of credit system; can be tested with Stripe CLI.

**Testing:** Stripe webhook testing with CLI, production smoke tests.

### Phase 5: UI Components

1. **Credit status context** - React context for credit balance
2. **Credit banner** - Display remaining credits
3. **Upgrade prompt modal** - Show when credits exhausted
4. **Integration** - Wire into existing layouts

**Why fifth:** Depends on all backend systems; final user-facing layer.

**Testing:** Component tests, E2E tests with Playwright, manual UX review.

### Phase 6: Cleanup and Polish

1. **Remove old pricing tiers** - Delete Basic/Pro from plans.ts, marketing
2. **Update environment variables** - New Stripe price IDs
3. **Documentation** - Update CLAUDE.md with new payment architecture

---

## Integration Points with Existing System

### Authentication Integration

**Location:** `apps/web/lib/getAuthUser.ts`

The existing unified auth helper returns the full User object. Credit checks simply access `user.freeCredits` and `user.level` from the returned object. No changes needed to auth flow.

```typescript
// In API route
const auth = await getAuthUser(request);
if (!auth?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Credit check uses auth.user directly
const access = await checkFeatureAccess('document_generation', auth.user);
```

### LLM Feature Integration

**Affected files:**
- `apps/web/lib/ai/generate-document.ts` - Document generation
- `apps/web/lib/ai/workstreams.ts` - Workstream clustering/naming
- `apps/web/app/api/performance-review/chat/route.ts` - Performance review chatbot
- `apps/web/app/api/chat/route.ts` - General chatbot

**Pattern:** Wrap LLM calls with credit check:

```typescript
// Before LLM operation
const access = await checkFeatureAccess('document_generation', user);
if (!access.allowed) {
  return NextResponse.json({
    error: access.reason,
    upgradeUrl: '/pricing'
  }, { status: 403 });
}

// Deduct credit if free user
if (user.level === 'free') {
  const deducted = await deductCredit(user.id, 'document_generation');
  if (!deducted) {
    return NextResponse.json({ error: 'Credits exhausted' }, { status: 403 });
  }
}

// Proceed with LLM operation
const result = await generateDocument(...);
```

### Stripe Integration

**Existing:** `apps/web/app/api/stripe/callback/route.ts`

**Changes needed:**
- Extract plan type from `lookup_key` (yearly vs lifetime)
- Update user level to 'paid' instead of 'basic'/'pro'
- Set `renewalPeriod` to 'yearly' or 'lifetime'
- Handle lifetime as subscription without expiry

```typescript
// Extract from line items
const lookupKey = price.lookup_key; // 'yearly' or 'lifetime'

await db.update(user).set({
  level: 'paid',
  renewalPeriod: lookupKey === 'lifetime' ? 'lifetime' : 'yearly',
  lastPayment: new Date(),
  stripeCustomerId: customerId,
}).where(eq(user.email, email));
```

### Subscription Status Helpers

**Existing:** `packages/database/src/models/user.ts`

**Changes needed:**

```typescript
export function isActiveSubscription(user: User): boolean {
  // Lifetime users are always active
  if (user.renewalPeriod === 'lifetime') {
    return true;
  }

  // Free users are never "subscribed" (but may have credits)
  if (user.level === 'free') {
    return false;
  }

  // Yearly users check lastPayment + 1 year
  if (!user.lastPayment) {
    return false;
  }

  const nextPaymentDue = addYears(new Date(user.lastPayment), 1);
  return isAfter(nextPaymentDue, new Date());
}

export function canAccessLLMFeature(user: User): boolean {
  // Paid users always have access
  if (user.level === 'paid' && isActiveSubscription(user)) {
    return true;
  }

  // Demo users always have access
  if (user.level === 'demo') {
    return true;
  }

  // Free users need credits
  return user.freeCredits > 0;
}
```

### Demo Mode Compatibility

**Existing:** Session-swap architecture with shadow users

Demo users have `level: 'demo'` which grants unlimited access. The credit system explicitly excludes demo users from credit checks:

```typescript
if (user.level === 'demo') {
  return { allowed: true, reason: 'demo_mode' };
}
```

---

## Security Considerations

### Credit Manipulation Prevention

1. **Server-side only** - Credit checks and deductions ONLY on server
2. **Atomic operations** - Use database transactions for deduction
3. **No client trust** - Client displays credits but cannot modify
4. **Audit trail** - Every deduction logged with timestamp and context

### Stripe Webhook Security

1. **Signature verification** - Existing pattern validates webhook signature
2. **Idempotency** - Handle duplicate webhooks gracefully
3. **Secret key protection** - Never expose STRIPE_WEBHOOK_SECRET

### Database Security

1. **userId scoping** - All queries include userId filter (existing pattern)
2. **Cascade deletes** - CreditLog deleted when User deleted
3. **No negative credits** - Deduction queries include `WHERE freeCredits > 0`

---

## Open Questions for Planning Phase

1. **Credit cost per feature** - Are all LLM features 1 credit, or variable?
2. **Chat message granularity** - 1 message = 1 decrement, or per conversation?
3. **Workstream clustering cost** - Should clustering use credits or be free?
4. **Error recovery** - If LLM call fails after credit deduction, refund?
5. **Grace period** - What happens when yearly subscription expires but user has data?

---

## Quality Gate Checklist

- [x] Components clearly defined with boundaries
- [x] Data flow direction explicit (credit deduction, webhook, UI)
- [x] Build order implications noted (phases 1-6)
- [x] Existing system integration points identified (auth, LLM, Stripe, demo mode)

---

*Generated for BragDoc Pricing Simplification milestone*
