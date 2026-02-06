# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code, libraries, and CLI
- JavaScript - Configuration files and build scripts

**Secondary:**
- MDX - Blog posts and content pages (Next.js integration)

## Runtime

**Environment:**
- Node.js - Runtime environment (version inferred from @types/node ^24.9.1, targeting Node 20+)

**Package Manager:**
- pnpm 9.5.0 - Monorepo workspace manager
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.0.10 (web app at `apps/web/`) - Main application with App Router and React 19 Server Components
- Next.js 15.5.9 (marketing site at `apps/marketing/`) - Marketing website with MDX support
- React 19.2.0 - UI framework for both web and marketing apps
- React 19.2.0 (CLI) - Used in `packages/cli/` for terminal UI components

**Authentication:**
- Better Auth 1.3.33 - Database-backed authentication with magic links, OAuth, and session management
- Location: `apps/web/lib/better-auth/`

**Database & ORM:**
- Drizzle ORM 0.44.6 - Type-safe SQL query builder
- PostgreSQL - Primary database (Neon or Vercel Postgres in production)
- postgres 3.4.7 - Native PostgreSQL driver
- @neondatabase/serverless 0.10.4 - Neon serverless driver
- @vercel/postgres 0.10.0 - Vercel Postgres client

**AI/LLM Integration:**
- Vercel AI SDK 5.0.76 - Unified LLM provider interface
- @ai-sdk/openai 2.0.53 - OpenAI models (GPT-4, GPT-4o, GPT-4o-mini)
- @ai-sdk/google 2.0.23 - Google Generative AI (Gemini)
- @ai-sdk/anthropic 2.0.35 - Anthropic Claude (available in CLI)
- ollama-ai-provider-v2 1.5.1 - Local Ollama support (CLI only)
- OpenAI-compatible providers - Generic OpenAI API-compatible endpoints

**Styling & UI:**
- Tailwind CSS 4.1.15 - Utility-first CSS framework
- Tailwind CSS Typography - Extended typography styles
- shadcn/ui 0.0.4 - Component library (command-line installer)
- Radix UI - Headless UI primitives for accessibility
- Class Variance Authority 0.7.1 - Component style composition
- Framer Motion 12.23.24 - Animation library
- Geist 1.5.1 - Design system font
- Lucide React 0.546.0 - Icon library

**Form Handling:**
- react-hook-form 7.65.0 - Performant form state management
- @hookform/resolvers 3.10.0 - Validation resolvers for Zod
- Zod 3.25.76 - TypeScript-first schema validation

**Email:**
- mailgun.js 10.4.0 - Email delivery via Mailgun
- @react-email/components 0.5.7 - React email component library
- @react-email/render 1.4.0 - Email template rendering
- Nodemailer 7.0.10 - SMTP email support (alternative)

**Payment Processing:**
- Stripe 19.1.0 - Payment processing and subscription management
- @stripe/stripe-js 8.1.0 - Stripe.js SDK for frontend

**Data Fetching & State:**
- SWR 2.3.6 - Data fetching with caching (web app)
- Vercel Analytics 1.5.0 - Performance monitoring

**Rich Text & Content:**
- TanStack React Table 8.21.3 - Headless data table
- React Markdown 9.1.0 - Markdown rendering
- Rehype Sanitize 6.0.0 - XSS protection for HTML
- Remark GFM 4.0.1 - GitHub Flavored Markdown support
- Shiki 3.13.0 - Syntax highlighting
- ProseMirror - Rich text editing (prosemirror-*)
- @mdxeditor/editor 3.52.3 - Visual MDX editor

**Charting & Visualization:**
- Recharts 3.3.0 - React charting library
- density-clustering 1.3.0 - DBSCAN clustering for workstreams ML

**Vector Search & AI Features:**
- pgvector 0.2.1 - PostgreSQL vector operations for embeddings
- @octokit/rest 21.1.1 - GitHub API client (available for future use)

**CLI & Terminal:**
- Commander 11.1.0 - CLI command framework (`packages/cli/`)
- Inquirer 12.10.0 - Interactive terminal prompts
- Chalk 4.1.2 - Terminal color output
- Boxen 8.0.1 - Terminal boxes for formatted output
- Winston 3.18.3 - Logging library
- Open 10.2.0 - Open URLs in default browser

**Development & Build:**
- Turbo 2.5.8 - Monorepo build orchestration
- pnpm workspaces - Monorepo package management
- Turborepo caching - Build acceleration

**Testing:**
- Jest 29.7.0 - Test runner with ts-jest for TypeScript
- @testing-library/react 16.3.0 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers for Jest
- mock-fs 5.5.0 - File system mocking (CLI tests)

**Code Quality:**
- Biome 2.3.13 - Fast linter and formatter
- ESLint 9.38.0+ - Linting with plugins for React, TypeScript, Next.js
- Prettier 5.5.5 - Code formatter (via ESLint plugin)
- TypeScript strict mode - Full type safety

**Development Tools:**
- tsx 4.20.6 - TypeScript executor for scripts
- ts-node 10.9.2 - TypeScript REPL and execution
- ts-jest 29.4.5 - TypeScript support in Jest
- Drizzle Kit 0.31.5 - Database schema migrations
- Wrangler 4.44.0 - Cloudflare Workers CLI
- @opennextjs/cloudflare 1.11.0 - OpenNext adapter for Cloudflare

**Error Tracking & Analytics:**
- @sentry/nextjs 10.25.0 - Error tracking and performance monitoring
- posthog-js 1.335.3 - Product analytics (opt-in for open source)
- posthog-node 5.10.3 - Server-side analytics

**Additional Utilities:**
- jose 6.1.0 - JWT token handling
- nanoid 5.1.6 - ID generation
- uuid 13.0.0 - UUID generation
- date-fns 4.1.0 - Date manipulation
- date-fns-tz 3.2.0 - Timezone support
- gray-matter 4.0.3 - YAML frontmatter parsing
- Feed 4.2.2 - RSS feed generation
- Diff Match Patch 1.0.5 - Diff and patch algorithms
- canvas-confetti 1.9.3 - Celebration animations
- react-day-picker 9.11.1 - Date picker component
- Embla Carousel 8.6.0 - Carousel/slider component
- dnd-kit 6.3.1+ - Drag and drop functionality
- Vaul 1.1.2 - Dialog drawer component
- Sonner 2.0.7 - Toast notifications
- next-themes 0.4.6 - Dark mode theme support
- isomorphic-dompurify 2.30.1 - XSS protection
- orderedmap 2.1.1 - Ordered map data structure

## Configuration

**Environment:**
- Required: `POSTGRES_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENAI_API_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- Optional: OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`), Stripe, DeepSeek, PostHog, Sentry
- Database: Supports Neon and Vercel Postgres via connection string

**Build:**
- `next.config.ts` - Next.js configuration with Sentry integration
- `drizzle.config.ts` - Database schema and migration configuration
- `tsconfig.json` - Shared TypeScript configuration
- `turbo.json` - Monorepo build pipeline configuration
- Biome configuration - Built into package.json lint-staged

**Dev Environment:**
- `.env` - Local development environment variables
- `.env.example` - Template with required and optional variables

## Platform Requirements

**Development:**
- Node.js 20+ (inferred from @types/node)
- pnpm 9.5.0
- PostgreSQL 12+ (local or cloud-hosted)
- macOS, Linux, or Windows with WSL

**Production:**
- Cloudflare Workers (via OpenNext adapter `@opennextjs/cloudflare`)
- PostgreSQL-compatible database (Neon recommended, Vercel Postgres, or self-hosted)
- Environment variables for external services (OpenAI, Stripe, Mailgun, Auth providers)

**Deployment:**
- Next.js build: Standard `next build` with Turbopack by default
- Web app: `pnpm build:web` or `pnpm deploy` for Cloudflare
- Marketing: `pnpm build:marketing` or `pnpm deploy` for Cloudflare
- Database migrations: `pnpm db:migrate` (production workflow)

---

*Stack analysis: 2026-02-06*
