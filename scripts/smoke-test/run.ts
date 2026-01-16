#!/usr/bin/env tsx
/**
 * Production Smoke Test Runner
 *
 * Executes all smoke tests sequentially against the configured application URL.
 * Outputs a JSON report to stdout for parsing by the Claude Code skill.
 *
 * Usage:
 *   pnpm test              # Run headless
 *   pnpm test:headed       # Run with visible browser
 *   HEADLESS=false pnpm test  # Alternative headed mode
 *
 * Environment Variables:
 *   DATABASE_URL  - PostgreSQL connection string (read-only user)
 *   APP_URL       - Application URL to test
 *   SCREENSHOT_DIR - Directory for failure screenshots (default: ./screenshots)
 *   HEADLESS      - Set to 'false' for headed mode (default: true)
 */

import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import type { SmokeTestReport, TestResult, TestContext } from './types.js';
import { generateTestEmail } from './helpers/test-email.js';
import { closePool } from './helpers/get-magic-link.js';

// Import test functions
import { testSignupMagicLink } from './tests/signup-magic-link.js';
import { testDemoMode } from './tests/demo-mode.js';
import { testDashboard } from './tests/dashboard.js';
import { testCreateAchievement } from './tests/create-achievement.js';
import { testLogout } from './tests/logout.js';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SCREENSHOT_DIR =
  process.env.SCREENSHOT_DIR || path.join(__dirname, 'screenshots');
const HEADLESS = process.env.HEADLESS !== 'false';

// Test definitions - order matters!
const tests = [
  { name: 'Magic Link Signup', fn: testSignupMagicLink },
  { name: 'Demo Mode Activation', fn: testDemoMode },
  { name: 'Dashboard Loads', fn: testDashboard },
  { name: 'Create Achievement', fn: testCreateAchievement },
  { name: 'Logout', fn: testLogout },
];

async function main(): Promise<void> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Generate unique test email for this run
  const testEmail = generateTestEmail();

  // Create test context
  const context: TestContext = {
    appUrl: APP_URL,
    screenshotDir: SCREENSHOT_DIR,
    testEmail,
  };

  // Launch browser
  const browser = await chromium.launch({
    headless: HEADLESS,
  });

  const browserContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BragDoc Smoke Test',
  });

  const page = await browserContext.newPage();

  // Set reasonable timeouts
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  try {
    // Run tests sequentially
    for (const test of tests) {
      const result = await test.fn(page, context);
      results.push(result);

      // If a critical test fails, we may want to stop
      // For now, continue with all tests to get full picture
      if (!result.passed) {
        console.error(`Test failed: ${test.name} - ${result.error}`);
      }
    }
  } finally {
    // Cleanup
    await page.close();
    await browserContext.close();
    await browser.close();
    await closePool();
  }

  // Generate report
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  const report: SmokeTestReport = {
    timestamp: new Date().toISOString(),
    appUrl: APP_URL,
    durationMs: Date.now() - startTime,
    passed: failedCount === 0,
    tests: results,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
    },
  };

  // Output JSON report to stdout
  console.log(JSON.stringify(report, null, 2));

  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run main function
main().catch((error) => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
