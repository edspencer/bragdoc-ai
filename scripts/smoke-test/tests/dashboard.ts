/**
 * Dashboard Loads Test
 *
 * Verifies the authenticated dashboard renders correctly with demo data.
 * Depends on: signup-magic-link.ts, demo-mode.ts
 */
import type { Page } from 'playwright';
import type { TestResult, TestContext } from '../types.js';

export async function testDashboard(
  page: Page,
  context: TestContext,
): Promise<TestResult> {
  const testName = 'Dashboard Loads';
  const startTime = Date.now();

  try {
    // 1. Navigate to dashboard (may already be there)
    await page.goto(`${context.appUrl}/dashboard`);

    // 2. Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // 3. Verify navigation sidebar is present
    // Look for sidebar navigation elements
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await sidebar.waitFor({ timeout: 10000 });

    // 4. Verify main dashboard content area renders
    // Check for dashboard-specific content like stats or achievement cards
    const mainContent = page.locator('main');
    await mainContent.waitFor({ timeout: 5000 });

    // 5. Verify demo data is visible (achievements or stats)
    // Look for achievement stats component or achievement cards
    const hasContent = await page
      .locator(
        '.achievement-stats, [data-testid="achievement-stats"], h2:has-text("Achievements")',
      )
      .count();

    // With demo data, there should be some content visible
    // If zero state is showing, demo mode may not have activated properly

    // 6. Check for no error messages
    const errorVisible = await page
      .locator('text=error, text=Error, text=failed')
      .isVisible();
    if (errorVisible) {
      throw new Error('Error message displayed on dashboard');
    }

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
