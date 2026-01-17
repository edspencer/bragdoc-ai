---
name: smoke-test
description: Executes production smoke tests against the BragDoc application to verify critical user flows. Use when asked to "run smoke tests", "check production", or "verify the app is working".
---

# Production Smoke Test Skill

Execute automated smoke tests against the production BragDoc application to verify critical user flows are working correctly.

## Overview

This skill runs a suite of Playwright-based tests that verify:
1. **Magic Link Signup** - New user registration via email
2. **Demo Mode Activation** - Demo mode enters correctly after signup with intent
3. **Dashboard Loads** - Authenticated dashboard renders properly
4. **Create Achievement** - Users can create achievements in demo mode
5. **Logout** - Session terminates and redirects to login

## When to Use

Run smoke tests when:
- After deploying to production
- As a daily health check (via Chronicle cron)
- When investigating potential production issues
- Before major releases

## Invocation

```bash
/smoke-test
```

Or via Claude CLI:
```bash
claude -p "run /smoke-test"
```

## What the Skill Does

1. Changes to the smoke test directory: `scripts/smoke-test`
2. Installs dependencies if needed: `pnpm install`
3. Runs the test suite: `pnpm test`
4. Parses the JSON output
5. Reports results in a human-readable format

## Output

### All Tests Pass
```
SMOKE TESTS PASSED: 5/5 tests in 45s

- Magic Link Signup: 12s
- Demo Mode Activation: 5s
- Dashboard Loads: 3s
- Create Achievement: 8s
- Logout: 2s
```

### Test Failures
```
SMOKE TEST FAILURE: 1 of 5 tests failed

FAILED: Demo Mode Activation
Error: Expected demo banner to be visible
Screenshot: screenshots/demo-mode-activation-1705395600000.png

Possible causes:
- Cookie prefix issue (dev vs prod)
- Demo mode toggle API error
- Session not properly created

PASSED:
- Magic Link Signup: 12s
- Dashboard Loads: 3s
- Create Achievement: 8s
- Logout: 2s
```

## Important Notes

- **Read-only reporting**: This skill reports test results only. It does NOT attempt to fix failures.
- **Production focus**: Tests run against the configured APP_URL (default: https://www.bragdoc.ai)
- **Database access**: Uses read-only credentials to retrieve magic link tokens
- **Test isolation**: Creates test users with `smoke-test-*@test.bragdoc.ai` email pattern

## Configuration

Environment variables in `scripts/smoke-test/.env`:
- `DATABASE_URL` - Read-only PostgreSQL connection string
- `APP_URL` - Target application URL
- `SCREENSHOT_DIR` - Directory for failure screenshots
- `HEADLESS` - Set to 'false' for headed mode debugging

## Troubleshooting

If the skill fails to run:
1. Ensure `scripts/smoke-test/.env` exists with valid credentials
2. Run `pnpm install` in the smoke-test directory
3. Install Playwright browsers: `pnpm exec playwright install chromium`
4. Check database connectivity with read-only credentials

## Test User Cleanup

Test users accumulate in the production database. Periodic manual cleanup:
```sql
DELETE FROM "User" WHERE email LIKE 'smoke-test-%@test.bragdoc.ai';
```
