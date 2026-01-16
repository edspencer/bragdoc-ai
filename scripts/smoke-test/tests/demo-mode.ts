/**
 * Demo Mode Activation Test
 *
 * Verifies demo mode activates correctly after signup with demo intent.
 * Depends on: signup-magic-link.ts (authenticated session with demo intent)
 */
import type { Page } from 'playwright';
import type { TestResult, TestContext } from '../types.js';

export async function testDemoMode(
  page: Page,
  context: TestContext,
): Promise<TestResult> {
  const testName = 'Demo Mode Activation';
  const startTime = Date.now();

  try {
    // 1. After signup, the DemoIntentHandler fires and calls window.location.reload()
    // This can cause timing issues. To handle this robustly:
    // - Wait a moment for the reload to start
    // - Then explicitly navigate to dashboard
    // - Wait for the page to fully load
    await page.waitForTimeout(2000);

    // Navigate fresh to dashboard to ensure we get the latest state
    await page.goto(`${context.appUrl}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to fully load by waiting for sidebar
    await page.locator('[data-sidebar="sidebar"]').waitFor({ timeout: 15000 });

    // 2. Check for demo mode banner
    // The PerUserDemoBanner component shows "You're viewing demo data"
    const demoBanner = page.locator('text=viewing demo data');

    // Wait for demo mode to activate
    await demoBanner.waitFor({ timeout: 15000 });

    // 3. Verify the banner is visible
    const isVisible = await demoBanner.isVisible();
    if (!isVisible) {
      throw new Error('Demo mode banner not visible');
    }

    // 4. Verify "Exit Demo Mode" button exists
    const exitButton = page.locator('button:has-text("Exit Demo Mode")');
    const exitVisible = await exitButton.isVisible();
    if (!exitVisible) {
      throw new Error('Exit Demo Mode button not found');
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
