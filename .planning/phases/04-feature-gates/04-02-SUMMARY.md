---
phase: 04-feature-gates
plan: 02
subsystem: api
tags: [credits, chat, streaming, ai-sdk, tools, jest]

# Dependency graph
requires:
  - phase: 02-credit-system
    provides: Credit checking and deduction utilities
  - phase: 03-subscription-management
    provides: hasUnlimitedAccess helper function
  - phase: 04-01
    provides: Pattern for credit gates on generation endpoints
provides:
  - Chat message gates on document and performance review chat endpoints
  - Credit-checked tool wrappers for AI SDK tools
  - Comprehensive unit tests for credit gate edge cases
affects: [04-03-UI-gates, future-chat-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Credit-gated AI SDK tools with *WithCreditCheck variants
    - Chat message gate pattern before LLM streaming
    - Non-blocking transaction logging in chat endpoints

key-files:
  created:
    - apps/web/test/api/credit-gates.test.ts
  modified:
    - apps/web/app/api/documents/[id]/chat/route.ts
    - apps/web/app/api/performance-review/chat/route.ts
    - apps/web/lib/ai/tools/create-document.ts
    - apps/web/lib/ai/tools/update-document.ts
    - apps/web/lib/ai/tools/update-performance-review-document.ts

key-decisions:
  - "Create separate *WithCreditCheck tool variants rather than runtime wrapping"
  - "Conditional tool selection based on hasUnlimitedAccess at request time"
  - "Tools return error objects instead of throwing to maintain LLM conversation flow"

patterns-established:
  - "Chat message gate: Check hasUnlimitedAccess, then checkUserChatMessages, then deductChatMessage"
  - "Credit-gated tools: Create *WithCreditCheck export that checks and deducts before execution"
  - "Error response format: { error: 'insufficient_credits', message: '...', upgradeUrl: '/pricing' }"

# Metrics
duration: 10min
completed: 2026-02-06
---

# Phase 4 Plan 2: Credit Gates for Chat Endpoints Summary

**Chat message gates on document and performance review endpoints with credit-checked AI SDK tool variants**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-06T21:50:18Z
- **Completed:** 2026-02-06T21:59:49Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added chat message gates to both document and performance review chat endpoints
- Created credit-checked tool variants (createDocumentWithCreditCheck, updateDocumentWithCreditCheck, updatePerformanceReviewDocumentWithCreditCheck)
- Free users consume 1 message per chat interaction, 1 credit per tool call
- Paid/demo users bypass all credit checks
- Added 22 unit tests covering all credit gate edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add chat message gate to document chat endpoint** - `11d40175` (feat)
2. **Task 2: Add chat message gate to performance review chat endpoint** - `f62a3a0b` (feat)
3. **Task 3: Create unit tests for credit gate edge cases** - `bf4b824d` (test)

## Files Created/Modified
- `apps/web/app/api/documents/[id]/chat/route.ts` - Chat message gate before processing, conditional tool selection
- `apps/web/app/api/performance-review/chat/route.ts` - Chat message gate before processing, conditional tool selection
- `apps/web/lib/ai/tools/create-document.ts` - Added createDocumentWithCreditCheck export
- `apps/web/lib/ai/tools/update-document.ts` - Added updateDocumentWithCreditCheck export
- `apps/web/lib/ai/tools/update-performance-review-document.ts` - Added updatePerformanceReviewDocumentWithCreditCheck export
- `apps/web/test/api/credit-gates.test.ts` - 22 unit tests for credit gate logic

## Decisions Made
- **Separate tool variants instead of runtime wrapping:** Creating *WithCreditCheck exports is cleaner than trying to wrap AI SDK tools at runtime due to complex tool typing
- **Conditional tool selection at request time:** Check hasUnlimitedAccess once and select the appropriate tools object, avoiding per-call overhead for paid users
- **Tools return error objects:** Returning `{ error: 'insufficient_credits', message: '...' }` instead of throwing maintains LLM conversation flow and allows graceful handling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file location correction**
- **Found during:** Task 3
- **Issue:** Created test in `__tests__/api/` but project uses `test/api/`
- **Fix:** Moved file to correct location
- **Files modified:** apps/web/test/api/credit-gates.test.ts
- **Verification:** Tests run and pass
- **Committed in:** bf4b824d

**2. [Rule 1 - Bug] Removed @jest/globals import**
- **Found during:** Task 3 verification
- **Issue:** Import caused TypeScript error, project doesn't use explicit jest imports
- **Fix:** Removed the import line
- **Verification:** TypeScript compilation passes
- **Committed in:** bf4b824d

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both were minor corrections to test setup. No scope creep.

## Issues Encountered
- AI SDK tool wrapping is complex due to strict typing - solved by creating separate tool exports rather than runtime wrapping

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Chat endpoints now have credit gates
- Ready for Phase 4 Plan 3: UI gates for credit display and upgrade prompts
- All credit checking utilities are tested and working

---
*Phase: 04-feature-gates*
*Completed: 2026-02-06*

## Self-Check: PASSED
