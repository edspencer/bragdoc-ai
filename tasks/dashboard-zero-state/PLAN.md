# Implementation Plan: Dashboard Zero State for New Users

## Summary

This plan implements a welcoming zero state experience for new users who land on an empty dashboard with no achievements. The zero state will provide clear CLI setup instructions and guide users through extracting their first achievements from a Git repository. Once achievements exist, the dashboard will automatically switch to the normal view with stats, charts, and activity streams.

## High-Level Overview

The implementation will:
1. Modify the dashboard page to check if the user has zero achievements
2. Create a new `DashboardZeroState` client component with CLI instructions and an interactive refresh button
3. Integrate the zero state into the existing dashboard layout, showing it when appropriate
4. Add proper loading states and error handling
5. Follow existing BragDoc patterns (Server Components, shadcn/ui, centered layouts)

## Table of Contents

- [Phase 1: Check Zero Achievement Condition](#phase-1-check-zero-achievement-condition)
- [Phase 2: Create Dashboard Zero State Component](#phase-2-create-dashboard-zero-state-component)
- [Phase 3: Integrate Zero State into Dashboard](#phase-3-integrate-zero-state-into-dashboard)
- [Phase 4: Testing](#phase-4-testing)
- [Phase 5: Documentation Updates](#phase-5-documentation-updates)

---

## Phase 1: Check Zero Achievement Condition

This phase focuses on detecting when a user has zero achievements so we can conditionally show the zero state.

### Context

The dashboard page is located at `/Users/ed/Code/brag-ai/apps/web/app/(app)/dashboard/page.tsx`. Currently, it's a simple Server Component that renders the `AchievementStats` and `ClientDashboardContent` components without checking if achievements exist.

**Note on file paths**: The SPEC.md mentions "page.tsx in the root of the (app) folder", but the actual file is located at `apps/web/app/(app)/dashboard/page.tsx`. This plan uses the correct path throughout.

We need to query the database to count achievements for the current user. The database layer provides `getAchievementStats()` from `@bragdoc/database`, which returns statistics including `totalAchievements`. This function is already being used in the `AchievementStats` component at `/Users/ed/Code/brag-ai/apps/web/components/achievement-stats.tsx`.

### Tasks

- [x] **1.1** Read the current dashboard page at `apps/web/app/(app)/dashboard/page.tsx` to understand its structure
- [x] **1.2** Import the necessary functions from `@bragdoc/database`:
  ```typescript
  import { getAchievementStats } from '@bragdoc/database';
  ```
- [x] **1.3** Import the auth function to get the current user:
  ```typescript
  import { auth } from 'app/(auth)/auth';
  ```
- [x] **1.4** Modify the page component to be async and fetch achievement stats:
  ```typescript
  export default async function Page() {
    const session = await auth();

    if (!session?.user?.id) {
      // DO NOT use redirect() in Server Components - it breaks the build
      // Instead, return a fallback UI element
      return <div className="p-4">Please log in to view your dashboard.</div>;
    }

    const achievementStats = await getAchievementStats({ userId: session.user.id });
    const hasNoAchievements = achievementStats.totalAchievements === 0;

    // Conditional rendering will be added in Phase 3
  }
  ```

  **IMPORTANT**: Do not import or use `redirect()` from `next/navigation` in Server Components. This causes build errors in our Cloudflare Workers deployment. Instead, return a simple fallback UI element. The middleware at `apps/web/middleware.ts` handles authentication redirects at the route level, so this fallback will rarely be shown to users.
- [x] **1.5** Pass the `hasNoAchievements` flag through to be used in the conditional rendering (implementation in Phase 3)

---

## Phase 2: Create Dashboard Zero State Component

This phase creates the zero state component with CLI instructions and an interactive button.

### Context

We'll create a new client component following the pattern used in `apps/web/components/standups/standup-zero-state.tsx`. The component will:
- Use a centered layout with `max-w-2xl` width constraint
- Display a welcome message and CLI setup instructions
- Include a button that refreshes the page to check for achievements
- Show feedback if still no achievements after clicking

The component will be a client component because it needs interactivity (button click, state for feedback message). We'll use the `useRouter` hook from Next.js for refreshing.

### Reusable Components

From the existing UI library at `apps/web/components/ui/`:
- `Button` - for the action button
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - for the container
- Tailwind CSS utilities for styling

### Tasks

- [x] **2.1** Create a new file at `apps/web/components/dashboard/dashboard-zero-state.tsx`
- [x] **2.2** Add the `'use client';` directive at the top of the file
- [x] **2.3** Import required dependencies:
  ```typescript
  'use client';

  import { useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { Button } from '@/components/ui/button';
  import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
  ```

  **Import path note**: Use `@/components/...` imports to match the dashboard page pattern. The existing `standup-zero-state.tsx` uses `components/...` without the `@/` alias, but we're following the dashboard page's convention for consistency within the dashboard feature.
- [x] **2.4** Create the `DashboardZeroState` component with the following structure:
  ```typescript
  export function DashboardZeroState() {
    const [isChecking, setIsChecking] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const router = useRouter();

    const handleCheckForAchievements = async () => {
      setIsChecking(true);
      setShowFeedback(false);

      // Refresh the page to re-fetch data from the server
      router.refresh();

      // Show feedback after a brief delay if still on zero state
      // Note: If achievements were added, the component will unmount during
      // the refresh, so this timeout won't fire. The timeout only completes
      // if we're still in the zero state (no achievements found).
      setTimeout(() => {
        setShowFeedback(true);
        setIsChecking(false);
      }, 1000);
    };

    return (
      // Component JSX
    );
  }
  ```

  **How router.refresh() works**: When called, `router.refresh()` triggers Next.js to re-fetch data from Server Components without performing a full page reload. This causes the dashboard page to re-run `getAchievementStats()` on the server. If achievements now exist, the page will re-render with `hasNoAchievements = false`, replacing the `DashboardZeroState` component with the normal dashboard content. If no achievements exist, the component remains mounted and the setTimeout callback executes to show feedback.

  **Component lifecycle**: The setTimeout is safe because if the component unmounts (due to achievements being found), the timer is automatically cleaned up by React. The state updates in the timeout callback will be ignored if the component is no longer mounted.
- [x] **2.5** Implement the centered container layout:
  ```typescript
  <div className="flex flex-1 flex-col items-center justify-center p-8">
    <div className="max-w-2xl w-full space-y-6">
      {/* Content here */}
    </div>
  </div>
  ```
- [x] **2.6** Add the welcome message heading:
  ```typescript
  <div className="text-center space-y-2">
    <h1 className="text-3xl font-bold">Welcome to BragDoc!</h1>
    <p className="text-lg text-muted-foreground">
      Let's get started by extracting achievements from your Git repositories
    </p>
  </div>
  ```
- [x] **2.7** Add the CLI setup instructions card:
  ```typescript
  <Card>
    <CardHeader>
      <CardTitle>Getting Started</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold mb-1">1. Install the CLI</h3>
          <code className="block bg-muted px-3 py-2 rounded-md text-sm">
            npm install -g @bragdoc/cli
          </code>
        </div>
        <div>
          <h3 className="font-semibold mb-1">2. Login</h3>
          <code className="block bg-muted px-3 py-2 rounded-md text-sm">
            bragdoc login
          </code>
        </div>
        <div>
          <h3 className="font-semibold mb-1">3. Initialize a repository</h3>
          <code className="block bg-muted px-3 py-2 rounded-md text-sm">
            bragdoc init
          </code>
          <p className="text-sm text-muted-foreground mt-1">
            Run this command inside your Git repository
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">4. Extract achievements</h3>
          <code className="block bg-muted px-3 py-2 rounded-md text-sm">
            bragdoc extract
          </code>
        </div>
      </div>
    </CardContent>
  </Card>
  ```
- [x] **2.8** Add the action button below the instructions card:
  ```typescript
  <div className="flex flex-col items-center gap-2">
    <Button
      size="lg"
      onClick={handleCheckForAchievements}
      disabled={isChecking}
    >
      {isChecking ? 'Checking...' : "I've run the CLI - Check for achievements"}
    </Button>

    {showFeedback && (
      <p className="text-sm text-muted-foreground text-center">
        No achievements yet. Did you run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">bragdoc extract</code>?
      </p>
    )}
  </div>
  ```
- [x] **2.9** Verify the component follows TypeScript strict mode (no `any` types, proper type annotations)
- [x] **2.10** Export the component using named export (not default export)
- [x] **2.11** Verify CLI command accuracy:
  - Open `packages/cli/README.md` and confirm the install command is correct
  - Verify `bragdoc login`, `bragdoc init`, and `bragdoc extract` commands match the CLI documentation
  - Ensure the command examples in the zero state component match the actual CLI implementation
  - If any commands are incorrect, update them in the component before proceeding

---

## Phase 3: Integrate Zero State into Dashboard

This phase integrates the zero state component into the dashboard page with conditional rendering.

### Context

The dashboard page at `apps/web/app/(app)/dashboard/page.tsx` currently renders:
1. `AppPage` wrapper
2. `SidebarInset`
3. `SiteHeader`
4. `AchievementStats` (Server Component that fetches stats)
5. `ClientDashboardContent` (Client Component with charts and activity)

We need to conditionally render either the zero state OR the normal dashboard content based on whether achievements exist. The `AchievementStats` component should still show even with zero achievements, but `ClientDashboardContent` should be replaced with `DashboardZeroState`.

### Tasks

- [x] **3.1** Import the new `DashboardZeroState` component in `apps/web/app/(app)/dashboard/page.tsx`:
  ```typescript
  import { DashboardZeroState } from '@/components/dashboard/dashboard-zero-state';
  ```
- [x] **3.2** Update the page component to conditionally render based on achievement count:

  **Note**: The code below shows the complete final implementation of the page component. You already added the auth check and stats fetching in Phase 1.4. This task adds the conditional rendering logic (the `hasNoAchievements ? ... : ...` ternary) to show either the zero state or normal dashboard content.

  ```typescript
  export default async function Page() {
    const session = await auth();

    if (!session?.user?.id) {
      // DO NOT use redirect() - return fallback UI instead
      return <div className="p-4">Please log in to view your dashboard.</div>;
    }

    const achievementStats = await getAchievementStats({ userId: session.user.id });
    const hasNoAchievements = achievementStats.totalAchievements === 0;

    return (
      <AppPage>
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <AchievementStats />
                {hasNoAchievements ? (
                  <DashboardZeroState />
                ) : (
                  <ClientDashboardContent />
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </AppPage>
    );
  }
  ```

  **CRITICAL**: Do not import or use `redirect()` from `next/navigation`. This breaks the Cloudflare Workers build. The fallback UI is sufficient since middleware handles authentication.
- [x] **3.3** Verify that the layout maintains proper spacing and alignment
- [x] **3.4** Test the conditional logic by temporarily changing the condition to always show zero state
- [x] **3.5** Verify that clicking the button triggers `router.refresh()` and the page re-renders

### Alternative Approach (if needed)

If the zero state needs to replace the entire content including `AchievementStats`, update the conditional to wrap both components:

```typescript
{hasNoAchievements ? (
  <DashboardZeroState />
) : (
  <>
    <AchievementStats />
    <ClientDashboardContent />
  </>
)}
```

However, the spec suggests keeping stats visible, so the first approach is preferred.

---

## Phase 4: Testing

This phase ensures the implementation works correctly across different scenarios.

### Manual Testing Tasks

- [ ] **4.1** Test with a new user account that has zero achievements:
  - Create a new test user account
  - Navigate to dashboard
  - Verify zero state is displayed
  - Verify stats show 0 for all metrics (the `AchievementStats` component should still render and display zeros)
  - Click "Check for achievements" button
  - Verify feedback message appears after ~1 second

  **Note**: The `AchievementStats` component will display alongside the zero state, showing 0 values for all metrics. This is intentional and provides consistency in the dashboard layout.
- [ ] **4.2** Test with a user who has achievements:
  - Use an existing account with achievements
  - Navigate to dashboard
  - Verify normal dashboard content is displayed (stats, charts, activity)
  - Verify zero state is NOT displayed
- [ ] **4.3** Test the transition from zero to populated:
  - Start with zero achievements
  - Use CLI to extract achievements (or create manually via API)
  - Click "Check for achievements" button
  - Verify dashboard transitions to normal view
- [ ] **4.4** Test responsive layout:
  - View zero state on mobile (narrow viewport)
  - View zero state on tablet
  - View zero state on desktop
  - Verify centered layout and max-width constraints work correctly
- [ ] **4.5** Test button interactions:
  - Click button multiple times rapidly
  - Verify loading state shows correctly
  - Verify feedback message appears/disappears appropriately
- [ ] **4.6** Test edge cases:
  - User with 1 achievement (should show normal dashboard)
  - User with archived achievements but 0 active (verify behavior based on `getAchievementStats` implementation)
  - Unauthenticated user (should see fallback UI with login message)

  **Note on archived achievements**: Check the implementation of `getAchievementStats()` in `packages/database/src/queries.ts` to confirm whether it filters out archived achievements. If it does, a user with only archived achievements will see the zero state. If it counts all achievements regardless of archived status, the normal dashboard will display. The spec doesn't specify this behavior, so follow whatever the existing query does.
- [ ] **4.7** Verify accessibility:
  - Check keyboard navigation works
  - Verify button has proper aria-labels if needed
  - Test with screen reader (if available)
- [x] **4.7.5** Create a `TEST_PLAN.md` file in `tasks/dashboard-zero-state/` documenting UI test scenarios for Playwright integration. Include test cases for:
  - Zero state displays when user has no achievements
  - Button click triggers refresh and shows loading state
  - Feedback message appears when still no achievements after refresh
  - Dashboard transitions to normal view when achievements are added
  - Responsive layout on mobile, tablet, and desktop viewports
  - Keyboard navigation and accessibility
- [x] **4.8** Run the add-to-test-plan SlashCommand to integrate UI tests:
  ```bash
  /add-to-test-plan tasks/dashboard-zero-state/TEST_PLAN.md
  ```

### Integration Testing Considerations

The zero state integrates with:
- Next.js App Router and Server Components
- Authentication system (NextAuth)
- Database queries (`getAchievementStats`)
- Existing dashboard components (`AchievementStats`, `ClientDashboardContent`)

All of these integration points should be tested as part of the manual testing above.

---

## Phase 5: Documentation Updates

This phase updates all relevant documentation to reflect the new zero state feature.

### Technical Documentation Updates

- [x] **5.1** Update `.claude/docs/tech/frontend-patterns.md`:
  - Add a section on "Zero State Patterns"
  - Document the pattern of conditionally rendering zero states based on data availability
  - Include the `DashboardZeroState` as an example
  - Add guidance on when to use zero states vs. empty states vs. loading states
  - **CRITICAL**: Document the prohibition against using `redirect()` in Server Components for Cloudflare Workers compatibility
  - Add guidance on using fallback UI instead of redirect() for authentication checks

### Feature Documentation Updates

- [x] **5.2** Check if `docs/FEATURES.md` exists and review its contents
- [x] **5.3** If `docs/FEATURES.md` exists, add a new section for the dashboard zero state:
  - Describe the feature
  - Explain when it's shown
  - Document the CLI commands referenced
  - Include screenshots (if applicable)
- [x] **5.4** If a UI documentation file for the dashboard exists in `docs/`, update it to mention the zero state

### README Updates

- [x] **5.5** Review `README.md` in the root directory
- [x] **5.6** If the README mentions the dashboard or new user onboarding, update it to reference the zero state feature
- [x] **5.7** Review `packages/cli/README.md`
- [x] **5.8** Verify that CLI command examples in the README match those shown in the zero state component

### CLAUDE.md Updates

- [x] **5.9** Review `CLAUDE.md` to check if the "Component Patterns" section needs updates
- [x] **5.10** Add an entry about zero state patterns if not already covered:
  - Location of zero state components
  - Pattern for conditional rendering based on data availability
  - Example: `DashboardZeroState` component
- [x] **5.11** If CLAUDE.md has a section on dashboard or onboarding, update it to mention the zero state
- [x] **5.12** Review and update `tasks/dashboard-zero-state/COMMIT_MESSAGE.md`:
  - Ensure the commit message accurately reflects the final implementation
  - Note any deviations from the original plan
  - Verify the message follows conventional commit format
  - Include any important implementation details or decisions made during development

---

## Instructions for Implementation

### General Guidelines

1. **Update this plan as you go**: Each time you complete a task, mark it as done by changing `- [ ]` to `- [x]` in the checkbox
2. **Follow the phases in order**: Complete all tasks in Phase 1 before moving to Phase 2, etc.
3. **Test incrementally**: Don't wait until Phase 4 to test - verify each component works as you build it
4. **Use existing patterns**: Reference similar components like `standup-zero-state.tsx` for guidance
5. **Maintain type safety**: Use TypeScript strict mode, avoid `any` types

### BragDoc-Specific Conventions

- **Server Components by default**: Only use `'use client';` when needed (Phase 2 component needs it for interactivity)
- **Named exports**: Use `export function ComponentName()` not `export default`
- **Styling**: Use Tailwind CSS utilities and shadcn/ui components
- **Database queries**: Always scope by `userId` for security
- **File organization**: Keep related components in feature directories (e.g., `components/dashboard/`)
- **Import paths**: Use `@/` alias for absolute imports from `apps/web/`
- **No redirect() in Server Components**: Never use `redirect()` from `next/navigation` in Server Components - it breaks Cloudflare Workers builds. Use fallback UI instead.
- **Import path consistency**: Use either `@/components/...` or `components/...` consistently within a file. Prefer `@/components/...` for clarity.

### Key Files and Locations

- Dashboard page: `apps/web/app/(app)/dashboard/page.tsx`
- New zero state component: `apps/web/components/dashboard/dashboard-zero-state.tsx`
- Existing stats component: `apps/web/components/achievement-stats.tsx`
- Database queries: `packages/database/src/queries.ts`
- UI components: `apps/web/components/ui/`

### Development Workflow

1. Start the dev server if not already running: `pnpm dev`
2. Monitor logs at `apps/web/.next-dev.log` for errors
3. Check the browser at `http://localhost:3000/dashboard`
4. Use React DevTools to inspect component props and state
5. Test with different user accounts (create test accounts as needed)

### Database Query Details

The `getAchievementStats()` function from `@bragdoc/database` returns:

```typescript
interface AchievementStats {
  totalAchievements: number;
  totalImpactPoints: number;
  avgImpactPerAchievement: number;
  thisWeekImpact: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}
```

Use `achievementStats.totalAchievements === 0` to determine if zero state should show.

### Testing Approach

- Create a test user with no achievements for zero state testing
- Use an existing user with achievements for normal dashboard testing
- Test the CLI flow end-to-end to verify the complete user journey
- Verify the `router.refresh()` call properly triggers server component re-rendering

### Common Issues and Solutions

**Issue**: Zero state doesn't disappear after adding achievements
- **Solution**: Ensure `router.refresh()` is being called correctly in the button handler
- **Solution**: Verify the database query in the page component is not cached incorrectly
- **Solution**: Check that `getAchievementStats()` is returning the correct count

**Issue**: Button loading state doesn't show
- **Solution**: Check that `isChecking` state is being set correctly before and after refresh
- **Solution**: Verify the setTimeout delay is appropriate (1000ms by default)

**Issue**: Layout looks broken on mobile
- **Solution**: Verify responsive classes are applied (flex-col, responsive padding)
- **Solution**: Test with actual mobile viewport, not just resized browser

**Issue**: TypeScript errors about missing types
- **Solution**: Import types from `@bragdoc/database` if needed
- **Solution**: Define local interfaces for component props

**Issue**: Build fails with "Dynamic server usage" error related to redirect()
- **Solution**: This is the critical issue this plan addresses. Do NOT use `redirect()` from `next/navigation` in Server Components. Return a fallback UI element instead.
- **Root cause**: Cloudflare Workers deployment doesn't support `redirect()` in Server Components during the build process.

### Commit Strategy

- Commit after each phase is complete
- Write descriptive commit messages referencing this plan
- Do NOT commit until all tests pass in Phase 4
- Final commit message should be based on `COMMIT_MESSAGE.md`

---

## Success Criteria

The implementation is complete when:

- [ ] Zero state is displayed when user has no achievements
- [ ] Layout is centered with max-w-2xl constraint
- [ ] CLI instructions are accurate and match the CLI README
- [ ] Button successfully triggers page refresh via `router.refresh()`
- [ ] Feedback message appears when still no achievements
- [ ] Normal dashboard is displayed once achievements exist
- [ ] Design is consistent with existing BragDoc UI (shadcn/ui, Tailwind)
- [ ] Component follows React Server Components patterns (server by default, client only when needed)
- [ ] All manual tests in Phase 4 pass
- [ ] All documentation is updated
- [ ] Code follows BragDoc conventions (named exports, TypeScript strict mode, etc.)
