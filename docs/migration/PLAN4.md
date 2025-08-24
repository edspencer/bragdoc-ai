# BragDoc Turborepo Migration Cleanup Plan

This document identifies top-level directories and files that should no longer exist after the turborepo migration is complete.

## Analysis Overview

After reviewing the turborepo migration plans (TURBOREPO.md, PLAN1.md, PLAN2.md, PLAN3.md) and examining the current repository structure, several directories and files at the root level are vestigial from the pre-turborepo architecture and should be cleaned up.

---

## Category 1: Critical Duplicated Functionality - IMMEDIATE CLEANUP REQUIRED

### 1.1 `/lib/` Directory
**Status**: ❌ **DUPLICATE** - Already moved to packages  
**Action**: **DELETE ENTIRE DIRECTORY**  
**Priority**: **HIGH**  

**Current State**: 
- Root `/lib/` contains the same functionality now in packages/
- Database functionality: `/lib/db/` → `packages/database/src/`
- AI functionality: `/lib/ai/` → Should be in `apps/web/src/lib/ai/`
- Email functionality: `/lib/email/` → `packages/email/src/`
- Other utilities duplicated across packages

**Verification Required**:
- ✅ Confirm `packages/database` contains all database functionality
- ✅ Confirm `packages/email` contains all email functionality  
- ✅ Confirm `apps/web/src/lib/ai/` contains AI functionality
- ✅ Confirm other utilities are properly packaged

**Safe to Delete**: Once verification confirms all functionality is properly packaged

### 1.2 `/hooks/` Directory
**Status**: ❌ **DUPLICATE** - Already moved to apps/web  
**Action**: **DELETE ENTIRE DIRECTORY**  
**Priority**: **HIGH**

**Current State**:
- Root `/hooks/` contains React hooks
- Same functionality exists in `apps/web/src/hooks/`

**Verification Required**:
- ✅ Confirm `apps/web/src/hooks/` contains all necessary hooks
- ✅ Test that web app works without root hooks directory

**Safe to Delete**: Once verification confirms hooks work in web app

### 1.3 `/types/` Directory  
**Status**: ❌ **DUPLICATE** - Should be in packages or apps  
**Action**: **MOVE OR DELETE**  
**Priority**: **MEDIUM**

**Current State**:
- Contains `marketing.ts` and `next-auth.d.ts`
- `marketing.ts` → Should move to `apps/marketing/src/types/`
- `next-auth.d.ts` → Should move to `apps/web/src/types/` or `packages/auth/src/`

**Action Plan**:
1. Move `marketing.ts` → `apps/marketing/src/types/marketing.ts`
2. Move `next-auth.d.ts` → `packages/auth/src/types/next-auth.d.ts`
3. Update imports in both apps
4. Delete root `/types/` directory

---

## Category 2: Root Next.js Configuration Files - NO LONGER NEEDED

### 2.1 Next.js Configuration Files
**Status**: ❌ **OBSOLETE** - Each app has its own config  
**Action**: **DELETE**  
**Priority**: **HIGH**

**Files to Delete**:
- `next-env.d.ts` (apps have their own)
- `next.config.ts` (apps have their own)  
- `middleware.ts` (should be in apps/web only)
- `tailwind.config.ts` (apps have their own)
- `postcss.config.mjs` (apps have their own)

**Verification Required**:
- ✅ Confirm `apps/web/next.config.ts` exists and works
- ✅ Confirm `apps/marketing/next.config.ts` exists and works
- ✅ Confirm `apps/web/src/middleware.ts` handles auth properly
- ✅ Confirm both apps have proper tailwind configs

### 2.2 TypeScript Configuration
**Status**: ⚠️ **KEEP BUT REVIEW** - Still needed for workspace  
**Action**: **REVIEW AND UPDATE**  
**Priority**: **LOW**

**Files to Review**:
- `tsconfig.json` - Should extend packages/config and reference workspace
- `global.d.ts` - May still be needed for workspace-level types

**Action Plan**:
1. Review if `tsconfig.json` properly references workspace packages
2. Confirm `global.d.ts` is still needed
3. Update if necessary to work with new architecture

---

## Category 3: Static Assets - NEEDS REDISTRIBUTION

### 3.1 `/public/` Directory
**Status**: ⚠️ **NEEDS REDISTRIBUTION** - Should be split between apps  
**Action**: **REDISTRIBUTE AND DELETE**  
**Priority**: **MEDIUM**

**Current Contents Analysis**:
- `fonts/` → Should go to both apps (shared assets)
- `images/logo/` → Should go to both apps (shared branding)
- `images/screenshots/` → Likely marketing-specific → `apps/marketing/public/`
- `images/avatars/` → Could be shared or marketing-specific
- Other images → Need case-by-case analysis

**Action Plan**:
1. Copy shared assets (fonts, logos) to both `apps/web/public/` and `apps/marketing/public/`
2. Move marketing-specific assets to `apps/marketing/public/`
3. Move app-specific assets to `apps/web/public/`
4. Delete root `/public/` directory

### 3.2 MDX Components
**Status**: ⚠️ **NEEDS REDISTRIBUTION** - Used by marketing app  
**Action**: **MOVE TO MARKETING APP**  
**Priority**: **MEDIUM**

**Files to Move**:
- `mdx-components.tsx` → `apps/marketing/src/mdx-components.tsx`

**Verification**: Test that blog posts render correctly in marketing app

---

## Category 4: Development and Build Tools - REVIEW REQUIRED

### 4.1 `/scripts/` Directory
**Status**: ⚠️ **REVIEW EACH SCRIPT** - Some may still be needed  
**Action**: **REVIEW AND REDISTRIBUTE**  
**Priority**: **LOW**

**Scripts Analysis**:
- `dev.sh` → Should be updated for turborepo or moved to root scripts
- `create-stripe-products.ts` → App-specific, move to `apps/web/scripts/`
- `capture-*` scripts → Marketing-specific, move to `apps/marketing/scripts/`
- `cli-test.tsx` → CLI-specific, move to `packages/cli/scripts/`

**Action Plan**: Review each script and move to appropriate app/package

### 4.2 `/test/` Directory
**Status**: ⚠️ **REDISTRIBUTE TO PACKAGES/APPS** - Tests should be co-located  
**Action**: **REDISTRIBUTE AND DELETE**  
**Priority**: **MEDIUM**

**Test Files Analysis**:
- Database tests → `packages/database/src/__tests__/`
- API tests → `apps/web/src/__tests__/`
- Hook tests → `apps/web/src/hooks/__tests__/`
- Company/Project tests → Appropriate packages

**Action Plan**: Move tests to be co-located with their source code

---

## Category 5: Documentation and Configuration - KEEP BUT ORGANIZE

### 5.1 Documentation Files
**Status**: ✅ **KEEP** - Still relevant at workspace level  
**Action**: **ORGANIZE INTO DOCS/**  
**Priority**: **LOW**

**Files to Organize**:
- `README.md` → Keep (workspace overview)
- `requirements.md` → Move to `docs/REQUIREMENTS.md`
- `Marketing.md` → Move to `docs/MARKETING.md` 
- `FEATURES.md` → Keep (workspace-level features)
- `TODO.md` → Keep or move to `docs/TODO.md`

### 5.2 Planning Documents
**Status**: ✅ **KEEP TEMPORARILY** - Useful for reference  
**Action**: **ARCHIVE AFTER MIGRATION COMPLETE**  
**Priority**: **LOW**

**Files**:
- `PLAN.md`, `PLAN1.md`, `PLAN2.md`, `PLAN3.md`, `PLAN4.md`
- `TURBOREPO.md`

**Future Action**: Move to `docs/migration/` after cleanup is complete

### 5.3 Configuration Files - Workspace Level
**Status**: ✅ **KEEP** - Required for workspace  
**Action**: **NO ACTION**  
**Priority**: **N/A**

**Files to Keep**:
- `package.json` (workspace root)
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `turbo.json`
- `components.json` (shadcn/ui config)
- `biome.jsonc` (code formatting)
- `jest.config.ts`, `jest.setup.ts` (workspace testing)

---

## Category 6: Other Directories to Review

### 6.1 `/ai-docs/` Directory
**Status**: ⚠️ **UNCLEAR PURPOSE** - Contains Salient template  
**Action**: **REVIEW AND DECIDE**  
**Priority**: **LOW**

**Analysis**: Contains what appears to be a Salient template. May be:
- Reference material → Move to `docs/references/`
- Unused template → Delete
- Development template → Keep temporarily

### 6.2 `/features/` Directory
**Status**: ✅ **KEEP** - Feature documentation is valuable  
**Action**: **NO ACTION**  
**Priority**: **N/A**

### 6.3 `/iac/` Directory (Infrastructure as Code)
**Status**: ✅ **KEEP** - Terraform configs for deployment  
**Action**: **NO ACTION**  
**Priority**: **N/A**

### 6.4 `/research/` Directory
**Status**: ✅ **KEEP** - Research materials are valuable  
**Action**: **NO ACTION**  
**Priority**: **N/A**

### 6.5 `/temp/` Directory
**Status**: ❌ **TEMPORARY FILES** - Safe to delete  
**Action**: **DELETE**  
**Priority**: **LOW**

---

## Implementation Priority Order

### Phase 1: IMMEDIATE (Critical Duplicates)
1. **Verify packages contain all functionality from root `/lib/`**
2. **Delete `/lib/` directory**
3. **Verify `/hooks/` functionality in `apps/web/src/hooks/`**
4. **Delete `/hooks/` directory**
5. **Delete obsolete Next.js config files**

### Phase 2: REDISTRIBUTION (Static Assets)
1. **Redistribute `/public/` assets to appropriate apps**
2. **Move `/types/` files to appropriate packages/apps**
3. **Move `mdx-components.tsx` to marketing app**
4. **Delete empty directories**

### Phase 3: TESTING AND CLEANUP
1. **Redistribute `/test/` files to appropriate packages/apps**
2. **Review and move `/scripts/` as needed**
3. **Clean up `/ai-docs/` and `/temp/`**

### Phase 4: ORGANIZATION
1. **Organize documentation into `/docs/`**
2. **Archive migration planning documents**

## Verification Commands

```bash
# Before cleanup - verify packages work
pnpm turbo build
pnpm turbo test  
pnpm turbo lint

# After each phase - verify nothing is broken
pnpm turbo build
pnpm turbo dev:web &
pnpm turbo dev:marketing &
# Test key functionality in both apps
```

## Success Criteria

- ✅ Both apps build successfully without root lib/hooks directories
- ✅ All tests pass after redistribution
- ✅ Development workflow works with `pnpm turbo dev`
- ✅ No broken imports or missing functionality
- ✅ Clean root directory with only workspace-level files
- ✅ Proper separation between apps and shared packages

---

This cleanup will complete the turborepo migration by removing all vestigial files and ensuring a clean workspace structure.