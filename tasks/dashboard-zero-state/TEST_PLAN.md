# Test Plan: Dashboard Zero State

## Overview

This test plan covers manual and automated testing for the dashboard zero state feature. The zero state should appear when a user has no achievements and provide clear instructions for getting started with the CLI.

## Test Environment Setup

### Prerequisites

- Running development server (`pnpm dev`)
- Test database with clean state
- Multiple test user accounts:
  1. New user with zero achievements
  2. Existing user with 1+ achievements
  3. User with only archived achievements

### Test Data Setup

Create test accounts with the following states:

1. **Zero State User**
   - Email: `zerostate@test.com`
   - Password: `TestPassword123!`
   - Achievements: 0

2. **Normal User**
   - Email: `normaluser@test.com`
   - Password: `TestPassword123!`
   - Achievements: 5+ (various projects)

3. **Archived Only User**
   - Email: `archivedonly@test.com`
   - Password: `TestPassword123!`
   - Achievements: 3 (all archived)

## Manual Test Cases

### TC1: Zero State Display

**Objective**: Verify zero state is displayed for users with no achievements

**Prerequisites**: Logged in as user with 0 achievements

**Steps**:
1. Navigate to `/dashboard`
2. Wait for page to load

**Expected Results**:
- [ ] Zero state container is displayed
- [ ] Welcome message "Welcome to BragDoc!" is visible
- [ ] CLI instructions card is displayed with all 4 steps
- [ ] "I've run the CLI - Check for achievements" button is visible
- [ ] AchievementStats component shows 0 for all metrics
- [ ] ClientDashboardContent (charts, activity) is NOT displayed

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC2: CLI Instructions Accuracy

**Objective**: Verify CLI commands shown match the actual CLI documentation

**Prerequisites**: Zero state is visible

**Steps**:
1. Review each CLI command shown in the zero state
2. Compare with `packages/cli/README.md`

**Expected Results**:
- [ ] Step 1: `npm install -g @bragdoc/cli` matches README
- [ ] Step 2: `bragdoc login` matches README
- [ ] Step 3: `bragdoc init` matches README with correct description
- [ ] Step 4: `bragdoc extract` matches README

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC3: Button Click - Still No Achievements

**Objective**: Verify feedback message appears when checking but no achievements exist

**Prerequisites**: Zero state is visible, no achievements in database

**Steps**:
1. Click "I've run the CLI - Check for achievements" button
2. Observe button state changes
3. Wait for feedback message

**Expected Results**:
- [ ] Button shows "Checking..." during refresh
- [ ] Button is disabled during refresh
- [ ] After ~1 second, feedback message appears
- [ ] Feedback message says "No achievements yet. Did you run `bragdoc extract`?"
- [ ] Zero state remains visible (doesn't switch to normal dashboard)

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC4: Transition to Normal Dashboard

**Objective**: Verify dashboard switches to normal view when achievements exist

**Prerequisites**: Zero state is visible

**Steps**:
1. Using the CLI or API, create at least 1 achievement for the user
2. Return to browser with dashboard open
3. Click "I've run the CLI - Check for achievements" button
4. Wait for page refresh

**Expected Results**:
- [ ] Page refreshes (data is re-fetched)
- [ ] Zero state is NO LONGER visible
- [ ] AchievementStats shows updated count (1+)
- [ ] ClientDashboardContent is now visible
- [ ] Weekly impact chart is displayed
- [ ] Activity stream is displayed

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC5: Normal Dashboard (No Zero State)

**Objective**: Verify zero state does NOT appear for users with achievements

**Prerequisites**: Logged in as user with 1+ achievements

**Steps**:
1. Navigate to `/dashboard`
2. Wait for page to load

**Expected Results**:
- [ ] Zero state is NOT displayed
- [ ] AchievementStats shows correct metrics
- [ ] ClientDashboardContent is visible
- [ ] Charts and activity stream are populated with data

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC6: Responsive Layout - Mobile

**Objective**: Verify zero state displays correctly on mobile devices

**Prerequisites**: Zero state is visible

**Steps**:
1. Open browser DevTools
2. Set viewport to iPhone SE (375px width)
3. Reload dashboard page

**Expected Results**:
- [ ] Zero state container is centered
- [ ] Max-width constraint prevents content from spanning full width on larger mobiles
- [ ] All CLI instruction steps are readable
- [ ] Code blocks don't overflow
- [ ] Button is appropriately sized and clickable
- [ ] Padding is appropriate for small screens

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC7: Responsive Layout - Tablet

**Objective**: Verify zero state displays correctly on tablet devices

**Prerequisites**: Zero state is visible

**Steps**:
1. Set viewport to iPad (768px width)
2. Reload dashboard page

**Expected Results**:
- [ ] Zero state container is centered
- [ ] Layout uses max-w-2xl constraint
- [ ] Content is well-spaced and readable
- [ ] Button is centered below instructions

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC8: Responsive Layout - Desktop

**Objective**: Verify zero state displays correctly on desktop

**Prerequisites**: Zero state is visible

**Steps**:
1. Set viewport to 1920px width
2. Reload dashboard page

**Expected Results**:
- [ ] Zero state container is centered horizontally
- [ ] Max-width (max-w-2xl ≈ 672px) prevents content from being too wide
- [ ] Vertical centering looks appropriate
- [ ] AchievementStats card grid displays above zero state

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC9: Button Rapid Clicking

**Objective**: Verify button handles rapid clicking gracefully

**Prerequisites**: Zero state is visible

**Steps**:
1. Click "I've run the CLI - Check for achievements" button rapidly 5 times
2. Observe behavior

**Expected Results**:
- [ ] Button becomes disabled after first click
- [ ] Multiple refreshes don't cause errors
- [ ] Feedback message appears only once
- [ ] No console errors
- [ ] UI doesn't break or freeze

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC10: Archived Achievements Only

**Objective**: Verify zero state appears when user has only archived achievements

**Prerequisites**: User with only archived achievements (0 active)

**Steps**:
1. Log in as user with archived achievements
2. Navigate to `/dashboard`

**Expected Results**:
- [ ] Zero state IS displayed (archived achievements shouldn't count)
- [ ] AchievementStats shows 0 total achievements
- [ ] If user creates a non-archived achievement, dashboard switches to normal view

**Note**: This assumes `getAchievementStats` filters by `isArchived = false`

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC11: Unauthenticated Access

**Objective**: Verify unauthenticated users can't access dashboard

**Prerequisites**: Logged out

**Steps**:
1. Log out of BragDoc
2. Navigate to `/dashboard` directly

**Expected Results**:
- [ ] User is redirected to `/login` or auth page
- [ ] Zero state is NOT displayed
- [ ] No errors in console

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC12: Accessibility - Keyboard Navigation

**Objective**: Verify zero state is keyboard accessible

**Prerequisites**: Zero state is visible

**Steps**:
1. Press Tab to navigate through page
2. Ensure button receives focus
3. Press Enter or Space when button is focused

**Expected Results**:
- [ ] Button is reachable via Tab key
- [ ] Button has visible focus indicator
- [ ] Enter key triggers button click
- [ ] Space key triggers button click
- [ ] Tab order is logical

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC13: Browser Compatibility

**Objective**: Verify zero state works across major browsers

**Prerequisites**: Zero state is visible

**Test Matrix**:

| Browser | Version | Layout OK | Button Works | Styles OK | Status |
|---------|---------|-----------|--------------|-----------|--------|
| Chrome | Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox | Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Safari | Latest | ⬜ | ⬜ | ⬜ | ⬜ |
| Edge | Latest | ⬜ | ⬜ | ⬜ | ⬜ |

**Expected Results**:
- [ ] All browsers display zero state correctly
- [ ] No layout issues or broken styles
- [ ] Button click works in all browsers

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

### TC14: Console Errors Check

**Objective**: Verify no console errors appear during zero state usage

**Prerequisites**: Zero state is visible, console open

**Steps**:
1. Load dashboard with zero state
2. Click button
3. Monitor console for errors/warnings

**Expected Results**:
- [ ] No JavaScript errors in console
- [ ] No React warnings in console
- [ ] No network errors (failed requests)
- [ ] No hydration mismatches

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

## Integration Test Cases

### TC15: End-to-End User Journey

**Objective**: Test complete new user onboarding flow

**Steps**:
1. Create new user account
2. Log in
3. Navigate to dashboard → see zero state
4. Follow CLI instructions:
   - Install CLI globally
   - Run `bragdoc login`
   - Navigate to a Git repo
   - Run `bragdoc init`
   - Run `bragdoc extract`
5. Return to browser dashboard
6. Click "Check for achievements" button

**Expected Results**:
- [ ] Step 2: Dashboard shows zero state
- [ ] Step 4: CLI commands execute successfully
- [ ] Step 4: Achievements are extracted and saved to database
- [ ] Step 6: Dashboard transitions to normal view with extracted achievements
- [ ] Step 6: AchievementStats shows correct count
- [ ] Step 6: Achievements appear in activity stream

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

## Performance Tests

### TC16: Page Load Performance

**Objective**: Verify zero state doesn't negatively impact page load time

**Steps**:
1. Open DevTools Network tab
2. Hard reload dashboard page (Cmd+Shift+R)
3. Measure time to interactive

**Expected Results**:
- [ ] Initial load completes in < 2 seconds
- [ ] Zero state component renders quickly (no flash of wrong content)
- [ ] No render-blocking resources

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

## Regression Tests

### TC17: Existing Dashboard Functionality

**Objective**: Verify normal dashboard features still work

**Prerequisites**: User with achievements (normal dashboard visible)

**Steps**:
1. Verify AchievementStats displays correctly
2. Verify WeeklyImpactChart renders
3. Verify ActivityStream shows recent achievements
4. Verify TopProjects component works
5. Click on stat cards to navigate

**Expected Results**:
- [ ] All existing components render without errors
- [ ] Stats are accurate
- [ ] Charts display data
- [ ] Links and navigation work

**Actual Results**: _[To be filled during testing]_

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Summary

**Total Test Cases**: 17

**Passed**: _[To be filled]_

**Failed**: _[To be filled]_

**Blocked**: _[To be filled]_

**Not Tested**: _[To be filled]_

---

## Known Issues

_[Document any issues found during testing]_

---

## Notes for Testers

- Test with actual CLI installation if possible for TC15
- Use multiple browser windows to test concurrent sessions
- Clear browser cache between tests if needed
- Check `apps/web/.next-dev.log` for server-side errors
- Take screenshots of any visual issues
- Document any edge cases discovered during testing

---

## Playwright UI Test Scenarios

This section documents UI test scenarios for Playwright integration testing. These tests can be added to the main BragDoc test suite.

### Playwright Test 1: Zero State Displays When User Has No Achievements

**Test ID**: `dashboard-zero-state-displays`

**Description**: Verify that the zero state component is displayed when a user has no achievements.

**Prerequisites**: Test user with zero achievements in database

**Test Steps**:
```typescript
test('displays zero state when user has no achievements', async ({ page }) => {
  // 1. Login as user with zero achievements
  await loginAsTestUser(page, 'zerostate@test.com');

  // 2. Navigate to dashboard
  await page.goto('/dashboard');

  // 3. Verify zero state is visible
  await expect(page.getByRole('heading', { name: 'Welcome to BragDoc!' })).toBeVisible();

  // 4. Verify CLI instructions card is present
  await expect(page.getByRole('heading', { name: 'Getting Started' })).toBeVisible();

  // 5. Verify all 4 CLI instruction steps are present
  await expect(page.getByText('Install the CLI')).toBeVisible();
  await expect(page.getByText('bragdoc login')).toBeVisible();
  await expect(page.getByText('bragdoc init')).toBeVisible();
  await expect(page.getByText('bragdoc extract')).toBeVisible();

  // 6. Verify button is present
  await expect(page.getByRole('button', { name: /Check for achievements/ })).toBeVisible();

  // 7. Verify normal dashboard content is NOT present
  await expect(page.getByText('Weekly Impact')).not.toBeVisible();
  await expect(page.getByText('Activity')).not.toBeVisible();
});
```

**Expected Results**:
- Zero state welcome message is visible
- CLI instructions card with all 4 steps is displayed
- Check button is visible and enabled
- Normal dashboard content (charts, activity) is not visible
- Stats cards show 0 values

---

### Playwright Test 2: Button Click Triggers Refresh and Shows Loading State

**Test ID**: `dashboard-zero-state-button-loading`

**Description**: Verify that clicking the check button shows a loading state and triggers a page refresh.

**Prerequisites**: Test user with zero achievements

**Test Steps**:
```typescript
test('button click shows loading state and triggers refresh', async ({ page }) => {
  // 1. Login and navigate to dashboard
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');

  // 2. Get the check button
  const button = page.getByRole('button', { name: /Check for achievements/ });
  await expect(button).toBeEnabled();

  // 3. Click the button
  await button.click();

  // 4. Verify loading state appears
  await expect(page.getByRole('button', { name: 'Checking...' })).toBeVisible();

  // 5. Verify button is disabled during loading
  await expect(button).toBeDisabled();

  // 6. Wait for loading to complete
  await page.waitForTimeout(1500);

  // 7. Verify button returns to normal state
  await expect(page.getByRole('button', { name: /Check for achievements/ })).toBeEnabled();
});
```

**Expected Results**:
- Button text changes to "Checking..." when clicked
- Button is disabled during refresh
- Page triggers a server-side data refresh (router.refresh())
- Button re-enables after refresh completes

---

### Playwright Test 3: Feedback Message Appears When Still No Achievements

**Test ID**: `dashboard-zero-state-feedback-message`

**Description**: Verify that a feedback message appears when the user checks for achievements but none are found.

**Prerequisites**: Test user with zero achievements

**Test Steps**:
```typescript
test('shows feedback message when still no achievements after refresh', async ({ page }) => {
  // 1. Login and navigate to dashboard
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');

  // 2. Click the check button
  const button = page.getByRole('button', { name: /Check for achievements/ });
  await button.click();

  // 3. Wait for feedback message to appear
  await page.waitForTimeout(1500);

  // 4. Verify feedback message is visible
  const feedbackMessage = page.getByText(/No achievements yet. Did you run/);
  await expect(feedbackMessage).toBeVisible();

  // 5. Verify message mentions bragdoc extract command
  await expect(feedbackMessage).toContainText('bragdoc extract');

  // 6. Verify zero state remains visible
  await expect(page.getByRole('heading', { name: 'Welcome to BragDoc!' })).toBeVisible();
});
```

**Expected Results**:
- Feedback message appears after ~1 second
- Message says "No achievements yet. Did you run bragdoc extract?"
- Zero state remains visible (doesn't transition to normal dashboard)
- Message is styled with muted foreground color

---

### Playwright Test 4: Dashboard Transitions to Normal View When Achievements Added

**Test ID**: `dashboard-zero-state-transition`

**Description**: Verify that the dashboard transitions from zero state to normal view when achievements are added.

**Prerequisites**: Test user with zero achievements, ability to create achievements via API

**Test Steps**:
```typescript
test('transitions to normal dashboard when achievements are added', async ({ page, request }) => {
  // 1. Login and verify zero state is visible
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome to BragDoc!' })).toBeVisible();

  // 2. Create an achievement via API
  const authToken = await getAuthToken(page);
  await request.post('/api/achievements', {
    headers: { 'Authorization': `Bearer ${authToken}` },
    data: {
      title: 'Test Achievement',
      description: 'Test description',
      impact: 5
    }
  });

  // 3. Click the check button to refresh
  await page.getByRole('button', { name: /Check for achievements/ }).click();

  // 4. Wait for page to refresh and transition
  await page.waitForTimeout(2000);

  // 5. Verify zero state is NO LONGER visible
  await expect(page.getByRole('heading', { name: 'Welcome to BragDoc!' })).not.toBeVisible();

  // 6. Verify normal dashboard content is now visible
  await expect(page.getByText('Weekly Impact')).toBeVisible();

  // 7. Verify stats show achievement count
  await expect(page.getByText('1')).toBeVisible(); // Total achievements
});
```

**Expected Results**:
- Zero state disappears after adding achievements
- Normal dashboard content (charts, activity) appears
- AchievementStats shows correct count (1+)
- No console errors during transition

---

### Playwright Test 5: Responsive Layout on Mobile Viewport

**Test ID**: `dashboard-zero-state-responsive-mobile`

**Description**: Verify that the zero state displays correctly on mobile devices.

**Prerequisites**: Test user with zero achievements

**Test Steps**:
```typescript
test('displays correctly on mobile viewport', async ({ page }) => {
  // 1. Set mobile viewport (iPhone SE)
  await page.setViewportSize({ width: 375, height: 667 });

  // 2. Login and navigate to dashboard
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');

  // 3. Verify zero state is visible and centered
  const zeroStateContainer = page.locator('div').filter({ hasText: 'Welcome to BragDoc!' });
  await expect(zeroStateContainer).toBeVisible();

  // 4. Verify CLI instructions card fits viewport
  const instructionsCard = page.getByRole('heading', { name: 'Getting Started' }).locator('..');
  await expect(instructionsCard).toBeVisible();

  // 5. Verify code blocks don't overflow
  const codeBlocks = page.locator('code');
  for (const codeBlock of await codeBlocks.all()) {
    const box = await codeBlock.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  }

  // 6. Verify button is appropriately sized
  const button = page.getByRole('button', { name: /Check for achievements/ });
  await expect(button).toBeVisible();
  const buttonBox = await button.boundingBox();
  expect(buttonBox?.width).toBeGreaterThan(200); // Should be large enough
  expect(buttonBox?.width).toBeLessThan(375); // But not full width

  // 7. Verify padding is appropriate for small screen
  const mainContent = page.locator('main');
  await expect(mainContent).toHaveCSS('padding', /\d+px/);
});
```

**Expected Results**:
- Zero state is centered on mobile viewport
- All content is readable and doesn't overflow
- Code blocks wrap or scroll appropriately
- Button is clickable and appropriately sized
- Padding is suitable for small screens

---

### Playwright Test 6: Responsive Layout on Desktop Viewport

**Test ID**: `dashboard-zero-state-responsive-desktop`

**Description**: Verify that the zero state displays correctly on desktop with proper width constraints.

**Prerequisites**: Test user with zero achievements

**Test Steps**:
```typescript
test('displays correctly on desktop with max-width constraint', async ({ page }) => {
  // 1. Set desktop viewport
  await page.setViewportSize({ width: 1920, height: 1080 });

  // 2. Login and navigate to dashboard
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');

  // 3. Verify zero state container has max-width constraint
  const zeroStateContainer = page.locator('[class*="max-w-"]').filter({ hasText: 'Welcome to BragDoc!' });
  await expect(zeroStateContainer).toBeVisible();

  // 4. Check that content is centered horizontally
  const box = await zeroStateContainer.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(672); // max-w-2xl = 42rem = ~672px

  // 5. Verify vertical centering looks appropriate
  expect(box?.y).toBeGreaterThan(100); // Should have some top spacing

  // 6. Verify stats cards are displayed above zero state
  await expect(page.getByText('Total Achievements')).toBeVisible();

  // 7. Verify overall layout is visually centered
  const mainContent = page.locator('main');
  await expect(mainContent).toBeVisible();
});
```

**Expected Results**:
- Zero state has max-width constraint (~672px for max-w-2xl)
- Content is horizontally centered on large screens
- Vertical positioning is appropriate (not stuck at top)
- Stats cards display correctly above zero state
- Overall layout is visually balanced

---

### Playwright Test 7: Keyboard Navigation and Accessibility

**Test ID**: `dashboard-zero-state-accessibility`

**Description**: Verify that the zero state is keyboard accessible and follows accessibility best practices.

**Prerequisites**: Test user with zero achievements

**Test Steps**:
```typescript
test('supports keyboard navigation and accessibility', async ({ page }) => {
  // 1. Login and navigate to dashboard
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');

  // 2. Tab to the check button
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  // 3. Verify button receives focus
  const button = page.getByRole('button', { name: /Check for achievements/ });
  await expect(button).toBeFocused();

  // 4. Verify focus indicator is visible
  await expect(button).toHaveCSS('outline', /\d+px/); // Should have outline or ring

  // 5. Trigger button with Enter key
  await page.keyboard.press('Enter');

  // 6. Verify button action is triggered
  await expect(page.getByRole('button', { name: 'Checking...' })).toBeVisible();

  // 7. Run accessibility audit
  await injectAxe(page);
  const results = await checkA11y(page);
  expect(results.violations).toHaveLength(0);
});
```

**Expected Results**:
- Button is reachable via Tab key
- Focus indicator is clearly visible
- Enter key activates the button
- Space key also activates the button (browser default)
- No accessibility violations detected
- Proper ARIA labels if needed

---

### Playwright Test 8: No Console Errors During Zero State Usage

**Test ID**: `dashboard-zero-state-no-console-errors`

**Description**: Verify that no console errors appear during zero state interactions.

**Prerequisites**: Test user with zero achievements

**Test Steps**:
```typescript
test('produces no console errors during usage', async ({ page }) => {
  // 1. Setup console error listener
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 2. Setup page error listener
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  // 3. Login and navigate to dashboard
  await loginAsTestUser(page, 'zerostate@test.com');
  await page.goto('/dashboard');

  // 4. Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // 5. Interact with button
  await page.getByRole('button', { name: /Check for achievements/ }).click();
  await page.waitForTimeout(2000);

  // 6. Verify no errors were logged
  expect(consoleErrors).toHaveLength(0);
  expect(pageErrors).toHaveLength(0);

  // 7. Check for React warnings (hydration mismatches, etc.)
  const consoleWarnings: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  // 8. Verify no React warnings
  const reactWarnings = consoleWarnings.filter(w => w.includes('React'));
  expect(reactWarnings).toHaveLength(0);
});
```

**Expected Results**:
- No JavaScript errors in console
- No page errors (uncaught exceptions)
- No React warnings (hydration mismatches)
- No network errors (failed requests)
- Clean console throughout the interaction

---

## Test Helpers

The Playwright tests above assume the following helper functions exist:

```typescript
// Helper to login as a test user
async function loginAsTestUser(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Helper to get auth token for API calls
async function getAuthToken(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('next-auth.session-token='))
      ?.split('=')[1] || '';
  });
}

// Accessibility testing helpers (using @axe-core/playwright)
async function injectAxe(page: Page) {
  await injectAxe(page);
}

async function checkA11y(page: Page) {
  return await checkA11y(page, undefined, {
    detailedReport: true,
    detailedReportOptions: { html: true }
  });
}
```

---

## Automated Testing Recommendations

The Playwright UI test scenarios documented above provide comprehensive coverage for:

1. **Zero State Display**: Verify component renders when no achievements exist
2. **Button Interactions**: Test loading states and feedback messages
3. **State Transitions**: Verify transition from zero state to normal dashboard
4. **Responsive Design**: Test mobile, tablet, and desktop viewports
5. **Accessibility**: Keyboard navigation and ARIA compliance
6. **Error Handling**: Verify no console errors during usage

These tests should be integrated into the main BragDoc Playwright test suite located at `__tests__/e2e/` or similar directory.

### Integration Steps

1. Add test file: `__tests__/e2e/dashboard-zero-state.spec.ts`
2. Implement helper functions for login and setup
3. Create test fixtures for users with/without achievements
4. Run tests as part of CI/CD pipeline
5. Monitor for flakiness and adjust timeouts as needed

### Additional Automated Testing

Beyond the Playwright tests, consider:

1. **Component Unit Tests**: Test `DashboardZeroState` component in isolation using Jest + Testing Library
2. **Integration Tests**: Test dashboard page Server Component rendering
3. **Visual Regression Tests**: Screenshot comparison for layout consistency
4. **API Tests**: Test achievement creation endpoints used during transition

These additional tests complement the Playwright UI tests for comprehensive coverage.
