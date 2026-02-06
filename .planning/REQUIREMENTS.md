# Requirements: Stripe Pricing Simplification

## Overview

Simplify BragDoc pricing from 4-tier model (Free/Basic/Pro/Demo) to 2-tier model (Free with trial credits vs Paid unlimited). Free users get 10 credits for LLM features and 20 messages for chatbot features. Paid users pay either $45/year (marketed as $3.75/month, billed annually) or $99 lifetime for unlimited access.

## v1 Requirements

### Database Schema (DATABASE)

Schema changes to support credit tracking and simplified subscription model.

- [ ] **DATABASE-01**: Add `freeCredits` integer field to user table with default 10
  - New free users start with 10 credits
  - Paid users bypass credit checks (don't need counter)
  - Demo users bypass credit checks (unlimited access)
  - NULL for existing users to distinguish from exhausted (0)

- [ ] **DATABASE-02**: Add `freeChatMessages` integer field to user table with default 20
  - Global counter across all chatbot sessions
  - Decrements on each user message (not assistant responses)
  - Paid users bypass message checks
  - Demo users bypass message checks

- [ ] **DATABASE-03**: Update `user_level` enum from ['free', 'basic', 'pro', 'demo'] to ['free', 'paid', 'demo']
  - Forward-compatible migration (add 'paid' first, migrate existing Basic/Pro to 'paid', retain enum values temporarily)
  - PostgreSQL cannot DROP enum values in transaction
  - Must coordinate code deploy with migration timing

- [ ] **DATABASE-04**: Update `renewalPeriod` enum to support ['yearly', 'lifetime']
  - Remove 'monthly' option (no monthly billing)
  - 'yearly' = recurring subscription at $45/year
  - 'lifetime' = one-time purchase, no expiration

- [ ] **DATABASE-05**: Add CHECK constraint to prevent negative credit balances
  - `CHECK (freeCredits IS NULL OR freeCredits >= 0)`
  - `CHECK (freeChatMessages IS NULL OR freeChatMessages >= 0)`
  - Prevents race condition bugs

- [ ] **DATABASE-06**: Create database migration file for all schema changes
  - Use `pnpm db:generate` to create migration
  - Test on production-like data volume
  - Never use `db:push` for production (bypasses migrations)

- [ ] **DATABASE-07**: Create `credit_transactions` table for audit logging
  - Fields: id, userId, amount, operation (deduct/refund), featureType, timestamp, metadata
  - Enables debugging, support inquiries, usage analytics
  - Indexed on userId and timestamp

### Credit System (CREDIT)

Core credit deduction and checking logic for LLM features.

- [ ] **CREDIT-01**: Implement atomic credit deduction function
  - Single UPDATE query with WHERE check: `UPDATE "User" SET freeCredits = freeCredits - X WHERE id = $1 AND freeCredits >= X RETURNING freeCredits`
  - Prevents race conditions from concurrent requests
  - Returns updated count to verify success before LLM call
  - Must be transaction-safe

- [ ] **CREDIT-02**: Implement credit reservation pattern for streaming operations
  - Reserve credit at request start (atomic decrement)
  - Execute LLM operation
  - Refund credit on failure (error handling)
  - Prevents mid-stream credit exhaustion

- [ ] **CREDIT-03**: Create `checkUserCredits()` utility function
  - Check if user has sufficient credits for operation
  - Returns: { hasCredits: boolean, remainingCredits: number }
  - Accounts for paid users (always return true)
  - Accounts for demo users (always return true)
  - Server-side only (never trust client)

- [ ] **CREDIT-04**: Implement chat message counter deduction
  - Decrement `freeChatMessages` on each user message submission
  - Global counter (not per-conversation)
  - Skip decrement for paid users
  - Skip decrement for demo users
  - Return error when exhausted: "You've used all 20 free messages"

- [ ] **CREDIT-05**: Add credit costs to feature definitions
  - Document generation: 1-2 credits (varies by document type/length)
  - Workstream clustering: 2 credits
  - Chat tool calls: 1 credit per tool invocation
  - Centralize in `lib/credit-costs.ts` for consistency

- [ ] **CREDIT-06**: Implement credit transaction logging
  - Log all credit deductions to `credit_transactions` table
  - Include: userId, amount, operation type, feature name, timestamp
  - Use Pino logger for structured JSON output
  - Never log PII or sensitive user data

### Subscription Management (SUBSCRIPTION)

Payment processing, webhook handling, and subscription status tracking.

- [ ] **SUBSCRIPTION-01**: Create Stripe products in dashboard (manual setup, not IaC)
  - Product 1: "BragDoc Yearly" - $45/year recurring subscription (lookup_key: 'yearly')
  - Product 2: "BragDoc Lifetime" - $99 one-time payment (lookup_key: 'lifetime')
  - Archive old products: Basic Achiever ($5/mo, $30/yr), Pro Achiever ($9/mo, $90/yr)
  - Do NOT delete old products (breaks historical payment links)

- [ ] **SUBSCRIPTION-02**: Update Stripe webhook handler for new plan types
  - Handle `checkout.session.completed` for both yearly and lifetime purchases
  - Handle `invoice.paid` for yearly subscription renewals
  - Handle `customer.subscription.deleted` for cancellations (skip lifetime users)
  - Parse lookup_key to determine plan type ('yearly' vs 'lifetime')
  - Update user fields: level='paid', renewalPeriod, lastPayment, stripeCustomerId

- [ ] **SUBSCRIPTION-03**: Use `stripeCustomerId` as primary webhook lookup
  - Current code looks up by email (fragile if user changes email)
  - Add `stripeCustomerId` unique index to prevent duplicates
  - Store during checkout flow
  - Use email only as fallback, log when fallback used

- [ ] **SUBSCRIPTION-04**: Implement webhook idempotency check
  - Store `stripe_event_id` in database before processing
  - Check for duplicate event IDs (Stripe retries webhooks on failure)
  - Return 200 OK for already-processed events
  - Prevents double credit additions or duplicate updates

- [ ] **SUBSCRIPTION-05**: Wrap all webhook database updates in single transaction
  - Prevents partial state (e.g., level updated but lastPayment NULL)
  - Single UPDATE with all fields: level, renewalPeriod, lastPayment, stripeCustomerId
  - Log transaction boundaries for debugging

- [ ] **SUBSCRIPTION-06**: Update `getSubscriptionStatus()` helper function
  - Check for lifetime access: `renewalPeriod === 'lifetime'` returns unlimited
  - Check for active yearly: `level === 'paid' AND renewalPeriod === 'yearly' AND lastPayment recent`
  - Demo users: always return unlimited
  - Free users: return credit-limited status

- [ ] **SUBSCRIPTION-07**: Remove debug console.log statements from payment code paths
  - Production logs should not contain customer PII, payment amounts, or webhook payloads
  - Use structured logger (Pino) with PII redaction
  - Log only event IDs and types, not full payloads

- [ ] **SUBSCRIPTION-08**: Update payment links environment variables
  - `NEXT_PUBLIC_STRIPE_YEARLY_LINK` - Payment link for $45/year plan
  - `NEXT_PUBLIC_STRIPE_LIFETIME_LINK` - Payment link for $99 lifetime plan
  - Remove old Basic/Pro link variables
  - Document in `.env.example` and deployment docs

### Feature Gating (FEATURE-GATE)

Access control logic for LLM features based on credits and subscription status.

- [ ] **FEATURE-GATE-01**: Update document generation endpoints to check credits
  - Check credits BEFORE starting LLM operation (not during)
  - Block if insufficient: return 402 Payment Required with upgrade message
  - Paid users: bypass credit check entirely
  - Demo users: bypass credit check entirely
  - Endpoints: `/api/documents/[id]/generate`, `/api/performance-review/generate`

- [ ] **FEATURE-GATE-02**: Update workstream generation endpoint to check credits
  - Requires 2 credits for clustering + naming
  - Check BEFORE executing DBSCAN and LLM naming
  - Same bypass logic for paid/demo users
  - Endpoint: `POST /api/workstreams/generate`

- [ ] **FEATURE-GATE-03**: Update chatbot endpoints to check message counter
  - Decrement `freeChatMessages` on user message submission
  - Block if counter at zero
  - Paid/demo users: bypass counter entirely
  - Endpoints: `/api/performance-review/chat`, `/api/documents/[id]/chat`

- [ ] **FEATURE-GATE-04**: Update chatbot tool call handler to check credits
  - Each tool invocation costs 1 credit
  - Check BEFORE executing tool (file read, search, etc.)
  - Tool calls happen server-side (Vercel AI SDK streamText with tools)
  - Same bypass logic for paid/demo users

- [ ] **FEATURE-GATE-05**: Preserve demo mode functionality
  - Demo users (level='demo') must have unlimited access to all features
  - Never show credit limits or upgrade prompts to demo users
  - Demo mode creates shadow users for anonymous testing
  - All credit/message checks must include: `if (user.level === 'demo') return unlimited`

- [ ] **FEATURE-GATE-06**: Add unit tests for credit checking edge cases
  - Test: freeCredits=0 returns appropriate error
  - Test: freeCredits=1 with 2 concurrent requests, only 1 succeeds
  - Test: paid users bypass credit checks
  - Test: demo users bypass credit checks
  - Test: database constraint prevents negative balances

### User Interface (UI)

UI components for credit display, upgrade prompts, and subscription status visibility.

- [ ] **UI-01**: Display credit balance in application UI
  - Show "X credits remaining" in sidebar or header (always visible)
  - Update in real-time after credit consumption
  - Consider progress bar visualization for at-a-glance status
  - Hide for paid users (show "Unlimited" badge instead)
  - Hide for demo users

- [ ] **UI-02**: Display chat message counter in chat interface
  - Show "X/20 messages used" in chat UI
  - Update after each user message
  - Clear indication when approaching limit (e.g., "3 messages remaining")
  - Hide for paid users
  - Hide for demo users

- [ ] **UI-03**: Show upgrade prompt when credits exhausted
  - Modal dialog: "You've used all 10 credits. Upgrade for unlimited access."
  - Display both options: $45/year OR $99 lifetime
  - Link to Stripe payment pages (external redirect)
  - No dark patterns: easy to dismiss, no fake urgency
  - Include clear pricing comparison

- [ ] **UI-04**: Show upgrade prompt when chat messages exhausted
  - Similar modal for 20-message limit
  - Same pricing display and CTA
  - Distinguish between credit limit and message limit in messaging

- [ ] **UI-05**: Block UI controls when credits insufficient
  - Disable "Generate" buttons for credit-gated features
  - Show tooltip: "X credits required. Upgrade for unlimited access."
  - Allow viewing existing content (just not generating new)
  - Blocking is advisory (real enforcement is server-side)

- [ ] **UI-06**: Add subscription status to account/settings page
  - Display current plan: Free, Paid Yearly, Paid Lifetime
  - For yearly: show next renewal date
  - For lifetime: show "Lifetime Access - No renewal needed" badge
  - Link to Stripe customer portal for cancellation (yearly only)
  - Show credit/message status for free users

- [ ] **UI-07**: Add annual vs lifetime choice comparison page
  - Side-by-side comparison: $45/year vs $99 lifetime
  - Highlight value proposition: "Lifetime = 2.2 years of annual"
  - Both options lead to unlimited usage (no feature differences)
  - No deceptive "best value" badges
  - Clear CTAs to Stripe payment links

### Cleanup (CLEANUP)

Remove legacy pricing tiers and update documentation.

- [ ] **CLEANUP-01**: Remove Basic and Pro tier references from codebase
  - Update or remove `apps/web/lib/plans.ts` definitions
  - Remove unused feature flags: `unlimited_documents`, `ai_assistant`, `advanced_analytics`, `team_collaboration`, `api_access`
  - Search codebase for "basic" and "pro" tier references

- [ ] **CLEANUP-02**: Update marketing copy to reflect new pricing
  - Landing page pricing section
  - FAQ page
  - Pricing page (if separate)
  - Email templates mentioning pricing

- [ ] **CLEANUP-03**: Archive old Stripe products (do NOT delete)
  - Archive Basic Achiever monthly ($5/mo)
  - Archive Basic Achiever yearly ($30/yr)
  - Archive Pro Achiever monthly ($9/mo)
  - Archive Pro Achiever yearly ($90/yr)
  - Archiving preserves historical payment records
  - Monitor webhook failures for 2 weeks post-archive

- [ ] **CLEANUP-04**: Update environment documentation
  - Document new Stripe payment link variables
  - Remove references to old plan variables
  - Update `.env.example` file
  - Update deployment documentation

## v2 Requirements (Deferred)

Features that enhance the experience but aren't required for v1 launch.

- [ ] **V2-01**: Low credit warning system
  - Proactive notification when credits below threshold (30% remaining = 3 credits)
  - Subtle banner/toast, dismissible
  - Soft upgrade prompt

- [ ] **V2-02**: Credit usage history page
  - Show last 30 days of credit transactions
  - Table: Date, Feature, Credits Used
  - Helps users understand consumption patterns
  - Supports debugging and support inquiries

- [ ] **V2-03**: Graceful degradation for partial features
  - Document generation: complete current generation, block next
  - Chat: allow reading history, block new messages
  - Workstreams: show existing, block regeneration
  - Never lose user work due to credit exhaustion

- [ ] **V2-04**: Stripe Customer Portal integration
  - Self-service subscription management
  - View invoices and payment history
  - Update payment method
  - Cancel subscription (with clear consequences messaging)

- [ ] **V2-05**: Analytics on credit usage patterns
  - Track which features consume most credits
  - Identify high-value vs low-value features
  - Inform future pricing decisions
  - Dashboard for internal team visibility

- [ ] **V2-06**: A/B test upgrade prompt messaging
  - Test different value propositions
  - Test pricing display formats
  - Measure conversion rates
  - Optimize free-to-paid conversion

## Out of Scope

Features deliberately NOT building to maintain simplicity.

- **Multi-Tier Paid Plans** — Current Basic/Pro distinction adds complexity without value. Single paid tier is clearer.
- **Credit Top-Up / Purchase** — Avoid hybrid state confusion. Simple binary: free limited OR paid unlimited.
- **Credit Rollover** — Free tier is one-time 10 credits (not monthly refresh). Paid is unlimited (no rollover needed).
- **Usage-Based Pricing** — Unpredictable costs worry users. Flat unlimited pricing more appealing.
- **Team/Organization Features** — Individual user product, not B2B. Massive complexity increase.
- **In-App Checkout Forms** — PCI compliance burden. Payment Links are simpler and Stripe handles security.
- **Free Trial Period** — 10 credits already serves as trial. No need to time-gate.
- **Promotional Codes / Discounts** — Marketing complexity. Code in repo would expose discount logic. Not needed for launch.
- **Refund Management** — Handle manually via Stripe dashboard. Low volume doesn't justify automation.
- **Real-Time Credit Animations** — Visual noise without utility. Simple "X credits remaining" is sufficient.
- **Monthly Billing Option** — Annual billing only for simplicity. Reduces Stripe transaction fees and support burden.
- **Migration Logic for Existing Paid Users** — No existing paid users (confirmed by user). No migration needed.

## Traceability

Requirements will be mapped to phases by the roadmapper. This section will be populated after roadmap creation.

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| (To be filled by roadmapper) | | | |

---

*Requirements finalized: 2026-02-06*
*Total v1 requirements: 38*
*Total v2 requirements: 6*
