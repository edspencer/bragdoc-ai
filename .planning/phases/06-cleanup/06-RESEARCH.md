# Phase 6: Cleanup - Research

**Researched:** 2026-02-06
**Domain:** Codebase cleanup, Stripe product management, documentation updates
**Confidence:** HIGH

## Summary

Phase 6 is a cleanup phase focused on removing legacy pricing tier references (Basic/Pro) from the codebase and updating all documentation to reflect the new simplified pricing model ($45/year or $99 lifetime). The phase requires minimal external tooling - it primarily involves codebase search-and-replace operations, Stripe Dashboard actions, and documentation updates.

The key areas to address are:
1. **Code cleanup**: Remove `apps/web/lib/plans.ts` definitions and `packages/config/src/payment-gates.ts` feature flags
2. **Marketing updates**: Update pricing pages, FAQ, and related components showing old pricing ($4.99/mo, $44.99/yr beta pricing)
3. **Stripe operations**: Archive old products via Dashboard (not delete)
4. **Environment documentation**: Update `.env.example` and deployment docs

**Primary recommendation:** Systematic grep-based search for legacy references, followed by targeted file updates. Archive Stripe products via Dashboard UI, not API or Terraform.

## Standard Stack

This phase requires no new dependencies - it uses existing tools.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Grep/Search | Built-in | Find legacy references | Already available in codebase |
| Stripe Dashboard | N/A | Archive products | Safest way to archive without breaking history |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| TypeScript compiler | Verify changes don't break types | After removing type definitions |
| ESLint | Verify no unused imports after cleanup | After removing files |

## Architecture Patterns

### Files to Modify or Remove

```
apps/web/
├── lib/
│   └── plans.ts                     # REMOVE or rewrite entirely
├── scripts/
│   └── create-stripe-products.ts    # REMOVE (legacy script)

packages/config/
└── src/
    └── payment-gates.ts              # REMOVE entirely (old tier-based gates)

apps/marketing/
├── app/pricing/
│   └── page.tsx                      # UPDATE metadata and offer schema
├── lib/
│   └── faq-data.ts                   # UPDATE pricing references
├── components/pricing/
│   ├── pricing-tiers.tsx             # UPDATE from beta to new pricing
│   ├── pricing-faq.tsx               # UPDATE pricing references
│   ├── pricing-header.tsx            # UPDATE if has pricing
│   └── comparison-table.tsx          # UPDATE cost row

iac/
├── modules/stripe/
│   └── main.tf                       # DO NOT MODIFY (archive via Dashboard instead)
├── envs/dev/
│   └── main.tf                       # Clean up outputs after Stripe archive

Root:
├── .env.example                      # Already updated to new format
├── docs/
│   └── Payment Modes.md              # UPDATE or REMOVE
```

### Pattern: Safe Stripe Product Archiving

**What:** Archive products by setting `active=false` via Stripe Dashboard
**When to use:** When removing old pricing tiers
**Why Dashboard not API/Terraform:**
- Dashboard provides UI confirmation
- Cannot accidentally delete (only archive)
- Preserves all historical payment data
- No code changes to Terraform state

**Steps:**
1. Log into Stripe Dashboard
2. Navigate to Products
3. Find each legacy product:
   - Basic Achiever monthly ($5/mo)
   - Basic Achiever yearly ($30/yr)
   - Pro Achiever monthly ($9/mo)
   - Pro Achiever yearly ($90/yr)
4. Click product -> Archive (not Delete)
5. Verify payment links still resolve (they'll show "product unavailable")

### Pattern: Feature Flag Removal

**What:** Remove unused feature gate definitions
**When to use:** After tier system is simplified
**Example:**
```typescript
// BEFORE: packages/config/src/payment-gates.ts (REMOVE ENTIRE FILE)
export type FeatureGate =
  | 'unlimited_documents'
  | 'ai_assistant'
  | 'advanced_analytics'
  | 'team_collaboration'
  | 'api_access';

// AFTER: File removed, no replacement needed
// Credit system now handles access control
```

### Anti-Patterns to Avoid
- **Deleting Stripe products**: Archive only - deletion breaks payment history
- **Removing enum values from PostgreSQL**: Decision [01-01] says keep deprecated values for compatibility
- **Updating Terraform state**: Don't modify IaC during cleanup, handle via Dashboard
- **Removing "basic" or "pro" strings from schema.ts comments**: Keep as documentation of deprecated values

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding legacy references | Manual file-by-file search | Grep with patterns | Comprehensive, repeatable |
| Archiving Stripe products | API calls or Terraform | Stripe Dashboard | Safer, no state issues |
| Validating changes | Visual review only | TypeScript + tests | Catches broken imports |

**Key insight:** This cleanup phase is about removal and simplification, not building. Use existing tooling.

## Common Pitfalls

### Pitfall 1: Incomplete Search Patterns
**What goes wrong:** Missing legacy references because search patterns are too narrow
**Why it happens:** "basic" and "pro" match many unrelated strings (e.g., "basic features", "production")
**How to avoid:** Use specific patterns like:
- `basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly` (exact matches)
- `'basic'` or `"basic"` (quoted in code)
- `Basic Achiever`, `Pro Achiever` (product names)
- `\$5`, `\$9`, `\$30`, `\$90` (old prices)
**Warning signs:** Grep returning thousands of false positives

### Pitfall 2: Breaking TypeScript Imports
**What goes wrong:** Removing files that are still imported elsewhere
**Why it happens:** Not checking import references before deletion
**How to avoid:**
1. Search for imports of the file being removed
2. Run TypeScript compiler after changes
3. Run tests to verify
**Warning signs:** "Cannot find module" errors after deletion

### Pitfall 3: Terraform State Drift
**What goes wrong:** Modifying Terraform files causes state drift with production
**Why it happens:** Trying to "clean up" IaC files
**How to avoid:**
- Archive Stripe products via Dashboard only
- Leave Terraform files unchanged OR remove the entire stripe module
- If removing module, run `terraform state rm` first
**Warning signs:** `terraform plan` shows resources to destroy

### Pitfall 4: Missing Marketing Site Pages
**What goes wrong:** Updating pricing page but missing FAQ, blog posts, or CTAs
**Why it happens:** Marketing copy is scattered across many components
**How to avoid:** Search all marketing components for pricing references
**Warning signs:** Inconsistent pricing shown on different pages

### Pitfall 5: Confusing Beta Messaging with New Pricing
**What goes wrong:** Marketing shows mixed messages (beta FREE vs $45/year)
**Why it happens:** Current site emphasizes beta, new pricing is $45/$99
**How to avoid:** Clearly decide: is this still beta or launching new pricing?
**Warning signs:** Pages showing both "FREE during beta" and "$45/year"

## Code Examples

### Example 1: Searching for Legacy References

```bash
# Find files with old tier references
grep -r "basic_monthly\|basic_yearly\|pro_monthly\|pro_yearly" --include="*.ts" --include="*.tsx"

# Find old price references
grep -r "\$5\|\$9\|\$30\|\$90" --include="*.ts" --include="*.tsx" --include="*.md"

# Find feature gate usage
grep -r "unlimited_documents\|ai_assistant\|advanced_analytics\|team_collaboration\|api_access" --include="*.ts"
```

### Example 2: Stripe Product Archive via API (if needed)

```typescript
// Source: Stripe API documentation
// Only use if Dashboard not accessible
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Archive a product (set active=false)
async function archiveProduct(productId: string) {
  await stripe.products.update(productId, { active: false });
}

// Example product IDs from Terraform state
const legacyProducts = [
  'prod_xxx_basic', // Basic Achiever
  'prod_xxx_pro',   // Pro Achiever
];

for (const productId of legacyProducts) {
  await archiveProduct(productId);
}
```

### Example 3: Updated .env.example (Already Done)

```bash
# Current .env.example shows new format:
# Stripe Payment Links
# Create these in Stripe Dashboard -> Payment Links for the two pricing options
NEXT_PUBLIC_STRIPE_YEARLY_LINK="https://buy.stripe.com/xxx"   # $45/year subscription
NEXT_PUBLIC_STRIPE_LIFETIME_LINK="https://buy.stripe.com/xxx" # $99 lifetime one-time
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4-tier pricing (Free/Basic/Pro/Demo) | 2-tier (Free with credits/Paid unlimited) | This project | Simpler code, clearer value prop |
| Per-feature gates | Credit-based access control | Phases 1-5 | Feature flags now obsolete |
| Manual price tracking | Stripe Payment Links | Phase 3 | No need for price_id env vars |

**Deprecated/outdated:**
- `apps/web/lib/plans.ts` - Legacy tier definitions, to be removed
- `packages/config/src/payment-gates.ts` - Old feature gate system, to be removed
- `iac/modules/stripe/` - Terraform for old products, keep but don't use

## Files Requiring Updates

### High Priority (Active Code)

| File | Current State | Required Change |
|------|---------------|-----------------|
| `apps/web/lib/plans.ts` | Full legacy tier definitions | REMOVE or rewrite for new pricing |
| `packages/config/src/payment-gates.ts` | Old tier-based feature gates | REMOVE entirely |
| `apps/web/scripts/create-stripe-products.ts` | Script for old products | REMOVE (obsolete) |

### Medium Priority (Marketing)

| File | Current State | Required Change |
|------|---------------|-----------------|
| `apps/marketing/components/pricing/pricing-tiers.tsx` | Shows beta pricing ($4.99/mo) | Update to $45/year or $99 lifetime |
| `apps/marketing/components/pricing/pricing-faq.tsx` | References $4.99/month | Update to new pricing |
| `apps/marketing/components/pricing/comparison-table.tsx` | Shows $4.99/mo beta | Update cost row |
| `apps/marketing/app/pricing/page.tsx` | Metadata mentions $4.99 | Update metadata |
| `apps/marketing/lib/faq-data.ts` | Multiple price references | Update all pricing mentions |

### Low Priority (Documentation)

| File | Current State | Required Change |
|------|---------------|-----------------|
| `.env.example` | Already updated | Verify no old vars remain |
| `docs/Payment Modes.md` | References old tier model | UPDATE or REMOVE |
| `README.md` | May have pricing | Check and update |
| `.claude/docs/tech/deployment.md` | Lists old env vars | Update if needed |

## Open Questions

1. **Beta vs Launch Messaging**
   - What we know: Marketing currently emphasizes "FREE during beta"
   - What's unclear: Should cleanup switch messaging to post-beta ($45/$99)?
   - Recommendation: User decision - either keep beta messaging or update to launch pricing

2. **Terraform Module Handling**
   - What we know: `iac/modules/stripe/` defines old products
   - What's unclear: Remove module or leave for reference?
   - Recommendation: Leave unchanged - archived products in Stripe don't affect running code

3. **Webhook Monitoring Period**
   - What we know: CLEANUP-03 says "Monitor webhook failures for 2 weeks post-archive"
   - What's unclear: How to implement monitoring
   - Recommendation: Check Stripe Dashboard webhook logs manually or set up Stripe alerts

## Sources

### Primary (HIGH confidence)
- Codebase analysis via Grep - verified files exist and contain referenced content
- Stripe API documentation - confirmed archive via `active=false`
- `.planning/REQUIREMENTS.md` - authoritative requirements for this phase
- `.planning/STATE.md` - prior decisions on enum compatibility

### Secondary (MEDIUM confidence)
- Terraform provider documentation for Stripe (andrewbaxter/stripe v0.0.24)

### Tertiary (LOW confidence)
- None - this is a cleanup phase with well-defined scope

## Metadata

**Confidence breakdown:**
- Files to modify: HIGH - verified via grep and file reads
- Stripe operations: HIGH - confirmed via official documentation
- Marketing updates: MEDIUM - scope depends on beta vs launch decision

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable cleanup scope)

## Decision Dependencies

This phase depends on prior decisions documented in STATE.md:

| Decision | Impact on Phase 6 |
|----------|-------------------|
| [01-01] Keep deprecated enum values | Do NOT remove 'basic'/'pro' from schema.ts enums |
| [03-03] Treat legacy levels as 'free' | No migration code needed, but references can be cleaned |

## Verification Checklist

After cleanup, verify:
- [ ] `pnpm build` succeeds (no broken imports)
- [ ] `pnpm test` passes (no runtime errors)
- [ ] No TypeScript errors
- [ ] Grep for legacy patterns returns only:
  - Schema.ts comments (intentional)
  - Planning/docs files (reference only)
- [ ] Marketing pricing pages show new pricing
- [ ] Old Stripe products show as archived in Dashboard
- [ ] Webhook endpoint continues working
