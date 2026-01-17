/**
 * Create Achievement Test
 *
 * Verifies users can create achievements in demo mode.
 * Depends on: authenticated session with demo mode active
 */
import type { Page } from 'playwright';
import type { TestResult, TestContext } from '../types.js';

export async function testCreateAchievement(
  page: Page,
  context: TestContext,
): Promise<TestResult> {
  const testName = 'Create Achievement';
  const startTime = Date.now();
  const achievementTitle = `Smoke Test Achievement - ${Date.now()}`;

  try {
    // 1. Navigate to achievements page
    await page.goto(`${context.appUrl}/achievements`);
    await page.waitForLoadState('networkidle');

    // 2. Find and click "Add Achievement" button
    // The header has a HeaderAddButton component
    const addButton = page
      .locator(
        'button:has-text("Add"), [aria-label*="add"], [data-testid="add-achievement"]',
      )
      .first();
    await addButton.click();

    // 3. Wait for dialog/form to appear
    const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]');
    await dialog.waitFor({ timeout: 5000 });

    // 4. Fill in achievement form
    // The QuickAddAchievementDialog uses a textarea for the title/description
    const titleInput = dialog.locator('textarea').first();
    await titleInput.fill(achievementTitle);

    // 5. Submit the form
    const submitButton = dialog
      .locator(
        'button[type="submit"], button:has-text("Add"), button:has-text("Save")',
      )
      .first();
    await submitButton.click();

    // 6. Wait for dialog to close
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });

    // 7. Verify achievement appears (or no error shown)
    await page.waitForTimeout(1000); // Brief wait for list update

    // Check for success - either the achievement is in the list or toast showed
    const errorToast = page.locator('text=error, text=failed').first();
    const hasError = await errorToast.isVisible().catch(() => false);

    if (hasError) {
      throw new Error('Error displayed after creating achievement');
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
