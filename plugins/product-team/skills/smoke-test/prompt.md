# Smoke Test Execution Instructions

Execute the production smoke test suite and report the results.

## Steps

1. **Navigate to smoke test directory**
   ```bash
   cd /Users/ed/Code/brag-ai/scripts/smoke-test
   ```

2. **Check for .env file**
   Verify `.env` exists. If not, inform the user they need to create it from `.env.example`.

3. **Install dependencies if needed**
   ```bash
   pnpm install
   ```

4. **Run the test suite**
   ```bash
   pnpm test
   ```

5. **Parse the JSON output**
   The script outputs a JSON object matching the `SmokeTestReport` interface:
   ```typescript
   interface SmokeTestReport {
     timestamp: string;
     appUrl: string;
     durationMs: number;
     passed: boolean;
     tests: TestResult[];
     summary: { total: number; passed: number; failed: number; };
   }
   ```

6. **Report results**

   **If all tests pass:**
   ```
   SMOKE TESTS PASSED: {summary.total}/{summary.total} tests in {durationMs/1000}s

   {for each test: - {name}: {durationMs/1000}s}
   ```

   **If any tests fail:**
   ```
   SMOKE TEST FAILURE: {summary.failed} of {summary.total} tests failed

   {for each failed test:
   FAILED: {name}
   Error: {error}
   Screenshot: {screenshot}

   Possible causes:
   - [list relevant possible causes based on which test failed]
   }

   PASSED:
   {for each passed test: - {name}: {durationMs/1000}s}
   ```

## Failure Analysis Guidance

When reporting failures, include possible causes based on the test:

**Magic Link Signup failures:**
- Database connectivity issues
- Email form not rendering
- Verification token not being created
- Magic link URL construction error

**Demo Mode Activation failures:**
- Cookie prefix issue (dev vs prod `__Secure-` prefix)
- Demo intent cookie not being set
- Demo mode toggle API failing
- Session not properly created

**Dashboard Loads failures:**
- Authentication session invalid
- Dashboard page error
- Demo data not seeded
- Network timeout

**Create Achievement failures:**
- Add button not found
- Form not rendering
- API error on submission
- Demo mode not active

**Logout failures:**
- User menu not found
- Sign out action failed
- Session not cleared
- Redirect not working

## Critical: DO NOT ATTEMPT FIXES

This skill is for **reporting only**. After presenting results:
- Do NOT suggest code changes
- Do NOT attempt to fix the issue
- Simply report what failed and why
- The developer will investigate and fix manually
