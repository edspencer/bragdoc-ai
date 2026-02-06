---
phase: 06-cleanup
plan: 01
subsystem: payments
tags: [pricing, stripe, marketing, cleanup]

# Dependency graph
requires:
  - phase: 05-user-interface
    provides: Credit system UI components ready for post-cleanup verification
provides:
  - Removed legacy Basic/Pro tier code (plans.ts, payment-gates.ts)
  - Marketing site updated to new pricing model ($45/year, $99 lifetime)
  - Clean codebase without old pricing references
affects: [06-cleanup, marketing, pricing]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/marketing/components/pricing/pricing-tiers.tsx
    - apps/marketing/components/pricing/pricing-header.tsx
    - apps/marketing/components/pricing/pricing-faq.tsx
    - apps/marketing/components/pricing/comparison-table.tsx
    - apps/marketing/components/pricing/hybrid-approach.tsx
    - packages/config/src/index.ts

key-decisions:
  - "Schema enum values (basic, pro, monthly) kept for PostgreSQL compatibility per [01-01]"
  - "Marketing messaging shifted from beta to trial credits (10 AI + 20 chat)"

patterns-established: []

# Metrics
duration: 6min
completed: 2026-02-06
---

# Phase 6 Plan 01: Remove Legacy Pricing Code Summary

**Removed legacy Basic/Pro tier code and updated marketing site to new simplified pricing ($45/year or $99 lifetime)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-06T23:29:43Z
- **Completed:** 2026-02-06T23:35:43Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Deleted legacy pricing tier definitions (plans.ts, payment-gates.ts, create-stripe-products.ts)
- Updated all marketing pricing components to show $45/year and $99 lifetime options
- Replaced beta messaging with free trial credits (10 AI credits + 20 chat messages)
- Verified full monorepo build succeeds with no broken imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove legacy pricing code files** - `dc4128fd` (chore)
2. **Task 2: Update marketing site pricing to new model** - `3b43b331` (feat)
3. **Task 3: Verify full build and search for remaining legacy references** - (verification only, no commit)

## Files Created/Modified

### Deleted
- `apps/web/lib/plans.ts` - Legacy Basic/Pro tier definitions
- `packages/config/src/payment-gates.ts` - Old tier-based feature gates
- `apps/web/scripts/create-stripe-products.ts` - Obsolete Stripe product script

### Modified
- `packages/config/src/index.ts` - Removed payment-gates export
- `apps/marketing/components/pricing/pricing-tiers.tsx` - New $45/year and $99 lifetime pricing
- `apps/marketing/components/pricing/pricing-header.tsx` - Updated tagline
- `apps/marketing/components/pricing/pricing-faq.tsx` - Updated FAQ answers
- `apps/marketing/components/pricing/comparison-table.tsx` - Updated cost row
- `apps/marketing/components/pricing/hybrid-approach.tsx` - Updated pricing reference
- `apps/marketing/components/structured-data/software-application-schema.tsx` - Updated schema
- `apps/marketing/app/pricing/page.tsx` - Updated metadata and offers
- `apps/marketing/app/pricing/opengraph-image.tsx` - Updated OG image
- `apps/marketing/components/mini-faq-section.tsx` - Updated FAQ
- `apps/marketing/components/use-cases/comparison-table.tsx` - Updated prices
- `apps/marketing/lib/faq-data.ts` - Updated pricing FAQs

## Decisions Made

- **Schema enum values kept:** Per decision [01-01], the database schema.ts enum values (basic, pro, monthly) are preserved for PostgreSQL compatibility. This cleanup only removed application-level tier definitions.
- **Trial credits messaging:** Updated marketing from "FREE during beta" to "Start free with trial credits (10 AI credits + 20 chat messages)"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Additional marketing files with old pricing**
- **Found during:** Task 2 (Update marketing site pricing)
- **Issue:** Plan specified 8 files but 3 additional files had old $4.99/month references
- **Fix:** Updated opengraph-image.tsx, mini-faq-section.tsx, and use-cases/comparison-table.tsx
- **Files modified:** 3 additional files beyond plan
- **Verification:** grep confirms no $4.99 or $44.99 references remain
- **Committed in:** 3b43b331 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (missing critical - incomplete file list)
**Impact on plan:** Auto-fix necessary for complete pricing update. No scope creep.

## Issues Encountered

- **Pre-existing test failures:** Tests failed due to database schema mismatch (free_credits column) documented in STATE.md. These failures are unrelated to this cleanup task and were already known.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Legacy pricing code completely removed
- Marketing site displays new pricing model
- Ready for Plan 02 (Documentation updates)

## Self-Check: PASSED

All claims verified:
- Commit dc4128fd exists
- Commit 3b43b331 exists
- Deleted files (plans.ts, payment-gates.ts, create-stripe-products.ts) do not exist
- Modified files exist and contain expected content

---
*Phase: 06-cleanup*
*Completed: 2026-02-06*
