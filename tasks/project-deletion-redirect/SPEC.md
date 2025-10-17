# Project Deletion: Side Nav Refresh + Redirect to Dashboard

## Problem Statement

When a user deletes a project via the UI, two issues occur:

1. **Incorrect redirect destination**: The user is redirected to `/projects` instead of `/dashboard`
2. **Stale side navigation**: The deleted project remains visible in the side nav projects list until the page is manually refreshed

This creates a poor UX where users see inconsistent state after performing a destructive action.

## Requirements

### Functional Requirements

1. After successful project deletion, redirect user to `/dashboard`
2. Side navigation must automatically refresh to remove the deleted project from the projects list
3. Deletion confirmation dialog should continue to work as-is
4. Database deletion of project and associated achievements should continue to work as-is (already working)

### Non-Functional Requirements

- Changes should not introduce layout shift or flickering in the side nav
- Navigation should feel instant (no noticeable delay before redirect)
- Solution should follow existing BragDoc patterns for route revalidation

## Technical Context

### Existing Implementation

**Database Layer** (`/Users/ed/Code/brag-ai/packages/database/src/projects/queries.ts:234-249`):
- Project deletion logic is already working correctly
- Deletes project and cascades to associated achievements

**API Route** (`/Users/ed/Code/brag-ai/apps/web/app/api/projects/[id]/route.ts`):
- DELETE endpoint handles the deletion request
- Returns appropriate response after deletion

**UI Component**:
- Location needs to be identified (likely in `apps/web/components/projects/` or a project detail page)
- Contains the delete button and confirmation dialog
- Handles the redirect after deletion

### Related Code Patterns

From CLAUDE.md, the following patterns are relevant:

1. **Next.js App Router navigation**:
   - Use `useRouter` from `next/navigation`
   - Call `router.push('/dashboard')` for redirect
   - Call `router.refresh()` to revalidate current route data

2. **Route revalidation**:
   - Server actions can use `revalidatePath()` to invalidate cache
   - Client components can use `router.refresh()` to trigger revalidation

3. **Component patterns**:
   - Client components need `'use client'` directive for useRouter
   - Server actions are preferred for mutations over API routes

### Files to Investigate

1. Find the UI component that handles project deletion (likely contains delete button)
2. Check if deletion is done via API route call or server action
3. Locate where the redirect currently happens
4. Identify how side nav fetches and displays projects list

## Acceptance Criteria

- [ ] After deleting a project, user is redirected to `/dashboard`
- [ ] Side navigation automatically removes the deleted project from the list
- [ ] No stale data remains visible after deletion
- [ ] Confirmation dialog continues to function correctly
- [ ] No console errors or warnings during deletion flow
- [ ] Solution follows existing BragDoc code patterns (see CLAUDE.md)

## Implementation Notes

### Suggested Approach

1. **Locate the deletion UI component**:
   - Search for project deletion dialog/button
   - Identify if it uses API route or server action

2. **Update redirect destination**:
   - Change redirect from `/projects` to `/dashboard`

3. **Add route revalidation**:
   - If using API route: Add `router.refresh()` after successful deletion
   - If using server action: Add `revalidatePath('/dashboard')` in the action
   - Consider also revalidating the projects list path if side nav doesn't refresh

4. **Test the complete flow**:
   - Delete a project
   - Verify redirect goes to dashboard
   - Verify side nav updates immediately
   - Check for any UI glitches or errors

### Questions to Answer During Implementation

- Where is the project deletion UI component located?
- Does it call the API route directly or use a server action?
- How does the side nav fetch its projects list? (Server component? Client component with SWR?)
- What paths need revalidation to ensure side nav refreshes?

## References

- Notion task: https://www.notion.so/28f50f2cf26481b8b771c3e2c73b9ebc
- Priority: Medium
- MVP: No
- Status: Ready for Plan
