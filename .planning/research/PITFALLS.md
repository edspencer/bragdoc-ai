# Pitfalls: Stripe Pricing Simplification and Credit Systems

**Research Date:** 2026-02-06
**Domain:** Stripe integration, credit systems, open source payment security

---

## Critical Pitfalls

### 1. Webhook Signature Verification Bypass in Open Source

**What Goes Wrong:**
With all payment code publicly visible on GitHub, attackers can study the webhook handler, understand the expected payload structure, and attempt to forge webhook calls. If signature verification is weak, skipped in development, or uses predictable secrets, attackers can grant themselves paid access.

**Warning Signs:**
- Webhook endpoint responds with 200 OK without verifying signature first
- `STRIPE_WEBHOOK_SECRET` is weak, predictable, or shared across environments
- Error handling reveals whether signature check failed vs. other errors
- Tests mock away signature verification completely (already happening in current tests)

**Prevention Strategy:**
- Always verify signature BEFORE any business logic (current code does this correctly)
- Use unique webhook secrets per environment (development, staging, production)
- Return identical error responses for all failure modes (timing-safe comparison)
- Audit that production code path matches test mocks
- Never log the raw webhook secret or signature in error messages

**Phase Mapping:** Should be verified in Phase 1 (webhook handler updates) with explicit security audit checklist.

**Current Status:** The existing `apps/web/app/api/stripe/callback/route.ts` correctly validates signatures first using `stripe.webhooks.constructEvent()`. Maintain this pattern when adding lifetime/yearly handling.

---

### 2. Race Conditions in Credit Deduction

**What Goes Wrong:**
When multiple concurrent requests attempt to use credits (e.g., user opens multiple tabs and triggers document generation simultaneously), read-then-decrement patterns can result in negative credits or double-spending. This is especially problematic because:
- LLM operations are expensive (each costs real money)
- Users have incentive to exploit race windows to get more free usage
- Database defaults like `freeCredits: 10` make the race window predictable

**Warning Signs:**
- Users report getting more than 10 free LLM operations
- Database shows negative credit values
- Credit decrements scattered across multiple API routes without atomic operations
- No database-level constraints preventing negative values

**Prevention Strategy:**
```sql
-- Use atomic decrement with check
UPDATE "User"
SET "freeCredits" = "freeCredits" - 1
WHERE id = $1 AND "freeCredits" > 0
RETURNING "freeCredits";
```
- Add CHECK constraint: `freeCredits >= 0`
- Single utility function for all credit deduction
- Return updated count to verify success before proceeding with LLM call
- Consider optimistic locking pattern for chat message counter

**Phase Mapping:** Phase 2 (credit system implementation) must use atomic operations from the start. Never implement as read-check-write separate queries.

---

### 3. Enum Migration Breaking Production

**What Goes Wrong:**
PostgreSQL enum changes require careful handling. The current `userLevelEnum` has `['free', 'basic', 'pro', 'demo']` and needs to become `['free', 'paid', 'demo']`. Similarly, `renewalPeriodEnum` needs `'lifetime'` added. Common mistakes:
- Dropping old enum values before migrating data
- Running migration during peak traffic causing lock contention
- Application code deploying before/after migration in wrong order

**Warning Signs:**
- Database constraint violations during deploy
- Users stuck with orphaned `basic` or `pro` level values
- Application errors when reading unexpected enum values
- Migration script that uses `ALTER TYPE ... DROP VALUE` (not supported in PostgreSQL)

**Prevention Strategy:**
1. Add new values first: `ALTER TYPE user_level ADD VALUE 'paid'`
2. Migrate existing data: `UPDATE "User" SET level = 'paid' WHERE level IN ('basic', 'pro')`
3. Deploy code that handles all values (old and new) gracefully
4. In future cleanup (weeks later): Create new enum, migrate column, drop old

**Important:** PostgreSQL cannot DROP enum values in a transaction. Plan for values to coexist.

**Phase Mapping:** Phase 1 (schema changes) is highest risk. Use migration file, not `db:push`. Test on production-like data volume first.

---

### 4. Demo Mode Breaks After Subscription Changes

**What Goes Wrong:**
Demo mode creates shadow users with `level: 'demo'`. If credit/subscription checks don't account for demo users, the demo experience could:
- Hit credit limits (demo users should have unlimited)
- Show upgrade prompts (demo users shouldn't see them)
- Break entirely if `demo` level is removed from enum

**Warning Signs:**
- Demo mode stops working after deploy
- Demo users see "out of credits" messages
- Tests pass but demo experience broken

**Prevention Strategy:**
- All credit/subscription checks must include: `if (user.level === 'demo') return unlimited`
- Keep `demo` in the enum forever (small cost, prevents breakage)
- Add demo mode regression tests for all new gating logic
- Demo users: `freeCredits` should be null (not zero) to distinguish from exhausted free tier

**Phase Mapping:** Every phase that touches feature gating must have demo mode test case.

**Current Code Reference:** See `apps/web/lib/demo-mode.ts` - shadow users are created with `level: 'demo'`. This must remain supported.

---

### 5. Lifetime Access Misconfigured as Subscription

**What Goes Wrong:**
Stripe has different product types: one-time payments vs. subscriptions. Lifetime access ($99) should be a one-time payment, not a subscription. Mistakes:
- Creating lifetime as a subscription that never renews (confusing billing UI)
- Missing webhook event for one-time payments (`checkout.session.completed` vs `invoice.paid`)
- User cancels non-existent subscription and loses access unexpectedly

**Warning Signs:**
- Lifetime users appear in Stripe subscription list
- `customer.subscription.deleted` fires for lifetime users
- Stripe dashboard shows "$99/forever" subscription with next billing date

**Prevention Strategy:**
- Create lifetime as one-time payment product, NOT subscription
- Store `renewalPeriod: 'lifetime'` to distinguish from active subscriptions
- Never check subscription status for lifetime users
- `customer.subscription.deleted` handler must skip users with `renewalPeriod === 'lifetime'`

**Phase Mapping:** Phase 1 (Stripe product setup - manual). Verify product configuration before webhook handler updates.

---

### 6. Feature Gate Edge Cases

**What Goes Wrong:**
Feature gating logic often fails in edge cases:
- What happens when free user runs out of credits mid-stream (streaming LLM response)?
- What if user downgrades during active session?
- What if webhook is delayed and user already used paid features?

**Warning Signs:**
- Inconsistent behavior between page refresh and session
- Users see partial results before hitting limits
- Race between webhook processing and user clicking "use feature"

**Prevention Strategy:**
- Check credits at request START, not during streaming
- Reserve credit before starting LLM operation, refund on failure
- Cache subscription status with short TTL (5 minutes), not indefinitely
- For streaming: deduct credit on stream start, not completion

**Critical Pattern:**
```typescript
// Wrong: Check during operation
async function generateDocument() {
  await checkCredits(); // Too late if user clicked twice
  return streamLLM();
}

// Right: Atomic reservation
async function generateDocument() {
  const reserved = await reserveCredit(); // Atomic decrement
  if (!reserved) throw new Error('No credits');
  try {
    return await streamLLM();
  } catch (e) {
    await refundCredit(); // On failure
    throw e;
  }
}
```

**Phase Mapping:** Phase 2 (feature gating updates) - design reservation pattern upfront.

---

### 7. Stripe Product Cleanup Leaves Orphans

**What Goes Wrong:**
Old Stripe products (Basic $5/mo, Pro $9/mo) should be archived but not deleted. Deleting them:
- Breaks existing payment links (404 errors)
- Loses historical payment records
- May cause webhook failures for pending payments

**Warning Signs:**
- Old payment links return "Product not found"
- Stripe dashboard shows gaps in revenue reports
- Historical lookup_keys stop working

**Prevention Strategy:**
- Archive old products, don't delete
- Update payment links BEFORE archiving old ones
- Keep environment variables for old links during transition (even if unused)
- Monitor Stripe webhook failures for 2 weeks post-migration

**Phase Mapping:** Phase 3 (cleanup) should happen last, after new system is proven stable.

---

### 8. User Lookup by Email in Webhook Handler

**What Goes Wrong:**
Current code updates user subscription using email from Stripe:
```typescript
.where(eq(user.email, email))
```

This fails when:
- User changes email in the app but not in Stripe
- Email is null in Stripe customer record
- Multiple users have same email (shouldn't happen, but edge case)

**Warning Signs:**
- Payment succeeds but subscription not updated
- Webhook logs show "0 rows updated"
- Users complain payment went through but account still free

**Prevention Strategy:**
- Store `stripeCustomerId` on user during checkout flow
- Use `stripeCustomerId` as primary lookup, email as fallback
- Log when email-based lookup is used (indicates missing customer ID)
- Add unique index on `stripeCustomerId` to prevent duplicates

**Phase Mapping:** Phase 1 (webhook handler updates) - verify `stripeCustomerId` path works for new checkout flow.

**Current Code Status:** The handler at `apps/web/app/api/stripe/callback/route.ts` already stores `stripeCustomerId` but looks up by email first. Consider inverting priority.

---

### 9. Console Logging Exposes Payment Data

**What Goes Wrong:**
From CONCERNS.md: "Extensive use of `console.log()` throughout codebase." In payment code, this could expose:
- Customer IDs
- Payment amounts
- Email addresses
- Webhook payloads

Current webhook handler has multiple `console.log` statements logging payment data.

**Warning Signs:**
- Production logs contain customer PII
- Log aggregators store sensitive payment information
- Compliance issues (PCI-DSS, GDPR)

**Prevention Strategy:**
- Remove all console.log from payment paths before production
- Use structured logging with redaction for sensitive fields
- Never log full webhook payloads (log event ID and type only)
- Add lint rule to flag console.log in `lib/stripe/` directory

**Phase Mapping:** Phase 1 - audit and remove debug logging from payment code paths.

---

### 10. Partial Payment State After Error

**What Goes Wrong:**
If webhook handler crashes mid-way through:
1. User record updated with `level: 'paid'`
2. But `lastPayment` not set (crash before second update)
3. User has paid access but no payment timestamp

Or worse:
- Credit fields updated incorrectly
- Transaction partially committed

**Warning Signs:**
- Database inconsistencies (paid level, null lastPayment)
- Users losing access unexpectedly
- Audit trail incomplete

**Prevention Strategy:**
- Use database transaction for all payment-related updates
- Single `UPDATE` with all fields, not multiple queries
- Add database trigger or check constraint for consistency
- Log transaction boundaries for debugging

**Correct Pattern:**
```typescript
await db.transaction(async (tx) => {
  await tx.update(user).set({
    level: 'paid',
    renewalPeriod: 'yearly',
    lastPayment: new Date(),
    stripeCustomerId: customerId,
  }).where(eq(user.email, email));
});
```

**Phase Mapping:** Phase 1 - wrap webhook handler updates in transaction.

---

## Security-Specific Pitfalls

### 11. Stripe Secret Key in Client Code

**What Goes Wrong:**
Vite/Next.js environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. If someone accidentally uses `NEXT_PUBLIC_STRIPE_SECRET_KEY`, the secret key is visible to anyone viewing page source.

**Warning Signs:**
- Client-side Stripe operations that shouldn't be possible
- Stripe dashboard shows API calls from unexpected origins
- Secret key visible in browser network tab or source

**Prevention Strategy:**
- Only `STRIPE_PUBLISHABLE_KEY` should ever have `NEXT_PUBLIC_` prefix
- Add ESLint rule to flag `NEXT_PUBLIC_STRIPE_SECRET`
- Use `'server-only'` import at top of Stripe utility files (current code does this)
- Review environment variable documentation

**Phase Mapping:** All phases - continuous vigilance. Add to PR checklist.

**Current Status:** `apps/web/lib/stripe/stripe.ts` correctly imports `'server-only'` first. Maintain this pattern.

---

### 12. Payment Links Without User Association

**What Goes Wrong:**
Stripe Payment Links are convenient but by default don't know which user is paying. The webhook receives payment confirmation but can't associate it with a user account. Common mistake: assuming email matching is reliable.

**Warning Signs:**
- Payment succeeds but no user account updated
- User pays with different email than their account
- Multiple people pay, only one gets access

**Prevention Strategy:**
- Use `client_reference_id` parameter when generating payment link
- Pass user ID in the URL: `https://buy.stripe.com/xxx?client_reference_id={userId}`
- Webhook extracts `client_reference_id` for reliable user lookup
- Fallback to email only as secondary lookup

**Phase Mapping:** Phase 1 - update payment link generation to include user ID.

---

### 13. Idempotency Failures in Webhook Retries

**What Goes Wrong:**
Stripe retries webhooks on failure. If the handler isn't idempotent, retries cause:
- Double credit additions
- Multiple database updates
- Duplicate notification emails

**Warning Signs:**
- User credits jump unexpectedly
- Multiple "Payment Successful" emails
- Database audit log shows duplicate timestamps

**Prevention Strategy:**
- Store `stripe_event_id` in database, check before processing
- Use database unique constraint on event ID
- Make all state changes idempotent (setting level to 'paid' is fine, adding credits is not)

```typescript
// Before processing
const processed = await db.select().from(webhookEvents)
  .where(eq(webhookEvents.eventId, event.id));
if (processed.length > 0) return { already_processed: true };

// After processing
await db.insert(webhookEvents).values({ eventId: event.id, processedAt: new Date() });
```

**Phase Mapping:** Phase 1 - add webhook deduplication table and check.

---

## Testing-Specific Pitfalls

### 14. Mock-Heavy Tests Hide Real Bugs

**What Goes Wrong:**
Current tests (`apps/web/test/api/stripe/callback/route.test.ts`) mock the Stripe SDK but use real database. This is good, but mocking signature verification means bugs in verification logic won't be caught.

**Warning Signs:**
- Tests pass but production webhook fails signature check
- Mock behavior drifts from real SDK behavior
- Edge cases in signature timing not tested

**Prevention Strategy:**
- Keep mocked unit tests for fast feedback
- Add integration test that uses Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/callback`
- Test with real webhook signatures in staging environment
- Document which tests are mocked vs. real

**Phase Mapping:** Phase 1 - add note about manual Stripe CLI testing before deploy.

---

### 15. Missing Negative Balance Tests

**What Goes Wrong:**
Tests verify happy path (credits decrement) but not edge cases:
- What if credits are already 0?
- What if concurrent requests exhaust credits?
- What if database update fails?

**Warning Signs:**
- Users get free LLM usage when they shouldn't
- Negative credit balances in database
- No error handling when credit deduction fails

**Prevention Strategy:**
- Test: `freeCredits = 0` returns appropriate error
- Test: `freeCredits = 1` with 2 concurrent requests, only 1 succeeds
- Test: Database constraint violation is handled gracefully
- Test: Paid users bypass credit check entirely

**Phase Mapping:** Phase 2 - credit system tests must include these edge cases.

---

## Database-Specific Pitfalls

### 16. Default Value for Existing Users

**What Goes Wrong:**
Adding `freeCredits` field with default `10` applies to ALL users, including:
- Existing paid users (who shouldn't need credits)
- Demo users (who should have unlimited)
- Users who already exhausted their trial

**Warning Signs:**
- Paid users see credit counter in UI
- Existing users get another 10 free credits
- Demo mode shows credit limits

**Prevention Strategy:**
- Default should be NULL, not 10
- Separate migration script to set initial credits for specific users
- Check `level` before applying default credits
- Code interprets NULL as "no credit system (legacy or paid)"

**Phase Mapping:** Phase 1 (schema migration) - use NULL default, Phase 2 assigns credits selectively.

---

### 17. Chat Message Counter Scope

**What Goes Wrong:**
Global `freeChatMessages` counter vs. per-conversation vs. per-day. Requirements say global, but implementation might accidentally:
- Reset on each conversation
- Apply to paid users
- Count system messages

**Warning Signs:**
- Users getting wildly different free message counts
- Counter not decrementing as expected
- Chatbot behavior inconsistent with dashboard display

**Prevention Strategy:**
- Clear documentation: "20 messages total across all chatbots for account lifetime"
- Decrement only for user messages, not assistant responses
- Skip counter for paid users
- Skip counter for demo users (level === 'demo')

**Phase Mapping:** Phase 2 - document counter semantics in code comments and user-facing copy.

---

## Operational Pitfalls

### 18. Environment Variable Mismatch

**What Goes Wrong:**
Deploying to Cloudflare Workers with different environment variables than development:
- Wrong Stripe webhook secret
- Test mode keys in production
- Missing required variables (silent failures)

**Warning Signs:**
- Webhooks fail with signature errors in production only
- Payments work in dev but not production
- "undefined" in logs for critical values

**Prevention Strategy:**
- Document all new environment variables in CLAUDE.md
- Add environment variable validation at startup (suggested in CONCERNS.md)
- Use different webhook secrets per environment
- Checklist before deploy: verify all env vars set

**Phase Mapping:** All phases - update environment documentation as new vars added.

---

### 19. Rollback Complexity

**What Goes Wrong:**
If new pricing system has issues, rolling back is complex because:
- Database schema changed (new fields, modified enums)
- Stripe products can't be "un-archived"
- Users may have already paid on new system

**Warning Signs:**
- N/A (this is about prevention, not detection)

**Prevention Strategy:**
- Design for forward-only migration
- Keep old enum values for 30+ days
- Feature flag new credit system initially
- Have manual Stripe product setup documented for quick recreation

**Phase Mapping:** Phase 0 (planning) - accept that rollback is "fix forward" not "revert."

---

## Checklist Summary

Before deploying each phase, verify:

**Phase 1 (Schema + Webhook):**
- [ ] Enum migration adds values without dropping old ones
- [ ] Webhook signature verification unchanged
- [ ] Console logging removed from payment paths
- [ ] Webhook deduplication added
- [ ] User lookup uses stripeCustomerId primarily
- [ ] All updates in single transaction
- [ ] Demo mode still works with new schema
- [ ] Environment variables documented

**Phase 2 (Credit System):**
- [ ] Credit deduction is atomic (single UPDATE with WHERE check)
- [ ] CHECK constraint prevents negative balances
- [ ] Paid users bypass credit checks entirely
- [ ] Demo users bypass credit checks entirely
- [ ] Streaming operations reserve credit at start
- [ ] Tests cover zero-credit edge case
- [ ] Tests cover concurrent request race

**Phase 3 (Cleanup):**
- [ ] Old products archived (not deleted)
- [ ] Payment links updated before archive
- [ ] Monitor webhooks for 2 weeks post-change
- [ ] Old enum values retained (cleanup later)

---

*Research completed: 2026-02-06*
