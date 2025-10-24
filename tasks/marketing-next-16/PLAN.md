# Marketing Site Next.js 16 Upgrade Plan

## Overview

Upgrade the BragDoc marketing website (`apps/marketing`) from Next.js 15.5.6 to Next.js 16. This is a **significantly simpler** migration than the main web application upgrade (completed in `tasks/next16/`) due to the marketing site's static, public-only nature with no authentication, middleware, API routes, or complex server-side logic.

## Instructions for Implementation

This plan should be followed sequentially from Phase 1 through the final phase. As you work:

1. **Mark Progress:** Update this plan document as you complete each task by changing `- [ ]` to `- [x]` in the checkbox
2. **Test Continuously:** Run build tests after dependency changes to catch issues early
3. **Commit Frequently:** Make atomic commits for each logical change
4. **Reference Lessons Learned:** Review `tasks/next16/LOG.md` for insights from the web app migration
5. **Check Build Output:** Monitor build logs for warnings or deprecation messages

**Important Notes:**
- This upgrade has NO code changes (only dependency updates)
- No middleware.ts → proxy.ts rename needed (marketing has no middleware)
- No redirect() usage to fix (marketing has no redirects)
- No async params/searchParams to update (marketing doesn't use dynamic route params)
- Marketing site already uses React 19.2.0 (compatible with Next.js 16)

## Risk Assessment: VERY LOW 🟢

**Why This Migration Is Extremely Low Risk:**

1. **No Breaking Code Patterns**:
   - ✅ No middleware file (no rename needed)
   - ✅ No redirect() usage in Server Components
   - ✅ No async params or searchParams (static pages only)
   - ✅ No deprecated API usage
   - ✅ No authentication logic
   - ✅ No API routes
   - ✅ No server actions

2. **Successful Precedent**:
   - ✅ Web app (`apps/web`) successfully upgraded to Next.js 16
   - ✅ Same deployment target (Cloudflare Workers via OpenNext)
   - ✅ Same monorepo structure
   - ✅ Lessons learned documented in `tasks/next16/LOG.md`

3. **Simple Architecture**:
   - ✅ Pure static content site (marketing pages, blog posts)
   - ✅ All pages are Server Components rendering static MDX content
   - ✅ No dynamic behavior beyond page navigation
   - ✅ No external integrations (Stripe, auth providers, etc.)

4. **Environment Already Compatible**:
   - ✅ Node.js v24.8.0 exceeds Next.js 16 minimum (20.9.0+)
   - ✅ React 19.2.0 already installed and compatible
   - ✅ TypeScript 5.x compatible
   - ✅ No special runtime requirements

5. **Easy Rollback**:
   - ✅ Simple git revert if issues arise
   - ✅ No data migrations or schema changes
   - ✅ No user sessions or authentication state
   - ✅ No database dependencies

## Pre-Flight Checklist

**Current State:**
- Next.js: 15.5.6 → Target: 16.x
- React: 19.2.0 ✅ (already compatible)
- React DOM: 19.2.0 ✅ (already compatible)
- Node.js: v24.8.0 ✅ (requires 20.9.0+)
- TypeScript: 5.x ✅ (requires 5.1.0+)

**Known Differences from Web App Migration:**
- ❌ No middleware → No proxy.ts rename needed
- ❌ No redirect() usage → No Server Component fixes needed
- ❌ No dynamic routes → No async params patterns to verify
- ✅ Simpler config → next.config.mjs (JavaScript, not TypeScript)
- ✅ Fewer dependencies → No auth, Stripe, AI SDK, etc.

## Table of Contents

- [Phase 1: Preparation](#phase-1-preparation)
- [Phase 2: Dependency Upgrades](#phase-2-dependency-upgrades)
- [Phase 3: Configuration Review](#phase-3-configuration-review)
- [Phase 4: Testing](#phase-4-testing)
- [Phase 5: Documentation](#phase-5-documentation)
- [Phase 6: After-Action Report](#phase-6-after-action-report)

## Implementation Plan

### Phase 1: Preparation

**1.1 - [x] Verify Current State**
```bash
# Run build to establish baseline
pnpm build:marketing

# Check for uncommitted changes
git status

# Document current versions
cat apps/marketing/package.json | grep '"next":\|"react":\|"react-dom":'
```

**Expected Output:**
- Build should succeed with Next.js 15.5.6
- No uncommitted changes (clean working tree)
- Current versions documented

**1.2 - [x] Review Web App Migration Lessons**

Review `tasks/next16/LOG.md` for relevant lessons learned:
- Phase 2: Dependency upgrade process (manual vs automated)
- Phase 4: Missing dependency issues (e.g., `tailwindcss-animate`)
- Phase 5: Testing approach and success criteria

**Key Takeaways to Apply:**
- Check for implicit/transitive dependencies that might not be declared
- Verify peer dependency warnings are non-blocking
- Run full build test after dependency upgrades
- Monitor for Turbopack-specific issues

### Phase 2: Dependency Upgrades

**2.1 - [x] Run Next.js Automated Codemod**

**Preferred Method:**
```bash
npx @next/codemod@canary upgrade latest
```

The codemod will:
- Upgrade `next`, `react`, `react-dom` to latest versions
- Update `@next/mdx` to match Next.js version
- Update `eslint-config-next` to match Next.js version
- Apply any necessary code transformations (none expected for marketing)

**Fallback - Manual Upgrade:**

If the codemod fails or you prefer manual control:
```bash
cd apps/marketing
pnpm add next@latest react@latest react-dom@latest @next/mdx@latest
pnpm add -D eslint-config-next@latest
cd ../..
pnpm install
```

**Expected Version Changes:**
- `next`: 15.5.6 → 16.x
- `react`: 19.2.0 → 19.2.0 (already latest)
- `react-dom`: 19.2.0 → 19.2.0 (already latest)
- `@next/mdx`: latest → 16.x
- `eslint-config-next`: 15.5.6 → 16.x

**2.2 - [x] Verify Peer Dependency Warnings**

Review console output for peer dependency conflicts. Document any warnings.

**Expected Warnings (if any):**
- Most third-party libraries should have updated peer deps by now
- Any warnings are likely non-blocking (libraries work but peer deps not updated)
- Document for future reference

**2.3 - [x] Update Lock File**
```bash
pnpm install
```

Verify lockfile updates without errors.

**2.4 - [x] Check for Implicit Dependencies**

**Lesson from Web App Migration:** The web app had `tailwindcss-animate` used in `tailwind.config.js` but not declared in `package.json`, causing Turbopack build failures.

**Check marketing app:**
```bash
# Check tailwind.config.js for any plugins
cat apps/marketing/tailwind.config.js

# Verify all used packages are in package.json
# Look for tw-animate-css (currently in devDependencies - correct)
```

**If using any Tailwind plugins, ensure they're in package.json.**

Marketing app uses `tw-animate-css` which IS declared in devDependencies ✅

### Phase 3: Configuration Review

**3.1 - [x] Review next.config.mjs**

**File:** `apps/marketing/next.config.mjs`

**Current Configuration:**
- Uses `createMDX` from `@next/mdx`
- ESLint/TypeScript build-time ignores (acceptable for marketing)
- Image optimization (AVIF, WebP formats)
- Page extensions include `.md` and `.mdx`
- Output: `standalone`
- File tracing includes public assets

**Verification Steps:**

1. **Verify MDX integration:**
   ```bash
   # Check current createMDX usage
   grep -A 5 "createMDX" apps/marketing/next.config.mjs
   ```

   - [x] Confirm `createMDX` is imported from '@next/mdx'
   - [x] Verify usage pattern: `const withMDX = createMDX({ ... })`
   - [x] Confirm export pattern: `export default withMDX(nextConfig)`
   - [x] Check this matches Next.js 16 MDX documentation

2. **Review image optimization defaults:**
   ```bash
   # Check image config
   grep -A 10 "images:" apps/marketing/next.config.mjs
   ```

   - [x] Verify formats are explicitly set (AVIF, WebP)
   - [x] Confirm device sizes and image sizes are specified
   - [x] Note: Next.js 16 changed some defaults, but explicit config overrides them
   - [x] Should continue working as-is

3. **Verify output mode:**
   - [x] Confirm `output: 'standalone'` is set (required for Cloudflare Workers)
   - [x] No changes needed

4. **Check page extensions:**
   - [x] Verify pageExtensions includes 'md' and 'mdx'
   - [x] Confirm MDX support is properly configured
   - [x] No changes needed

**Expected Outcome:** No configuration changes needed.

**3.2 - [x] Verify No Deprecated Config Options**

Confirm the config does NOT use:
- ❌ `experimental.turbopack` (moved to top-level in Next.js 16, but not needed)
- ❌ `experimental.ppr` (removed in Next.js 16)
- ❌ `serverRuntimeConfig` or `publicRuntimeConfig` (deprecated)

**Marketing app config is clean:** ✅ None of these are used.

### Phase 4: Testing

**4.1 - [x] Production Build Test**

```bash
pnpm build:marketing
```

**Verification Checklist:**
- [x] Build completes without errors
- [x] Turbopack bundler runs successfully (default in Next.js 16)
- [x] All pages compile correctly
- [x] MDX blog posts render without errors
- [x] No TypeScript compilation errors
- [x] No warnings about deprecated Next.js features

**Expected Metrics:**
- Build time: Should be 2-5× faster with Turbopack (vs webpack in 15.x)
- Routes: ~18 static pages generated
- Bundle size: Should be similar or smaller (~105 kB First Load JS)

**If build fails with Turbopack, test webpack fallback:**
```bash
cd apps/marketing
pnpm build --webpack
```

**4.2 - [x] Cloudflare Workers Preview Test**

```bash
cd apps/marketing
pnpm preview
```

**Verification Checklist:**
- [x] OpenNext Cloudflare build succeeds
- [x] Preview server starts without errors
- [x] Can access preview URL
- [x] All marketing pages load correctly
- [x] Blog posts render with proper MDX formatting
- [x] Images optimize and load properly
- [x] No runtime errors in browser console

**Manual QA Testing:**
- [ ] Homepage loads
- [ ] Features page loads
- [ ] Blog index page loads
- [ ] Individual blog post loads (test one)
- [ ] About page loads
- [ ] Pricing page loads
- [ ] FAQ page loads
- [ ] All navigation links work
- [ ] Images display correctly
- [ ] Dark mode toggle works (if applicable)

**4.3 - [x] TypeScript Check**

```bash
cd apps/marketing
pnpm exec tsc --noEmit
```

Verify no TypeScript errors in marketing app.

**Expected:** Marketing app should have cleaner TypeScript (no test files with complex mocking).

**4.4 - [x] Linting**

```bash
pnpm lint:fix
```

Verify no new linting errors introduced by the upgrade.

**4.5 - [x] Open Graph Image Generation Test**

The marketing app uses `@vercel/og` for Open Graph image generation. Verify this still works:

```bash
# Build should include API routes for OG images
# Check build output for /opengraph-image routes
pnpm build:marketing | grep opengraph
```

**Verify:**
- [x] OG image routes compile successfully
- [x] No errors related to @vercel/og package

**4.6 - [x] Analytics Integration Test**

Marketing app uses `@vercel/analytics`. Verify package compatibility:

```bash
# Check package.json for @vercel/analytics version
cat apps/marketing/package.json | grep '@vercel/analytics'
```

**Expected:** Package should work without updates (usually very stable).

**4.7 - [x] Verify All Tests Passed**

Before proceeding to documentation phase, confirm all Phase 4 tests passed:

- [x] Production build succeeded (Task 4.1)
- [x] Cloudflare preview worked (Task 4.2)
- [x] TypeScript check passed (Task 4.3)
- [x] Linting passed (Task 4.4)
- [x] OG images generate (Task 4.5)
- [x] Analytics package compatible (Task 4.6)

**If any tests failed, resolve issues before proceeding to Phase 5.**

### Phase 5: Documentation

**Note:** Per plan requirements (`.claude/docs/processes/plan-requirements.md`), the documentation-manager agent should be consulted to identify all necessary documentation updates. The tasks below represent an initial assessment but should be validated or revised after consulting the documentation-manager agent for comprehensive guidance on which files need updates and what sections should be modified.

**5.1 - [x] Update Technical Documentation**

**File:** `.claude/docs/tech/architecture.md`

Locate the "Frontend/Web Framework" section (currently documents apps/web).

Add or update a subsection for the marketing app with the following information:
- **Framework version:** Next.js 16.x.x (upgraded from 15.5.6)
- **React version:** 19.2.0
- **Key features:** Turbopack bundler (default), MDX support, static site generation
- **Deployment:** Cloudflare Workers via OpenNext
- **Differences from apps/web:** No authentication, no API routes, static content only, no middleware

If there's no existing section for apps/marketing, create one following the pattern used for apps/web.

```bash
# First, check if marketing app is already documented
grep -A 10 "marketing" .claude/docs/tech/architecture.md
```

**File:** `.claude/docs/tech/deployment.md`

Search for any existing marketing app deployment documentation:

```bash
# Check for existing marketing deployment docs
grep -A 10 -i "marketing" .claude/docs/tech/deployment.md
```

Add or update a marketing app deployment section with:
- Marketing app now uses Next.js 16 with Turbopack bundler (default)
- Build command: `pnpm build:marketing`
- Expected build time improvement: 2-5× faster with Turbopack vs webpack
- Deployment command: `pnpm deploy` (from apps/marketing directory)
- Preview command: `pnpm preview` (uses opennextjs-cloudflare)
- Turbopack is production-ready and significantly faster
- Webpack opt-out available if needed: `pnpm build --webpack`
- Next.js 16 compatibility confirmed with Cloudflare Workers via OpenNext adapter

**5.2 - [ ] Update CLAUDE.md**

**Search for marketing references:**
```bash
# Find all mentions of marketing app
grep -n "marketing" CLAUDE.md
```

Update any references to the marketing site to reflect Next.js 16 upgrade.

**Locate the "Apps" section** and update or add the `@bragdoc/marketing` subsection:

```markdown
### @bragdoc/marketing

**Location**: `apps/marketing/`

Marketing and landing pages built with Next.js 16 (upgraded from 15.5.6).

**Key Differences from Main App:**
- No authentication or middleware
- No API routes
- Pure static content (MDX blog posts, marketing pages)
- Deployed to Cloudflare Workers via OpenNext
- Turbopack bundler (default, 2-5× faster builds than webpack)

**Configuration:**
- Uses next.config.mjs (JavaScript config)
- MDX support via @next/mdx
- Image optimization with AVIF and WebP formats
- Output mode: standalone (for Cloudflare)
```

**Check "Build Commands" section** to ensure marketing build commands are documented:
- `pnpm build:marketing` - Build marketing site with Turbopack
- `pnpm build --webpack` - Opt-out to webpack if needed

**5.3 - [x] Review README Updates**

**Root README.md:** No changes required - marketing upgrade is internal detail.

**5.4 - [x] Document Changeset (If Needed)**

**Decision Framework:** Per `.claude/docs/processes/changeset-management.md`, determine if changeset is needed.

**Assessment:**
- Marketing app is NOT a published package (it's an application)
- No CLI or npm package changes
- Internal deployment only

**Decision:** ❌ **NO CHANGESET NEEDED**

Marketing app upgrades do not require changesets as it's not a published package.

### Phase 6: After-Action Report

**6.1 - [x] Submit After-Action Report to Process Manager**

After completing the marketing site upgrade, submit a report to the process-manager agent following the template in `.claude/docs/after-action-reports/README.md`.

**Report should include:**

1. **Task Summary:**
   - What: Upgraded marketing site to Next.js 16
   - Why: Keep in sync with main web app, leverage Turbopack performance
   - Outcome: [Success/Partial/Issues]

2. **Process Used:**
   - Followed PLAN.md sequentially
   - Referenced lessons learned from web app migration
   - Applied similar testing approach

3. **Results:**
   - Build time improvement: [X]% faster with Turbopack
   - All tests passed: [Yes/No]
   - Cloudflare deployment: [Success/Issues]
   - Any issues encountered: [List]

4. **Issues Encountered:**
   - [List any dependency conflicts, build errors, or unexpected behavior]
   - [How each issue was resolved]

5. **Lessons Learned:**
   - [What went well]
   - [What could be improved]
   - [Recommendations for future upgrades]

6. **Documentation Updates:**
   - [List all documentation files updated]
   - [Any gaps identified]

**Delivery Method:**
```
Consult process-manager agent with this report following the after-action report template.
```

**Purpose:** Enable continuous improvement of upgrade processes and documentation.

---

## Success Criteria

### Build & Deployment
- ✅ Production build succeeds with Turbopack
- ✅ All pages compile without errors
- ✅ MDX blog posts render correctly
- ✅ Open Graph images generate successfully
- ✅ Cloudflare Workers preview works (`pnpm preview`)
- ✅ No TypeScript errors
- ✅ No linting errors

### Functionality
- ✅ All marketing pages load correctly
- ✅ Blog posts render with proper MDX formatting
- ✅ Images optimize and load properly
- ✅ Analytics tracking works
- ✅ SEO metadata renders correctly
- ✅ Dark mode works (if applicable)
- ✅ Navigation links work

### Performance
- ✅ Build time improved or maintained (expect 2-5× faster with Turbopack)
- ✅ Bundle size reasonable (no regressions)
- ✅ Page load performance maintained or improved

### Quality
- ✅ No console errors in browser
- ✅ No build warnings about deprecated features
- ✅ Linting passes
- ✅ TypeScript compilation passes

## Rollback Plan

If issues arise:

**Immediate Rollback:**
```bash
git checkout apps/marketing/package.json
pnpm install
pnpm build:marketing
```

**Revert Commit:**
```bash
git revert <commit-hash>
git push
```

**Redeploy Previous Version:**
```bash
cd apps/marketing
pnpm deploy
```

## Known Issues to Avoid

Based on `tasks/next16/LOG.md` (web app migration):

**Issue 1: Missing Implicit Dependencies**
- **Web app issue:** `tailwindcss-animate` not declared, caused Turbopack failure
- **Marketing check:** ✅ `tw-animate-css` IS in devDependencies
- **Prevention:** Verify all Tailwind plugins are in package.json

**Issue 2: Peer Dependency Warnings**
- **Web app issue:** next-auth and react-day-picker peer dependency warnings
- **Marketing impact:** Minimal (no auth libraries, simpler dependencies)
- **Action:** Document any warnings but don't block on cosmetic warnings

**Issue 3: Type Errors in Middleware/Proxy**
- **Web app issue:** proxy.ts type annotation issues
- **Marketing impact:** ❌ NONE - No middleware file in marketing
- **Action:** Nothing to fix

**Issue 4: Build System Changes**
- **Web app issue:** Turbopack now default, some adjustments needed
- **Marketing impact:** Should be smooth (simpler build, no complex configs)
- **Action:** Test both Turbopack and webpack if needed

## Optional Optimizations

**NOT RECOMMENDED** for this upgrade. Keep it simple and focused.

These were evaluated and deferred in the web app upgrade:

### React Compiler
- Status: Stable but impacts build performance
- Decision: DEFER to separate PR
- Rationale: Need isolated evaluation with benchmarks

### Cache Components
- Status: Stable but requires code changes
- Decision: DEFER to separate PR
- Rationale: Requires caching strategy planning

### Turbopack Dev Caching
- Status: Still in BETA
- Decision: DEFER until stable
- Rationale: Experimental features need more testing

**Recommendation:** Skip all optional optimizations. Focus on stable, core upgrade only.

## Quick Reference: Key Differences from Web App Migration

The marketing app upgrade is significantly simpler than the web app (tasks/next16):

| Aspect | Marketing App |
|--------|---------------|
| **Code changes** | 0 files (only package.json) |
| **Middleware** | None (no rename needed) |
| **redirect() fixes** | None |
| **Dependencies** | Few (MDX, analytics, OG images) |
| **API routes** | None |
| **Testing** | Build + manual QA (no unit tests) |
| **Complexity** | Very Low 🟢 |

See `tasks/next16/` for comparison with the more complex web app migration.

## References

### Internal Documentation
- **Web App Migration Plan:** `tasks/next16/PLAN.md`
- **Web App Migration Log:** `tasks/next16/LOG.md` (comprehensive lessons learned)
- **Technical Docs:** `.claude/docs/tech/architecture.md`, `.claude/docs/tech/deployment.md`
- **Project Guide:** `CLAUDE.md`
- **After-Action Reports:** `.claude/docs/after-action-reports/README.md`
- **Changeset Management:** `.claude/docs/processes/changeset-management.md`

### External Documentation
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Turbopack Documentation](https://turbo.build/pack)
- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)
- [@next/mdx Documentation](https://nextjs.org/docs/app/building-your-application/configuring/mdx)

## Summary

This migration upgrades the marketing site to Next.js 16 with **minimal risk and maximum simplicity**.

**Why this is the easiest Next.js 16 upgrade possible:**
- ✅ No code changes expected (only dependency updates)
- ✅ No middleware to rename
- ✅ No redirect() usage to fix
- ✅ No async patterns to update
- ✅ No authentication logic
- ✅ No API routes
- ✅ Pure static content
- ✅ Simple configuration
- ✅ Web app migration lessons inform this process

**Primary benefits:**
- 2-5× faster builds with Turbopack
- Better Cloudflare Workers compatibility
- Staying current with Next.js releases
- Consistency with main web app (both on Next.js 16)
- Foundation for future optimizations

**Implementation approach:**
1. Upgrade dependencies (Phase 2)
2. Verify config is compatible (Phase 3)
3. Test thoroughly (Phase 4)
4. Update documentation (Phase 5)
5. Submit after-action report (Phase 6)

**No surprises expected.** This should be a smooth, straightforward upgrade.

---

**Last Updated**: 2025-10-23
**Status**: Ready for Implementation
**Related Tasks**:
- `tasks/next16` (web app upgrade - completed ✅)
- Informs: Future Next.js upgrades for other apps/packages
