# Roadmap: BragDoc Pricing Simplification

## Overview

This roadmap transforms BragDoc's pricing from a complex four-tier model (Free/Basic/Pro/Demo) to a simple two-option system: $45/year or $99 lifetime. Free users receive 10 LLM credits and 20 chat messages to try AI features, then must upgrade for unlimited access. The journey progresses through database foundation, credit system implementation, subscription management updates, feature gate integration, UI components, and legacy cleanup. Each phase builds on the previous, with database changes enabling credit tracking, credit tracking enabling feature gates, and feature gates enabling user-facing components.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation** - Schema changes for credits, simplified enums, and audit logging
- [x] **Phase 2: Credit System** - Atomic credit deduction and checking logic
- [x] **Phase 3: Subscription Management** - Stripe products, webhook handling, status helpers
- [ ] **Phase 4: Feature Gates** - Access control integration at LLM endpoints
- [ ] **Phase 5: User Interface** - Credit display, upgrade prompts, settings page
- [ ] **Phase 6: Cleanup** - Remove legacy tiers, update documentation

## Phase Details

### Phase 1: Database Foundation
**Goal**: Establish the data model supporting credits, simplified subscription tiers, and audit logging
**Depends on**: Nothing (first phase)
**Requirements**: DATABASE-01, DATABASE-02, DATABASE-03, DATABASE-04, DATABASE-05, DATABASE-06, DATABASE-07
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — User table schema: credit fields, enum updates, CHECK constraints
- [x] 01-02-PLAN.md — Credit transaction audit table with operation/feature enums
- [x] 01-03-PLAN.md — Gap closure: Better Auth config for credit fields

**Success Criteria** (what must be TRUE):
  1. New free users receive freeCredits=10 and freeChatMessages=20 upon account creation
  2. User level can be set to 'free', 'paid', or 'demo' (Basic/Pro no longer valid)
  3. Renewal period can be set to 'yearly' or 'lifetime' for tracking subscription type
  4. Database prevents negative credit balances via CHECK constraints
  5. Credit transactions are logged to audit table for debugging and support

### Phase 2: Credit System
**Goal**: Implement race-condition-safe credit deduction and checking utilities
**Depends on**: Phase 1
**Requirements**: CREDIT-01, CREDIT-02, CREDIT-03, CREDIT-04, CREDIT-05, CREDIT-06
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Atomic credit deduction and reservation utilities
- [x] 02-02-PLAN.md — Credit checking helpers and transaction logging

**Success Criteria** (what must be TRUE):
  1. Credit deduction is atomic (concurrent requests cannot cause double-spending)
  2. Streaming LLM operations reserve credit at start and refund on failure
  3. checkUserCredits() returns accurate status for free, paid, and demo users
  4. Chat message counter decrements correctly for free users only
  5. All credit operations are logged with user, operation type, and timestamp

### Phase 3: Subscription Management
**Goal**: Update Stripe integration for yearly/lifetime plans with robust webhook handling
**Depends on**: Phase 1
**Requirements**: SUBSCRIPTION-01, SUBSCRIPTION-02, SUBSCRIPTION-03, SUBSCRIPTION-04, SUBSCRIPTION-05, SUBSCRIPTION-06, SUBSCRIPTION-07, SUBSCRIPTION-08
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — StripeEvent table and idempotency infrastructure
- [x] 03-02-PLAN.md — Webhook handler refactor with lookup_key and stripeCustomerId
- [x] 03-03-PLAN.md — Subscription status helper and Stripe dashboard setup

**Success Criteria** (what must be TRUE):
  1. Stripe dashboard has "BragDoc Yearly" ($45/year) and "BragDoc Lifetime" ($99) products created
  2. Webhook correctly upgrades user to paid status on checkout completion
  3. Webhook handles yearly renewals and cancellations appropriately
  4. Lifetime users show as active subscribers with no renewal date checks
  5. Duplicate webhook events do not cause double-processing

### Phase 4: Feature Gates
**Goal**: Integrate credit checking at all LLM-powered endpoints while preserving demo mode
**Depends on**: Phase 2, Phase 3
**Requirements**: FEATURE-GATE-01, FEATURE-GATE-02, FEATURE-GATE-03, FEATURE-GATE-04, FEATURE-GATE-05, FEATURE-GATE-06
**Success Criteria** (what must be TRUE):
  1. Free user with 0 credits cannot generate documents or workstreams
  2. Free user with 0 chat messages cannot send new chat messages
  3. Paid users have unlimited access to all LLM features
  4. Demo users have unlimited access to all LLM features
  5. Blocked requests return 402 with upgrade URL for client to display
**Plans**: TBD

Plans:
- [ ] 04-01: Document and workstream generation gates
- [ ] 04-02: Chatbot endpoint gates and tool call credit handling

### Phase 5: User Interface
**Goal**: Display credit status and provide clear upgrade path when limits are reached
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. Free users see their remaining credits and chat messages in the UI
  2. Upgrade modal appears when credits or messages are exhausted
  3. Settings page shows current subscription status (plan, renewal date, or lifetime badge)
  4. Generate buttons are disabled with tooltip when credits insufficient
  5. Pricing comparison page shows annual vs lifetime options clearly
**Plans**: TBD

Plans:
- [ ] 05-01: Credit status display and upgrade prompt components
- [ ] 05-02: Settings page subscription status and comparison page

### Phase 6: Cleanup
**Goal**: Remove legacy pricing tiers and update all documentation
**Depends on**: Phase 5
**Requirements**: CLEANUP-01, CLEANUP-02, CLEANUP-03, CLEANUP-04
**Success Criteria** (what must be TRUE):
  1. No references to "Basic" or "Pro" tiers remain in active codebase
  2. Marketing site displays new pricing ($45/year or $99 lifetime)
  3. Old Stripe products are archived (not deleted)
  4. Environment documentation reflects new payment link variables
**Plans**: TBD

Plans:
- [ ] 06-01: Codebase cleanup and marketing updates
- [ ] 06-02: Stripe product archival and documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 3/3 | Complete | 2026-02-06 |
| 2. Credit System | 2/2 | Complete | 2026-02-06 |
| 3. Subscription Management | 3/3 | Complete | 2026-02-06 |
| 4. Feature Gates | 0/2 | Not started | - |
| 5. User Interface | 0/2 | Not started | - |
| 6. Cleanup | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-06*
*Total phases: 6*
*Total v1 requirements: 38*
