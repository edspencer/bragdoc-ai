# Production Smoke Test System

Automated smoke tests that verify critical BragDoc user flows in production.

## Overview

This test suite runs 5 sequential tests:
1. **Magic Link Signup** - Register new user via magic link
2. **Demo Mode Activation** - Verify demo mode enters correctly
3. **Dashboard Loads** - Confirm dashboard renders with demo data
4. **Create Achievement** - Test achievement creation in demo mode
5. **Logout** - Verify session termination and redirect

## Local Development Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure `.env`:
   ```bash
   DATABASE_URL=postgres://smoke_test_reader:...@host:5432/neondb
   APP_URL=http://localhost:3000  # or https://www.bragdoc.ai for prod
   ```

3. Install dependencies:
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```

4. Run tests:
   ```bash
   pnpm test           # Headless
   pnpm test:headed    # With visible browser
   ```

## Production Setup (Chronicle)

Chronicle is the home lab server that runs scheduled smoke tests.

### Initial Setup

1. Clone repository on Chronicle:
   ```bash
   git clone git@github.com:edspencer/brag-ai.git
   cd brag-ai/scripts/smoke-test
   ```

2. Create `.env` with production credentials:
   ```bash
   DATABASE_URL=postgres://smoke_test_reader:...@neon-host:5432/neondb?sslmode=require
   APP_URL=https://www.bragdoc.ai
   ```

3. Install dependencies:
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```

4. Test manually:
   ```bash
   pnpm test
   ```

### Cron Job Configuration

Add to crontab (`crontab -e`):
```cron
# Run BragDoc smoke tests daily at 8 AM
0 8 * * * cd /path/to/brag-ai/scripts/smoke-test && pnpm test >> /var/log/bragdoc-smoke-test.log 2>&1
```

Alternative: Use Claude CLI for rich reporting:
```cron
0 8 * * * cd /path/to/brag-ai && claude -p "run /smoke-test" >> /var/log/bragdoc-smoke-test.log 2>&1
```

## Database Setup

Create a read-only PostgreSQL user for smoke tests:

```sql
-- Create read-only user
CREATE ROLE smoke_test_reader WITH LOGIN PASSWORD 'generate-a-secure-password';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE neondb TO smoke_test_reader;
GRANT USAGE ON SCHEMA public TO smoke_test_reader;
GRANT SELECT ON verification TO smoke_test_reader;
```

## Test User Cleanup

Test users (pattern: `smoke-test-*@test.bragdoc.ai`) accumulate over time.
Periodic manual cleanup is acceptable:

```sql
DELETE FROM "User" WHERE email LIKE 'smoke-test-%@test.bragdoc.ai';
```

## Output Format

Tests output JSON to stdout matching `SmokeTestReport`:

```json
{
  "timestamp": "2025-01-16T08:00:00.000Z",
  "appUrl": "https://www.bragdoc.ai",
  "durationMs": 45000,
  "passed": true,
  "tests": [
    {"name": "Magic Link Signup", "passed": true, "durationMs": 12000},
    ...
  ],
  "summary": {"total": 5, "passed": 5, "failed": 0}
}
```

## Troubleshooting

### Database connection fails
- Verify DATABASE_URL is correct
- Check SSL settings (add `?sslmode=require` for Neon)
- Confirm read-only user has SELECT on verification table

### Browser fails to launch
- Run `pnpm exec playwright install chromium`
- Check system dependencies: `pnpm exec playwright install-deps`

### Tests timeout
- Increase timeout in individual test files
- Check network connectivity to APP_URL
- Verify the application is running

### Cookie/Session issues
- This was the original bug that prompted this system
- Check for `__Secure-` cookie prefix differences between dev/prod
- Verify demo intent cookie is being set correctly
