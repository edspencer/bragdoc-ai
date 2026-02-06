# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Simple two-option pricing ($45/year or $99 lifetime) with free trial credits
**Current focus:** Phase 5 - User Interface (in progress)

## Current Position

Phase: 5 of 6 (User Interface)
Plan: 1 of 3 in Phase 5
Status: In progress
Last activity: 2026-02-06 — Completed 05-01-PLAN.md (Credit Status UI)

Progress: [███████████░] 91.7% (11/12 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 5.8 min
- Total execution time: 1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-foundation | 3 | 13 min | 4.3 min |
| 02-credit-system | 2 | 15 min | 7.5 min |
| 03-subscription-management | 3 | 26 min | 8.7 min |
| 04-feature-gates | 2 | 14 min | 7.0 min |
| 05-user-interface | 1 | 4 min | 4.0 min |

**Recent Trend:**
- Last 5 plans: 8 min, 12 min, 4 min, 10 min, 4 min
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Use database-level credit tracking (simple integers) over Stripe Billing Credits
- [Init]: Forward-compatible enum migration (add 'paid' before removing 'basic'/'pro')
- [Init]: Global freeChatMessages counter (not per-conversation)
- [01-01]: NULL OR >= 0 CHECK constraint pattern for existing user compatibility
- [01-01]: Keep deprecated enum values (basic, pro, monthly) for PostgreSQL compatibility
- [01-01]: Default 10 freeCredits and 20 freeChatMessages via column defaults
- [01-02]: Store amount as positive integer with operation enum indicating direction
- [01-02]: JSONB metadata field for flexible context (document IDs, error messages, refund reasons)
- [01-02]: Three-index strategy for CreditTransaction (userId, createdAt, userId+createdAt)
- [01-03]: Better Auth additionalFields use required: false for nullable fields with existing users
- [01-03]: Better Auth defaultValue matches database column defaults for consistency
- [02-01]: Use destructuring assignment for Drizzle RETURNING results
- [02-01]: COALESCE for NULL freeCredits on refund
- [02-02]: Non-blocking logger - credit logging failures don't fail the main operation
- [02-02]: Nullish coalescing for existing users - NULL means never initialized, defaults to 10/20
- [02-verify]: Deferred internal logging wiring to Phase 4 when operations are integrated with endpoints
- [03-01]: Use Stripe event ID as primary key directly (no synthetic UUID needed)
- [03-01]: Standalone StripeEvent audit table (no foreign keys)
- [03-03]: Treat legacy basic/pro levels as 'free' rather than requiring migration
- [03-03]: Return daysRemaining in subscription status for UI countdown display
- [03-03]: hasUnlimitedAccess convenience wrapper for simple feature gates
- [03-02]: Use billing_reason to detect subscription invoices in Stripe SDK v19
- [03-02]: Removed payment_intent events - not needed for Payment Links workflow
- [04-01]: Credit gate placement BEFORE LLM operations, after auth and request validation
- [04-01]: SSE endpoints: credit gate BEFORE ReadableStream creation (cannot return 402 after stream starts)
- [04-01]: Credit gate pattern: hasUnlimitedAccess() -> checkUserCredits() -> deductCredits() -> logCreditTransaction()
- [04-02]: Create separate *WithCreditCheck tool variants rather than runtime wrapping
- [04-02]: Conditional tool selection based on hasUnlimitedAccess at request time
- [04-02]: Tools return error objects instead of throwing to maintain LLM conversation flow
- [05-01]: SSR hydration: pass initialCreditStatus to provider from server to avoid loading flash
- [05-01]: CreditStatusProvider inside DemoModeProvider but outside SidebarProvider for proper context nesting
- [05-01]: No loading skeleton in sidebar - return null when loading to avoid layout shift

### Pending Todos

None yet.

### Blockers/Concerns

- Drizzle atomic UPDATE syntax verified and working
- Chat message granularity confirmed as user messages only (not assistant responses)
- Web app tests failing due to test database schema mismatch (free_credits column) - not blocking

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 05-01-PLAN.md (Credit Status UI)
Resume file: None

---
*State initialized: 2026-02-06*
