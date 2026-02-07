# Milestone v1: Stripe Pricing Simplification

**Status:** ✅ SHIPPED 2026-02-06
**Phases:** 1-7
**Total Plans:** 15

## Overview

This milestone transformed BragDoc's pricing from a complex four-tier model (Free/Basic/Pro/Demo) to a simple two-option system: $45/year or $99 lifetime. Free users receive 10 LLM credits and 20 chat messages to try AI features, then must upgrade for unlimited access. The journey progressed through database foundation, credit system implementation, subscription management updates, feature gate integration, UI components, and legacy cleanup.

## Phases

### Phase 1: Database Foundation

**Goal**: Establish the data model supporting credits, simplified subscription tiers, and audit logging
**Depends on**: Nothing (first phase)
**Requirements**: DATABASE-01, DATABASE-02, DATABASE-03, DATABASE-04, DATABASE-05, DATABASE-06, DATABASE-07
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — User table schema: credit fields, enum updates, CHECK constraints
- [x] 01-02-PLAN.md — Credit transaction audit table with operation/feature enums
- [x] 01-03-PLAN.md — Gap closure: Better Auth config for credit fields

**Details:**
- Added freeCredits (default 10) and freeChatMessages (default 20) columns
- Extended userLevelEnum with 'paid' value for simplified pricing
- Extended renewalPeriodEnum with 'lifetime' value
- Added CHECK constraints preventing negative balances
- Created CreditTransaction audit table with JSONB metadata

### Phase 2: Credit System

**Goal**: Implement race-condition-safe credit deduction and checking utilities
**Depends on**: Phase 1
**Requirements**: CREDIT-01, CREDIT-02, CREDIT-03, CREDIT-04, CREDIT-05, CREDIT-06
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Atomic credit deduction and reservation utilities
- [x] 02-02-PLAN.md — Credit checking helpers and transaction logging

**Details:**
- Atomic UPDATE with RETURNING for race-condition safety
- checkUserCredits and checkUserChatMessages utilities
- Non-blocking credit transaction logging
- Credit costs configuration (CREDIT_COSTS object)

### Phase 3: Subscription Management

**Goal**: Update Stripe integration for yearly/lifetime plans with robust webhook handling
**Depends on**: Phase 1
**Requirements**: SUBSCRIPTION-01, SUBSCRIPTION-02, SUBSCRIPTION-03, SUBSCRIPTION-04, SUBSCRIPTION-05, SUBSCRIPTION-06, SUBSCRIPTION-07, SUBSCRIPTION-08
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — StripeEvent table and idempotency infrastructure
- [x] 03-02-PLAN.md — Webhook handler refactor with lookup_key and stripeCustomerId
- [x] 03-03-PLAN.md — Subscription status helper and Stripe dashboard setup

**Details:**
- StripeEvent table using Stripe event ID as primary key
- Idempotent webhook processing (duplicates return 200 OK)
- Modular webhook handler with separate event type handlers
- hasUnlimitedAccess and getSubscriptionStatus helpers
- Payment link environment variables documented

### Phase 4: Feature Gates

**Goal**: Integrate credit checking at all LLM-powered endpoints while preserving demo mode
**Depends on**: Phase 2, Phase 3
**Requirements**: FEATURE-GATE-01, FEATURE-GATE-02, FEATURE-GATE-03, FEATURE-GATE-04, FEATURE-GATE-05, FEATURE-GATE-06
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Document and workstream generation credit gates
- [x] 04-02-PLAN.md — Chatbot message gates, tool credit handling, and unit tests

**Details:**
- Credit gate pattern: hasUnlimitedAccess → checkUserCredits → deductCredits → logCreditTransaction
- 402 Payment Required responses with structured JSON
- 22 unit tests for edge cases
- Tool credit handling with conditional tool selection

### Phase 5: User Interface

**Goal**: Display credit status and provide clear upgrade path when limits are reached
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Credit status provider, API endpoint, sidebar display, upgrade modal
- [x] 05-02-PLAN.md — Chat counter, credit-gated button, account status, pricing page

**Details:**
- CreditStatusProvider with SSR hydration
- Credit status API endpoint
- Sidebar credit display for free users
- UpgradeModal component with yearly/lifetime options
- ChatMessageCounter in chat interface
- CreditGatedButton with tooltip for disabled state
- SubscriptionStatus component for account page
- Pricing comparison page at /upgrade

### Phase 6: Cleanup

**Goal**: Remove legacy pricing tiers and update all documentation
**Depends on**: Phase 5
**Requirements**: CLEANUP-01, CLEANUP-02, CLEANUP-03, CLEANUP-04
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Remove legacy pricing code and update marketing site
- [x] 06-02-PLAN.md — Archive Stripe products and update documentation

**Details:**
- Removed plans.ts legacy definitions
- Updated marketing site pricing section
- Archived old Stripe products (not deleted)
- Updated .env.example with new payment link variables
- Removed obsolete Payment Modes.md

### Phase 7: UX Polish (INSERTED)

**Goal**: Close tech debt gap from milestone audit - show upgrade modal instead of toast on 402 in document generation
**Depends on**: Phase 5
**Requirements**: None (tech debt closure)
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Add 402 → upgrade modal handling to generate-document-dialog.tsx

**Details:**
- Added showUpgradeModal state to GenerateDocumentDialog
- 402 error detection triggers modal instead of toast
- Consistent UX with chat interface 402 handling

---

## Milestone Summary

**Key Decisions:**
- Database-level credit tracking over Stripe Billing Credits (simpler)
- Forward-compatible enum migration (add before remove)
- Global chat message counter (not per-conversation)
- Non-blocking credit logging (failures don't fail main operation)
- 402 response pattern with structured upgradeUrl

**Issues Resolved:**
- Race condition prevention via atomic UPDATE with RETURNING
- Stripe webhook duplicate processing via StripeEvent idempotency
- Document dialog 402 handling (Phase 7 gap closure)

**Issues Deferred:**
- Low credit warning system (v2)
- Credit usage history page (v2)
- Stripe Customer Portal integration (v2)

**Technical Debt Incurred:**
- None — all identified tech debt was resolved in Phase 7

---

*For current project status, see .planning/ROADMAP.md*
