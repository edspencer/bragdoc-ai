# Project Deletion: Side Nav Refresh + Redirect to Dashboard - Implementation Plan

## Summary

This plan outlines the steps to fix two issues with project deletion:
1. **Wrong redirect destination**: After deleting a project, users are incorrectly redirected to `/projects` instead of `/dashboard`
2. **Stale side navigation**: The deleted project remains visible in the side nav projects list until manual page refresh

The fix involves updating the redirect destination and ensuring Next.js revalidates the page data to refresh the side navigation.

## High-Level Overview

The implementation requires changes to a single file:
- Update `project-details-content.tsx` to redirect to `/dashboard` and call `router.refresh()` to revalidate all page data

## Current Implementation Analysis

### File Structure

**Main file requiring changes:**
- `/Users/ed/Code/brag-ai/apps/web/components/project-details-content.tsx` (lines 143-153)

**Related files (for context, no changes needed):**
- `/Users/ed/Code/brag-ai/apps/web/hooks/useProjects.ts` - Contains `useDeleteProject()` hook
- `/Users/ed/Code/brag-ai/apps/web/components/nav-projects.tsx` - Side nav component that displays projects
- `/Users/ed/Code/brag-ai/apps/web/hooks/use-top-projects.ts` - Hook used by side nav to fetch top 5 projects

### Current Delete Flow

1. User clicks delete button in `ProjectDetailsContent` component
2. Confirmation dialog appears (AlertDialog component)
3. User confirms deletion
4. `handleDeleteProject()` is called (line 143)
5. `deleteProject(project.id)` from `useDeleteProject()` hook is invoked
6. Hook makes DELETE request to `/api/projects/${id}`
7. Hook calls `mutateList()` to update `/api/projects` SWR cache
8. Hook shows success toast
9. Component calls `router.push('/projects')` ⚠️ **WRONG DESTINATION**
10. Side nav does NOT refresh because it uses a different SWR cache (`/api/projects/top`) ⚠️ **STALE DATA**

### Why Side Nav Doesn't Refresh

The side nav component (`NavProjects`) uses the `useTopProjects(5)` hook which fetches from `/api/projects/top?limit=5`. This is a separate SWR cache from `/api/projects` that `useDeleteProject()` mutates. Therefore, when a project is deleted:

- The `/api/projects` cache is revalidated ✓
- The `/api/projects/top?limit=5` cache is NOT revalidated ✗
- The side nav continues showing the deleted project until page refresh

## Implementation

### Phase 1: Fix Redirect Destination and Add Router Refresh

#### Task 1.1: Update redirect destination to /dashboard
- [ ] Open `/Users/ed/Code/brag-ai/apps/web/components/project-details-content.tsx`
- [ ] Locate the `handleDeleteProject` function (around line 143)
- [ ] Find the line `router.push('/projects');` (line 147)
- [ ] Change it to `router.push('/dashboard');`

**Before:**
```typescript
const handleDeleteProject = async () => {
  try {
    setIsDeleting(true);
    await deleteProject(project.id);
    router.push('/projects');  // ❌ Wrong destination
  } catch (error) {
    console.error('Failed to delete project:', error);
  } finally {
    setIsDeleting(false);
  }
};
```

**After:**
```typescript
const handleDeleteProject = async () => {
  try {
    setIsDeleting(true);
    await deleteProject(project.id);
    router.push('/dashboard');  // ✅ Correct destination
  } catch (error) {
    console.error('Failed to delete project:', error);
  } finally {
    setIsDeleting(false);
  }
};
```

#### Task 1.2: Add router.refresh() to revalidate page data
- [ ] In the same function, add `router.refresh();` BEFORE the `router.push()` call
- [ ] This will force Next.js to revalidate all Server Components and SWR caches

**After:**
```typescript
const handleDeleteProject = async () => {
  try {
    setIsDeleting(true);
    await deleteProject(project.id);
    router.refresh();  // ✅ Revalidate page data (side nav will refresh)
    router.push('/dashboard');  // ✅ Navigate to dashboard
  } catch (error) {
    console.error('Failed to delete project:', error);
  } finally {
    setIsDeleting(false);
  }
};
```

**Why this works:**
- `router.refresh()` tells Next.js to refetch all Server Component data and revalidate SWR caches on the current page
- This includes the side nav's `useTopProjects()` hook which will re-fetch from `/api/projects/top?limit=5`
- After refresh completes, `router.push('/dashboard')` navigates to the dashboard
- The user sees the dashboard with an updated side nav (deleted project removed)

### Phase 2: Testing

#### Task 2.1: Manual testing - Project deletion from detail page
- [ ] Start the development server: `pnpm dev`
- [ ] Navigate to a project details page (e.g., `/projects/[id]`)
- [ ] Verify the side nav shows the project in the projects list
- [ ] Click the delete button (trash icon)
- [ ] Verify the confirmation dialog appears
- [ ] Click "Delete" to confirm
- [ ] Verify the following behavior:
  - Loading spinner appears with "Deleting project..." text
  - After deletion, user is redirected to `/dashboard` (NOT `/projects`)
  - Side nav immediately updates to remove the deleted project (no manual refresh needed)
  - Success toast appears: "Project deleted successfully"
  - No console errors appear

#### Task 2.2: Manual testing - Multiple projects
- [ ] Create multiple projects (at least 6 projects to ensure side nav shows "top 5")
- [ ] Navigate to one of the projects shown in the side nav
- [ ] Delete the project
- [ ] Verify:
  - User is redirected to dashboard
  - Deleted project is removed from side nav
  - If there were more than 5 projects, the 6th project now appears in side nav (taking the deleted project's place)

#### Task 2.3: Edge case - Delete last project
- [ ] If you have only one project, delete it
- [ ] Verify:
  - User is redirected to dashboard
  - Side nav projects list is empty (shows loading skeleton or empty state)
  - No errors occur

#### Task 2.4: Error handling
- [ ] Test with network tab open in DevTools
- [ ] Simulate a failed deletion (e.g., by throttling network or disabling network)
- [ ] Verify:
  - Error toast appears: "Failed to delete project"
  - Loading state is cleared (`isDeleting` becomes false)
  - User remains on the project details page (no redirect on error)
  - Side nav still shows the project (because deletion failed)

### Phase 3: Code Review Checklist

#### Task 3.1: Review changes
- [ ] Confirm only one file was modified: `project-details-content.tsx`
- [ ] Confirm two lines were changed/added:
  - Line 147: Changed from `router.push('/projects')` to `router.push('/dashboard')`
  - Added `router.refresh()` before the push
- [ ] Verify no other code was modified
- [ ] Verify the `useRouter` import from `next/navigation` is already present (line 13)

#### Task 3.2: Verify no regressions
- [ ] Check that project deletion from `/projects` page (project list table) still works correctly
  - Note: The projects list page uses different components (`ProjectsTable`, `ProjectActions`) and doesn't need changes because:
    - Users are already on the projects page (no redirect needed)
    - The `useProjects()` hook is used directly on that page, which gets mutated by `useDeleteProject()`
- [ ] Verify project edit dialog still works
- [ ] Verify project stats display correctly
- [ ] Verify achievements table on project details page still works

## Documentation

### Task 4.1: Update FEATURES.md (if needed)
- [ ] Check if `/Users/ed/Code/brag-ai/docs/FEATURES.md` or `/Users/ed/Code/brag-ai/FEATURES.md` exists
- [ ] If it exists and contains a section about projects or navigation, consider adding a note about the deletion flow:
  - "When deleting a project from its detail page, users are redirected to the dashboard and the side navigation automatically refreshes to reflect the deletion"
- [ ] If the file doesn't exist or doesn't have relevant sections, skip this task

### Task 4.2: Consider creating project-deletion.md documentation
- [ ] If project deletion behavior is complex or has nuances worth documenting, consider creating `/Users/ed/Code/brag-ai/docs/project-deletion.md`
- [ ] Document:
  - Deletion from project details page (with redirect)
  - Deletion from projects list page (no redirect)
  - What gets deleted (project + associated achievements via cascade)
  - Side nav refresh behavior
- [ ] If the deletion flow is straightforward and self-explanatory, skip this task

## CLAUDE.md Updates

### Task 5.1: Review CLAUDE.md for relevant sections
- [ ] Open `/Users/ed/Code/brag-ai/CLAUDE.md`
- [ ] Check the "Component Patterns" section to see if it mentions client component patterns with `useRouter`
- [ ] Check the "API Conventions" section to see if it mentions SWR cache invalidation patterns

### Task 5.2: Consider adding router.refresh() pattern
- [ ] If CLAUDE.md doesn't already document the `router.refresh()` pattern for revalidating page data, consider adding it to the "Component Patterns" or "API Conventions" section
- [ ] Example addition to "Component Patterns > Client Components":

```markdown
#### Revalidating Page Data After Mutations

When performing mutations (create, update, delete) in client components, use `router.refresh()` to revalidate Server Component data and SWR caches:

```typescript
'use client';
import { useRouter } from 'next/navigation';

export function Component() {
  const router = useRouter();

  const handleDelete = async () => {
    await deleteItem(id);
    router.refresh(); // Revalidate all page data
    router.push('/dashboard'); // Navigate to new page
  };
}
```

This ensures that:
- All Server Components re-fetch their data
- All SWR caches on the current page are revalidated
- Side navigation and other shared components reflect the latest data
```

- [ ] If this pattern is already documented elsewhere in CLAUDE.md, skip this task

## Instructions for Implementation

### Before You Begin
1. Read this entire plan document carefully
2. Ensure you have the latest code from the repository
3. Familiarize yourself with the relevant files listed above

### During Implementation
1. **Update the plan as you go**: Mark each task as complete using the checkbox `[x]` when finished
2. **Test incrementally**: After completing Phase 1, test the changes before moving to documentation tasks
3. **Commit frequently**: Make small, logical commits as you complete each phase
4. **Follow BragDoc conventions**: Refer to `/Users/ed/Code/brag-ai/CLAUDE.md` for:
   - TypeScript conventions (strict typing)
   - React patterns (client components with `'use client'`)
   - Import conventions (use `@/` aliases)
   - Error handling patterns

### Key Conventions from CLAUDE.md
- **Client Components**: This component already has `'use client'` directive (required for `useRouter`)
- **useRouter**: Import from `next/navigation` (not `next/router` from Pages Router)
- **Error Handling**: Already implemented with try/catch and console.error
- **Loading States**: Already implemented with `isDeleting` state
- **Code Style**: Use TypeScript, async/await, and proper error handling

### After Implementation
1. Run all tests to ensure no regressions
2. Test the feature manually following Phase 2 tasks
3. Update documentation as specified in Phase 3
4. Review all changes one final time before submitting

### Commit Message
When committing these changes, use the conventional commit format from CLAUDE.md:
```
fix: redirect to dashboard after project deletion and refresh side nav

- Changed redirect destination from /projects to /dashboard
- Added router.refresh() to revalidate page data and update side nav
- Fixes issue where deleted project remained visible in side nav
```

### Common Pitfalls to Avoid
1. ❌ Don't forget to call `router.refresh()` BEFORE `router.push()` - order matters!
2. ❌ Don't modify the `useDeleteProject()` hook - the fix belongs in the component
3. ❌ Don't modify the side nav component - `router.refresh()` handles the update
4. ❌ Don't add loading states for the refresh - it happens in the background
5. ✅ Do test with multiple projects to ensure side nav updates correctly
6. ✅ Do test error scenarios to ensure no redirect happens on failed deletion

### Questions or Issues?
- If the side nav doesn't refresh after adding `router.refresh()`, check the browser console for errors
- If the redirect doesn't work, verify the `useRouter` import is from `next/navigation`
- Refer to CLAUDE.md for additional patterns and conventions
- The fix is intentionally minimal - only 2 lines of code should change

## Success Criteria

All tasks are complete when:
- ✅ Project deletion redirects to `/dashboard` instead of `/projects`
- ✅ Side navigation immediately removes deleted project (no manual refresh needed)
- ✅ All manual tests pass (Phase 2)
- ✅ No console errors during deletion flow
- ✅ Code follows BragDoc conventions from CLAUDE.md
- ✅ Documentation is updated appropriately
- ✅ Changes are committed with proper commit message
