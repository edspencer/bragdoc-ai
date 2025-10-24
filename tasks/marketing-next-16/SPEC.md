# Task: Upgrade Marketing Site to Next.js 16

## Overview

Upgrade the BragDoc marketing website (`apps/marketing`) from Next.js 15.5.6 to Next.js 16. This is a simpler migration than the main web application as the marketing site is a static content site with no authentication, middleware, or complex server-side logic.

## Background Context

The main web application (`apps/web`) has already been successfully upgraded to Next.js 16. See `tasks/next16/` for the completed plan, log, and lessons learned from that migration.

### Key Differences from apps/web Migration

The marketing app migration should be **significantly simpler** than the web app migration because:

1. **No Middleware**: Marketing site has no middleware.ts file (no authentication required)
   - No middleware.ts → proxy.ts rename needed
   - Purely public static content

2. **No redirect() Usage**: No Server Components using redirect()
   - No authentication flows
   - No dynamic redirects to fix

3. **No Complex Patterns**:
   - No params or searchParams in any components
   - No AI SDK usage (experimental_transform, experimental_telemetry)
   - No authentication logic
   - No API routes

4. **Simpler Configuration**:
   - Uses next.config.mjs (JavaScript) vs next.config.ts (TypeScript)
   - Minimal config: MDX support, image optimization, static output
   - No special dependencies like puppeteer, stripe, auth libraries

5. **Static Content Focus**:
   - All pages are Server Components rendering static content
   - MDX blog posts
   - Public marketing pages
   - No dynamic behavior beyond page navigation

## Current State

### Versions
- **Next.js**: 15.5.6 → Target: 16.x
- **React**: 19.2.0 (already compatible)
- **React DOM**: 19.2.0 (already compatible)
- **@next/mdx**: latest → Target: 16.x
- **Node.js**: v24.8.0 ✅ (exceeds minimum requirement of 20.9.0+)
- **TypeScript**: 5.x ✅

### Configuration
- **File**: `apps/marketing/next.config.mjs`
- **Key Features**:
  - MDX support via @next/mdx
  - Image optimization (AVIF, WebP)
  - Static site optimization
  - Output: standalone

### Deployment
- **Target**: Cloudflare Workers (via OpenNext)
- **Build Command**: `pnpm build`
- **Preview**: `pnpm preview` (uses opennextjs-cloudflare)
- **Deploy**: `pnpm deploy`

### Dependencies
**Key Dependencies**:
- `next`: 15.5.6
- `react`: 19.2.0
- `react-dom`: 19.2.0
- `@next/mdx`: latest
- `next-mdx-remote`: latest
- `@vercel/og`: For Open Graph image generation
- `@vercel/analytics`: For analytics tracking

**Dev Dependencies**:
- `@opennextjs/cloudflare`: 1.11.0 (Cloudflare adapter)
- `tailwindcss`: 4.1.15 (Tailwind v4)
- `eslint-config-next`: 15.5.6 → Target: 16.x

## Risk Assessment: VERY LOW 🟢

### Why This Migration Is Low Risk

1. **No Breaking Code Patterns**:
   - No middleware to rename
   - No redirect() usage to fix
   - No async params/searchParams patterns (none used)
   - No deprecated API usage

2. **Successful Precedent**:
   - apps/web migration completed successfully
   - Same deployment target (Cloudflare Workers)
   - Same general stack (Next.js + React + Cloudflare)

3. **Simple Architecture**:
   - Pure static content site
   - No authentication or authorization
   - No API routes
   - No server actions
   - No database access

4. **Environment Already Compatible**:
   - Node.js v24.8.0 exceeds requirements
   - React 19.2.0 already installed
   - TypeScript version compatible
   - No special runtime requirements

5. **Easy Rollback**:
   - Simple git revert if issues arise
   - No data migrations or schema changes
   - No user sessions or state to manage

## Specific Requirements

### 1. Dependency Upgrades

**Core Dependencies** (apps/marketing/package.json):
```json
{
  "dependencies": {
    "next": "16.x.x",           // 15.5.6 → 16.x
    "@next/mdx": "16.x.x",      // Update to match Next.js version
    "react": "19.2.0",          // Already compatible
    "react-dom": "19.2.0"       // Already compatible
  },
  "devDependencies": {
    "eslint-config-next": "16.x.x"  // Update to match Next.js version
  }
}
```

**Upgrade Method**:
- Prefer automated codemod: `npx @next/codemod@canary upgrade latest`
- Fallback to manual: `cd apps/marketing && pnpm add next@latest @next/mdx@latest`

### 2. Configuration Review

**File**: `apps/marketing/next.config.mjs`

**Current Config**:
```javascript
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { /* image optimization config */ },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  output: 'standalone',
  outputFileTracingIncludes: { '/': ['./public/**/*'] }
}
```

**Verification Needed**:
- Confirm MDX integration still works with Next.js 16
- Verify image optimization defaults (Next.js 16 changed some defaults)
- Ensure Cloudflare Workers build still works with OpenNext adapter
- Check that all config options are still valid in Next.js 16

**No Changes Expected**: Configuration is minimal and already follows best practices.

### 3. Turbopack Bundler

**New Default in Next.js 16**: Turbopack replaces Webpack as the default bundler.

**Expected Impact**:
- Faster build times (2-5× improvement expected)
- No code changes required
- Opt-out available if issues: `pnpm build --webpack`

**Testing Required**:
- Verify production build succeeds with Turbopack
- Confirm all pages compile correctly
- Check bundle sizes are reasonable
- Ensure MDX files compile correctly

### 4. Cloudflare Workers Compatibility

**Deployment Target**: Cloudflare Workers via OpenNext adapter

**Expected Improvements**:
- Next.js 16 has better Cloudflare Workers compatibility
- No middleware means no proxy.ts changes needed
- Static site should deploy seamlessly

**Testing Required**:
- Production build: `pnpm build:marketing`
- Cloudflare preview: `cd apps/marketing && pnpm preview`
- Verify all routes accessible
- Confirm Open Graph images generate correctly
- Test analytics integration still works

### 5. Documentation Updates

After successful migration, update:

**Technical Documentation** (`.claude/docs/tech/`):
- `architecture.md`: Update marketing app Next.js version
- `deployment.md`: Note Turbopack as default bundler for marketing
- No frontend-patterns.md changes needed (no middleware in marketing)

**Project Documentation**:
- `CLAUDE.md`: Update marketing app Next.js version references (if any)

**Note**: Marketing app is simpler, so most documentation is about the web app.

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
- ✅ Blog posts render with proper formatting
- ✅ Images optimize and load properly
- ✅ Analytics tracking works
- ✅ SEO metadata renders correctly
- ✅ Structured data (JSON-LD) still works

### Performance
- ✅ Build time improved or maintained
- ✅ Bundle size reasonable (no regressions)
- ✅ Page load performance maintained

### Quality
- ✅ No console errors in browser
- ✅ No build warnings about deprecated features
- ✅ Linting passes
- ✅ TypeScript compilation passes

## Expected Timeline

This migration should be faster than the web app migration:

**Phase 1: Preparation** (5 minutes)
- Verify current state
- Document versions
- Review existing build

**Phase 2: Dependency Upgrades** (10 minutes)
- Run codemod or manual upgrade
- Update lock file
- Resolve peer dependency warnings

**Phase 3: Configuration Review** (10 minutes)
- Review next.config.mjs
- Verify no deprecated options
- Ensure MDX integration compatible

**Phase 4: Testing** (20 minutes)
- Production build test
- Cloudflare preview test
- Manual QA of key pages
- TypeScript & linting checks

**Phase 5: Documentation** (10 minutes)
- Update technical docs
- Update CLAUDE.md if needed

**Total Estimated Time**: ~1 hour (vs 3-4 hours for web app)

## Known Issues to Avoid

Based on the web app migration:

1. **Missing Dependencies**:
   - The web app had `tailwindcss-animate` not declared explicitly
   - Check marketing app doesn't have similar hidden dependencies
   - Verify all used packages are in package.json

2. **Type Errors**:
   - The web app had initial type errors in proxy.ts
   - Marketing should have none (no middleware)
   - Still run TypeScript check to be safe

3. **Peer Dependency Warnings**:
   - Some packages may warn about Next.js 16 (e.g., next-auth warned on web app)
   - Most warnings are non-blocking
   - Document any warnings for future reference

## Rollback Plan

If issues arise:

**Immediate Rollback**:
```bash
git checkout apps/marketing/package.json
pnpm install
pnpm build:marketing
```

**Revert Commit**:
```bash
git revert <commit-hash>
git push
```

**Redeploy Previous Version**:
```bash
cd apps/marketing
pnpm deploy
```

## Optional Optimizations

These are NOT required for the initial migration but can be considered later:

### React Compiler
- Automatic memoization
- May increase build times
- Evaluate in separate PR

### Cache Components
- Requires "use cache" directives
- Not needed for static marketing site
- Skip for now

### Turbopack Dev Caching
- Still experimental in Next.js 16
- Would speed up dev server restarts
- Low priority for marketing (infrequently developed)

**Recommendation**: Skip all optional optimizations for this migration. Focus on stable, core upgrade.

## References

### Internal Documentation
- **Web App Migration**: `tasks/next16/PLAN.md` and `tasks/next16/LOG.md`
- **Technical Docs**: `.claude/docs/tech/architecture.md`, `.claude/docs/tech/deployment.md`
- **Project Guide**: `CLAUDE.md`

### External Documentation
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Turbopack Documentation](https://turbo.build/pack)
- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)

## Summary

This migration upgrades the marketing site to Next.js 16 with minimal risk. The marketing app's simple, static nature means:

- **No code changes expected** (only dependency upgrades)
- **No migration patterns needed** (no middleware, auth, or complex logic)
- **Faster migration** than web app
- **Lower risk** due to simpler architecture

The primary benefits are:
- 2-5× faster builds with Turbopack
- Better Cloudflare Workers compatibility
- Staying current with Next.js releases
- Consistency with main web app (both on Next.js 16)

---

**Last Updated**: 2025-10-23
**Status**: Ready for Planning
**Related Tasks**: tasks/next16 (web app upgrade - completed)
