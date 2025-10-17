# Implementation Plan: Add Careers Section to Side Navigation

## Summary

This plan restructures the side navigation by removing the Documents section and adding a new "Careers" section. The Careers section consolidates career-related features including Standup and "For my manager" (moved from their current location), plus two new coming-soon pages: Performance Review and Workstreams.

## High-Level Overview

1. Create a new NavCareers component for the Careers navigation section
2. Create two new coming-soon pages (/performance and /workstreams)
3. Update the main sidebar to use NavCareers instead of NavDocuments
4. Move Standup and "For my manager" items from NavMain to NavCareers
5. Remove the NavDocuments component and its usage
6. Update documentation

**Note**: A comprehensive test plan has been created in `TEST_PLAN.md` in the same directory. The test plan covers visual/UI testing, navigation functionality, coming-soon pages, regression testing, authentication, cross-browser compatibility, and accessibility. All tests in the test plan should pass before considering this implementation complete.

## Table of Contents

- [Phase 1: Create New Components](#phase-1-create-new-components)
- [Phase 2: Create Coming Soon Pages](#phase-2-create-coming-soon-pages)
- [Phase 3: Update Main Sidebar](#phase-3-update-main-sidebar)
- [Phase 4: Clean Up](#phase-4-clean-up)
- [Phase 5: Documentation](#phase-5-documentation)
- [Phase 6: CLAUDE.md Updates](#phase-6-claudemd-updates)

---

## Phase 1: Create New Components

### Context
We need a new navigation component for the Careers section that will group career-related links. This component will be similar to NavDocuments but simpler since it only contains static navigation items (no dynamic documents list).

The component should use the same shadcn/ui sidebar components as other navigation components in the codebase.

### Tasks

- [ ] **1.1** Create `apps/web/components/nav-careers.tsx`
  - Import necessary components from `@/components/ui/sidebar`:
    - `SidebarGroup`
    - `SidebarGroupLabel`
    - `SidebarMenu`
    - `SidebarMenuButton`
    - `SidebarMenuItem`
  - Import Link from `next/link`
  - Import icons from `@tabler/icons-react`:
    - `IconUsers` (for Standup)
    - `IconUserCheck` (for "For my manager")
    - `IconChartBar` or `IconTrophy` (for Performance Review)
    - `IconNetwork` or `IconFolder` (for Workstreams)
  - Create a client component with `'use client';` directive
  - Create the `NavCareers` function component with no props
  - Structure:
    ```tsx
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Careers</SidebarGroupLabel>
      <SidebarMenu>
        {/* Four menu items */}
      </SidebarMenu>
    </SidebarGroup>
    ```
  - Add four `SidebarMenuItem` components with `SidebarMenuButton` inside:
    1. **Standup** - Link to `/standup` with `IconUsers`
    2. **For my manager** - Link to `/reports` with `IconUserCheck`
    3. **Performance Review** - Link to `/performance` with icon
    4. **Workstreams** - Link to `/workstreams` with icon
  - Each menu button should use the pattern:
    ```tsx
    <SidebarMenuButton asChild>
      <Link href="/path">
        <IconName />
        <span>Link Title</span>
      </Link>
    </SidebarMenuButton>
    ```
  - Export the component as a named export

---

## Phase 2: Create Coming Soon Pages

### Context
We need to create two new pages that don't have full implementations yet. These should have nice, informative "coming soon" messages that give users a sense of what's coming.

Both pages should follow the same pattern as existing pages like `/standup` and `/reports`:
- Use the `AppPage` wrapper component from `@/components/shared/app-page`
- Use `SidebarInset` from `@/components/ui/sidebar`
- Include `SiteHeader` from `@/components/site-header`
- Use server-side authentication with the `auth()` function
- Follow Next.js 15 App Router conventions

For the Workstreams page, reference the detailed specification at `tasks/workstreams/SPEC.md` to provide meaningful context about what's coming.

### Tasks

- [ ] **2.1** Create `apps/web/app/(app)/performance/page.tsx`
  - Import necessary components:
    ```tsx
    import { auth } from 'app/(auth)/auth';
    import { AppPage } from '@/components/shared/app-page';
    import { SidebarInset } from '@/components/ui/sidebar';
    import { SiteHeader } from '@/components/site-header';
    ```
  - Export metadata object:
    ```tsx
    export const metadata = {
      title: 'Performance Review',
    };
    ```
  - Create async default export function `PerformancePage`
  - Get session with `const session = await auth();`
  - Return early if no session (return null)
  - Return JSX structure:
    ```tsx
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md space-y-4">
              <h1 className="text-3xl font-bold">Performance Review</h1>
              <p className="text-muted-foreground">
                Coming soon: AI-powered performance review generation based on your achievements.
              </p>
              <p className="text-sm text-muted-foreground">
                This feature will help you compile your accomplishments into comprehensive
                performance review documents, highlighting your impact and growth.
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
    ```

- [ ] **2.2** Create `apps/web/app/(app)/workstreams/page.tsx`
  - Import the same components as Performance page
  - Export metadata:
    ```tsx
    export const metadata = {
      title: 'Workstreams',
    };
    ```
  - Create async default export function `WorkstreamsPage`
  - Get session and return early if no session (same pattern)
  - Return JSX structure with more detailed description based on workstreams spec:
    ```tsx
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-2xl space-y-4">
              <h1 className="text-3xl font-bold">Workstreams</h1>
              <p className="text-muted-foreground text-lg">
                Coming soon: Automatically discover thematic patterns in your work.
              </p>
              <div className="text-left space-y-3 text-sm text-muted-foreground">
                <p>
                  Workstreams will use AI to automatically group your achievements into
                  semantic categories that span multiple projects:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Discover patterns like "API Performance Optimization" or "User Authentication & Security"</li>
                  <li>See how your work themes evolve over time</li>
                  <li>Group related achievements across different projects</li>
                  <li>Build a clearer picture of your areas of expertise</li>
                </ul>
                <p className="pt-2">
                  This feature will require at least 20 achievements to generate meaningful workstreams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
    ```

---

## Phase 3: Update Main Sidebar

### Context
The main sidebar component is at `apps/web/components/app-sidebar.tsx`. Currently it:
- Imports and uses `NavDocuments` component (line 16)
- Imports `useDocuments` hook (line 14)
- Has `Standup` in the `navMain` array (lines 38-42)
- Has `For my manager` in the `navMain` array (lines 54-57)

We need to:
1. Remove the NavDocuments import and usage
2. Remove the useDocuments import and usage
3. Remove Standup and "For my manager" from navMain
4. Add NavCareers import and usage
5. Adjust icon imports as needed

### Tasks

- [ ] **3.1** Update `apps/web/components/app-sidebar.tsx` - Remove Documents references
  - Remove the import: `import { useDocuments } from '@/hooks/use-documents';` (line 14)
  - Remove the import: `import { NavDocuments } from '@/components/nav-documents';` (line 16)
  - Remove the line: `const { documents } = useDocuments();` (line 85)
  - Remove the line: `<NavDocuments documents={documents} />` (line 118)

- [ ] **3.2** Update `apps/web/components/app-sidebar.tsx` - Remove items from navMain
  - Remove the Standup object from the `navMain` array (lines 38-42):
    ```tsx
    {
      title: 'Standup',
      url: '/standup',
      icon: IconUsers,
    },
    ```
  - Remove the "For my manager" object from the `navMain` array (lines 54-57):
    ```tsx
    {
      title: 'For my manager',
      url: '/reports',
      icon: IconUserCheck,
    },
    ```

- [ ] **3.3** Update `apps/web/components/app-sidebar.tsx` - Add NavCareers
  - Add import at top: `import { NavCareers } from '@/components/nav-careers';`
  - Add `<NavCareers />` in the `<SidebarContent>` section after `<NavProjects />` and before `<NavSecondary>`
  - The structure should be:
    ```tsx
    <SidebarContent>
      <NavMain items={staticData.navMain} />
      <NavProjects />
      <NavCareers />
      <NavSecondary items={staticData.navSecondary} className="mt-auto" />
    </SidebarContent>
    ```

- [ ] **3.4** Update `apps/web/components/app-sidebar.tsx` - Clean up unused icon imports
  - Remove `IconUsers` from the import (if not used elsewhere in staticData)
  - Remove `IconUserCheck` from the import (if not used elsewhere in staticData)
  - Verify the remaining icons in the import statement are all used

---

## Phase 4: Clean Up

### Context
After moving to the new structure, we have files that are no longer used or referenced. The `nav-documents.tsx` component is now obsolete since we've replaced it with `nav-careers.tsx`.

The `use-documents.ts` hook should NOT be deleted as it may still be used by the `/documents` page (at `apps/web/app/(app)/documents/page.tsx`) for displaying the documents list.

### Tasks

- [ ] **4.1** Delete `apps/web/components/nav-documents.tsx`
  - This file is no longer referenced anywhere after the sidebar changes
  - Verify it's not imported anywhere else with: `grep -r "nav-documents" apps/web/`
  - Delete the file

- [ ] **4.2** Verify documents functionality still works
  - The `/documents` page should still function correctly
  - The `use-documents` hook should remain in place as it's used by other parts of the app
  - Do NOT delete `apps/web/hooks/use-documents.ts`

---

## Phase 5: Documentation

### Context
This change affects the navigation structure of the application, which should be documented for future developers. We need to update relevant documentation files to reflect the new Careers section and the removal of the Documents section from navigation.

### Tasks

- [ ] **5.1** Review `docs/FEATURES.md` if it exists
  - Check if this file exists at `/Users/ed/Code/brag-ai/docs/FEATURES.md`
  - If it exists and contains information about navigation structure or the Documents section, update it to:
    - Remove any mention of Documents in navigation
    - Add information about the new Careers section
    - Document the four items in the Careers section
  - If the file doesn't exist, skip this task

- [ ] **5.2** Consider updating README.md
  - Check `/Users/ed/Code/brag-ai/README.md`
  - If it contains information about the navigation structure or application features, update it to reflect:
    - The new Careers section
    - The coming soon status of Performance Review and Workstreams
  - If navigation isn't documented in README, no changes needed

- [ ] **5.3** Create or update navigation documentation
  - Check if there's a navigation-specific document in the `docs/` directory
  - If not, consider creating `docs/navigation.md` to document:
    - The overall navigation structure
    - The purpose of each navigation section
    - The Careers section and its four items
    - Which pages are available vs coming soon
  - If this seems excessive for the current project stage, skip this task

---

## Phase 6: CLAUDE.md Updates

### Context
The CLAUDE.md file contains comprehensive documentation about the BragDoc codebase architecture, conventions, and patterns. We should review it to see if any sections need updates based on our changes.

Relevant sections in CLAUDE.md that might need updates:
- Project Architecture (if it mentions specific navigation patterns)
- Component Patterns (if it documents navigation components)
- Directory Structure (if it lists navigation components)

### Tasks

- [ ] **6.1** Review and update CLAUDE.md navigation references
  - Read through `/Users/ed/Code/brag-ai/CLAUDE.md`
  - Look for any references to:
    - Documents section in navigation
    - Navigation structure examples that include Documents
    - Component listings that mention nav-documents
  - Update any such references to reflect the new Careers section
  - Add a note about NavCareers component if navigation components are documented

- [ ] **6.2** Update component directory listings in CLAUDE.md
  - If CLAUDE.md has a section listing navigation components, update it to:
    - Remove mention of nav-documents.tsx
    - Add mention of nav-careers.tsx
  - If no such listing exists, no changes needed

---

## Instructions for Implementation

### General Guidelines
1. **Update this plan as you work**: Mark each task as complete using `[x]` in the checkbox when done
2. **Test incrementally**: After each phase, verify the application still builds and runs
3. **Follow existing patterns**: Use the same code style and patterns as seen in existing components
4. **Use TypeScript strictly**: Ensure all types are properly defined
5. **Server Components by default**: Use `'use client'` directive only for NavCareers (which needs client-side Link navigation)

### Development Workflow
1. Start the development server with `pnpm dev` if not already running
2. After creating new files, verify they're recognized by the Next.js build
3. Check the browser console for any errors after each phase
4. Navigate to each new page (/performance, /workstreams) to verify they render correctly
5. Verify the Careers section appears in the sidebar with all four items
6. Click each navigation item to ensure they navigate correctly

### Testing the Changes
1. **Sidebar renders correctly**: Verify the Careers section appears in the correct position
2. **Navigation works**: Click each of the four Careers items and verify they navigate to the correct pages
3. **Existing pages unchanged**: Verify that Dashboard, Achievements, Companies, and other existing pages still work
4. **Coming soon pages**: Verify both /performance and /workstreams show their coming soon messages
5. **Documents page still works**: Navigate to /documents and verify it still functions (even though it's not in sidebar navigation)
6. **Responsive behavior**: Test on mobile/narrow screens to ensure sidebar collapses correctly

### Common Issues and Solutions
- **Import errors**: If you see "cannot find module" errors, verify the file paths are correct and use absolute paths with `@/`
- **Build errors**: Run `pnpm build` to check for TypeScript errors before committing
- **Navigation not highlighting**: The active state is handled by pathname matching in NavMain; NavCareers should follow the same pattern if needed
- **Icons not showing**: Verify icon imports from `@tabler/icons-react` are correct and the package is installed

### Code Style Notes
- Use **named exports** for all components (not default exports)
- Use **interfaces** for prop types (not type aliases)
- Use **async/await** for server components that need data
- Use **const** for all variables unless reassignment is needed
- Follow **existing formatting** for consistency (2-space indentation, single quotes for strings)

---

## Success Criteria

This implementation will be considered complete when:

1. ✅ The Careers section appears in the sidebar navigation
2. ✅ The Careers section contains all four items: Standup, For my manager, Performance Review, and Workstreams
3. ✅ Standup and "For my manager" have been removed from their previous location in navMain
4. ✅ The Documents section has been removed from the sidebar
5. ✅ The /performance page shows a coming soon message
6. ✅ The /workstreams page shows a detailed coming soon message with context about the feature
7. ✅ All four navigation items in Careers section work correctly
8. ✅ The application builds without errors
9. ✅ No console errors appear when navigating between pages
10. ✅ Documentation has been updated appropriately
