---
phase: 04-feature-gates
plan: 01
subsystem: api
tags: [credits, stripe, feature-gates, monetization, 402]

# Dependency graph
requires:
  - phase: 02-credit-system
    provides: [credit checking utilities, deductCredits, logCreditTransaction]
  - phase: 03-subscription-management
    provides: [hasUnlimitedAccess helper, subscription status calculation]
provides:
  - Credit-gated document generation endpoints
  - Credit-gated workstream generation endpoint
  - 402 Payment Required responses with upgrade URL
  - Credit transaction logging for LLM operations
affects: [05-ui-integration, api-patterns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Credit gate pattern: check hasUnlimitedAccess first, then checkUserCredits, then deductCredits atomically"
    - "402 response pattern: structured JSON with error, message, required, available, upgradeUrl"

key-files:
  created: []
  modified:
    - apps/web/app/api/documents/generate/route.ts
    - apps/web/app/api/performance-review/generate/route.ts
    - apps/web/app/api/workstreams/generate/route.ts

key-decisions:
  - "Credit gate placement: BEFORE any LLM operations, after auth and request validation"
  - "SSE endpoints: credit gate BEFORE ReadableStream creation (cannot return 402 after stream starts)"
  - "Combined logging with deduction in same task (plan had it separate but flow is the same)"

patterns-established:
  - "Credit gate pattern: hasUnlimitedAccess() -> checkUserCredits() -> deductCredits() -> logCreditTransaction()"
  - "402 response structure: { error, message, required, available, upgradeUrl }"
  - "Non-blocking logging: .catch() on logCreditTransaction to not fail main operation"

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 04 Plan 01: Credit Gates for Generation Endpoints Summary

**Added credit gates to document and workstream generation endpoints, enforcing monetization at the API layer with 402 responses for insufficient credits**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-06T21:50:46Z
- **Completed:** 2026-02-06T21:54:21Z
- **Tasks:** 3 (Task 3 combined with Tasks 1/2)
- **Files modified:** 3

## Accomplishments

- Added credit gates to `/api/documents/generate` for all document types (weekly_report, brag_doc, etc.)
- Added credit gate to `/api/performance-review/generate` for performance review documents
- Added credit gate to `/api/workstreams/generate` SSE endpoint (gate placed before stream creation)
- All gates check `hasUnlimitedAccess()` first to bypass for paid/demo users
- Atomic credit deduction before LLM operations with proper error handling
- Non-blocking credit transaction logging for audit trail

## Task Commits

Each task was committed atomically:

1. **Task 1: Add credit gate to document generation endpoints** - `b7fffca6` (feat)
   - Modified: documents/generate/route.ts, performance-review/generate/route.ts
2. **Task 2: Add credit gate to workstream generation endpoint** - `924c323e` (feat)
   - Modified: workstreams/generate/route.ts

Note: Task 3 (logging integration) was combined with Tasks 1 and 2 as the logging is part of the same credit gate flow.

## Files Created/Modified

- `apps/web/app/api/documents/generate/route.ts` - Credit-gated brag doc/report generation
- `apps/web/app/api/performance-review/generate/route.ts` - Credit-gated performance review generation
- `apps/web/app/api/workstreams/generate/route.ts` - Credit-gated workstream clustering (SSE)

## Decisions Made

1. **Credit gate placement for SSE endpoints**: Gate MUST be before `ReadableStream` creation because once streaming starts, returning a 402 response would corrupt the SSE stream
2. **Combined logging with credit deduction**: Plan had logging as separate Task 3, but it logically belongs in the same flow as deduction - combined for cleaner implementation
3. **Type casting for document cost lookup**: Used explicit type assertion for CREDIT_COSTS.document_generation lookup since document types include values like 'quarterly_report' not in CREDIT_COSTS

## Deviations from Plan

None - plan executed exactly as written. Task 3 (logging) was combined with Tasks 1/2 but this was an organizational choice, not a deviation from requirements.

## Issues Encountered

- Pre-existing build error in `apps/web/app/api/documents/[id]/chat/route.ts` (references `updateDocumentWithCreditCheck` which doesn't exist). This is unrelated to this plan's scope and was present in the working tree before changes.
- TypeScript compilation for the three modified files passes successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Credit gates are now enforced on all LLM-powered generation endpoints
- Ready for Phase 04-02 (chat message gating) or UI integration
- Pre-existing build error in chat route should be addressed separately

---
*Phase: 04-feature-gates*
*Completed: 2026-02-06*

## Self-Check: PASSED
