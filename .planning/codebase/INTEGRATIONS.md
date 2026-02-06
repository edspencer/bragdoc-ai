# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**LLM Providers:**
- OpenAI - Primary AI provider for achievement extraction and document generation
  - SDK/Client: `@ai-sdk/openai` 2.0.53
  - Models: gpt-4o, gpt-4o-mini, gpt-3.5-turbo, gpt-4
  - Default model: gpt-4o-mini for extraction, gpt-4o for chat
  - Config: `apps/web/lib/ai/index.ts`, `packages/cli/src/ai/providers.ts`
  - Auth: `OPENAI_API_KEY` environment variable
  - Web location: `apps/web/lib/ai/`

- Google Generative AI (Gemini) - Alternative LLM option
  - SDK/Client: `@ai-sdk/google` 2.0.23
  - Models: gemini-1.5-pro
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY` (CLI), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (OAuth)
  - CLI location: `packages/cli/src/ai/providers.ts`

- Anthropic Claude - Alternative LLM provider (CLI only)
  - SDK/Client: `@ai-sdk/anthropic` 2.0.35
  - Models: claude-3-5-sonnet-20241022
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - CLI location: `packages/cli/src/ai/providers.ts`

- DeepSeek - OpenAI-compatible LLM provider
  - SDK/Client: `@ai-sdk/openai` with custom baseURL
  - Models: deepseek-chat
  - Auth: `DEEPSEEK_API_KEY`
  - Base URL: https://api.deepseek.com/v1
  - CLI location: `packages/cli/src/ai/providers.ts`

- Ollama - Local LLM provider for offline use
  - SDK/Client: `ollama-ai-provider-v2` 1.5.1
  - Default base URL: http://localhost:11434/api
  - CLI location: `packages/cli/src/ai/providers.ts`

- OpenAI-compatible providers - Generic integration for LM Studio, etc.
  - SDK/Client: `@ai-sdk/openai` with baseURL
  - CLI location: `packages/cli/src/ai/providers.ts`

**Authentication & OAuth:**
- Google OAuth - User login via Google
  - Provider: Google Identity Platform
  - Client: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Scope: Basic profile + email
  - Config: `apps/web/lib/better-auth/config.ts` (lines 198-225)
  - Refresh token: Requested via `accessType: 'offline'`

- GitHub OAuth - User login via GitHub
  - Provider: GitHub API
  - Client: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Scope: `user:email` for private email access
  - Config: `apps/web/lib/better-auth/config.ts` (lines 227-253)
  - SDK: `@octokit/rest` 21.1.1 (available for future GitHub data extraction)

- Magic Link Authentication - Passwordless email login
  - Provider: Better Auth magic-link plugin
  - Implementation: `apps/web/lib/better-auth/server.ts`
  - Email delivery: Via Mailgun webhook integration

**Email Service:**
- Mailgun - Email delivery for authentication and notifications
  - Client: `mailgun.js` 10.4.0
  - API Key: `MAILGUN_API_KEY`
  - Domain: `MAILGUN_DOMAIN`
  - SMTP: `MAILGUN_SMTP_SERVER`, `MAILGUN_SMTP_LOGIN`, `MAILGUN_SMTP_PASSWORD`
  - Webhook: POST `/api/email/webhook` for incoming email processing
  - Location: `apps/web/lib/email/`
  - Webhook signature verification: HMAC-SHA256 (`MAILGUN_WEBHOOK_SIGNING_KEY`)
  - Implementation: `apps/web/app/api/email/webhook/route.ts`
  - Use cases: Magic links, welcome emails, notifications

**Payment Processing:**
- Stripe - Payment processing and subscription management
  - Client: `stripe` 19.1.0 (server), `@stripe/stripe-js` 8.1.0 (client)
  - Secret Key: `STRIPE_SECRET_KEY`
  - Publishable Key: `STRIPE_PUBLISHABLE_KEY`
  - Webhook Secret: `STRIPE_WEBHOOK_SECRET`
  - Implementation: `apps/web/lib/stripe/stripe.ts`, `apps/web/app/api/stripe/callback/route.ts`
  - Webhook events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.deleted`
  - Webhook URL: POST `/api/stripe/callback`
  - Integration: Stripe plans mapped to `userLevel` (free/basic/pro) and `renewalPeriod` (monthly/yearly)
  - Database sync: Stores `stripeCustomerId`, `level`, `renewalPeriod`, `lastPayment` in user table

**GitHub Integration (CLI):**
- GitHub API - Repository data extraction and PR/issue fetching
  - SDK/Client: @octokit/rest (available in dependencies, not heavily used yet)
  - Authentication: GitHub CLI (`gh`) via OAuth
  - Connector: `packages/cli/src/connectors/github-connector.ts`
  - Optional: GitHub CLI (`gh`) must be installed and authenticated separately
  - Fallback: Git connector for local-only extraction if `gh` unavailable
  - Location: `packages/cli/` CLI tool

## Data Storage

**Databases:**
- PostgreSQL - Primary relational database
  - Connection: `POSTGRES_URL` environment variable
  - Client options:
    - Production/dev: `@neondatabase/serverless` (Neon) or `postgres` (postgres-js)
    - Test: `postgres` (postgres-js)
  - ORM: Drizzle ORM 0.44.6
  - Schema: `packages/database/src/schema.ts`
  - Migrations: Located in `packages/database/src/migrations/`
  - Vector support: pgvector extension for embedding storage (workstreams ML feature)

**File Storage:**
- Local filesystem only - No external cloud storage configured
- Vercel Blob: Support infrastructure ready (`BLOB_READ_WRITE_TOKEN` in turbo.json)

**Caching:**
- Database connection caching: PostgreSQL connection pooling via postgres driver
- Session cookie caching: 5-minute max age before database refresh (`apps/web/lib/better-auth/config.ts`)
- SWR client-side caching: Used in web app for data fetching

## Authentication & Identity

**Auth Provider:**
- Better Auth v1.3.33 - Custom open-source authentication
  - Implementation: `apps/web/lib/better-auth/`
  - Configuration: `apps/web/lib/better-auth/config.ts`
  - Server: `apps/web/lib/better-auth/server.ts`
  - Client: `apps/web/lib/better-auth/client.ts`
  - Session strategy: Database-backed with 30-day expiration
  - Cookie caching: 5 minutes for performance
  - Supports: Email/password, Magic links, Google OAuth, GitHub OAuth
  - Custom fields: provider, providerId, level, renewalPeriod, stripeCustomerId, tosAcceptedAt
  - Account linking: Automatic on matching email addresses
  - API route: `/api/auth/[...all]/route.ts`

**CLI Authentication:**
- JWT tokens stored locally in configuration
- Token generation via `/api/cli/token` endpoint
- Implementation: `apps/web/lib/getAuthUser.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry - Error tracking and performance monitoring
  - Client: `@sentry/nextjs` 10.25.0
  - DSN: `https://0337f9c49b2d9d00f3308e137d2bd3e3@o4510341241110528.ingest.us.sentry.io/4510341243404288`
  - Enabled: Production only
  - Config: `apps/web/sentry.server.config.ts`, `apps/web/sentry.edge.config.ts`
  - Features: Error tracking, performance monitoring (trace sampling rate 1.0), PII included
  - Integration: `next.config.ts` includes Sentry wrapper
  - Tunnel: `/monitoring` route for ad-blocker circumvention
  - Source maps: Automatically uploaded (widenClientFileUpload: true)

**Analytics:**
- PostHog - Product analytics (opt-in for open source)
  - Client: `posthog-js` 1.335.3
  - Enabled: Optional via `NEXT_PUBLIC_POSTHOG_ENABLED=true`
  - Config: `apps/web/components/posthog-provider.tsx`
  - Key: `NEXT_PUBLIC_POSTHOG_KEY`
  - Host: `NEXT_PUBLIC_POSTHOG_HOST` (defaults to https://app.posthog.com)
  - Features: Custom event capture, user identification (opt-in)
  - Disabled: Autocapture, session recording, feature flags
  - Implementation: Client-side only via PHProvider component
  - Server-side: `posthog-node` 5.10.3 available in dependencies
  - Location: `apps/web/lib/posthog-server.ts`

**Performance:**
- Vercel Analytics - Performance monitoring
  - Client: `@vercel/analytics` 1.5.0
  - Web Vitals tracking
  - Deployment context: Used for Vercel deployments

## CI/CD & Deployment

**Hosting:**
- Cloudflare Workers - Production deployment platform
  - Adapter: `@opennextjs/cloudflare` 1.11.0
  - Build commands: `pnpm preview`, `pnpm deploy`, `pnpm upload`
  - Edge environment: Sentry configured for edge runtime
  - Typegen: `wrangler types` integration

**CI Pipeline:**
- GitHub Actions - Automated testing and releases
  - Workflows: `.github/workflows/`
    - `evals.yml` - LLM evaluation tests
    - `lint.yml` - Code linting checks
    - `test.yml` - Jest unit and integration tests
    - `release-cli.yml` - CLI package release to npm
  - Dependabot: `.github/dependabot.yml` for automated dependency updates

**Database Migrations:**
- Drizzle Kit - Schema migration management
  - Config: `packages/database/drizzle.config.ts`
  - Workflow: `db:generate` → `db:migrate` (production recommended)
  - Dev shortcut: `db:push` (local development only)
  - Implementation: `packages/database/src/migrate.ts`

## Environment Configuration

**Required env vars:**
- `POSTGRES_URL` - Database connection string
- `BETTER_AUTH_SECRET` - Secret for signing cookies/tokens
- `BETTER_AUTH_URL` - Application base URL (e.g., http://localhost:3000)
- `OPENAI_API_KEY` - OpenAI API key
- `MAILGUN_API_KEY` - Mailgun API key
- `MAILGUN_DOMAIN` - Mailgun domain
- `STRIPE_SECRET_KEY` - Stripe secret key (for payment processing)

**Optional env vars:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe payment
- `MAILGUN_WEBHOOK_SIGNING_KEY` - Mailgun webhook verification
- `ANTHROPIC_API_KEY` - Anthropic Claude (CLI only)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Generative AI (CLI alternative)
- `DEEPSEEK_API_KEY` - DeepSeek API key (CLI alternative)
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` - PostHog analytics
- `NEXT_PUBLIC_POSTHOG_ENABLED` - PostHog enable flag (defaults to false)
- `SENTRY_AUTH_TOKEN` - Sentry source map upload
- `PAYMENT_TOKEN_REQUIRED` - Enable/disable payment gating (defaults to false for open source)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage (future use)

**Secrets location:**
- `.env` file (not committed, `.env.example` provides template)
- GitHub Secrets for CI/CD (Actions workflows)
- Vercel/Cloudflare environment configuration for production

## Webhooks & Callbacks

**Incoming Webhooks:**
- POST `/api/email/webhook` - Mailgun email ingestion webhook
  - Receives parsed emails from Mailgun
  - Signature verification: HMAC-SHA256 with `MAILGUN_WEBHOOK_SIGNING_KEY`
  - Payload: Form data with recipient, sender, subject, body, attachment count
  - Processing: `apps/web/lib/email/process-incoming.ts`
  - Use case: Email-based achievement creation

- POST `/api/stripe/callback` - Stripe webhook for payment events
  - Receives Stripe events for checkout and payment status
  - Signature verification: Stripe webhook signature validation
  - Event types: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed, customer.subscription.deleted
  - Processing: `apps/web/lib/stripe/` (handles user subscription updates)
  - Use case: Payment confirmation and subscription management

**Outgoing Webhooks:**
- None detected - System primarily receives webhooks, no outgoing webhook delivery

**OAuth Callbacks:**
- GET `/api/auth/callback/google` - Google OAuth redirect
- GET `/api/auth/callback/github` - GitHub OAuth redirect
- Implementation: Better Auth magic-link plugin handles all OAuth flows automatically
- Location: `apps/web/lib/better-auth/config.ts`

---

*Integration audit: 2026-02-06*
