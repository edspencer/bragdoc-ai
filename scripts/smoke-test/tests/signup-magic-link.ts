/**
 * Magic Link Signup Test
 *
 * Verifies new user registration via magic link works in production.
 * This test creates a session that subsequent tests depend on.
 */
import type { Page } from 'playwright';
import type { TestResult, TestContext } from '../types.js';
import { waitForToken } from '../helpers/get-magic-link.js';

export async function testSignupMagicLink(
  page: Page,
  context: TestContext,
): Promise<TestResult> {
  const testName = 'Magic Link Signup';
  const startTime = Date.now();

  try {
    // 1. Navigate to register page with demo=true
    await page.goto(`${context.appUrl}/register?demo=true`);

    // 2. Wait for magic link form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // 3. Fill email in magic link form
    await page.fill('input[type="email"]', context.testEmail);

    // 4. Check ToS checkbox if present (for new signups)
    const tosCheckbox = page.locator('input[type="checkbox"]').first();
    if (await tosCheckbox.isVisible()) {
      await tosCheckbox.check();
    }

    // 5. Submit the form - find the submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // 6. Wait for form submission to complete
    // The page should show a success message or update
    await page.waitForTimeout(2000);

    // 7. Query database for verification token
    const token = await waitForToken(context.testEmail, 10000);

    // 8. Construct and navigate to magic link URL
    // Include callbackURL to ensure redirect to dashboard after verification
    const callbackURL = encodeURIComponent('/dashboard');
    const magicLinkUrl = `${context.appUrl}/api/auth/magic-link/verify?token=${token}&callbackURL=${callbackURL}`;
    await page.goto(magicLinkUrl);

    // 9. Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // 10. Verify we're on the dashboard
    const url = page.url();
    if (!url.includes('/dashboard')) {
      throw new Error(`Expected redirect to dashboard, got: ${url}`);
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
