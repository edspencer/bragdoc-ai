# BragDoc Phase 3 Cleanup Plan: Remaining App Directory Migration

This document outlines the remaining files and directories in `/app` that need to be migrated or cleaned up after the initial app splitting in PLAN2.md.

## Overview of Remaining Files

After analyzing the `/app` directory, several important files and directories were not migrated during the initial split. This plan categorizes them and provides migration strategies.

---

## Category 1: Critical Missing Features - Immediate Migration Required

### 1.1 CLI Authentication (`/app/cli-auth/`)

**Status**: ❌ **NOT MIGRATED** - Critical functionality missing  
**Destination**: `apps/web/src/app/cli-auth/`  
**Priority**: **HIGH** - Required for CLI package authentication

**Files to migrate**:
- `app/cli-auth/page.tsx` → `apps/web/src/app/cli-auth/page.tsx`
- `app/cli-auth/CLIAuthContent.tsx` → `apps/web/src/app/cli-auth/CLIAuthContent.tsx`

**Migration steps**:
1. Copy CLI auth directory to web app
2. Update imports to use workspace packages:
   - `@/app/(auth)/auth` → `@bragdoc/auth`
3. Test CLI authentication flow
4. Verify redirect URLs work correctly

**Why web app**: CLI authentication is part of the main application functionality and requires user sessions.

### 1.2 Email Unsubscribe Page (`/app/unsubscribed/`)

**Status**: ❌ **NOT MIGRATED** - Email functionality broken  
**Destination**: `apps/web/src/app/unsubscribed/`  
**Priority**: **HIGH** - Required for email compliance

**Files to migrate**:
- `app/unsubscribed/page.tsx` → `apps/web/src/app/unsubscribed/page.tsx`

**Migration steps**:
1. Copy unsubscribed page to web app
2. Update imports:
   - `@/components/marketing/salient/Container` → `@bragdoc/ui/Container` (or local component)
   - `@/lib/email/unsubscribe` → `@bragdoc/email/unsubscribe`
3. Test unsubscribe token validation
4. Verify email unsubscribe flow works end-to-end

**Why web app**: Email unsubscribe is part of the core application functionality and requires database access.

---

## Category 2: Marketing Features - Should Be Migrated

### 2.1 RSS/JSON Feed (`/app/feed/`)

**Status**: ❌ **NOT MIGRATED** - Marketing SEO feature missing  
**Destination**: `apps/marketing/src/app/feed/`  
**Priority**: **MEDIUM** - Important for blog/content marketing

**Files to migrate**:
- `app/feed/route.ts` → `apps/marketing/src/app/feed/route.ts`

**Migration steps**:
1. Copy feed route to marketing app
2. Update imports:
   - `@/lib/blog/Posts` → Move blog utilities to marketing app or create shared package
   - `@/lib/markdownToHTML` → Move to marketing app
   - `@/lib/config` → `@bragdoc/config`
3. Test RSS and JSON feed generation
4. Verify feed URLs work correctly

**Why marketing app**: RSS feeds are primarily for marketing content (blog posts, announcements).

### 2.2 Blog Content (`/app/posts/` and `/app/excerpts/`)

**Status**: ❌ **NOT MIGRATED** - Content missing from marketing site  
**Destination**: `apps/marketing/src/app/posts/` and `apps/marketing/src/app/excerpts/`  
**Priority**: **MEDIUM** - Blog content needed for marketing site

**Files to migrate**:
- `app/posts/2025/introducing-bragdoc-cli.mdx` → `apps/marketing/src/app/posts/2025/introducing-bragdoc-cli.mdx`
- `app/excerpts/2025/introducing-bragdoc-cli.mdx` → `apps/marketing/src/app/excerpts/2025/introducing-bragdoc-cli.mdx`

**Migration steps**:
1. Copy blog content directories to marketing app
2. Update any internal links or references
3. Verify blog posts render correctly in marketing site
4. Test blog navigation and permalinks

**Why marketing app**: Blog content is marketing material for public consumption.

---

## Category 3: Static Assets and Metadata - Simple Migration

### 3.1 Favicon and Static Assets

**Status**: ❌ **NOT MIGRATED** - Missing from both apps  
**Destination**: Both apps need favicon  
**Priority**: **LOW** - Cosmetic but should be fixed

**Files to migrate**:
- `app/favicon.ico` → `apps/web/src/app/favicon.ico` AND `apps/marketing/src/app/favicon.ico`

**Migration steps**:
1. Copy favicon to both apps
2. Consider using different favicons if needed for branding distinction
3. Test favicon appears in both apps

### 3.2 SEO and Metadata Files

**Status**: ✅ **PARTIALLY MIGRATED** - robots.ts and sitemap.ts in web app only  
**Destination**: Should be in both apps  
**Priority**: **MEDIUM** - Important for SEO

**Current status**:
- `robots.ts` and `sitemap.ts` are in web app
- Marketing app is missing these files

**Action needed**:
1. Review robots.ts and sitemap.ts in web app
2. Create marketing-specific versions
3. Ensure proper SEO configuration for both domains

---

## Category 4: Already Migrated - Safe to Delete

### 4.1 Route Groups
**Status**: ✅ **MIGRATED**
- `app/(app)/` → `apps/web/src/app/(app)/` ✅
- `app/(auth)/` → `apps/web/src/app/(auth)/` ✅  
- `app/(marketing)/` → `apps/marketing/src/app/` ✅

### 4.2 API Routes
**Status**: ✅ **MIGRATED**
- `app/api/` → `apps/web/src/app/api/` ✅

### 4.3 Root Layout and Globals
**Status**: ✅ **MIGRATED**
- `app/layout.tsx` → Both apps have their own layouts ✅
- `app/globals.css` → Both apps have their own styles ✅

---

## Detailed Migration Tasks

### Task 1: Migrate CLI Authentication (Priority: HIGH)

```bash
# Step 1: Copy CLI auth files to web app
mkdir -p apps/web/src/app/cli-auth
cp app/cli-auth/* apps/web/src/app/cli-auth/

# Step 2: Update imports in the copied files
# Edit apps/web/src/app/cli-auth/page.tsx
# Change: import { auth } from '@/app/(auth)/auth';
# To:     import { auth } from '@bragdoc/auth';
```

**Files to edit**:
- `apps/web/src/app/cli-auth/page.tsx`: Update auth import
- `apps/web/src/app/cli-auth/CLIAuthContent.tsx`: Update any component imports

**Testing**:
1. Start web app: `pnpm dev:web`
2. Test CLI auth flow: Visit `http://localhost:3000/cli-auth?state=test&port=5556`
3. Verify authentication redirect works
4. Test with actual CLI package

### Task 2: Migrate Email Unsubscribe (Priority: HIGH)

```bash
# Step 1: Copy unsubscribe page to web app
mkdir -p apps/web/src/app/unsubscribed
cp app/unsubscribed/* apps/web/src/app/unsubscribed/
```

**Files to edit**:
- `apps/web/src/app/unsubscribed/page.tsx`: 
  - Update Container import to use @bragdoc/ui or create local component
  - Update unsubscribe import: `@/lib/email/unsubscribe` → `@bragdoc/email/unsubscribe`

**Testing**:
1. Create test unsubscribe token
2. Visit unsubscribe URL with valid token
3. Verify database is updated correctly
4. Test with invalid/expired tokens

### Task 3: Migrate RSS Feed (Priority: MEDIUM)

```bash
# Step 1: Copy feed route to marketing app
mkdir -p apps/marketing/src/app/feed
cp app/feed/* apps/marketing/src/app/feed/
```

**Dependencies needed**:
- Blog utilities (`lib/blog/Posts.ts`) need to be moved to marketing app
- Markdown processing utilities need to be available in marketing app

**Files to edit**:
- `apps/marketing/src/app/feed/route.ts`: Update all imports to use workspace packages or local utilities

**Testing**:
1. Start marketing app: `pnpm dev:marketing`
2. Test RSS feed: Visit `http://localhost:3001/feed`
3. Test JSON feed: Visit `http://localhost:3001/feed?type=json`
4. Verify feed content is correct

### Task 4: Migrate Blog Content (Priority: MEDIUM)

```bash
# Step 1: Copy blog content to marketing app
mkdir -p apps/marketing/src/app/posts/2025
mkdir -p apps/marketing/src/app/excerpts/2025
cp -r app/posts/* apps/marketing/src/app/posts/
cp -r app/excerpts/* apps/marketing/src/app/excerpts/
```

**Testing**:
1. Verify blog posts are accessible in marketing app
2. Test blog post navigation and rendering
3. Update any internal links if necessary

### Task 5: Handle Static Assets (Priority: LOW)

```bash
# Step 1: Copy favicon to both apps
cp app/favicon.ico apps/web/src/app/
cp app/favicon.ico apps/marketing/src/app/
```

**Additional considerations**:
- Consider different favicons for web app vs marketing site
- Update any references to favicon in layouts

### Task 6: SEO Files Review (Priority: MEDIUM)

**Current state**: SEO files already in web app, need marketing versions

**Actions**:
1. Review `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts`
2. Create marketing-specific versions:
   - `apps/marketing/src/app/robots.ts`
   - `apps/marketing/src/app/sitemap.ts`
3. Ensure proper domain configuration for each app

---

## Post-Migration Cleanup

### Files Safe to Delete After Migration

Once all migrations are complete, these files can be safely deleted:

```bash
# After successful migration and testing:
rm -rf app/cli-auth/
rm -rf app/unsubscribed/
rm -rf app/feed/
rm -rf app/posts/
rm -rf app/excerpts/
rm app/favicon.ico

# Keep temporarily for reference:
# - app/(app)/ (until web app fully working)
# - app/(auth)/ (until web app fully working)
# - app/(marketing)/ (until marketing app fully working)
# - app/api/ (until web app API fully working)
```

### Final Cleanup (After Full Testing)

```bash
# Once both apps are fully functional and tested:
rm -rf app/(app)/
rm -rf app/(auth)/
rm -rf app/(marketing)/
rm -rf app/api/
rm app/layout.tsx
rm app/globals.css
rm app/robots.ts
rm app/sitemap.ts

# Keep these files as they may be used by root or other tools:
# - Any tooling configuration files
# - Any shared utilities that haven't been properly extracted
```

---

## Testing Strategy

### 1. Critical Path Testing
1. **CLI Authentication**: Test full CLI auth flow
2. **Email Unsubscribe**: Test email unsubscribe functionality
3. **API Endpoints**: Ensure all API routes work in web app

### 2. Marketing Site Testing
1. **Blog Content**: Verify blog posts render correctly
2. **RSS Feeds**: Test feed generation and validation
3. **SEO**: Check robots.txt and sitemap.xml

### 3. Cross-App Testing
1. **Navigation**: Test links between apps
2. **Authentication**: Verify auth state works across domains (if applicable)
3. **Shared Resources**: Verify workspace packages work correctly

### 4. Production Readiness
1. **Build Tests**: Both apps should build successfully
2. **Performance**: Check bundle sizes haven't significantly increased
3. **SEO**: Verify proper meta tags and structured data

---

## Migration Priority Order

1. **Phase 1 (Immediate)**: CLI Auth + Email Unsubscribe
2. **Phase 2 (This Week)**: RSS Feed + Blog Content  
3. **Phase 3 (Nice to Have)**: Static Assets + SEO Refinements
4. **Phase 4 (Cleanup)**: Remove old app directory files

## Success Criteria

- [ ] CLI package can successfully authenticate with web app
- [ ] Email unsubscribe functionality works end-to-end
- [ ] Marketing site has functional RSS feeds
- [ ] Blog content is accessible in marketing site
- [ ] Both apps build and deploy successfully
- [ ] No broken links or missing functionality
- [ ] Original `/app` directory can be safely removed

This migration plan ensures all functionality is preserved while completing the transition to the new Turborepo architecture.