# Phase 2: Credit System - Research

**Researched:** 2026-02-06
**Domain:** Atomic database operations, credit system utilities, transaction logging with Drizzle ORM
**Confidence:** HIGH

## Summary

This phase implements race-condition-safe credit deduction and checking utilities for the simplified pricing model. The research focused on three key areas: (1) atomic UPDATE with conditional WHERE and RETURNING in Drizzle ORM, (2) credit reservation pattern for streaming LLM operations, and (3) structured logging for credit transactions.

The core technical challenge is ensuring atomic credit deduction that prevents double-spending from concurrent requests. Drizzle ORM supports this via `sql` template literals combined with conditional WHERE clauses and RETURNING. The database CHECK constraints from Phase 1 provide a safety net, but the application layer must handle the "insufficient credits" case gracefully.

The secondary focus is on user-level checks that properly bypass credit limits for paid and demo users. The existing `getAuthUser()` helper returns the user's `level` field, enabling simple conditional checks.

**Primary recommendation:** Use Drizzle's `sql` template for atomic decrements with WHERE condition, check `result.length === 0` to detect insufficient credits, and centralize credit costs in a single config file.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.44.6 | Type-safe ORM with sql template | Already in use, supports atomic operations |
| @bragdoc/database | - | Centralized database layer | Houses schema, queries, and connection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pino | 9.x | Structured JSON logging | Production logging with redaction |
| pino-pretty | 11.x | Dev-friendly log output | Local development only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pino logger | console.log | Console doesn't support structured JSON or log levels; Pino is needed for production debugging |
| sql template | raw SQL | sql template provides type safety and injection protection |

**Installation:**
```bash
pnpm add pino pino-pretty
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/lib/
├── credits/
│   ├── costs.ts           # Credit cost definitions per feature
│   ├── operations.ts      # Atomic deduct, refund, check functions
│   ├── logger.ts          # Credit transaction logging
│   └── index.ts           # Public API exports

packages/database/src/
├── credit-transactions/
│   └── queries.ts         # CRUD for CreditTransaction table
└── schema.ts              # Already has creditTransaction table
```

### Pattern 1: Atomic Credit Deduction
**What:** Single UPDATE with WHERE condition and RETURNING
**When to use:** Any credit deduction that must be race-condition-safe
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/decrementing-a-value
import { sql, eq, and, gte } from 'drizzle-orm';
import { db } from '@bragdoc/database';
import { user } from '@bragdoc/database/schema';

export async function deductCredits(
  userId: string,
  amount: number,
): Promise<{ success: boolean; remaining: number | null }> {
  const result = await db
    .update(user)
    .set({
      freeCredits: sql`${user.freeCredits} - ${amount}`,
    })
    .where(
      and(
        eq(user.id, userId),
        gte(user.freeCredits, amount) // Only update if sufficient credits
      )
    )
    .returning({ remaining: user.freeCredits });

  if (result.length === 0) {
    // WHERE condition not met - insufficient credits
    return { success: false, remaining: null };
  }

  return { success: true, remaining: result[0].remaining };
}
```

### Pattern 2: Credit Reservation for Streaming
**What:** Reserve-execute-refund pattern for streaming LLM operations
**When to use:** Document generation, workstream clustering, any streaming operation
**Example:**
```typescript
// Reserve credit at start, refund on failure
export async function withCreditReservation<T>(
  userId: string,
  creditCost: number,
  operation: () => Promise<T>,
): Promise<T> {
  // 1. Reserve credits (atomic deduct)
  const reservation = await deductCredits(userId, creditCost);
  if (!reservation.success) {
    throw new InsufficientCreditsError(creditCost);
  }

  try {
    // 2. Execute the operation
    return await operation();
  } catch (error) {
    // 3. Refund credits on failure
    await refundCredits(userId, creditCost);
    throw error;
  }
}
```

### Pattern 3: User Credit Check
**What:** Check if user has credits or is exempt (paid/demo)
**When to use:** Before any credit-gated operation
**Example:**
```typescript
// Source: Existing pattern from apps/web/lib/getAuthUser.ts
export async function checkUserCredits(
  user: User,
  requiredCredits: number,
): Promise<{ hasCredits: boolean; remainingCredits: number }> {
  // Paid and demo users always have unlimited credits
  if (user.level === 'paid' || user.level === 'demo') {
    return { hasCredits: true, remainingCredits: Infinity };
  }

  const credits = user.freeCredits ?? 10; // Default for existing users
  return {
    hasCredits: credits >= requiredCredits,
    remainingCredits: credits,
  };
}
```

### Pattern 4: Chat Message Counter
**What:** Decrement freeChatMessages for free users only
**When to use:** On each user message submission
**Example:**
```typescript
export async function deductChatMessage(
  userId: string,
  userLevel: UserLevel,
): Promise<{ success: boolean; remaining: number | null }> {
  // Paid and demo users don't consume messages
  if (userLevel === 'paid' || userLevel === 'demo') {
    return { success: true, remaining: null }; // null = unlimited
  }

  const result = await db
    .update(user)
    .set({
      freeChatMessages: sql`${user.freeChatMessages} - 1`,
    })
    .where(
      and(
        eq(user.id, userId),
        gte(user.freeChatMessages, 1)
      )
    )
    .returning({ remaining: user.freeChatMessages });

  if (result.length === 0) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: result[0].remaining };
}
```

### Anti-Patterns to Avoid
- **Read-then-write for decrements:** `SELECT freeCredits` followed by `UPDATE freeCredits = X - 1` creates race conditions. Always use atomic decrement.
- **Trusting client-side credit checks:** Never rely on frontend credit display. Always verify server-side.
- **Logging PII in credit transactions:** Never log email, name, or other user data. Log userId and operation type only.
- **Hardcoding credit costs:** Put all costs in `lib/credits/costs.ts` for consistency and easy adjustment.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic decrements | SELECT then UPDATE | Drizzle sql template with conditional WHERE | Race conditions under concurrent load |
| Transaction logging | Custom INSERT wrapper | Reuse Phase 1 creditTransaction schema | Schema already exists with proper indexes |
| Structured logging | console.log with JSON.stringify | Pino logger | Log levels, redaction, performance |
| User level checks | Inline if/else everywhere | Centralized checkUserCredits() | Consistency, single source of truth |

**Key insight:** The database CHECK constraint (from Phase 1) prevents negative balances, but the application should detect insufficient credits before hitting the constraint. This provides better user experience (proper error message) vs constraint violation (500 error).

## Common Pitfalls

### Pitfall 1: Empty RETURNING Result
**What goes wrong:** Assuming UPDATE always returns rows when the row exists
**Why it happens:** WHERE condition includes credit check, so row isn't returned if credits insufficient
**How to avoid:** Check `result.length === 0` after UPDATE with RETURNING
**Warning signs:** Silent failures, users reporting credits deducted without feature access

### Pitfall 2: NULL vs 0 Credits Handling
**What goes wrong:** Treating NULL freeCredits as "no credits" instead of "never initialized"
**Why it happens:** Existing users have NULL (default from Phase 1), exhausted users have 0
**How to avoid:** Use `user.freeCredits ?? 10` in checks (default for existing users)
**Warning signs:** Existing users blocked after upgrade deployment

### Pitfall 3: Forgetting Paid/Demo Bypass
**What goes wrong:** Paid users get blocked by credit checks
**Why it happens:** Missing early-return for paid/demo levels in every credit function
**How to avoid:** Every credit function starts with: `if (user.level === 'paid' || user.level === 'demo') return unlimited`
**Warning signs:** Customer complaints from paying users

### Pitfall 4: Refund Without Original Deduction
**What goes wrong:** Credits increase beyond original allocation
**Why it happens:** Refunding when deduction wasn't actually successful
**How to avoid:** Only call refund if deductCredits returned success: true
**Warning signs:** Users gaining credits over time without purchasing

### Pitfall 5: Missing Transaction Logging
**What goes wrong:** Cannot debug customer credit issues
**Why it happens:** Skipping logCreditTransaction for "quick" operations
**How to avoid:** ALWAYS log via logCreditTransaction, even for refunds
**Warning signs:** Support requests with no audit trail

### Pitfall 6: Hardcoded Credit Costs
**What goes wrong:** Different costs in different code paths
**Why it happens:** Inline numbers like `deductCredits(userId, 2)` scattered in codebase
**How to avoid:** Import from centralized CREDIT_COSTS object
**Warning signs:** Inconsistent credit deductions for same feature

## Code Examples

Verified patterns from official sources:

### Atomic Decrement with Condition
```typescript
// Source: https://orm.drizzle.team/docs/guides/decrementing-a-value
import { sql, eq, and, gte } from 'drizzle-orm';

const result = await db
  .update(user)
  .set({ freeCredits: sql`${user.freeCredits} - ${amount}` })
  .where(and(eq(user.id, id), gte(user.freeCredits, amount)))
  .returning({ remaining: user.freeCredits });
```

### Credit Transaction Insert
```typescript
// Source: packages/database/src/schema.ts (Phase 1)
import { creditTransaction } from '@bragdoc/database/schema';

await db.insert(creditTransaction).values({
  userId,
  amount,
  operation: 'deduct', // or 'refund', 'grant'
  featureType: 'document_generation',
  metadata: { documentId, documentType },
});
```

### Pino Logger Setup
```typescript
// Source: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
import pino from 'pino';

export const creditLogger = pino({
  name: 'credits',
  level: process.env.LOG_LEVEL || 'info',
  // Redact sensitive fields
  redact: ['email', 'name', 'password'],
});

// Usage
creditLogger.info({
  userId,
  operation: 'deduct',
  amount: 2,
  featureType: 'document_generation',
}, 'Credit deducted');
```

### Credit Costs Configuration
```typescript
// apps/web/lib/credits/costs.ts
export const CREDIT_COSTS = {
  document_generation: {
    weekly_report: 1,
    performance_review: 2,
    brag_doc: 2,
  },
  workstream_clustering: 2,
  chat_tool_call: 1,
} as const;

export type FeatureType = keyof typeof CREDIT_COSTS;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SELECT then UPDATE | Atomic UPDATE with WHERE | PostgreSQL standard | Prevents race conditions |
| console.log | Structured Pino logging | Industry standard | Better debugging, log aggregation |
| Per-feature credit checks | Centralized credit utility | This phase | Consistency across features |

**Deprecated/outdated:**
- Using transactions for single-row atomic updates: PostgreSQL handles single-statement atomicity naturally

## Open Questions

Things that couldn't be fully resolved:

1. **Pino vs Existing Console Logging**
   - What we know: Codebase currently uses console.error/console.log
   - What's unclear: Whether to introduce Pino just for credits or use console for consistency
   - Recommendation: Use Pino for credit logging (structured JSON needed for production debugging), keep console for general app logs. Introduce Pino as a dev dependency.

2. **Chat Message Granularity**
   - What we know: Confirmed as user messages only (not assistant responses)
   - What's unclear: Whether tool calls within chat count as separate messages
   - Recommendation: Tool calls use credits (CREDIT-05), not message counter. Message counter is only for user text submissions.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM Decrementing Values](https://orm.drizzle.team/docs/guides/decrementing-a-value) - Atomic decrement syntax verified
- [Drizzle ORM Update](https://orm.drizzle.team/docs/update) - RETURNING clause, WHERE conditions verified
- [Drizzle GitHub Discussion #1454](https://github.com/drizzle-team/drizzle-orm/discussions/1454) - Atomic operations confirmation
- Project files: `packages/database/src/schema.ts` - creditTransaction table structure
- Project files: `apps/web/lib/getAuthUser.ts` - User type and level access pattern

### Secondary (MEDIUM confidence)
- [Better Stack Pino Guide](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) - Pino setup patterns
- [Arcjet Structured Logging](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) - Next.js + Pino integration

### Tertiary (LOW confidence)
- Community discussions on credit systems - General patterns, not technology-specific

## Metadata

**Confidence breakdown:**
- Atomic decrement pattern: HIGH - Official Drizzle docs verified
- Credit check utilities: HIGH - Based on existing codebase patterns
- Transaction logging: HIGH - Schema exists from Phase 1
- Pino integration: MEDIUM - Standard approach but not yet in codebase

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain)
