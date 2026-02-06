# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
brag-ai/
├── apps/
│   ├── web/                  # Main Next.js application (Port 3000)
│   │   ├── app/
│   │   │   ├── (app)/        # Authenticated route group
│   │   │   ├── (auth)/       # Authentication route group
│   │   │   ├── api/          # RESTful API routes
│   │   │   └── ...           # Marketing pages (home, about, etc.)
│   │   ├── components/       # React components (UI, features, layouts)
│   │   ├── lib/              # Utilities and business logic
│   │   │   ├── ai/           # LLM, embeddings, clustering
│   │   │   ├── better-auth/  # Authentication configuration
│   │   │   ├── email/        # Email sending utilities
│   │   │   ├── demo-mode.ts  # Demo user data handling
│   │   │   └── ...           # Other utilities
│   │   ├── hooks/            # Custom React hooks
│   │   ├── emails/           # React Email templates
│   │   ├── __tests__/        # Jest test files
│   │   ├── public/           # Static assets (images, icons)
│   │   ├── artifacts/        # Generated code artifacts
│   │   ├── types/            # TypeScript type definitions
│   │   └── package.json      # Web app dependencies
│   │
│   ├── marketing/            # Marketing website (separate Next.js app)
│   │   ├── app/
│   │   │   ├── blog/         # Blog posts (MDX)
│   │   │   ├── features/     # Feature pages
│   │   │   ├── pricing/      # Pricing page
│   │   │   ├── sitemap.ts    # Dynamic sitemap generation
│   │   │   └── ...           # Other pages (about, faq, etc.)
│   │   ├── components/
│   │   │   └── structured-data/  # Schema.org JSON-LD components
│   │   ├── lib/              # Utilities and content
│   │   ├── public/
│   │   │   └── robots.txt    # Search engine directives
│   │   ├── docs/
│   │   │   └── SEO.md        # SEO maintenance guide
│   │   └── package.json      # Marketing dependencies
│   │
│   └── marketing2/           # Marketing v2 (in development)
│
├── packages/
│   ├── database/             # Shared database layer
│   │   ├── src/
│   │   │   ├── schema.ts          # Drizzle table definitions
│   │   │   ├── queries.ts         # Reusable query functions (CRUD)
│   │   │   ├── migrations/        # SQL migration files
│   │   │   ├── achievements/      # Achievement-specific logic
│   │   │   ├── projects/          # Project queries and utilities
│   │   │   ├── standups/          # Standup logic
│   │   │   ├── performance-reviews/ # Review queries
│   │   │   ├── workstreams/       # Workstream clustering queries
│   │   │   ├── models/            # Data model helpers
│   │   │   ├── types/             # TypeScript type definitions
│   │   │   ├── index.ts           # Public exports
│   │   │   └── __tests__/         # Database tests
│   │   ├── drizzle.config.ts      # Drizzle configuration
│   │   └── package.json
│   │
│   ├── cli/                  # Command-line interface tool
│   │   ├── src/
│   │   │   ├── index.ts           # CLI entry point
│   │   │   ├── commands/          # Command implementations (auth, extract, projects, standup)
│   │   │   ├── connectors/        # Data source connectors (Git, GitHub, Jira)
│   │   │   ├── api/               # API client for backend communication
│   │   │   ├── git/               # Git repository operations
│   │   │   ├── config/            # Configuration management (~/.bragdoc/)
│   │   │   ├── cache/             # Local caching
│   │   │   ├── ai/                # LLM provider configuration
│   │   │   ├── lib/               # Utilities
│   │   │   └── utils/             # Helper functions
│   │   ├── __tests__/            # CLI tests
│   │   └── package.json          # Published to npm as @bragdoc/cli
│   │
│   ├── config/               # Shared configuration types
│   │   └── src/
│   │       └── types.ts      # Configuration interfaces
│   │
│   └── typescript-config/    # Shared TypeScript configurations
│       ├── base.json         # Base config for all packages
│       ├── nextjs.json       # Next.js-specific config
│       └── react-library.json # React library config
│
├── features/                 # Feature documentation
│   └── [feature-name]/       # Detailed specs, requirements
│
├── tasks/                    # Task planning and execution logs
│   └── {issue-number}-{task}/
│       ├── SPEC.md          # Task specification
│       ├── PLAN.md          # Implementation plan
│       └── TEST_PLAN.md     # Manual testing procedures
│
├── docs/                     # Additional documentation
│   └── DATABASE-MIGRATIONS.md # Migration workflow guide
│
├── .claude/                  # Claude Code configuration
│   ├── docs/
│   │   ├── tech/            # Technical documentation
│   │   │   ├── architecture.md
│   │   │   ├── database.md
│   │   │   ├── api-conventions.md
│   │   │   ├── authentication.md
│   │   │   ├── ai-integration.md
│   │   │   ├── cli-architecture.md
│   │   │   ├── frontend-patterns.md
│   │   │   └── deployment.md
│   │   └── standing-orders.md  # Cross-cutting agent directives
│   └── commands/             # Custom slash commands
│
├── scripts/                  # Build and utility scripts
│   ├── prepare-demo-data.ts  # Demo data preparation
│   ├── smoke-test/           # Production smoke tests
│   └── seo-*.ts              # SEO research scripts
│
├── .planning/codebase/       # GSD codebase mapping documents
│   ├── ARCHITECTURE.md       # System architecture and data flow
│   ├── STRUCTURE.md          # Directory layout and file organization
│   ├── CONVENTIONS.md        # Coding conventions and patterns
│   ├── TESTING.md            # Testing patterns and setup
│   ├── STACK.md              # Technology stack
│   ├── INTEGRATIONS.md       # External integrations
│   └── CONCERNS.md           # Technical debt and issues
│
├── turbo.json                # Turborepo pipeline configuration
├── package.json              # Root workspace configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
├── tsconfig.json             # Root TypeScript configuration
├── jest.config.js            # Jest test configuration
├── .eslintrc                 # ESLint configuration
├── biome.json                # Biome formatting configuration
└── README.md                 # Project overview
```

## Directory Purposes

**`apps/web/`:**
- Purpose: Main application where users create accounts, track achievements, generate documents
- Contains: Next.js App Router pages, API routes, React components, utility functions
- Key files: `app/layout.tsx` (root setup), `app/(app)/layout.tsx` (auth wrapper), `app/api/achievements/route.ts` (core API)

**`apps/web/app/(app)/`:**
- Purpose: Authenticated pages (require login)
- Contains: Dashboard, achievements, projects, workstreams, performance reviews, standups
- Pattern: Route groups prevent outer layout re-renders on navigation

**`apps/web/app/(auth)/`:**
- Purpose: Authentication pages (login, register, magic link verification)
- Contains: Auth form, OAuth flows, email verification
- Pattern: Separate layout from authenticated app

**`apps/web/app/api/`:**
- Purpose: RESTful API endpoints for web and CLI consumption
- Contains: 24 route files handling achievements, projects, workstreams, standups, documents, auth
- Pattern: Each resource has directory (e.g., `api/achievements/`) with `route.ts` and nested `[id]/route.ts`

**`apps/web/components/`:**
- Purpose: Reusable React components (UI, features, layouts)
- Contains: Button, Dialog, Sidebar (shadcn/ui), AchievementsTable, ProjectCard (feature components)
- Pattern: Feature-specific subdirectories (e.g., `components/achievements/`)

**`apps/web/lib/`:**
- Purpose: Business logic, utilities, and configuration
- Contains: AI features (embeddings, clustering), authentication setup, email, demo mode, data utilities
- Key subdirectories:
  - `lib/ai/`: LLM providers, prompt rendering, clustering, workstream logic
  - `lib/better-auth/`: Authentication configuration and helpers
  - `lib/email/`: Email sending via Mailgun, unsubscribe handling

**`apps/web/hooks/`:**
- Purpose: Custom React hooks for state management and effects
- Pattern: Named with `use` prefix (e.g., `useAchievements`, `useWorkstreams`)

**`apps/web/__tests__/`:**
- Purpose: Jest unit and integration tests
- Pattern: Mirrors source structure (e.g., `__tests__/api/` mirrors `app/api/`)
- Contains: API route mocks, component tests, integration tests

**`apps/marketing/`:**
- Purpose: Public-facing marketing and information website
- Contains: Landing page, feature pages, blog, pricing, FAQ, legal pages
- Key: Separate from main app for SEO optimization and marketing workflow

**`packages/database/`:**
- Purpose: Centralized database layer using Drizzle ORM
- Contains: Schema definitions, migrations, query functions, type definitions
- Pattern: All database access goes through this package for consistency

**`packages/database/src/schema.ts`:**
- Purpose: Single source of truth for database structure
- Contains: All Drizzle table definitions (User, Achievement, Project, Company, Workstream, etc.)
- Pattern: Tables with UUID primary keys, timestamps, soft deletes via isArchived

**`packages/database/src/queries.ts`:**
- Purpose: Reusable query functions for common operations
- Contains: getAchievements, getProjects, getCounts, getUser, etc.
- Pattern: All queries scoped by userId for security

**`packages/database/src/migrations/`:**
- Purpose: Version-controlled SQL schema changes
- Contains: Numbered migration files (0000_initial_baseline.sql, etc.) with metadata
- Pattern: Applied sequentially via `pnpm db:migrate`, never reversed

**`packages/cli/`:**
- Purpose: Command-line tool for local achievement extraction
- Published to npm as `@bragdoc/cli`
- Contains: Command implementations, connectors, configuration management

**`packages/cli/src/commands/`:**
- Purpose: CLI command implementations
- Contains: `extract.ts` (achievement extraction), `projects.ts` (project init), `auth.ts` (login/logout), `standup.ts` (standup management)
- Pattern: Each command is a Commander.js Command instance

**`packages/cli/src/connectors/`:**
- Purpose: Pluggable multi-source extraction
- Contains: `git-connector.ts` (local commits), `github-connector.ts` (PRs, issues, comments)
- Pattern: Interface-based, enables adding Jira, GitLab, etc. without core changes

**`packages/config/`:**
- Purpose: Shared configuration types
- Contains: TypeScript interfaces for environment variables, config schemas
- Used by: Both web and CLI for consistent configuration

**`packages/typescript-config/`:**
- Purpose: Shared TypeScript configurations to prevent drift
- Contains: `base.json`, `nextjs.json`, `react-library.json`
- Pattern: Extended by individual tsconfig.json files

**`.claude/docs/tech/`:**
- Purpose: Comprehensive technical documentation for LLM consumption
- Contains: Architecture, database, API, auth, AI, CLI, frontend, deployment guides
- Pattern: Single source of truth for implementation guidance

**`scripts/`:**
- Purpose: Utility scripts for development and operations
- Key files:
  - `prepare-demo-data.ts`: Prepares user exports for demo mode
  - `smoke-test/`: Automated production testing
  - `seo-*.ts`: SEO keyword research utilities

## Key File Locations

**Entry Points:**
- `apps/web/app/layout.tsx`: Root layout with providers setup
- `apps/web/app/(app)/layout.tsx`: Authenticated layout with sidebar and auth checking
- `apps/web/app/(auth)/layout.tsx`: Auth page layout
- `packages/cli/src/index.ts`: CLI program setup with command registration

**Configuration:**
- `apps/web/tsconfig.json`: TypeScript config with path aliases (@/, @/database/, etc.)
- `apps/web/next.config.ts`: Next.js configuration
- `apps/web/.env.local`: Environment variables (local development)
- `packages/database/drizzle.config.ts`: Drizzle ORM configuration
- `packages/cli/src/config/`: Configuration file management

**Core Logic:**
- `packages/database/src/schema.ts`: Complete database structure (20+ tables)
- `packages/database/src/queries.ts`: CRUD and complex queries (~900 lines)
- `apps/web/lib/ai/workstreams.ts`: Workstream clustering logic (~1000 lines)
- `apps/web/lib/ai/llm-router.ts`: Provider selection logic
- `apps/web/lib/getAuthUser.ts`: Unified auth helper for both sessions and JWT

**Testing:**
- `apps/web/__tests__/api/achievements.ts`: Example API test
- `packages/database/__tests__/`: Database query tests
- `packages/cli/__tests__/`: CLI command tests

**Database:**
- `packages/database/src/migrations/0000_initial_baseline.sql`: Initial schema
- `packages/database/src/migrations/meta/`: Migration metadata
- `.env.test`: Test database connection

## Naming Conventions

**Files:**
- Server Components: `component.tsx` (no "Server" suffix, default)
- Client Components: `component.tsx` with `'use client'` directive at top
- Utilities: `kebab-case.ts` (e.g., `get-auth-user.ts`, `demo-mode.ts`)
- Types: `types.ts` or `[domain].types.ts` (e.g., `achievement.types.ts`)
- Tests: `__tests__/[path]/[file].test.ts` or `.test.ts` suffix
- API Routes: `route.ts` in route segment directories (e.g., `app/api/achievements/route.ts`)

**Directories:**
- Components: `PascalCase` (e.g., `Achievement`, `AchievementsTable`)
- Features: `kebab-case` (e.g., `better-auth`, `demo-mode`)
- Routes: `kebab-case` with `[]` for dynamic segments (e.g., `(app)`, `[id]`, `[...slug]`)
- Utilities: `kebab-case` (e.g., `lib/ai/`, `lib/email/`)

**Functions:**
- camelCase (e.g., `getAchievements`, `generateEmbedding`, `createProject`)
- Prefix conventions:
  - `get*`: Fetch data (queries)
  - `create*`: Insert data (mutations)
  - `update*`: Modify data (mutations)
  - `delete*`: Remove data (mutations)
  - `*Async`: Explicitly async functions

**Types/Interfaces:**
- PascalCase (e.g., `User`, `Achievement`, `WorkstreamCluster`)
- Use `interface` for object shapes, `type` for unions/utilities
- Prefixes: `*Props`, `*State`, `*Options` for clarity

## Where to Add New Code

**New Feature (e.g., New Achievement Type):**
- Primary code: `apps/web/app/(app)/[feature]/page.tsx` (pages), `apps/web/lib/ai/` (logic)
- Database: Add table to `packages/database/src/schema.ts`, query functions to `packages/database/src/queries.ts`
- API: `apps/web/app/api/[feature]/route.ts`
- Tests: `apps/web/__tests__/api/[feature].test.ts`
- CLI support: `packages/cli/src/commands/` if applicable

**New Component:**
- Implementation: `apps/web/components/[feature]/Component.tsx`
- Tests: `apps/web/__tests__/components/[feature].test.ts`
- Styles: Tailwind classes in component (no separate CSS files)
- State: React hooks, no Redux/Zustand (kept intentionally simple)

**New Utility Function:**
- General utilities: `apps/web/lib/utilities/my-util.ts`
- Feature-specific: `apps/web/lib/[feature]/my-util.ts`
- Database: `packages/database/src/[domain]/my-query.ts`
- CLI: `packages/cli/src/utils/my-util.ts`

**New API Endpoint:**
- Route file: `apps/web/app/api/[resource]/route.ts` (for single resource)
- With ID: `apps/web/app/api/[resource]/[id]/route.ts`
- Nested: `apps/web/app/api/[parent]/[parentId]/[child]/route.ts`
- Pattern: Use `getAuthUser()` first, validate with Zod, call database queries

**New Connector (Multi-Source):**
- Implement `Connector` interface in `packages/cli/src/connectors/[source]-connector.ts`
- Register in `packages/cli/src/connectors/registry.ts`
- Add type to `sourceTypeEnum` in `packages/database/src/schema.ts`
- No changes needed to existing CLI logic (pluggable architecture)

**Database Migration:**
- Schema change: Update `packages/database/src/schema.ts`
- Generate migration: `pnpm db:generate` (creates in `migrations/`)
- Review: Check generated SQL in `migrations/[number]_*.sql`
- Apply locally: `pnpm db:push` (development only)
- Apply to production: `pnpm db:migrate` (via migration runner)

## Special Directories

**`.next/` and `.next-dev/`:**
- Purpose: Generated Next.js build artifacts
- Generated: Yes (by build process)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by pnpm install)
- Committed: No

**`dist/` and `build/`:**
- Purpose: Built/compiled output
- Generated: Yes (by build process)
- Committed: No

**`.turbo/`:**
- Purpose: Turborepo cache
- Generated: Yes (by turbo during builds)
- Committed: No

**`public/`:**
- Purpose: Static assets served at root (images, icons, robots.txt)
- Generated: No (manually maintained)
- Committed: Yes (except user uploads)

**`migrations/meta/`:**
- Purpose: Drizzle migration metadata (snapshots)
- Generated: Yes (by drizzle-kit)
- Committed: Yes (for reproducibility)

**`.env`, `.env.local`, `.env.*.local`:**
- Purpose: Environment variables and secrets
- Generated: No (created manually or via deployment platform)
- Committed: No (in .gitignore)
