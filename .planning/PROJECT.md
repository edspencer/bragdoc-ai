# BragDoc Pricing Simplification

## What This Is

A credit-based pricing system for BragDoc that offers two simple options: $45/year (marketed as $3.75/month) or $99 lifetime for unlimited AI features. Free users receive 10 credits for LLM operations and 20 messages for chatbot features to experience the product before upgrading.

## Core Value

Dead-simple pricing with no confusing tiers. Free trial through credits, unlimited access through payment.

## Requirements

### Validated

Capabilities shipped in v1:

- ✓ Database schema with freeCredits and freeChatMessages fields — v1
- ✓ Atomic credit deduction with race-condition-safe UPDATE queries — v1
- ✓ Credit checking utilities (checkUserCredits, checkUserChatMessages) — v1
- ✓ Credit transaction logging for audit trail — v1
- ✓ Stripe webhook idempotency via StripeEvent table — v1
- ✓ Subscription status helper with lifetime/yearly detection — v1
- ✓ Feature gates at all LLM endpoints (documents, workstreams, chat) — v1
- ✓ 402 Payment Required responses with upgrade URL — v1
- ✓ Credit status display in sidebar and chat interface — v1
- ✓ Upgrade modal on credit/message exhaustion — v1
- ✓ Credit-gated button component with disabled state — v1
- ✓ Subscription status in account settings — v1
- ✓ Pricing comparison page ($45/year vs $99 lifetime) — v1
- ✓ Legacy Basic/Pro tier code removed — v1
- ✓ Marketing site updated to new pricing — v1

### Active

Next capabilities to build (v2):

- [ ] Low credit warning system (proactive notifications at 30% remaining)
- [ ] Credit usage history page (last 30 days of transactions)
- [ ] Stripe Customer Portal integration (self-service management)
- [ ] Analytics on credit usage patterns (internal dashboard)

### Out of Scope

- Multi-tier paid plans — simplified to single paid tier
- Monthly billing option — annual only for simplicity
- Credit top-up / purchase — binary free vs unlimited
- Credit rollover — one-time trial credits only
- Team/organization features — individual product
- In-app checkout — using Stripe payment links
- Promotional codes — marketing complexity avoided

## Context

**Project Type:** Brownfield (pricing simplification on existing app)

**Shipped:** v1 on 2026-02-06

**Codebase State:**
- ~72,880 lines TypeScript in web app
- ~5,038 lines TypeScript in database package
- 125 files modified in this milestone
- Tech stack: Next.js 16, PostgreSQL/Drizzle, Stripe SDK v19, Better Auth

**Key Technical Decisions:**
- Database-level credit tracking (simple integers) over Stripe Billing Credits
- Forward-compatible enum migration (add 'paid' before removing 'basic'/'pro')
- Global freeChatMessages counter (not per-conversation)
- NULL OR >= 0 CHECK constraint pattern for existing user compatibility
- Non-blocking credit logging (failures don't fail main operation)
- 402 response pattern with structured upgradeUrl for client handling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use database integers for credits | Simple, no external dependencies | ✓ Good |
| Global chat message counter | Simpler than per-conversation tracking | ✓ Good |
| Paid users bypass all credit checks | Cleaner code paths | ✓ Good |
| 10 credits + 20 messages for free | Enough to try full product | ✓ Good |
| Market as $3.75/month (billed annually) | Common pricing UX pattern | ✓ Good |
| Use Stripe payment links | No custom checkout UI to secure | ✓ Good |
| Keep deprecated enum values | PostgreSQL compatibility | ✓ Good |
| StripeEvent table for idempotency | Prevents duplicate webhook processing | ✓ Good |
| Credit gate before LLM operations | Cannot return 402 mid-stream | ✓ Good |

## Constraints

- Open source codebase — security through simplicity
- Cloudflare Workers deployment target
- No existing paid users — no migration needed
- Better Auth v1.3.33 — some known quirks

---
*Last updated: 2026-02-06 after v1 milestone*
