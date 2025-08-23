# BragDoc Phase 3 & 4 Implementation Plan

This document provides detailed implementation steps for **Phase 3: Split Applications** and **Phase 4: Configure Deployment & Environment Management** from the TURBOREPO.md migration plan.

## Prerequisites

- Phase 1 and Phase 2 must be completed successfully
- All shared packages (@bragdoc/ui, @bragdoc/database, @bragdoc/auth, @bragdoc/email, @bragdoc/config) should be functional
- Turborepo infrastructure should be set up and working

---

## Phase 3: Split Applications

### Task 3.1: Create apps/web Application

#### Step 3.1.1: Create Web App Directory Structure
```bash
mkdir -p apps/web/src/app
mkdir -p apps/web/src/components
mkdir -p apps/web/src/lib
mkdir -p apps/web/public
```

#### Step 3.1.2: Create Web App package.json
Create `apps/web/package.json`:
```json
{
  "name": "@bragdoc/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint && biome lint --write --unsafe src/",
    "format": "biome format --write src/",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@bragdoc/ui": "workspace:*",
    "@bragdoc/database": "workspace:*",
    "@bragdoc/auth": "workspace:*",
    "@bragdoc/email": "workspace:*",
    "@bragdoc/config": "workspace:*",
    "@ai-sdk/deepseek": "^0.1.2",
    "@ai-sdk/google": "^1.0.12",
    "@ai-sdk/openai": "1.0.6",
    "@headlessui/react": "^2.2.0",
    "@hookform/resolvers": "^3.9.1",
    "@mdx-js/loader": "^3.1.0",
    "@mdx-js/mdx": "^3.1.0",
    "@mdx-js/react": "^3.1.0",
    "@next/mdx": "^15.1.6",
    "@next/third-parties": "^15.1.3",
    "@octokit/rest": "^21.0.2",
    "@openrouter/ai-sdk-provider": "^0.0.6",
    "@stripe/stripe-js": "^5.4.0",
    "@types/canvas-confetti": "^1.9.0",
    "@types/mdx": "^2.0.13",
    "@types/react-syntax-highlighter": "^15.5.13",
    "@vercel/analytics": "^1.3.1",
    "@vercel/blob": "^0.24.1",
    "ai": "4.0.20",
    "autoevals": "^0.0.110",
    "bright": "^1.0.0",
    "canvas-confetti": "^1.9.3",
    "classnames": "^2.5.1",
    "diff-match-patch": "^1.0.5",
    "dotenv": "^16.4.5",
    "embla-carousel-react": "^8.5.1",
    "fast-deep-equal": "^3.1.3",
    "framer-motion": "^11.3.19",
    "geist": "^1.3.1",
    "isomorphic-dompurify": "^2.20.0",
    "mdx": "^0.3.1",
    "mdx-prompt": "^0.4.1",
    "next": "15.1.6",
    "next-themes": "^0.3.0",
    "orderedmap": "^2.1.1",
    "prosemirror-example-setup": "^1.2.3",
    "prosemirror-inputrules": "^1.4.0",
    "prosemirror-markdown": "^1.13.1",
    "prosemirror-model": "^1.23.0",
    "prosemirror-schema-basic": "^1.2.3",
    "prosemirror-schema-list": "^1.4.1",
    "prosemirror-state": "^1.4.3",
    "prosemirror-view": "^1.34.3",
    "react": ">=19",
    "react-dom": ">=19",
    "react-hook-form": "^7.54.1",
    "react-markdown": "^9.0.1",
    "react-syntax-highlighter": "^15.6.1",
    "rehype-sanitize": "^6.0.0",
    "rehype-stringify": "^10.0.1",
    "remark-gfm": "^4.0.0",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.1",
    "server-only": "^0.0.1",
    "sonner": "^1.5.0",
    "stripe": "^17.5.0",
    "swr": "^2.2.5",
    "unified": "^11.0.5",
    "usehooks-ts": "^3.1.0",
    "uuid": "^11.0.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.8.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.6.3"
  }
}
```

#### Step 3.1.3: Move App and Auth Routes
```bash
# Create the main app routes directory
mkdir -p apps/web/src/app/(app)

# Move app routes (exclude marketing routes)
cp -r app/\(app\)/* apps/web/src/app/\(app\)/
cp -r app/\(auth\) apps/web/src/app/

# Copy API routes (exclude marketing-specific ones)
mkdir -p apps/web/src/app/api
cp -r app/api/* apps/web/src/app/api/

# Remove marketing-specific API routes if any exist
# (Manual review needed to identify marketing vs app API routes)
```

#### Step 3.1.4: Move App-Specific Components
```bash
# Move app-specific components
mkdir -p apps/web/src/components
# Copy components that are used only by the main app
# This requires manual analysis of which components are app-specific vs shared
```

#### Step 3.1.5: Create Web App Configuration Files
Create `apps/web/next.config.js`:
```javascript
const { withContentCollections } = require('@content-collections/next')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ]
  },
}

module.exports = withContentCollections(nextConfig)
```

Create `apps/web/tsconfig.json`:
```json
{
  "extends": "../../packages/config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/ui": ["../../packages/ui/src"],
      "@/database": ["../../packages/database/src"],
      "@/auth": ["../../packages/auth/src"],
      "@/email": ["../../packages/email/src"],
      "@/config": ["../../packages/config/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Copy theme extensions from root tailwind.config.js
    },
  },
  plugins: [
    // Copy plugins from root tailwind.config.js
  ],
}
```

#### Step 3.1.6: Create Web App Root Layout
Create `apps/web/src/app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

#### Step 3.1.7: Update Import Paths in Web App
Systematically update all imports in the web app to use workspace packages:
```bash
# Example replacements (need to be done throughout the app):
# '@/components/ui/' → '@bragdoc/ui/'
# '@/lib/db' → '@bragdoc/database'
# '@/lib/auth' → '@bragdoc/auth'
# '@/lib/email' → '@bragdoc/email'
```

#### Step 3.1.8: Implement Payment Gating Middleware
Create `apps/web/src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@bragdoc/auth'
import { isPaymentRequired, requiresPayment } from '@bragdoc/config'

export async function middleware(request: NextRequest) {
  // Only enforce payment gates if PAYMENT_TOKEN_REQUIRED is true
  if (!isPaymentRequired()) {
    return NextResponse.next()
  }

  const session = await auth()
  
  // Define protected routes and their required levels
  const protectedRoutes = {
    '/chat': 'unlimited_documents',
    '/api/ai': 'ai_assistant',
    '/settings/integrations': 'api_access',
  }

  const pathname = request.nextUrl.pathname
  
  for (const [route, feature] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!session?.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      if (requiresPayment(session.user.level, feature)) {
        return NextResponse.redirect(new URL(`/upgrade?feature=${feature}`, request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

### Task 3.2: Create apps/marketing Application

#### Step 3.2.1: Create Marketing App Directory Structure
```bash
mkdir -p apps/marketing/src/app
mkdir -p apps/marketing/src/components
mkdir -p apps/marketing/src/lib
mkdir -p apps/marketing/public
```

#### Step 3.2.2: Create Marketing App package.json
Create `apps/marketing/package.json`:
```json
{
  "name": "@bragdoc/marketing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint && biome lint --write --unsafe src/",
    "format": "biome format --write src/"
  },
  "dependencies": {
    "@bragdoc/ui": "workspace:*",
    "@bragdoc/config": "workspace:*",
    "@mdx-js/loader": "^3.1.0",
    "@mdx-js/mdx": "^3.1.0",
    "@mdx-js/react": "^3.1.0",
    "@next/mdx": "^15.1.6",
    "@vercel/analytics": "^1.3.1",
    "feed": "^4.2.2",
    "framer-motion": "^11.3.19",
    "geist": "^1.3.1",
    "gray-matter": "^4.0.3",
    "next": "15.1.6",
    "next-themes": "^0.3.0",
    "react": ">=19",
    "react-dom": ">=19",
    "react-share": "^5.1.2"
  },
  "devDependencies": {
    "@types/node": "^22.8.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.6.3"
  }
}
```

#### Step 3.2.3: Move Marketing Routes
```bash
# Move marketing-specific routes
cp -r app/\(marketing\)/* apps/marketing/src/app/

# Move marketing-specific components
# (Manual analysis needed to identify marketing vs shared components)
```

#### Step 3.2.4: Create Marketing App Configuration
Create `apps/marketing/next.config.js`:
```javascript
const { withContentCollections } = require('@content-collections/next')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/app/:path*',
        destination: `${process.env.NEXT_PUBLIC_APP_URL}/:path*`,
      },
    ]
  },
}

module.exports = withContentCollections(nextConfig)
```

Create `apps/marketing/tsconfig.json`:
```json
{
  "extends": "../../packages/config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/ui": ["../../packages/ui/src"],
      "@/config": ["../../packages/config/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

#### Step 3.2.5: Create Marketing Root Layout
Create `apps/marketing/src/app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'BragDoc - Track Your Professional Achievements',
  description: 'Effortlessly document your work accomplishments and build your professional story.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

### Task 3.3: Update CLI Package Integration

#### Step 3.3.1: Update CLI Dependencies
The CLI should already be in `packages/cli/` from Phase 1. Update its package.json if needed:
```json
{
  "dependencies": {
    "@bragdoc/config": "workspace:*",
    "@bragdoc/auth": "workspace:*"
  }
}
```

#### Step 3.3.2: Update CLI Import Paths
Update any imports in the CLI to use the new workspace packages:
```typescript
// In CLI source files
import config from '@bragdoc/config'
import { auth } from '@bragdoc/auth'
```

---

### Task 3.4: Update Root Package Configuration

#### Step 3.4.1: Update Root Package Scripts
Update the root `package.json` scripts to handle multiple apps:
```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=@bragdoc/web",
    "dev:marketing": "turbo dev --filter=@bragdoc/marketing",
    "build": "turbo build",
    "build:web": "turbo build --filter=@bragdoc/web",
    "build:marketing": "turbo build --filter=@bragdoc/marketing",
    "lint": "turbo lint",
    "format": "turbo format",
    "test": "turbo test",
    "db:generate": "turbo db:generate --filter=@bragdoc/database",
    "db:push": "turbo db:push --filter=@bragdoc/database",
    "db:studio": "turbo db:studio --filter=@bragdoc/database"
  }
}
```

#### Step 3.4.2: Update Turbo Configuration
Update `turbo.json` to handle multiple apps:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "env": ["DATABASE_URL", "NEXTAUTH_SECRET", "PAYMENT_TOKEN_REQUIRED"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "format": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

---

### Task 3.5: Phase 3 Verification Steps

#### Step 3.5.1: Test App Separation
```bash
# Test that each app can run independently
pnpm dev:web        # Should start on port 3000
pnpm dev:marketing  # Should start on port 3001

# Test builds
pnpm build:web
pnpm build:marketing
```

#### Step 3.5.2: Verify Import Resolution
Check that all workspace package imports resolve correctly in both apps.

#### Step 3.5.3: Test Functionality
- Verify authentication works in web app
- Verify marketing site loads correctly
- Test that shared UI components work in both contexts
- Verify payment gating logic (if PAYMENT_TOKEN_REQUIRED=true)

---

## Phase 4: Configure Deployment & Environment Management

### Task 4.1: Environment Configuration

#### Step 4.1.1: Create Environment Templates
Create `.env.example`:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bragdoc"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Payment Integration
PAYMENT_TOKEN_REQUIRED="false"  # Set to "true" for production
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App URLs (for production)
NEXT_PUBLIC_APP_URL="https://app.bragdoc.ai"
NEXT_PUBLIC_MARKETING_URL="https://bragdoc.ai"

# Email
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-mailgun-domain"

# AI Providers
OPENAI_API_KEY="sk-..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
DEEPSEEK_API_KEY="..."
```

#### Step 4.1.2: Create App-Specific Environment Files
Create `apps/web/.env.example`:
```bash
# Web app specific environment variables
PAYMENT_TOKEN_REQUIRED="false"
NEXT_PUBLIC_MARKETING_URL="http://localhost:3001"
```

Create `apps/marketing/.env.example`:
```bash
# Marketing app specific environment variables
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### Task 4.2: Development Setup Configuration

#### Step 4.2.1: Create Development Scripts
Create `scripts/dev.sh`:
```bash
#!/bin/bash
# Development script to run both apps concurrently

echo "Starting BragDoc development environment..."
echo "Web app: http://localhost:3000"
echo "Marketing site: http://localhost:3001"

# Run turbo dev which will start both apps
pnpm turbo dev
```

#### Step 4.2.2: Update Package.json Dev Scripts
Add convenience scripts to root package.json:
```json
{
  "scripts": {
    "setup": "pnpm install && pnpm db:generate && pnpm db:push",
    "dev:all": "turbo dev",
    "dev:web-only": "turbo dev --filter=@bragdoc/web --filter=@bragdoc/database",
    "dev:marketing-only": "turbo dev --filter=@bragdoc/marketing"
  }
}
```

---

### Task 4.3: Production Deployment Configuration

#### Step 4.3.1: Vercel Configuration (Option 1 - Recommended)
Create `apps/web/vercel.json`:
```json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@bragdoc/web",
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install",
  "ignoreCommand": "cd ../.. && npx turbo-ignore @bragdoc/web"
}
```

Create `apps/marketing/vercel.json`:
```json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@bragdoc/marketing",
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install",
  "ignoreCommand": "cd ../.. && npx turbo-ignore @bragdoc/marketing"
}
```

#### Step 4.3.2: Docker Configuration (Alternative Deployment)
Create `Dockerfile.web`:
```dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm turbo build --filter=@bragdoc/web

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

#### Step 4.3.3: GitHub Actions CI/CD
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
      - run: pnpm turbo test
      - run: pnpm turbo lint

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.WEB_PROJECT_ID }}
          working-directory: ./apps/web
          
  deploy-marketing:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.MARKETING_PROJECT_ID }}
          working-directory: ./apps/marketing
```

---

### Task 4.4: Open Source Configuration

#### Step 4.4.1: Create Self-Hosting Documentation
Create `docs/SELF_HOSTING.md`:
```markdown
# Self-Hosting BragDoc

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Run `pnpm setup` to install dependencies and set up the database
4. Run `pnpm dev` to start both applications

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for session encryption

### Optional (Payment Integration)
Set `PAYMENT_TOKEN_REQUIRED=true` to enable payment gating:
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

### Optional (Authentication Providers)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For GitHub OAuth

## Deployment Options

### Single Server Deployment
Run both apps on the same server with different ports:
```bash
pnpm build
pnpm start:web    # Port 3000
pnpm start:marketing  # Port 3001
```

### Separate Deployments
Deploy apps independently using the build filters:
```bash
pnpm build:web
pnpm build:marketing
```
```

#### Step 4.4.2: Create Feature Flag Documentation
Create `docs/FEATURES.md`:
```markdown
# Feature Configuration

BragDoc supports feature flags to control functionality:

## Payment Gating
- `PAYMENT_TOKEN_REQUIRED=false` (default): All features available
- `PAYMENT_TOKEN_REQUIRED=true`: Enables subscription-based feature gating

## Feature Gates
When payment is required, features are gated by subscription level:
- **Free**: Basic achievement tracking
- **Basic**: Unlimited documents, email integration
- **Pro**: AI assistance, advanced analytics, team features

## Self-Hosting Options
- **Open Source Mode**: Set no payment variables, all features available
- **Commercial Mode**: Configure Stripe for subscription management
- **Hybrid Mode**: Partial feature restrictions with custom logic
```

---

### Task 4.5: Phase 4 Verification Steps

#### Step 4.5.1: Test Development Environment
```bash
# Test full development setup
pnpm setup
pnpm dev:all

# Verify both apps start correctly
curl http://localhost:3000  # Web app
curl http://localhost:3001  # Marketing site
```

#### Step 4.5.2: Test Build Process
```bash
# Test all builds
pnpm build

# Test individual app builds
pnpm build:web
pnpm build:marketing
```

#### Step 4.5.3: Test Environment Configurations
- Test with `PAYMENT_TOKEN_REQUIRED=false` (open source mode)
- Test with `PAYMENT_TOKEN_REQUIRED=true` (commercial mode)
- Verify feature gating works correctly in both modes

#### Step 4.5.4: Test Deployment Configurations
- Test Vercel deployment setup (if using)
- Test Docker builds (if using)
- Verify CI/CD pipeline works correctly

---

## Success Criteria for Phases 3 & 4

### Phase 3 Success Criteria
- [ ] Web app runs independently with all main application features
- [ ] Marketing app runs independently with all marketing pages
- [ ] Both apps use shared workspace packages correctly
- [ ] Payment gating middleware works in web app
- [ ] All imports are correctly updated to use workspace packages
- [ ] CLI integration works with new package structure

### Phase 4 Success Criteria
- [ ] Development environment works seamlessly for contributors
- [ ] Production deployment works for both apps
- [ ] Environment variable management is clear and documented
- [ ] Open source self-hosting is fully documented
- [ ] Feature flags work correctly in both open source and commercial modes
- [ ] CI/CD pipeline successfully builds and deploys both apps

## Post-Implementation Tasks

1. **Update Documentation**
   - Update README.md with new development setup
   - Create contributor guide for the new architecture
   - Update deployment documentation

2. **Performance Optimization**
   - Optimize shared package imports to avoid bundle bloat
   - Set up proper tree shaking for unused code
   - Configure proper caching strategies

3. **Monitoring & Observability**
   - Set up monitoring for both applications
   - Configure error tracking
   - Set up analytics for both apps

4. **Security Review**
   - Review session sharing between apps
   - Validate payment gating security
   - Audit environment variable handling

This completes the detailed implementation plan for Phases 3 and 4 of the Turborepo migration.