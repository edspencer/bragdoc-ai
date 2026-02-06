# Features Research: Credit Systems and Simplified Subscription Pricing

## Research Context

**Question:** What features do credit-based and simplified subscription systems have? What's table stakes vs differentiating?

**Target System:**
- Free tier: 10 credits for LLM features, 20 chat messages
- Paid tier: $45/year OR $99 lifetime (unlimited usage)
- Removing multi-tier pricing (currently has Basic/Pro at $5-9/month)
- Open source project (all code visible)

**LLM Features Requiring Credits:**
- Document generation (performance reviews, brag docs): 1-2 credits
- Workstreams (clustering + name generation): 2 credits
- Performance review chatbot: 1 credit per tool call
- Document chatbot: 1 credit per tool call
- Chat messages: 1 per message (separate 20-message counter)

---

## Feature Categories

### Table Stakes (Must Have)

These features are required for the credit system to function and for users to trust it.

#### 1. Credit Balance Display
**Complexity:** Low
**Dependencies:** None
**Description:** Users must always see their remaining credits clearly. Industry best practice is to display balance prominently in the UI, not buried in account settings.

**Implementation Notes:**
- Display in sidebar or header (always visible)
- Show as simple "X credits remaining" text
- Consider progress bar visualization for at-a-glance status
- Update in real-time after credit consumption

**Security (Open Source):** Balance display logic is not sensitive. The calculation happens server-side.

#### 2. Credit Deduction on Feature Use
**Complexity:** Medium
**Dependencies:** Database schema changes, API middleware
**Description:** Each LLM feature call must atomically check and deduct credits before execution.

**Implementation Notes:**
- Atomic transaction: check balance + deduct + execute
- Prevent race conditions with concurrent requests
- Return clear error when insufficient credits
- Log all credit transactions for debugging

**Security (Open Source):** Credit deduction MUST happen server-side. Client cannot be trusted to report usage.

#### 3. Insufficient Credits Blocking
**Complexity:** Low
**Dependencies:** Credit balance check
**Description:** When credits hit zero, LLM features must be blocked with clear messaging.

**Implementation Notes:**
- Block feature execution (not just warn)
- Show clear message: "You've used all 10 credits. Upgrade for unlimited access."
- Disable buttons/controls for credit-gated features
- Allow viewing existing content (just not generating new)

**Security (Open Source):** Blocking logic must be enforced server-side. UI blocking is supplementary.

#### 4. Upgrade Call-to-Action
**Complexity:** Low
**Dependencies:** Payment integration
**Description:** Clear, non-manipulative prompt to upgrade when credits are low or exhausted.

**Implementation Notes:**
- Show upgrade option in insufficient-credits modal
- Include pricing clearly ($45/year or $99 lifetime)
- Link to Stripe payment page (external redirect)
- No dark patterns: easy to dismiss, no fake urgency

**Security (Open Source):** Payment links are Stripe-hosted. No sensitive payment logic in codebase.

#### 5. Subscription Status Visibility
**Complexity:** Low
**Dependencies:** User schema update
**Description:** Users must see their current plan status (Free vs Paid, expiration date if applicable).

**Implementation Notes:**
- Display in account/settings page
- Show: Plan name, status (active/expired), renewal date (yearly) or "Lifetime" badge
- For lifetime: simple "Lifetime Access - No renewal needed"
- For yearly: show next renewal date, link to manage subscription

**Security (Open Source):** Subscription status comes from Stripe webhook data stored in DB. Validate server-side.

#### 6. Payment Integration (Stripe Payment Links)
**Complexity:** Medium
**Dependencies:** Stripe account setup
**Description:** Redirect to Stripe-hosted checkout for payment. No in-app payment form.

**Implementation Notes:**
- Use Stripe Payment Links for simplicity (no API integration for checkout)
- Two links: $45/year subscription, $99 one-time lifetime
- Include success/cancel redirect URLs
- Handle Stripe webhooks for payment confirmation

**Rationale for Payment Links over Checkout API:**
- Simpler implementation (no checkout session code)
- No PCI compliance concerns in codebase
- Stripe handles all payment UI
- Good enough for low-volume, simple pricing

**Security (Open Source):** Payment links are created in Stripe dashboard, not code. Webhook signature verification is critical.

#### 7. Webhook Handling for Payment Confirmation
**Complexity:** Medium
**Dependencies:** Stripe webhook setup
**Description:** Process Stripe webhooks to update user subscription status after successful payment.

**Implementation Notes:**
- Handle `checkout.session.completed` for new purchases
- Handle `invoice.paid` for subscription renewals
- Handle `customer.subscription.deleted` for cancellations
- Update user level to "paid" and set renewal date
- For lifetime: set level to "paid" with no expiration

**Security (Open Source):** CRITICAL - Verify Stripe webhook signatures. Webhook endpoint must validate signatures before trusting data.

---

### Differentiators (Make the UX Great)

These features enhance the experience but aren't strictly required for the system to work.

#### 8. Low Credit Warning
**Complexity:** Low
**Dependencies:** Credit balance tracking
**Description:** Proactive notification when credits are running low (e.g., 3 credits remaining).

**Implementation Notes:**
- Show subtle banner/toast when below threshold (30% remaining = 3 credits)
- Don't be annoying: show once per session, dismissible
- Include soft upgrade prompt

**Why Differentiating:** Users appreciate the heads-up vs. hitting zero unexpectedly.

#### 9. Credit Usage History
**Complexity:** Medium
**Dependencies:** Transaction logging
**Description:** Show users what consumed their credits with timestamps.

**Implementation Notes:**
- Simple table: Date, Feature, Credits Used
- Last 30 days visible
- Helps users understand consumption patterns
- Supports debugging/support inquiries

**Why Differentiating:** Builds trust through transparency. Users know exactly where credits went.

#### 10. Graceful Degradation for Partial Features
**Complexity:** Medium
**Dependencies:** Feature-specific logic
**Description:** When credits run out mid-flow, handle gracefully rather than crashing.

**Implementation Notes:**
- For document generation: Complete current generation, block next
- For chat: Allow reading history, block new messages
- For workstreams: Show existing workstreams, block regeneration
- Never lose user work due to credit exhaustion

**Why Differentiating:** Prevents frustrating data loss. Users feel safe using credits.

#### 11. Annual vs Lifetime Choice Display
**Complexity:** Low
**Dependencies:** Payment links setup
**Description:** Clear comparison of the two paid options at upgrade time.

**Implementation Notes:**
- Side-by-side comparison: $45/year vs $99 lifetime
- Highlight value: "Lifetime = 2.2 years of annual"
- Both options lead to unlimited usage (no feature differences)
- No deceptive "best value" badges

**Why Differentiating:** Reduces decision friction. Users pick confidently.

#### 12. Chat Message Counter (Separate from Credits)
**Complexity:** Low
**Dependencies:** Message tracking
**Description:** Track and display the separate 20-message limit for chat features.

**Implementation Notes:**
- Display "X/20 messages used" in chat interface
- Reset monthly for free users (or per-period)
- Clear indication when approaching limit
- Same upgrade flow when exhausted

**Why Differentiating:** Clarity on two-counter system. Users understand both limits.

#### 13. Cancel Subscription Flow
**Complexity:** Low
**Dependencies:** Stripe customer portal
**Description:** Easy cancellation through Stripe's customer portal.

**Implementation Notes:**
- Link to Stripe customer portal for self-service
- No dark patterns: visible cancellation option
- Show what happens after cancellation (revert to free tier)
- Consider grace period messaging

**Why Differentiating:** Trust signal. Users more likely to subscribe knowing they can easily cancel.

---

### Anti-Features (Deliberately NOT Building)

These features add complexity without proportional value for this use case.

#### A1. Multi-Tier Paid Plans
**Current State:** Basic ($5/month) and Pro ($9/month)
**Decision:** Consolidate to single paid tier

**Rationale:**
- Complexity in code, UI, and user decision-making
- Current tiers have minimal feature differentiation
- $45/year or $99 lifetime is simpler and more competitive
- Reduces support burden from plan confusion

#### A2. Credit Top-Up / Purchase
**Description:** Ability to buy additional credits without upgrading

**Rationale:**
- Adds billing complexity (one-time purchases alongside subscriptions)
- Creates confusing hybrid state (10 + 5 purchased credits?)
- Simple binary works better: free tier with limits OR unlimited paid
- Avoids "nickel and diming" perception

#### A3. Credit Rollover
**Description:** Unused credits carry over to next period

**Rationale:**
- Free tier is one-time 10 credits (not monthly refresh)
- Paid tier is unlimited (no credits to rollover)
- No rollover logic needed

#### A4. Usage-Based Pricing
**Description:** Pay per credit used (metered billing)

**Rationale:**
- Unpredictable costs worry users
- Complex billing reconciliation
- Flat unlimited pricing is more appealing for this use case
- LLM costs are low enough to absorb with flat fee

#### A5. Team/Organization Features
**Description:** Shared credit pools, admin dashboards, seat management

**Rationale:**
- Individual user product (not B2B)
- Massive complexity increase
- Not aligned with current user base
- Can be added later if demand emerges

#### A6. In-App Checkout Forms
**Description:** Collecting payment info within the app

**Rationale:**
- PCI compliance burden (even with Stripe Elements)
- More code to maintain and secure
- Payment Links are simpler and Stripe handles all security
- Lower conversion isn't a concern at current scale

#### A7. Free Trial Period
**Description:** Full access for X days, then revert

**Rationale:**
- 10 credits already serves as "trial" - users experience the product
- No need to time-gate: credit-gate is sufficient
- Simpler than tracking trial periods and expirations
- No dark pattern "trial auto-converts to paid"

#### A8. Promotional Codes / Discounts
**Description:** Coupon system for reduced pricing

**Rationale:**
- Marketing complexity
- Code in repo would expose discount logic
- Stripe supports coupons natively if needed later
- Not needed for launch

#### A9. Refund Management
**Description:** In-app refund request processing

**Rationale:**
- Handle manually via Stripe dashboard
- Low volume doesn't justify automation
- Better to have human review refund requests
- Reduces attack surface for abuse

#### A10. Real-Time Credit Deduction Animations
**Description:** Fancy UI showing credits counting down

**Rationale:**
- Visual noise without utility
- Can create anxiety (watching credits disappear)
- Simple "X credits remaining" is sufficient
- Performance cost of real-time updates

---

## Feature Dependencies Map

```
Payment Integration (6)
├── Webhook Handling (7)
│   └── Subscription Status Visibility (5)
│       └── Annual vs Lifetime Choice Display (11)
│       └── Cancel Subscription Flow (13)
│
Credit Balance Display (1)
├── Credit Deduction on Feature Use (2)
│   ├── Insufficient Credits Blocking (3)
│   │   └── Upgrade Call-to-Action (4)
│   ├── Low Credit Warning (8)
│   ├── Credit Usage History (9)
│   └── Graceful Degradation (10)
│
Chat Message Counter (12) - Independent track
```

---

## Implementation Priority

### Phase 1: Core Credit System (Table Stakes)
1. Database schema for credits and subscription status
2. Credit balance display in UI
3. Credit deduction middleware
4. Insufficient credits blocking + upgrade CTA
5. Stripe Payment Links setup
6. Webhook handling for payment confirmation

### Phase 2: Polish (Differentiators)
7. Subscription status visibility in settings
8. Low credit warning system
9. Chat message counter display
10. Credit usage history (optional)

### Phase 3: Future Consideration
- Graceful degradation improvements
- Analytics on credit usage patterns
- A/B testing upgrade prompts

---

## Security Implications for Open Source

### Safe to Expose
- Credit display component code
- UI logic for showing/hiding features
- Feature cost definitions (2 credits for workstreams, etc.)
- Webhook endpoint routes

### Must Protect (Environment Variables)
- `STRIPE_SECRET_KEY` - Never in code
- `STRIPE_WEBHOOK_SECRET` - For signature verification
- Payment Link URLs (can be in env vars or Stripe dashboard)

### Critical Server-Side Enforcement
- **Credit deduction** - Must happen in API routes, not client
- **Subscription status** - Read from DB, not client state
- **Feature gating** - Server must enforce, client is advisory only
- **Webhook validation** - Always verify Stripe signatures

### Potential Attack Vectors to Mitigate
1. **Direct API calls bypassing UI** - All gating in API middleware
2. **Race conditions on credit checks** - Atomic transactions
3. **Fake webhook calls** - Signature verification required
4. **Subscription status spoofing** - Never trust client-provided status

---

## Comparison to Current Implementation

### Current State (from codebase analysis)
- Three tiers: Free, Basic ($5/$30), Pro ($9/$90)
- Feature gates: unlimited_documents, ai_assistant, advanced_analytics, team_collaboration, api_access
- User level stored in DB: free | basic | pro | demo
- Stripe integration exists (customer ID, callback route)
- No credit tracking currently implemented

### Changes Needed
1. Add credit fields to user schema (creditsRemaining, lifetimeAccess)
2. Simplify user level to: free | paid | demo
3. Remove Basic/Pro distinction
4. Add credit transaction logging table
5. Add chat message counter fields
6. Update Stripe products (remove Basic/Pro, add Yearly/Lifetime)
7. Update payment-gates.ts for credit-based gating

---

## Sources

- [How to Implement Credit System in Subscription Model in 2025](https://flexprice.io/blog/how-to-implement-credit-system-in-subscription-model)
- [SaaS Credits System Guide 2026: Billing Models & Implementation](https://colorwhistle.com/saas-credits-system-guide/)
- [SaaS Credits Workflow: Developer Guide for Billing & API Design](https://colorwhistle.com/saas-credits-workflow/)
- [The 2025 State of SaaS Pricing Changes](https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes)
- [Freemium Pricing Strategy Explained - Stripe](https://stripe.com/resources/more/freemium-pricing-explained)
- [How I Designed a Credit System That Actually Makes Users Upgrade](https://dev.to/sholajegede/how-i-designed-a-credit-system-that-actually-makes-users-upgrade-59h5)
- [We've Built AI Credits. And It Was Harder Than We Expected - Stigg](https://www.stigg.io/blog-posts/weve-built-ai-credits-and-it-was-harder-than-we-expected)
- [Choosing Between Payment Links, Invoicing, Checkout, and Payment Element - Stripe](https://support.stripe.com/questions/choosing-between-payment-links-invoicing-checkout-and-payment-element)
- [Guide to Using Payment Links for Streamlined Sales - Stripe](https://stripe.com/resources/more/payment-links)
- [Lifetime Deal Strategy: One-Time Payment Growth](https://alignify.co/marketing/lifetime-deal)
- [Lifetime Deals and SaaS Businesses - The Bootstrapped Founder](https://thebootstrappedfounder.com/lifetime-deals-and-saas-businesses/)
- [UX in Freemium Products: How to Balance Monetization and User Experience](https://aguayo.co/en/blog-aguayo-user-experience/ux-in-freemium-products/)
- [Design Dark Patterns - Zivtech](https://www.zivtech.com/blog/design-dark-patterns)
- [The 2026 Free-to-Paid Conversion Report](https://www.growthunhinged.com/p/free-to-paid-conversion-report)
