# Project Research Summary

**Project:** BragDoc Credit System and Simplified Subscription Pricing
**Domain:** SaaS Payment Integration with Credit-Based Access Control
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

This research addresses integrating a simplified two-tier pricing model (free with credits vs. paid unlimited) into BragDoc's existing Next.js + Stripe architecture. The recommended approach emphasizes incremental changes to proven infrastructure rather than rebuilding payment systems. The core insight from cross-domain research is that credit systems work best when implemented as simple database counters rather than complex ledgers or external metering services, especially for open-source projects where all code is publicly visible.

The pricing simplification consolidates four user tiers (free, basic, pro, demo) into two (free, paid, demo) with two purchase options: $45/year or $99 lifetime. Free users receive 10 LLM credits and 20 chat messages as trial capacity, after which they must upgrade for unlimited access. This model aligns with 2025 SaaS trends away from complex multi-tier pricing toward simple binary freemium models, reducing cognitive load for users and operational complexity for the platform.

Key risk mitigation centers on webhook security, database transaction integrity, and PostgreSQL enum migrations. The open-source nature of the codebase demands extra attention to server-side enforcement of credit limits and payment verification, as client-side code cannot be trusted. The architecture research identified atomic credit deduction as the critical pattern to prevent race conditions, while the pitfalls analysis revealed that enum migration requires forward-compatible changes (adding values before removing old ones) to avoid production downtime.

## Key Findings

### Recommended Stack

Database-level credit tracking is the optimal approach for BragDoc's simple usage model. Stripe Billing Credits and Metered Billing add unnecessary complexity for a binary free-vs-paid system. The research found that Stripe's new Billing Meters (2025) only apply to subscription prices and don't support one-time lifetime purchases, making them unsuitable for BragDoc's dual pricing model.

**Core technologies:**
- **PostgreSQL fields on User table**: Credit counters (freeCredits, freeChatMessages) as simple integers with atomic decrement operations — no external dependencies for feature gating
- **Pino structured logger**: Audit trail for credit deduction and payment events — 5-10x faster than Winston, native JSON output with PII redaction
- **Stripe Payment Links**: Hosted checkout for both yearly subscription and lifetime purchase — eliminates PCI compliance code surface, secure by default
- **PostgreSQL transactions**: Ensure atomic webhook processing updates — prevents partial payment state corrupting user records
- **Drizzle ORM enum handling**: Forward-compatible enum migration pattern — adds new values first, migrates data second, removes old values last (weeks later)

The existing stack (Next.js 16, Better Auth v1.3.33, Drizzle ORM, Cloudflare Workers deployment) requires no changes. All additions integrate with established patterns: unified auth helper provides user context, Server Components enforce gates, API routes handle webhook callbacks.

### Expected Features

Research into credit-based freemium systems identified 13 table-stakes features and 6 key differentiators, with a clear anti-features list to avoid scope creep.

**Must have (table stakes):**
- Credit balance display in UI (sidebar/header, always visible)
- Atomic credit deduction before LLM operations (prevents race conditions)
- Insufficient credits blocking with clear messaging (no silent degradation)
- Upgrade call-to-action linking to Stripe payment (non-manipulative, dismissible)
- Subscription status visibility in settings (plan name, renewal date, lifetime badge)
- Stripe webhook handling for payment confirmation (signature verification critical)
- Payment integration via Stripe Payment Links (one for yearly, one for lifetime)

**Should have (competitive differentiators):**
- Low credit warning at 30% remaining (proactive, not annoying)
- Credit usage history showing what consumed credits (transparency builds trust)
- Graceful degradation mid-flow (never lose user work due to credit exhaustion)
- Annual vs lifetime choice comparison (side-by-side, honest value proposition)
- Separate chat message counter display (clarity on dual-limit system)
- Easy cancellation through Stripe customer portal (trust signal)

**Defer (explicitly NOT building):**
- Multi-tier paid plans (consolidating to single "paid" level)
- Credit top-up purchasing (avoids hybrid billing complexity)
- Credit rollover (one-time allocation for free tier, unlimited for paid)
- Usage-based metered billing (flat pricing more appealing, simpler)
- Team/organization features (individual user product)
- In-app checkout forms (Payment Links eliminate PCI burden)
- Free trial time-gating (10 credits already serve as trial)
- Promotional codes (can add later via Stripe if needed)
- In-app refund management (manual via Stripe dashboard)
- Real-time credit countdown animations (visual noise without utility)

Feature dependencies map shows Payment Links → Webhook Handler → Subscription Status forms one track, while Credit Display → Deduction → Blocking → Upgrade CTA forms the second track. These converge at feature gates which check subscription OR credits.

### Architecture Approach

The architecture extends existing BragDoc patterns with five new component boundaries, each with clear responsibilities and integration points. The design prioritizes simplicity: credit tracking as database fields (not a separate service), feature gates as helper functions (not middleware), UI context for balance display (leveraging React Server Components).

**Major components:**

1. **Credit Tracking System** (packages/database/schema + apps/web/lib/credits.ts) — Stores credit balances as integer fields, provides atomic decrement operations via single UPDATE with WHERE check, prevents negative values with database constraint, logs all deductions to CreditLog table for audit trail

2. **Feature Gate System** (extends packages/config/payment-gates.ts) — Checks user eligibility as paid OR has-credits, returns actionable result (allowed, upgrade_required, credits_exhausted), integrates at API routes before LLM operations and Server Components for UI rendering

3. **Subscription Management** (User table enums + webhook handler) — Tracks subscription status via simplified level enum (free/paid/demo), handles yearly subscriptions with renewal date checks, recognizes lifetime purchases with no expiry, processes Stripe webhooks to update user state atomically

4. **Upgrade Prompt System** (React components + context provider) — Displays credit balance in persistent UI element, shows contextual upgrade prompts when limits hit, provides direct Stripe Payment Links for purchase flow

5. **Audit Logging** (CreditLog table + Pino logger) — Records every credit deduction with timestamp/user/operation, enables security review of consumption patterns, supports debugging unexpected usage

Data flow for credit deduction: User Action → API Route → checkFeatureAccess() (paid? credits?) → deductCredit() (atomic UPDATE) → Execute LLM → Return with updated balance. Stripe webhook flow: Event → Verify signature → Extract plan from lookup_key → Update User in transaction → Return 200. Feature gate check branches: paid → allow (no deduct), demo → allow (no deduct), has credits → allow (will deduct), otherwise → deny with upgrade_needed.

### Critical Pitfalls

The pitfalls research identified 19 failure modes across security, database, testing, and operational dimensions. The top five by severity:

1. **Race conditions in credit deduction** — Concurrent requests can cause double-spending if using read-then-decrement pattern instead of atomic UPDATE with WHERE check; prevention requires single-query decrement with `freeCredits > 0` guard and database CHECK constraint preventing negatives; must be implemented in Phase 2 from the start, not retrofitted

2. **PostgreSQL enum migration breaking production** — Cannot drop enum values directly; must add new values first, migrate data, deploy code handling both old and new values, then remove old values weeks later; current migration from [free, basic, pro, demo] to [free, paid, demo] requires multi-step process documented in Drizzle enum migration PR #4831

3. **Webhook signature verification bypass** — Open-source code exposes webhook handler structure; attackers can forge calls if signature check is skipped or uses predictable secrets; existing code correctly validates first via stripe.webhooks.constructEvent(), must maintain this pattern and use unique secrets per environment

4. **Lifetime access misconfigured as subscription** — Stripe product must be one-time payment (mode: 'payment'), not recurring subscription; webhook must handle checkout.session.completed for lifetime vs invoice.paid for yearly; isActiveSubscription() helper must return true for renewalPeriod === 'lifetime' without date checks

5. **Demo mode breaking after subscription changes** — Shadow users with level: 'demo' must bypass all credit checks and subscription gates; all feature access logic must include explicit demo check returning unlimited access; cannot remove 'demo' from enum; requires regression test in every phase touching gating

Additional critical pitfalls: user lookup by email fails if user changes email (use stripeCustomerId primary), console.log exposes payment PII (remove all from payment paths), partial payment state after error (wrap in database transaction), Payment Links need client_reference_id for user association, webhook retries require idempotency table (dedupe by event.id), default freeCredits: 10 applies to all users including paid/demo (use NULL default with selective assignment).

## Implications for Roadmap

Based on architecture dependencies and risk mitigation requirements, the recommended phase structure follows a strict dependency order: database foundation → credit system → feature gates → webhook updates → UI polish → cleanup. Each phase builds on the previous, with specific pitfall avoidance mapped to phase boundaries.

### Phase 1: Database Foundation & Webhook Security

**Rationale:** All subsequent phases depend on correct data model. Enum migration is highest-risk operation (production downtime if wrong). Webhook security must be verified before any payment processing changes. Foundational changes should happen together to minimize migration count.

**Delivers:**
- User table with freeCredits/freeChatMessages integer fields
- Simplified userLevelEnum (free, paid, demo) via forward-compatible migration
- Enhanced renewalPeriodEnum with 'lifetime' value
- CreditLog table for audit trail
- Webhook idempotency table (StripeEvent) to prevent duplicate processing
- Updated webhook handler for yearly/lifetime plans with transaction wrapping

**Addresses features:**
- Subscription status visibility (data model support)
- Payment integration foundation (webhook security hardening)

**Avoids pitfalls:**
- #3 Enum migration breaking production (multi-step, forward-compatible)
- #8 User lookup by email (add stripeCustomerId priority)
- #10 Partial payment state (transaction wrapping)
- #13 Idempotency failures (deduplication table)
- #16 Default values for existing users (NULL default, selective assignment)

**Implementation notes:**
- Migration must add 'paid' to enum before removing 'basic'/'pro'
- Data migration: UPDATE User SET level = 'paid' WHERE level IN ('basic', 'pro')
- Deploy code handling both old and new enum values before cleanup
- Remove console.log from all payment code paths
- Verify webhook signature verification unchanged
- Test enum migration on production-like dataset first

### Phase 2: Atomic Credit System

**Rationale:** Feature gates (Phase 3) depend on reliable credit checking. Atomic operations must be correct from the start—retrofitting transaction safety is harder than building it initially. This phase has no UI surface, can be tested independently via API.

**Delivers:**
- apps/web/lib/credits.ts with checkCredit() and deductCredit() functions
- Atomic UPDATE with WHERE freeCredits > 0 guard
- Database CHECK constraint preventing negative balances
- CreditLog insertion on every deduction
- Helper functions in packages/database/models/user.ts

**Addresses features:**
- Credit deduction on feature use (atomic, race-condition safe)
- Audit logging for security review

**Avoids pitfalls:**
- #2 Race conditions in credit deduction (atomic operations pattern)
- #6 Feature gate edge cases (reservation pattern for streaming)
- #15 Missing negative balance tests (comprehensive edge case coverage)

**Implementation notes:**
- Single utility function for all credit deduction (no scattered logic)
- Return updated count to verify success before proceeding
- Streaming LLM operations reserve credit at stream start, refund on failure
- Tests must cover: zero credits, concurrent requests, database constraint violation
- Paid users must bypass credit checks entirely (level === 'paid')
- Demo users must bypass credit checks entirely (level === 'demo')

### Phase 3: Feature Gate Integration

**Rationale:** With credit system proven stable, integrate into all LLM-powered endpoints. This phase touches many files but follows uniform pattern. Each endpoint integration is independent, supports incremental rollout.

**Delivers:**
- Enhanced packages/config/payment-gates.ts with credit-based gates
- apps/web/lib/feature-access.ts unified access checker
- Integration with document generation, workstreams, chatbots
- Separate chat message counter enforcement
- Error responses with upgrade_url for client UX

**Uses stack:**
- Atomic credit deduction from Phase 2
- Subscription status helpers from Phase 1
- Unified auth helper (existing getAuthUser)

**Implements architecture:**
- Feature Gate System component boundary
- Integration points with LLM features identified in architecture research

**Addresses features:**
- Insufficient credits blocking with clear messaging
- Upgrade call-to-action linking to payment
- Chat message counter (separate from LLM credits)

**Avoids pitfalls:**
- #4 Demo mode breaking (explicit checks in all gates)
- #6 Feature gate edge cases (consistent reservation pattern)

**Implementation notes:**
- Pattern: check access → deduct credit if free → execute LLM → return with balance
- API routes return 403 with {error, upgradeUrl} when access denied
- Server Components check gates for conditional rendering
- CLI validates access before expensive operations (auth via JWT)

### Phase 4: UI Components & Upgrade Flow

**Rationale:** Backend fully functional, can test via API. UI is the final user-facing layer. Credit display depends on stable backend. Upgrade prompts need working payment flow to test E2E.

**Delivers:**
- CreditStatusProvider React context for balance state
- CreditStatusBanner component in sidebar
- UpgradePromptModal with pricing comparison
- Integration into existing layouts
- Stripe Payment Links with client_reference_id for user association

**Addresses features:**
- Credit balance display (always visible)
- Low credit warning (30% threshold)
- Annual vs lifetime choice display (side-by-side comparison)
- Graceful degradation mid-flow (show history, block new)

**Avoids pitfalls:**
- #12 Payment Links without user association (include client_reference_id)

**Implementation notes:**
- Server Component fetches user credits, passes to Client Component via props
- Update on API response, not optimistic (source of truth is database)
- Low credit warning: dismissible, show once per session at 3 credits remaining
- Upgrade modal: non-manipulative, clear value proposition, easy to dismiss
- Payment Links: https://buy.stripe.com/xxx?client_reference_id={userId}

### Phase 5: Settings & Account Management

**Rationale:** Core payment flow working, add self-service management. Independent of credit system, can be built in parallel with Phase 4 if resources allow.

**Delivers:**
- Subscription status display in settings page
- Stripe customer portal link for cancellation/billing
- Credit usage history table (last 30 days)
- Plan comparison page update with new pricing

**Addresses features:**
- Subscription status visibility (plan, renewal date, lifetime badge)
- Easy cancellation flow (Stripe customer portal)
- Credit usage history (transparency)

**Implementation notes:**
- Lifetime: show "Lifetime Access - No renewal needed" badge
- Yearly: show next renewal date, link to manage subscription
- Usage history: query CreditLog table grouped by operation
- Portal link: generated via Stripe API using stripeCustomerId

### Phase 6: Cleanup & Migration Completion

**Rationale:** New system proven in production. Safe to archive old products and complete enum cleanup. Should wait 2-4 weeks after Phase 5 deploy to ensure stability.

**Delivers:**
- Archive old Stripe products (Basic $5, Pro $9)
- Remove old enum values if safe (or keep indefinitely)
- Update marketing site with new pricing
- Documentation updates (CLAUDE.md environment variables)
- Remove feature flags if used for gradual rollout

**Addresses features:**
- N/A (cleanup phase)

**Avoids pitfalls:**
- #7 Stripe product cleanup (archive, don't delete)
- #19 Rollback complexity (accept fix-forward approach)

**Implementation notes:**
- Archive products only after confirming no pending payments
- Update payment links BEFORE archiving old products
- Monitor Stripe webhooks for 2 weeks for any old product activity
- Old enum values can remain indefinitely (small cost, prevents edge cases)

### Phase Ordering Rationale

- Database changes precede code changes (data model stability)
- Atomic operations precede distributed feature gates (correctness foundation)
- Backend precedes frontend (testability via API)
- Core flow precedes self-service management (prioritize payment success)
- Cleanup follows stability period (risk mitigation)

This order minimizes dependencies between phases, enables incremental testing, and surfaces high-risk operations (enum migration, webhook changes) early when rollback is still feasible. Each phase delivers independently testable functionality.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2 (Credit System):** Atomic transaction patterns in Drizzle ORM—research indicates single UPDATE with WHERE, but need to verify Drizzle SQL builder syntax for this pattern and test race condition handling
- **Phase 3 (Feature Gates):** Streaming credit reservation pattern—LLM streaming responses via Vercel AI SDK may need credit reservation before stream start; research SDK hooks for pre-stream checks

Phases with standard patterns (skip research-phase):

- **Phase 1 (Database Foundation):** Well-documented Drizzle enum migration pattern (PR #4831), established Stripe webhook signature verification
- **Phase 4 (UI Components):** Standard React context + Server Component patterns already used throughout BragDoc
- **Phase 5 (Settings):** Stripe customer portal is turnkey integration, documented in Stripe API
- **Phase 6 (Cleanup):** Operational tasks, no novel technical challenges

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Recommendation to avoid Stripe Billing Credits based on direct Stripe documentation showing Meters apply only to subscription prices; Pino logger recommendation from comparative benchmarks (5-10x Winston); all other stack elements already in production |
| Features | HIGH | Table stakes identified from 6 authoritative sources on freemium credit systems (Stripe guides, FlexPrice, Colorwhistle); anti-features validated against 2025 SaaS pricing trend research showing move toward simplification |
| Architecture | HIGH | Component boundaries follow existing BragDoc patterns (database + query helpers, React context, Server Components); atomic deduction pattern validated against PostgreSQL ACID properties; webhook transaction wrapping is standard pattern |
| Pitfalls | HIGH | All 19 pitfalls derived from: Stripe documentation on webhook security, Drizzle GitHub issues on enum migration, PostgreSQL concurrent update behavior, existing BragDoc code analysis (demo mode, payment-gates.ts) |

**Overall confidence:** HIGH

Research cross-referenced Stripe official documentation, Drizzle ORM GitHub issues, established SaaS pricing patterns, and BragDoc codebase analysis. The only medium-confidence area is chat message counter scope (global vs per-conversation vs per-period), which was addressed via explicit documentation recommendation in Phase 2. All other recommendations are backed by authoritative sources or existing production patterns.

### Gaps to Address

While overall confidence is high, three areas need validation during implementation:

- **Drizzle atomic UPDATE syntax:** Research indicates pattern `UPDATE user SET credits = credits - 1 WHERE id = $1 AND credits > 0 RETURNING credits` but need to verify Drizzle SQL builder API for this exact construct; alternative is using `db.execute()` with raw SQL if builder insufficient
  - *How to handle:* Spike in Phase 2 planning to verify Drizzle supports this pattern; fallback to raw SQL if needed (acceptable for critical path)

- **Vercel AI SDK credit reservation hooks:** Streaming responses may start before credit deduction; need to identify SDK hook for pre-stream credit check
  - *How to handle:* Review AI SDK documentation during Phase 3 planning; worst case is deducting credit on stream initiation (start of first chunk) rather than pre-stream

- **Chat message granularity decision:** Requirements say "20 chat messages" but unclear if this means user messages only (recommended) or includes assistant responses (would exhaust much faster)
  - *How to handle:* Product decision needed before Phase 3; recommend user messages only (standard pattern per SaaS chatbot research)

None of these gaps block phase ordering or architecture decisions. All have clear fallback strategies documented.

## Sources

### Primary (HIGH confidence)

**Stripe Official Documentation:**
- [Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — yearly subscription implementation
- [Billing credits and metering](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits) — why NOT to use for BragDoc
- [Webhook signature verification](https://docs.stripe.com/webhooks/signature) — security implementation
- [One-time payments guide](https://stripe.com/resources/more/what-is-a-one-time-payment-a-guide-for-businesses) — lifetime purchase setup

**Drizzle ORM:**
- [GitHub PR #4831: Fix enum migration when dropping values](https://github.com/drizzle-team/drizzle-orm/pull/4831) — forward-compatible migration pattern
- [PostgreSQL Best Practices Guide 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) — query patterns, transactions

**BragDoc Codebase:**
- `apps/web/app/api/stripe/callback/route.ts` — existing webhook handler
- `packages/database/src/schema.ts` — current User table schema
- `apps/web/lib/demo-mode.ts` — demo user creation pattern
- `packages/config/src/payment-gates.ts` — existing feature gates

### Secondary (MEDIUM confidence)

**SaaS Pricing Research:**
- [2025 State of SaaS Pricing Changes](https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes) — trend toward simplification
- [Freemium Pricing Strategy - Stripe](https://stripe.com/resources/more/freemium-pricing-explained) — free tier best practices
- [Free-to-Paid Conversion Report 2026](https://www.growthunhinged.com/p/free-to-paid-conversion-report) — conversion optimization

**Credit System Implementation:**
- [FlexPrice: Implement Credit System in Subscription Model 2025](https://flexprice.io/blog/how-to-implement-credit-system-in-subscription-model) — credit vs metered billing comparison
- [Colorwhistle: SaaS Credits System Guide 2026](https://colorwhistle.com/saas-credits-system-guide/) — architecture patterns
- [Colorwhistle: SaaS Credits Workflow](https://colorwhistle.com/saas-credits-workflow/) — API design for credits

**Logging:**
- [Pino vs Winston comparison](https://dev.to/wallacefreitas/pino-vs-winston-choosing-the-right-logger-for-your-nodejs-application-369n) — performance benchmarks
- [Complete Guide to Pino Logging](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) — implementation guide

### Tertiary (LOW confidence, needs validation)

- [Dev.to: How I Designed a Credit System](https://dev.to/sholajegede/how-i-designed-a-credit-system-that-actually-makes-users-upgrade-59h5) — UX patterns for upgrade prompts (single author perspective, but aligns with other sources)
- [Stigg: We've Built AI Credits](https://www.stigg.io/blog-posts/weve-built-ai-credits-and-it-was-harder-than-we-expected) — pitfalls from production experience (company blog, not peer-reviewed, but useful war stories)

---
*Research completed: 2026-02-06*
*Ready for roadmap: yes*
