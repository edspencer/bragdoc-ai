---
phase: 02-credit-system
plan: 01
subsystem: api
tags: [credits, drizzle, atomic-operations, streaming, llm]

# Dependency graph
requires:
  - phase: 01-database-foundation
    provides: "User table with freeCredits, freeChatMessages columns and CHECK constraints"
provides:
  - "Atomic credit deduction with race-condition safety"
  - "Credit reservation pattern for streaming LLM operations"
  - "Centralized credit costs configuration"
  - "Credit-related error classes"
affects: [03-stripe-integration, 04-feature-gates, chat-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic UPDATE with conditional WHERE and RETURNING"
    - "Reserve-execute-refund pattern for streaming"
    - "Centralized cost configuration"

key-files:
  created:
    - apps/web/lib/credits/costs.ts
    - apps/web/lib/credits/operations.ts
    - apps/web/lib/credits/errors.ts
    - apps/web/lib/credits/index.ts
  modified: []

key-decisions:
  - "Use destructuring assignment for Drizzle RETURNING results"
  - "COALESCE for NULL freeCredits on refund"

patterns-established:
  - "deductCredits: Atomic decrement with gte() WHERE condition"
  - "withCreditReservation: Reserve at start, refund on catch, rethrow"
  - "Paid/demo bypass: Early return with null remaining (indicates unlimited)"

# Metrics
duration: 6min
completed: 2026-02-06
---

# Phase 02 Plan 01: Credit Operations Summary

**Atomic credit deduction with Drizzle sql template, reserve-execute-refund pattern for streaming, and centralized cost configuration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-06T19:38:06Z
- **Completed:** 2026-02-06T19:44:08Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Atomic deductCredits() using UPDATE with conditional WHERE prevents double-spending
- withCreditReservation() pattern for streaming LLM operations (reserve-execute-refund)
- deductChatMessage() with automatic bypass for paid/demo users
- CREDIT_COSTS centralized for easy pricing adjustment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create credit costs configuration and error classes** - `2aa81690` (feat)
2. **Task 2: Implement atomic credit deduction and reservation operations** - `ae19c518` (feat)

## Files Created

- `apps/web/lib/credits/costs.ts` - Credit cost definitions per feature type (CREDIT_COSTS, getDocumentCost)
- `apps/web/lib/credits/operations.ts` - Atomic deduct, refund, reservation functions
- `apps/web/lib/credits/errors.ts` - InsufficientCreditsError, InsufficientChatMessagesError
- `apps/web/lib/credits/index.ts` - Public API re-exports

## Decisions Made

- **Drizzle returning() pattern:** Use destructuring `const [updated] = await db.update()...returning()` for TypeScript narrowing (matches existing codebase pattern)
- **COALESCE for refunds:** Handle NULL freeCredits from legacy users with `COALESCE(freeCredits, 0) + amount`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Next.js build failure:** Turbopack build failed with missing manifest file error - this is a pre-existing build cache issue unrelated to credit module changes. TypeScript compilation passed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Credit operations module ready for integration
- Phase 03 (Stripe Integration) can wire up credit grants on payment
- Phase 04 (Feature Gates) can import and use deductCredits/withCreditReservation

---
*Phase: 02-credit-system*
*Completed: 2026-02-06*

## Self-Check: PASSED

All files exist and commits verified:
- apps/web/lib/credits/costs.ts: FOUND
- apps/web/lib/credits/operations.ts: FOUND
- apps/web/lib/credits/errors.ts: FOUND
- apps/web/lib/credits/index.ts: FOUND
- Commit 2aa81690: FOUND
- Commit ae19c518: FOUND
