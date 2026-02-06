---
phase: 03-subscription-management
plan: 01
name: Stripe Event Idempotency
subsystem: billing
tags: [stripe, webhooks, idempotency, database]

dependency-graph:
  requires: [01-database-foundation]
  provides: [stripe-event-table, idempotency-queries]
  affects: [03-02, 03-03]

tech-stack:
  added: []
  patterns: [idempotency-key-pattern]

key-files:
  created:
    - packages/database/src/stripe-events/queries.ts
    - packages/database/src/migrations/0014_lovely_wrecker.sql
  modified:
    - packages/database/src/schema.ts
    - packages/database/src/index.ts

decisions:
  - id: stripe-event-pk
    choice: Use Stripe event ID as primary key directly
    rationale: No need for synthetic UUID; Stripe IDs are globally unique
  - id: standalone-audit
    choice: No foreign keys on StripeEvent table
    rationale: Standalone audit table for webhook deduplication, independent of user data

metrics:
  duration: 6 min
  completed: 2026-02-06
---

# Phase 03 Plan 01: Stripe Event Idempotency Summary

**One-liner:** StripeEvent table with idempotency queries for webhook deduplication using Stripe event IDs as primary keys.

## What Was Built

### StripeEvent Table

Added to `packages/database/src/schema.ts`:
- `id` (varchar 64, PK) - Stripe event ID (evt_xxx format)
- `type` (varchar 64) - Event type (e.g., checkout.session.completed)
- `processedAt` (timestamp) - When the event was processed

### Idempotency Query Functions

Created `packages/database/src/stripe-events/queries.ts`:

```typescript
// Check if event was already processed
checkEventProcessed(eventId: string): Promise<boolean>

// Record event within a transaction (acts as idempotency lock)
recordProcessedEvent(tx: DrizzleTx, eventId: string, eventType: string): Promise<void>
```

### Migration

Generated `0014_lovely_wrecker.sql` which creates the StripeEvent table with correct column types.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add StripeEvent table to schema | 7204f4b0 | packages/database/src/schema.ts |
| 2 | Create stripe-events query module | fa02dfbb | packages/database/src/stripe-events/queries.ts, packages/database/src/index.ts |
| 3 | Generate and apply migration | 250aba0d | packages/database/src/migrations/0014_lovely_wrecker.sql |

## Decisions Made

1. **Stripe event ID as primary key**: Used Stripe's event ID directly as the primary key rather than generating a synthetic UUID. Stripe event IDs are globally unique and immutable.

2. **Standalone audit table**: No foreign keys to user or other tables. The StripeEvent table is purely for idempotency checking and audit logging, not for relational queries.

3. **Transaction-based recording**: The `recordProcessedEvent` function takes a transaction parameter so it can be called at the start of webhook processing, making the insert act as an idempotency lock.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `pnpm --filter=@bragdoc/database build` succeeds
- [x] StripeEvent table defined with id (PK), type, processedAt fields
- [x] Query functions checkEventProcessed and recordProcessedEvent exported
- [x] Migration generated and applied to development database

Note: Web app tests show failures unrelated to this plan (test database missing free_credits column from Phase 02). CLI tests and database build pass.

## Next Phase Readiness

Plan 03-01 provides the foundation for:
- **03-02**: Webhook handler can use these queries to prevent duplicate event processing
- **03-03**: Subscription status sync relies on idempotent webhook handling

No blockers identified.

## Self-Check: PASSED
