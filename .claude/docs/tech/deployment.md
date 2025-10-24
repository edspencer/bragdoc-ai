# Deployment

## Overview

BragDoc is designed for flexible deployment: Cloudflare Workers (primary), Vercel, or self-hosted environments.

## Development Environment

```bash
# Install dependencies
pnpm install

# Run dev server (all apps)
pnpm dev

# Run specific app
pnpm dev:web          # Port 3000
pnpm dev:marketing    # Port varies
```

**Dev Server Logs:** `./apps/web/.next-dev.log`

## Build Process

### Next.js 16 Build System

**Bundler**: Turbopack (default as of Next.js 16)
- 2-5× faster builds compared to webpack
- Incremental compilation
- Improved Hot Module Replacement (HMR)

**Opt-out to webpack** (if needed):
```bash
pnpm build --webpack
```

### Turborepo Build Pipeline

**File:** `turbo.json`

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "env": ["POSTGRES_URL", "AUTH_SECRET", "OPENAI_API_KEY"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Build Commands

```bash
# Build all packages and apps
pnpm build

# Build specific app
pnpm --filter=@bragdoc/web build
pnpm --filter=@bragdoc/cli build

# Type checking
pnpm --filter=@bragdoc/web exec tsc --noEmit

# Linting
pnpm lint
pnpm lint:fix
```

## Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migration to database
pnpm db:push

# Run migrations programmatically
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm db:studio
```

## Cloudflare Workers (Primary)

### Setup

1. **Install Wrangler**
   ```bash
   pnpm add -D wrangler
   ```

2. **Configure wrangler.toml**
   ```toml
   name = "bragdoc"
   compatibility_date = "2024-01-01"

   [env.production]
   vars = { NODE_ENV = "production" }
   ```

3. **Build for Cloudflare**
   ```bash
   pnpm --filter=@bragdoc/web build
   ```

   **Note**: As of Next.js 16, Turbopack is the default bundler. The build now benefits from faster compilation times and improved compatibility with Cloudflare Workers edge runtime.

4. **Deploy**
   ```bash
   pnpm --filter=@bragdoc/web deploy
   ```

### Next.js 16 Compatibility

**Proxy Middleware**: The upgrade to Next.js 16 includes renaming `middleware.ts` → `proxy.ts`, which improves Cloudflare Workers compatibility. Additionally, the removal of `redirect()` calls in Server Components (like in `cli-auth/page.tsx`) eliminates edge runtime build issues.

**Key improvements**:
- Proxy file (`apps/web/proxy.ts`) uses proper Next.js 16 patterns
- No `redirect()` in Server Components (Cloudflare Workers compatible)
- Turbopack bundler optimized for edge runtime
- Image optimization defaults updated (minimumCacheTTL: 60s → 4 hours)

### Environment Variables (Cloudflare)

Set via Wrangler or Dashboard:

```bash
wrangler secret put POSTGRES_URL
wrangler secret put AUTH_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put STRIPE_SECRET_KEY
```

### OpenNext Adapter

**File:** `apps/web/next.config.js`

```javascript
const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

module.exports = {
  // ... config
};

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}
```

## Vercel Deployment

### Setup

1. **Connect GitHub Repository**
   - Import project in Vercel dashboard
   - Select `apps/web` as root directory

2. **Configure Environment Variables**
   ```
   POSTGRES_URL
   AUTH_SECRET
   NEXTAUTH_URL
   OPENAI_API_KEY
   STRIPE_SECRET_KEY
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   GITHUB_CLIENT_ID
   GITHUB_CLIENT_SECRET
   ```

3. **Deploy**
   ```bash
   # Automatic on git push
   # Or manual via Vercel CLI
   vercel deploy
   ```

### Build Settings

- **Framework Preset:** Next.js
- **Build Command:** `cd ../.. && pnpm install && pnpm --filter=@bragdoc/web build`
- **Output Directory:** `.next`
- **Install Command:** `pnpm install`

## Self-Hosted (Docker)

### Dockerfile

```dockerfile
FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.5.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - POSTGRES_URL=${POSTGRES_URL}
      - AUTH_SECRET=${AUTH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: bragdoc
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Deploy

```bash
docker-compose up -d
```

## Environment Variables

### Required

```env
# Database
POSTGRES_URL=postgresql://user:pass@host:5432/bragdoc

# Auth
AUTH_SECRET=<openssl-rand-hex-32>
NEXTAUTH_URL=https://yourdomain.com

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx  # Same for both apps (cross-domain tracking)
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# AI/LLM
OPENAI_API_KEY=sk-...

# Payments
STRIPE_SECRET_KEY=sk_...
```

### Optional

```env
# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Email
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=mg.yourdomain.com

# Additional LLMs
DEEPSEEK_API_KEY=...
ANTHROPIC_API_KEY=...

# Demo Mode
DEMO_MODE_ENABLED=true
NEXT_PUBLIC_DEMO_MODE_ENABLED=true
```

## Database Setup

### Neon (Recommended)

1. Create project at neon.tech
2. Copy connection string
3. Set `POSTGRES_URL` environment variable
4. Run migrations: `pnpm db:push`

### Self-Hosted PostgreSQL

1. Install PostgreSQL 14+
2. Create database: `CREATE DATABASE bragdoc;`
3. Set connection string
4. Run migrations

## CLI Tool Deployment

### npm Package

```bash
# Build
pnpm --filter=@bragdoc/cli build

# Publish
cd packages/cli
npm publish
```

### User Installation

```bash
npm install -g @bragdoc/cli
bragdoc login
```

## Monitoring & Logs

### Development

```bash
# Dev server logs
tail -f apps/web/.next-dev.log

# CLI logs
tail -f ~/.bragdoc/logs/bragdoc.log
```

### Production

- **Cloudflare:** Wrangler tail or Dashboard logs
- **Vercel:** Vercel dashboard logs
- **Self-hosted:** Docker logs or system logs

## Performance

### Build Optimization

- Turborepo caching (local + remote)
- Turbopack bundler (2-5× faster builds in Next.js 16)
- Next.js automatic code splitting
- Tree shaking
- Image optimization (improved defaults in Next.js 16)

### Runtime Optimization

- Server Components (zero JS by default)
- Edge Runtime (low latency)
- Database connection pooling (Neon)
- Static generation where possible

## Health Checks

### Web App

```bash
curl https://yourdomain.com/api/health
# Expected: 200 OK
```

### Database

```bash
curl https://yourdomain.com/api/db-health
# Expected: {"status": "healthy"}
```

## Analytics Deployment Checklist

### PostHog Environment Variables

**Both apps must use the same PostHog key for cross-domain tracking:**

```bash
# Set for web app (Cloudflare Workers)
wrangler secret put NEXT_PUBLIC_POSTHOG_KEY
wrangler secret put NEXT_PUBLIC_POSTHOG_HOST

# Set for marketing site (same values)
```

**Verify:**
- Marketing site uses cookieless mode (no cookies set)
- Web app switches from memory to localStorage+cookie after authentication
- Events appear in PostHog dashboard with correct properties
- Cross-domain tracking works (same user ID across both domains)

---

**Last Updated:** 2025-10-24 (PostHog analytics environment variables)
**Deployment Targets:** Cloudflare Workers, Vercel, Docker
**Build System:** Turbopack (default in Next.js 16)
