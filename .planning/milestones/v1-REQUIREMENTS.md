# Requirements Archive: v1 Stripe Pricing Simplification

**Archived:** 2026-02-06
**Status:** ✅ SHIPPED

This is the archived requirements specification for v1.
For current requirements, see `.planning/REQUIREMENTS.md` (created for next milestone).

---

# Requirements: Stripe Pricing Simplification

## Overview

Simplify BragDoc pricing from 4-tier model (Free/Basic/Pro/Demo) to 2-tier model (Free with trial credits vs Paid unlimited). Free users get 10 credits for LLM features and 20 messages for chatbot features. Paid users pay either $45/year (marketed as $3.75/month, billed annually) or $99 lifetime for unlimited access.

## v1 Requirements

### Database Schema (DATABASE)

Schema changes to support credit tracking and simplified subscription model.

- [x] **DATABASE-01**: Add `freeCredits` integer field to user table with default 10
- [x] **DATABASE-02**: Add `freeChatMessages` integer field to user table with default 20
- [x] **DATABASE-03**: Update `user_level` enum from ['free', 'basic', 'pro', 'demo'] to ['free', 'paid', 'demo']
- [x] **DATABASE-04**: Update `renewalPeriod` enum to support ['yearly', 'lifetime']
- [x] **DATABASE-05**: Add CHECK constraint to prevent negative credit balances
- [x] **DATABASE-06**: Create database migration file for all schema changes
- [x] **DATABASE-07**: Create `credit_transactions` table for audit logging

### Credit System (CREDIT)

Core credit deduction and checking logic for LLM features.

- [x] **CREDIT-01**: Implement atomic credit deduction function
- [x] **CREDIT-02**: Implement credit reservation pattern for streaming operations
- [x] **CREDIT-03**: Create `checkUserCredits()` utility function
- [x] **CREDIT-04**: Implement chat message counter deduction
- [x] **CREDIT-05**: Add credit costs to feature definitions
- [x] **CREDIT-06**: Implement credit transaction logging

### Subscription Management (SUBSCRIPTION)

Payment processing, webhook handling, and subscription status tracking.

- [x] **SUBSCRIPTION-01**: Create Stripe products in dashboard (manual setup)
- [x] **SUBSCRIPTION-02**: Update Stripe webhook handler for new plan types
- [x] **SUBSCRIPTION-03**: Use `stripeCustomerId` as primary webhook lookup
- [x] **SUBSCRIPTION-04**: Implement webhook idempotency check
- [x] **SUBSCRIPTION-05**: Wrap all webhook database updates in single transaction
- [x] **SUBSCRIPTION-06**: Update `getSubscriptionStatus()` helper function
- [x] **SUBSCRIPTION-07**: Remove debug console.log statements from payment code paths
- [x] **SUBSCRIPTION-08**: Update payment links environment variables

### Feature Gating (FEATURE-GATE)

Access control logic for LLM features based on credits and subscription status.

- [x] **FEATURE-GATE-01**: Update document generation endpoints to check credits
- [x] **FEATURE-GATE-02**: Update workstream generation endpoint to check credits
- [x] **FEATURE-GATE-03**: Update chatbot endpoints to check message counter
- [x] **FEATURE-GATE-04**: Update chatbot tool call handler to check credits
- [x] **FEATURE-GATE-05**: Preserve demo mode functionality
- [x] **FEATURE-GATE-06**: Add unit tests for credit checking edge cases

### User Interface (UI)

UI components for credit display, upgrade prompts, and subscription status visibility.

- [x] **UI-01**: Display credit balance in application UI
- [x] **UI-02**: Display chat message counter in chat interface
- [x] **UI-03**: Show upgrade prompt when credits exhausted
- [x] **UI-04**: Show upgrade prompt when chat messages exhausted
- [x] **UI-05**: Block UI controls when credits insufficient
- [x] **UI-06**: Add subscription status to account/settings page
- [x] **UI-07**: Add annual vs lifetime choice comparison page

### Cleanup (CLEANUP)

Remove legacy pricing tiers and update documentation.

- [x] **CLEANUP-01**: Remove Basic and Pro tier references from codebase
- [x] **CLEANUP-02**: Update marketing copy to reflect new pricing
- [x] **CLEANUP-03**: Archive old Stripe products (do NOT delete)
- [x] **CLEANUP-04**: Update environment documentation

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATABASE-01 | Phase 1 | Complete |
| DATABASE-02 | Phase 1 | Complete |
| DATABASE-03 | Phase 1 | Complete |
| DATABASE-04 | Phase 1 | Complete |
| DATABASE-05 | Phase 1 | Complete |
| DATABASE-06 | Phase 1 | Complete |
| DATABASE-07 | Phase 1 | Complete |
| CREDIT-01 | Phase 2 | Complete |
| CREDIT-02 | Phase 2 | Complete |
| CREDIT-03 | Phase 2 | Complete |
| CREDIT-04 | Phase 2 | Complete |
| CREDIT-05 | Phase 2 | Complete |
| CREDIT-06 | Phase 2 | Complete |
| SUBSCRIPTION-01 | Phase 3 | Complete |
| SUBSCRIPTION-02 | Phase 3 | Complete |
| SUBSCRIPTION-03 | Phase 3 | Complete |
| SUBSCRIPTION-04 | Phase 3 | Complete |
| SUBSCRIPTION-05 | Phase 3 | Complete |
| SUBSCRIPTION-06 | Phase 3 | Complete |
| SUBSCRIPTION-07 | Phase 3 | Complete |
| SUBSCRIPTION-08 | Phase 3 | Complete |
| FEATURE-GATE-01 | Phase 4 | Complete |
| FEATURE-GATE-02 | Phase 4 | Complete |
| FEATURE-GATE-03 | Phase 4 | Complete |
| FEATURE-GATE-04 | Phase 4 | Complete |
| FEATURE-GATE-05 | Phase 4 | Complete |
| FEATURE-GATE-06 | Phase 4 | Complete |
| UI-01 | Phase 5 | Complete |
| UI-02 | Phase 5 | Complete |
| UI-03 | Phase 5 | Complete |
| UI-04 | Phase 5 | Complete |
| UI-05 | Phase 5 | Complete |
| UI-06 | Phase 5 | Complete |
| UI-07 | Phase 5 | Complete |
| CLEANUP-01 | Phase 6 | Complete |
| CLEANUP-02 | Phase 6 | Complete |
| CLEANUP-03 | Phase 6 | Complete |
| CLEANUP-04 | Phase 6 | Complete |

---

## Milestone Summary

**Shipped:** 38 of 38 v1 requirements
**Adjusted:** None
**Dropped:** None

---
*Archived: 2026-02-06 as part of v1 milestone completion*
