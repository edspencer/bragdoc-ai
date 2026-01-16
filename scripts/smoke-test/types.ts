/**
 * Smoke Test Type Definitions
 *
 * These types define the structure of test results and reports
 * for the production smoke test system.
 */

/**
 * Result of a single test execution
 */
export interface TestResult {
  /** Human-readable test name */
  name: string;
  /** Whether the test passed */
  passed: boolean;
  /** Execution time in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Path to failure screenshot (relative to smoke-test directory) */
  screenshot?: string;
}

/**
 * Complete smoke test report
 */
export interface SmokeTestReport {
  /** ISO 8601 timestamp of test run */
  timestamp: string;
  /** Target application URL that was tested */
  appUrl: string;
  /** Total execution time in milliseconds */
  durationMs: number;
  /** Overall pass/fail - true only if all tests pass */
  passed: boolean;
  /** Individual test results in execution order */
  tests: TestResult[];
  /** Summary statistics */
  summary: {
    /** Total number of tests run */
    total: number;
    /** Number of tests that passed */
    passed: number;
    /** Number of tests that failed */
    failed: number;
  };
}

/**
 * Test function signature
 * Each test receives a Playwright page and returns a TestResult
 */
export type TestFunction = (
  page: import('playwright').Page,
  context: TestContext,
) => Promise<TestResult>;

/**
 * Context passed to each test
 */
export interface TestContext {
  /** Application URL being tested */
  appUrl: string;
  /** Directory for screenshots */
  screenshotDir: string;
  /** Test email generated for this run */
  testEmail: string;
}
