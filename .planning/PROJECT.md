# BragDoc Pricing Simplification

## What This Is

A major pricing simplification for BragDoc that eliminates the multi-tier subscription model in favor of two simple options: $45/year (marketed as $3.75/month, billed annually) or $99 lifetime access. Free users get 10 credits to try LLM-powered features and 20 messages for chatbot features before hitting limits. This makes BragDoc accessible for free usage while sustainably monetizing expensive LLM operations.

## Core Value

Make pricing dead simple with no confusing tiers. Users choose between affordable annual billing or a one-time lifetime purchase. Free tier provides full product access except LLM features, with generous trial credits so users can experience the AI capabilities before deciding to pay.

## Requirements

### Validated

These capabilities already exist in the codebase:

- ✓ Stripe SDK integration (v19.1.0) — existing
- ✓ Database-backed user subscription tracking — existing
- ✓ Webhook handler for Stripe events — existing
- ✓ Feature gating system — existing
- ✓ Better Auth authentication with JWT support — existing
- ✓ Product creation script infrastructure — existing
- ✓ User level and renewal period tracking — existing
- ✓ PostgreSQL with Drizzle ORM — existing
- ✓ Chat message persistence system — existing
- ✓ Document and performance review generation — existing
- ✓ Workstreams ML clustering — existing

### Active

New capabilities to build:

- [ ] Update user_level enum from free/basic/pro/demo to free/paid/demo
- [ ] Update renewalPeriod enum to support yearly/lifetime
- [ ] Add freeCredits field to user table (default 10)
- [ ] Add freeChatMessages field to user table (default 20)
- [ ] Implement credit deduction system for LLM features
- [ ] Implement chat message counter for free users
- [ ] Update Stripe webhook to handle annual and lifetime plans
- [ ] Update subscription status helper to recognize lifetime access
- [ ] Create Stripe products for annual ($45) and lifetime ($99) plans
- [ ] Update feature gates to check credits for free users
- [ ] Add upgrade prompts when credits/messages exhausted
- [ ] Display credit/message status in UI
- [ ] Remove old Basic/Pro Stripe products
- [ ] Update payment links environment variables
- [ ] Add database migration for schema changes
- [ ] Add audit logging for credit usage (security consideration)

### Out of Scope

- Multiple pricing tiers (Basic/Pro) — removing complexity
- Monthly billing option — annual only for simplicity
- Stripe Customer Portal integration — defer to future
- Credit refills for free users — one-time trial only
- In-app checkout flow — using Stripe payment links
- Migration logic for existing paid users — no paid users exist yet
- Subscription downgrade/upgrade flows — can cancel and repurchase
- Proration logic — not needed with simple model

## Context

**Project Type:** Existing production application (brownfield)

**Existing Infrastructure:**
- Monorepo with Turborepo + pnpm workspaces
- Next.js 16 App Router with React 19 Server Components
- PostgreSQL database with Drizzle ORM
- Stripe integration already configured
- Better Auth for authentication
- Vercel AI SDK for LLM operations
- Multiple chatbot endpoints (performance reviews, documents)
- Deployed on Cloudflare Workers

**Current Pricing (Being Replaced):**
- Basic: $5/month or $30/year
- Pro: $9/month or $90/year
- No users currently on paid plans

**LLM Features Requiring Payment:**
- Document generation (performance reviews, brag docs, etc.)
- Workstream name generation and clustering
- Performance review chatbot document updates
- General document chatbot interactions

**Security Considerations:**
- Open source project - all payment code publicly visible
- Must follow security best practices
- Design simplicity aids security review
- Never expose Stripe secret keys in client code
- All payment verification server-side only

**Technical Debt Context:**
From CONCERNS.md:
- Type assertions (`as any`) exist in auth code
- Console logging in production needs cleanup
- Better Auth v1.3.33 is early version with known issues

## Constraints

- **Open Source**: All code publicly visible on GitHub - security through simplicity and best practices
- **No IaC for Stripe**: Manual product setup in Stripe UI (previous IaC attempts were overly complex)
- **Stripe Payment Links**: Use Stripe-hosted checkout pages, not custom UI
- **Cloudflare Workers**: Deployment target constrains build configuration
- **No Paid Users**: No migration logic needed, but must preserve demo mode
- **Credit System Simplicity**: No complex tracking, just simple counters that decrement

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use yearly/lifetime for renewalPeriod enum | Annual billing exists as "yearly" in current code; avoids schema complexity | — Pending |
| Global freeChatMessages counter | Simpler than per-conversation tracking; easier to implement and understand | — Pending |
| Paid users have unlimited usage | No need to track credits for paying customers; simpler code paths | — Pending |
| 10 credits + 20 chat messages for free | Enough to try full product capabilities without excessive LLM costs | — Pending |
| Market as $3.75/month (billed annually) | Common pricing UX pattern; shows affordability while avoiding monthly Stripe fees | — Pending |
| Remove all existing pricing tiers | Radical simplification eliminates maintenance burden and user confusion | — Pending |
| Use Stripe payment links | Leverage Stripe's hosted checkout; no custom payment UI to secure | — Pending |
| Manual Stripe product setup | Avoid IaC complexity; manual setup in Stripe dashboard is simpler | — Pending |

---
*Last updated: 2026-02-06 after initialization*
