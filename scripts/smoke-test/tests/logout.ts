/**
 * Logout Test
 *
 * Verifies logout functionality works correctly.
 * This is the final test - clears the session.
 */
import type { Page } from 'playwright';
import type { TestResult, TestContext } from '../types.js';

export async function testLogout(
  page: Page,
  context: TestContext,
): Promise<TestResult> {
  const testName = 'Logout';
  const startTime = Date.now();

  try {
    // 1. Navigate to dashboard first (ensure we're in app)
    await page.goto(`${context.appUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    // 2. Find user menu / profile dropdown in sidebar
    // The NavUser component uses a SidebarMenuButton with the user's name
    // Look for the button with the vertical dots icon (IconDotsVertical) or the user name area
    const userMenuTrigger = page
      .locator('button:has-text("Demo User"), button:has-text("User")')
      .first();
    await userMenuTrigger.waitFor({ timeout: 10000 });
    await userMenuTrigger.click();

    // 3. Wait for dropdown menu to appear
    const dropdownMenu = page.locator(
      '[role="menu"], [data-radix-menu-content]',
    );
    await dropdownMenu.waitFor({ timeout: 5000 });

    // 4. Click "Log out" option (the nav-user.tsx uses "Log out" with space)
    const logoutButton = page.locator('[role="menuitem"]:has-text("Log out")');
    await logoutButton.click();

    // 5. Wait for redirect to login page
    // After clicking logout, the signOut function redirects to '/' which then redirects to /login
    await page.waitForURL('**/login**', { timeout: 15000 });

    // 6. Verify we're on the login page
    const url = page.url();
    if (!url.includes('/login')) {
      throw new Error(
        `Expected redirect to login page after logout, got: ${url}`,
      );
    }

    // 7. Verify login form is visible (confirms we're logged out)
    // The login page shows "Welcome back" heading
    const loginHeading = page.locator('text=Welcome back');
    await loginHeading.waitFor({ timeout: 5000 });

    return {
      name: testName,
      passed: true,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const screenshot = await captureFailureScreenshot(page, testName, context);
    return {
      name: testName,
      passed: false,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      screenshot,
    };
  }
}

async function captureFailureScreenshot(
  page: Page,
  testName: string,
  context: TestContext,
): Promise<string> {
  const filename = `${testName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
  const path = `${context.screenshotDir}/${filename}`;
  await page.screenshot({ path, fullPage: true });
  return path;
}
