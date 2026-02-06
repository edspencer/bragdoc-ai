# Phase 1: Database Foundation - Research

**Researched:** 2026-02-06
**Domain:** PostgreSQL schema migration with Drizzle ORM (enum changes, CHECK constraints, audit tables)
**Confidence:** HIGH

## Summary

This phase establishes the database layer for credit tracking and simplified subscription tiers. The research focused on three key areas: (1) PostgreSQL enum migrations for transitioning from 4-tier to 2-tier user levels, (2) CHECK constraints for preventing negative credit balances, and (3) audit table design for credit transactions.

The primary technical challenge is the PostgreSQL enum migration. PostgreSQL cannot remove enum values directly, requiring a multi-step workaround. However, since the project has **no existing paid users** (confirmed in requirements), we can use a simpler forward-compatible approach: add 'paid' value, migrate existing Basic/Pro users if any exist, and leave deprecated values in the enum for now.

**Primary recommendation:** Use Drizzle ORM's `check()` function for balance constraints, generate migrations via `pnpm db:generate`, and handle enum changes with separate ADD VALUE statements executed outside transaction blocks.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.44.6 | Type-safe ORM | Already in use, supports CHECK constraints |
| drizzle-kit | 0.31.5 | Migration generation | Already in use, handles enum changes |
| PostgreSQL | 14+ | Database engine | Production database |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @neondatabase/serverless | 0.10.4 | DB connection | Serverless PostgreSQL driver |
| zod | 3.25.76 | Schema validation | Validate insert types before DB |

**Installation:** No new packages needed - all already present.

## Architecture Patterns

### Recommended Project Structure
```
packages/database/src/
├── schema.ts           # Add new fields and CHECK constraints to user table
├── credit-transactions/
│   └── queries.ts      # CRUD functions for audit table
├── migrations/
│   └── 0012_*.sql      # Generated migration file
└── models/
    └── user.ts         # Update user model helpers
```

### Pattern 1: CHECK Constraint in Drizzle
**What:** Table-level constraint preventing negative balances
**When to use:** Any column that must remain non-negative
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { check, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const user = pgTable(
  'User',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    freeCredits: integer('free_credits').default(10),
    freeChatMessages: integer('free_chat_messages').default(20),
    // ... other fields
  },
  (table) => [
    check('free_credits_non_negative', sql`${table.freeCredits} IS NULL OR ${table.freeCredits} >= 0`),
    check('free_chat_messages_non_negative', sql`${table.freeChatMessages} IS NULL OR ${table.freeChatMessages} >= 0`),
  ]
);
```

### Pattern 2: Audit Table with Indexes
**What:** Transaction log for credit operations
**When to use:** Any operation requiring audit trail
**Example:**
```typescript
// Source: Project conventions from database.md
export const operationTypeEnum = pgEnum('operation_type', ['deduct', 'refund', 'grant']);
export const featureTypeEnum = pgEnum('feature_type', [
  'document_generation',
  'workstream_clustering',
  'chat_tool_call',
  'chat_message'
]);

export const creditTransaction = pgTable(
  'CreditTransaction',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),          // Positive for deduct, negative for refund
    operation: operationTypeEnum('operation').notNull(),
    featureType: featureTypeEnum('feature_type').notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('credit_tx_user_id_idx').on(table.userId),
    index('credit_tx_created_at_idx').on(table.createdAt),
    index('credit_tx_user_created_idx').on(table.userId, table.createdAt),
  ]
);
```

### Pattern 3: Enum Migration Strategy
**What:** Forward-compatible enum change
**When to use:** Adding new enum values, deprecating old ones
**Example:**
```sql
-- Step 1: Add new value (outside transaction)
ALTER TYPE "public"."user_level" ADD VALUE IF NOT EXISTS 'paid';

-- Step 2: Migrate existing data (if any)
UPDATE "User" SET level = 'paid' WHERE level IN ('basic', 'pro');

-- Step 3: Leave 'basic' and 'pro' in enum (PostgreSQL cannot drop values)
-- Future: If needed, recreate enum entirely (rename-create-replace pattern)
```

### Anti-Patterns to Avoid
- **Dropping enum values directly:** PostgreSQL does not support `ALTER TYPE DROP VALUE`. Attempting this will fail.
- **ALTER TYPE ADD VALUE inside transaction:** New values cannot be used until transaction commits. Split into separate migration statements.
- **Using db:push for production:** Bypasses migration history, can cause data loss.
- **Trusting client-side credit checks:** Always verify on server before LLM operations.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic decrements | Manual SELECT then UPDATE | Single UPDATE with WHERE clause | Race conditions in concurrent requests |
| Constraint validation | Application-level checks | Database CHECK constraints | Database is authoritative, app can be bypassed |
| Enum changes | Direct ALTER TYPE DROP | Forward-compatible migrations | PostgreSQL limitation prevents value removal |
| Audit timestamps | Application-generated | `defaultNow()` | Database time is consistent across replicas |

**Key insight:** Database-level enforcement (CHECK constraints, atomic updates) is more reliable than application-level checks which can be bypassed by bugs or direct DB access.

## Common Pitfalls

### Pitfall 1: ALTER TYPE ADD VALUE in Transaction Block
**What goes wrong:** PostgreSQL prevents using newly added enum values within the same transaction
**Why it happens:** PostgreSQL requires transaction commit before new enum values are visible
**How to avoid:** Use Drizzle's `--> statement-breakpoint` to split migration into separate statements
**Warning signs:** Migration runs but subsequent UPDATE using new value fails

### Pitfall 2: NULL vs 0 Confusion for Credits
**What goes wrong:** Treating NULL as 0 credits, causing different behavior for new vs exhausted users
**Why it happens:** Existing users have NULL (never set), exhausted users have 0
**How to avoid:**
- Use `freeCredits IS NULL OR freeCredits >= 0` in CHECK constraint
- Use COALESCE in queries when needed: `COALESCE(freeCredits, 10)`
**Warning signs:** Existing users suddenly blocked or treated as exhausted

### Pitfall 3: Missing Index on Audit Table Timestamp
**What goes wrong:** Slow queries when viewing credit history or running analytics
**Why it happens:** Growing audit table without proper indexes
**How to avoid:** Add composite index on (userId, createdAt) from the start
**Warning signs:** API timeout when fetching transaction history

### Pitfall 4: Enum Value Removal Attempt
**What goes wrong:** Migration fails with "cannot drop type value" error
**Why it happens:** PostgreSQL fundamentally does not support dropping enum values
**How to avoid:** Leave deprecated values in enum, or use full recreation pattern (rename-create-replace)
**Warning signs:** Migration generation attempts to drop enum values

### Pitfall 5: Drizzle Check Constraint Syntax
**What goes wrong:** CHECK constraint not generated in migration
**Why it happens:** Using old array syntax vs new function syntax in Drizzle 0.44+
**How to avoid:** Use array return syntax in third parameter: `(table) => [check(...)]`
**Warning signs:** Empty `checkConstraints: {}` in generated snapshot

## Code Examples

Verified patterns from official sources:

### Adding Integer Fields with Defaults
```typescript
// Source: packages/database/src/schema.ts (existing patterns)
freeCredits: integer('free_credits').default(10),
freeChatMessages: integer('free_chat_messages').default(20),
```

### CHECK Constraint Syntax (Drizzle 0.44+)
```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// In table definition's third parameter:
(table) => [
  check('free_credits_non_negative',
    sql`${table.freeCredits} IS NULL OR ${table.freeCredits} >= 0`),
]
```

### Enum Definition
```typescript
// Source: packages/database/src/schema.ts (existing pattern)
export const userLevelEnum = pgEnum('user_level', [
  'free',
  'basic',  // Deprecated but kept for PostgreSQL compatibility
  'pro',    // Deprecated but kept for PostgreSQL compatibility
  'paid',   // New: replaces basic and pro
  'demo',
]);
```

### Renewal Period Enum Update
```typescript
// Source: packages/database/src/schema.ts (existing pattern)
export const renewalPeriodEnum = pgEnum('renewal_period', [
  'monthly',   // Deprecated but kept for PostgreSQL compatibility
  'yearly',
  'lifetime',  // New: one-time purchase
]);
```

### Audit Table Query Function
```typescript
// Source: packages/database/src/queries.ts patterns
export async function logCreditTransaction({
  userId,
  amount,
  operation,
  featureType,
  metadata,
  db = defaultDb,
}: {
  userId: string;
  amount: number;
  operation: 'deduct' | 'refund' | 'grant';
  featureType: string;
  metadata?: Record<string, any>;
  db?: typeof defaultDb;
}) {
  return await db.insert(creditTransaction).values({
    userId,
    amount,
    operation,
    featureType,
    metadata,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serial` for PKs | `uuid().defaultRandom()` | PostgreSQL 14+ | Already using UUID throughout |
| Separate constraint files | Inline in schema.ts | Drizzle 0.30+ | Single source of truth |
| Manual migration SQL | `pnpm db:generate` | Already in use | Consistent migration workflow |

**Deprecated/outdated:**
- Drizzle's old `table.constraint()` syntax replaced by `check()` function
- PostgreSQL `serial` type replaced by identity columns (not applicable here - using UUIDs)

## Open Questions

Things that couldn't be fully resolved:

1. **Enum Cleanup Timing**
   - What we know: PostgreSQL cannot drop enum values, but we can leave 'basic' and 'pro' indefinitely
   - What's unclear: Whether to ever do the full recreate pattern to remove deprecated values
   - Recommendation: Leave as-is for v1, revisit in v2 if database size becomes concern

2. **Drizzle Kit Enum Migration Generation**
   - What we know: Drizzle-kit 0.26.2+ supports `ALTER TYPE ADD VALUE` generation
   - What's unclear: Whether current version (0.31.5) automatically generates correct migration for enum additions
   - Recommendation: Review generated migration SQL carefully before applying

3. **Atomic Update Verification in Phase 2**
   - What we know: Phase 2 needs atomic credit decrement (UPDATE with WHERE check)
   - What's unclear: Exact Drizzle syntax for `UPDATE SET x = x - 1 WHERE x >= 1 RETURNING x`
   - Recommendation: Research during Phase 2 planning (noted as blocker in phase context)

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) - CHECK constraint syntax verified
- [PostgreSQL ALTER TYPE Documentation](https://www.postgresql.org/docs/current/sql-altertype.html) - Enum limitations confirmed
- Project files: `packages/database/src/schema.ts` - Existing patterns extracted
- Project files: `packages/database/package.json` - Drizzle versions confirmed

### Secondary (MEDIUM confidence)
- [Drizzle ORM GitHub Discussions](https://github.com/drizzle-team/drizzle-orm/discussions/3192) - Enum best practices
- [Drizzle ORM PostgreSQL Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Community patterns
- [Supabase Enum Documentation](https://supabase.com/docs/guides/database/postgres/enums) - PostgreSQL enum limitations

### Tertiary (LOW confidence)
- Various Stack Overflow discussions on enum migrations - Verified against PostgreSQL docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified
- Architecture patterns: HIGH - Based on existing project patterns and official docs
- CHECK constraints: HIGH - Verified against Drizzle 0.44+ documentation
- Enum migration: HIGH - PostgreSQL limitation is well-documented and confirmed
- Pitfalls: MEDIUM - Some based on general PostgreSQL knowledge

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain)
