---
phase: 05-user-interface
plan: 01
subsystem: ui
tags: [react, context, stripe, progress, modal, sidebar]

# Dependency graph
requires:
  - phase: 04-feature-gates
    provides: credit check functions, subscription status helper
  - phase: 01-database-foundation
    provides: freeCredits/freeChatMessages columns, user level enum
provides:
  - CreditStatusProvider React context with useCreditStatus hook
  - /api/user/credit-status endpoint for fetching credit/message counts
  - CreditStatusDisplay sidebar component showing credits/messages
  - UpgradeModal dialog with $45/year and $99 lifetime options
affects: [05-02-credit-gate-ui, 05-03-exhausted-ux]

# Tech tracking
tech-stack:
  added: []
  patterns: [context-provider-with-ssr-hydration, sidebar-footer-status-display]

key-files:
  created:
    - apps/web/app/api/user/credit-status/route.ts
    - apps/web/components/credit-status/credit-status-provider.tsx
    - apps/web/components/credit-status/credit-status-display.tsx
    - apps/web/components/credit-status/upgrade-modal.tsx
    - apps/web/components/credit-status/index.ts
    - apps/web/hooks/use-credit-status.ts
  modified:
    - apps/web/components/app-sidebar.tsx
    - apps/web/app/(app)/layout.tsx

key-decisions:
  - "SSR hydration: pass initialCreditStatus to provider from server to avoid loading flash"
  - "CreditStatusProvider inside DemoModeProvider but outside SidebarProvider for proper context nesting"
  - "No loading skeleton in sidebar - return null when loading to avoid layout shift"

patterns-established:
  - "credit-status-provider: context for credit/message status with refresh() and showUpgradeModal() methods"
  - "sidebar-footer-display: status component placed above NavUser in SidebarFooter"

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 5 Plan 01: Credit Status UI Summary

**Credit status context provider with sidebar display showing X/10 credits and X/20 messages for free users, "Unlimited Access" badge for paid/demo users, and upgrade modal with $45/year and $99 lifetime options**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-06T22:24:20Z
- **Completed:** 2026-02-06T22:28:19Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Credit status API endpoint returning freeCredits, freeChatMessages, isUnlimited, subscriptionType, daysRemaining
- CreditStatusProvider context with SSR hydration support for initial load
- CreditStatusDisplay in sidebar footer showing progress bars for free users
- UpgradeModal with annual ($45/year) and lifetime ($99) pricing, no dark patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create credit status API endpoint and context provider** - `9d243e90` (feat)
2. **Task 2: Create upgrade modal dialog** - included in Task 1 (component interdependency)
3. **Task 3: Create sidebar credit display and integrate with layout** - `aad933b5` (feat)

## Files Created/Modified
- `apps/web/app/api/user/credit-status/route.ts` - GET endpoint returning credit status JSON
- `apps/web/components/credit-status/credit-status-provider.tsx` - Context provider with refresh and modal triggers
- `apps/web/components/credit-status/credit-status-display.tsx` - Sidebar display component with progress bars
- `apps/web/components/credit-status/upgrade-modal.tsx` - Dialog with annual and lifetime upgrade options
- `apps/web/components/credit-status/index.ts` - Barrel exports
- `apps/web/hooks/use-credit-status.ts` - Hook alias for convenience import
- `apps/web/components/app-sidebar.tsx` - Added CreditStatusDisplay to SidebarFooter
- `apps/web/app/(app)/layout.tsx` - Wrapped with CreditStatusProvider, added SSR hydration

## Decisions Made
- **SSR hydration pattern:** Pass initialCreditStatus from server to provider to avoid loading flash and extra API call
- **Context nesting:** CreditStatusProvider inside DemoModeProvider but outside SidebarProvider for proper context hierarchy
- **No loading skeleton:** Return null when loading in sidebar to prevent layout shifts
- **Task 2 merged with Task 1:** UpgradeModal created in Task 1 since provider imports it - no separate commit needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Environment variables for Stripe Payment Links (optional):**
- `NEXT_PUBLIC_STRIPE_YEARLY_LINK` - Stripe Payment Link URL for annual plan
- `NEXT_PUBLIC_STRIPE_LIFETIME_LINK` - Stripe Payment Link URL for lifetime plan

If not set, upgrade buttons link to `/upgrade` fallback page.

## Next Phase Readiness
- Credit status context available throughout app via useCreditStatus hook
- Ready for credit gate UI integration (05-02) to show messages when operations blocked
- Ready for exhausted UX (05-03) to trigger upgrade modal automatically

## Self-Check: PASSED

---
*Phase: 05-user-interface*
*Completed: 2026-02-06*
