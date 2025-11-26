# BragDoc Development Guide

This document provides high-level guidance for developing BragDoc, an AI-powered platform for tracking and documenting professional achievements.

## Table of Contents

- [Technical Documentation](#technical-documentation)
- [Task Management](#task-management)
- [Standing Orders](#standing-orders)
- [Dev Server and Logs](#dev-server-and-logs)
- [Quick Reference Architecture](#quick-reference-architecture)
- [Monorepo Structure](#monorepo-structure)
- [Apps](#apps)
- [Packages](#packages)
- [Testing](#testing)
- [Build Commands](#build-commands)
- [Code Style](#code-style)
- [Git Conventions](#git-conventions)
- [Additional Resources](#additional-resources)

---

## Technical Documentation

**IMPORTANT:** All detailed technical documentation is maintained in `.claude/docs/tech/` for LLM consumption and reference.

### Available Documentation

- **[architecture.md](/.claude/docs/tech/architecture.md)** - System architecture, technology stack, monorepo structure, deployment, and analytics
- **[database.md](/.claude/docs/tech/database.md)** - Complete database schema, query patterns, Drizzle ORM usage, migrations
- **[authentication.md](/.claude/docs/tech/authentication.md)** - Better Auth configuration, OAuth providers, CLI auth flow, unified auth helper
- **[api-conventions.md](/.claude/docs/tech/api-conventions.md)** - RESTful API patterns, request/response formats, validation, CORS
- **[ai-integration.md](/.claude/docs/tech/ai-integration.md)** - LLM providers, prompt engineering, AI SDK usage, streaming
- **[cli-architecture.md](/.claude/docs/tech/cli-architecture.md)** - CLI tool structure, commands, Git operations, configuration
- **[frontend-patterns.md](/.claude/docs/tech/frontend-patterns.md)** - React patterns, Server Components, Tailwind CSS, component composition
- **[deployment.md](/.claude/docs/tech/deployment.md)** - Build process, deployment targets, environment setup

### When to Use Which Documentation

**Planning features:**
- Architecture decisions → `architecture.md`
- Frontend/UI work → `frontend-patterns.md`
- Database schema changes → `database.md`

**Implementing features:**
- API endpoints → `api-conventions.md` + `authentication.md`
- Database queries → `database.md`
- AI/LLM features → `ai-integration.md`
- CLI commands → `cli-architecture.md`

**Deploying:**
- Build configuration → `deployment.md`
- Environment setup → `deployment.md`

### Documentation Maintenance

**When implementing features:** Always review the relevant technical documentation before starting work, and update it after completing significant changes.

**When creating plans:** Reference these documents to understand existing patterns and ensure consistency with established conventions.

---

## Task Management

Tasks are managed through GitHub issues and synced locally via the GitHub Task Sync skill. Each task uses Claude Code Agents and SlashCommands for specification, planning, implementation, and review.

### Task Structure

```
./tasks/{issue-number}-{task-name}/
├── SPEC.md              # Task specification
├── PLAN.md              # Implementation plan
├── TEST_PLAN.md         # Manual testing procedures
└── COMMIT_MESSAGE.md    # Git commit message template
```

**Directory Naming:** Tasks are named `{issue-number}-{task-slug}` to directly reference the GitHub issue. For example: `tasks/188-account-deletion/`

**SPEC.md:** Task description, expected outcome, and requirements. Should start with "Task: <task name>" heading. Use level 2 headings for "Background Reading" and "Specific Requirements" when applicable.

**PLAN.md:** Implementation plan with phased approach, task breakdown, and dependencies. Created by the `plan-writer` agent with full specification coverage.

**TEST_PLAN.md:** Manual testing procedures and acceptance criteria. Integrated with the master test plan via `/add-to-test-plan` SlashCommand.

**COMMIT_MESSAGE.md:** Git commit message template (2-4 paragraphs) describing the changes, created during planning phase.

### GitHub Task Sync Skill

All task files live both locally and on GitHub issues, synchronized via the `github-task-sync` skill. Task files are NOT source-controlled (in `.gitignore`), with GitHub issues as the source of truth.

**Quick Commands:**
```bash
# Create new GitHub issue and task directory
./.claude/skills/github-task-sync/create-issue.sh "Feature title" "Description"

# Push task files to GitHub
./.claude/skills/github-task-sync/push.sh 188 ./tasks/188-account-deletion

# Pull task files from GitHub
./.claude/skills/github-task-sync/pull.sh 188 ./tasks/188-account-deletion

# Read a single file from GitHub
./.claude/skills/github-task-sync/read-issue-file.sh 188 SPEC
```

See `.claude/skills/github-task-sync/SKILL.md` for complete documentation and all available scripts.

### Agent System v2

**Note:** On 2025-10-28, the BragDoc agent system underwent a major refactoring to establish the Writer/Checker pattern.

**Key Changes:**
- All content types (Spec, Plan, Code, Blog) now have dedicated Writer and Checker agents
- SlashCommands follow `/[action]-[content]` naming pattern (e.g., `/write-plan`, `/check-plan`)
- Process documentation follows `[content]-rules.md` naming pattern
- Four-tier agent hierarchy: Manager → Writer → Checker → QA
- Standing Orders system provides cross-cutting concerns for all agents

**Historical Names:** For reference, some agents were renamed:
- `spec-planner` → `plan-writer`
- `plan-executor` → `code-writer`
- `web-app-tester` → `browser-tester`

**Documentation:** See `.claude/docs/after-action-reports/2025-10-28-agent-alignment-refactoring.md` for complete details.

---

## Standing Orders

**All agents check `.claude/docs/standing-orders.md` before beginning work.** This document contains cross-cutting concerns and project-wide directives ensuring consistent behavior.

**Purpose:** Standing orders capture operational requirements spanning multiple agents:

- Development environment monitoring (dev server logs, error checking)
- Testing requirements (when to run tests, what must pass before completion)
- Documentation maintenance (when and how to update docs)
- Context window management (when to delegate vs. handle directly)
- Error handling and recovery patterns
- Quality assurance standards
- Communication protocols

**Location:** `/Users/ed/Code/brag-ai/.claude/docs/standing-orders.md`

**Key Directives:**
- Always check dev server logs at `apps/web/.next-dev.log` before and during implementation
- Run tests before marking tasks complete (`pnpm test` and `pnpm build` must succeed)
- Update relevant documentation after code changes
- Use strategic context window management (delegate when >75% full or specialized expertise needed)
- Follow systematic error handling (log, analyze root cause, check patterns, verify fix, document)
- Complete pre-completion checklist (TypeScript errors, tests, patterns, security, docs, logs, verification)

---

## Dev Server and Logs

The dev server runs on port 3000, with logs continually written to `./apps/web/.next-dev.log`. Scan this file for errors and warnings to debug issues.

---

## Quick Reference Architecture

BragDoc is a **TypeScript monorepo** using:

- **Framework:** Next.js 16 (App Router with React 19+ Server Components)
- **Monorepo:** Turborepo with pnpm workspaces
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Better Auth v1.3.33 with database-backed sessions
- **AI:** Vercel AI SDK with multiple LLM providers (OpenAI, Anthropic, Google, DeepSeek, Ollama)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Deployment:** Cloudflare Workers (via OpenNext)

### Key Principles

- Server Components by default (zero JS unless needed)
- Type safety throughout (strict TypeScript)
- All queries scoped by `userId` for security
- Unified auth helper supports both web sessions and CLI JWT tokens
- **Never use `redirect()` in Server Components** (breaks Cloudflare builds, use fallback UI)
- **Idempotent achievement creation**: Submitting the same (projectId, uniqueSourceId) pair returns existing achievement without error, enabling safe CLI retries

➡️ **See [architecture.md](/.claude/docs/tech/architecture.md) for complete architecture details, technology stack, and deployment info**

---

## Monorepo Structure

```
brag-ai/
├── apps/
│   ├── web/           # Main Next.js application
│   └── marketing/     # Marketing website
├── packages/
│   ├── database/      # Shared database schema, queries, migrations
│   ├── cli/          # Command-line interface tool
│   ├── config/       # Shared configuration
│   └── typescript-config/ # Shared TypeScript configs
├── .claude/          # Agent system and documentation
├── features/         # Feature documentation
├── docs/            # Additional documentation
├── turbo.json       # Turborepo configuration
└── package.json     # Root workspace configuration
```

All packages are managed via pnpm workspaces and orchestrated by Turborepo for optimal build caching.

➡️ **See [architecture.md](/.claude/docs/tech/architecture.md#monorepo-structure) for detailed directory structures**

---

## Apps

### @bragdoc/web

**Location:** `apps/web/`

Main application built with Next.js 16 App Router. Key features:
- Server Components by default
- RESTful API routes with unified authentication
- Route groups: `(app)` for authenticated pages, `(auth)` for login/register
- React Email templates in `emails/`
- AI/LLM utilities in `lib/ai/`

➡️ **See [frontend-patterns.md](/.claude/docs/tech/frontend-patterns.md) for component patterns, zero states, detail pages, and styling**

### @bragdoc/marketing

**Location:** `apps/marketing/`

Marketing and landing pages with comprehensive SEO optimizations:
- Unique metadata for all pages
- Schema.org structured data (Organization, SoftwareApplication, FAQ, BlogPosting, HowTo, Offer)
- Auto-generated sitemap and robots.txt
- Image optimization with AVIF/WebP

**Maintenance Guide:** Full documentation at `apps/marketing/docs/SEO.md`

➡️ **See [frontend-patterns.md](/.claude/docs/tech/frontend-patterns.md) for metadata patterns and SEO implementation**

---

## Packages

### @bragdoc/database

**Location:** `packages/database/`

Centralized database layer using Drizzle ORM.

**Key Patterns:**
- UUID primary keys with `.defaultRandom()`
- Timestamps (`createdAt`, `updatedAt`) with `.defaultNow()`
- Soft deletes via `isArchived` flags
- Foreign keys with cascade delete
- **Always scope queries by userId** for security

**Critical Pattern:**
```typescript
// ALWAYS scope by userId
const data = await db
  .select()
  .from(table)
  .where(eq(table.userId, userId));
```

➡️ **See [database.md](/.claude/docs/tech/database.md) for complete schema, query patterns, migrations, and Drizzle usage**

### @bragdoc/cli

**Location:** `packages/cli/`

Command-line tool for analyzing local repositories and extracting achievements from multiple data sources using a pluggable connector architecture.

**Features:**
- Multi-source support: Git, GitHub, Jira (via pluggable connectors)
- Pluggable connector architecture for extensibility
- Local caching to optimize extraction performance
- OAuth authentication with JWT token storage
- Configuration management for projects and integrations

**Commands:**
- `bragdoc login` - Authenticate with web app
- `bragdoc init` - Initialize repository
- `bragdoc extract` - Extract achievements from configured sources
- `bragdoc cache clear` - Clear commit cache

**Optional Dependencies:**
- **GitHub CLI (`gh`)**: Required for GitHub connector to extract PRs, issues, and remote commits. Install from https://cli.github.com/ and authenticate with `gh auth login`. Without `gh`, the CLI falls back to the Git connector for local repository extraction only.

**Key Architecture:**
The CLI uses a pluggable connector pattern where each data source (Git, GitHub, Jira, etc.) implements a standardized `Connector` interface. The `ConnectorRegistry` manages connector discovery. This enables adding new sources without modifying core CLI logic.

➡️ **See [cli-architecture.md](/.claude/docs/tech/cli-architecture.md) for detailed CLI architecture, connector pattern, commands, and configuration**

### @bragdoc/config

**Location:** `packages/config/`

Shared configuration types and utilities.

### @repo/typescript-config

**Location:** `packages/typescript-config/`

Shared TypeScript configurations: `base.json`, `nextjs.json`, `react-library.json`

---

## Workstreams Feature

### Overview

Workstreams provide automatic semantic clustering of achievements across projects to identify work patterns and themes. The feature uses machine learning to group related achievements, helping users understand their professional development. Users can optionally filter by time period and/or projects when generating workstreams.

### Architecture

- **ML Pipeline:** OpenAI embeddings → DBSCAN clustering → LLM naming
- **Database:** pgvector extension for 1536-dimensional embedding storage
- **API:** RESTful endpoints for generation, CRUD, and manual assignment
- **UI:** Dashboard widget, dedicated page, achievement integration
- **Filtering:** Optional time range and project filters for focused clustering

### Key Components

**Database Tables:**
- `Achievement` - Extended with embedding vectors and workstream assignments
- `Workstream` - Stores clusters with cached centroids
- `WorkstreamMetadata` - Tracks clustering history and generation parameters

**API Endpoints:**
- `POST /api/workstreams/generate` - Trigger clustering (supports optional filters)
- `GET /api/workstreams` - List workstreams
- `GET/PUT/DELETE /api/workstreams/[id]` - CRUD operations
- `POST /api/workstreams/assign` - Manual assignment

**UI Components:**
- `WorkstreamBadge` - Display assignment on achievements
- `WorkstreamCard` - Summary display
- `WorkstreamStatus` - Dashboard widget
- `useWorkstreams` - Data fetching hook

### Filtering for Clustering

Users can optionally specify filters when generating workstreams to focus clustering on specific time periods and/or projects:

**Filter Parameters:**
- `timeRange`: Optional start and end dates (ISO 8601 format, max 24 months)
- `projectIds`: Optional array of project UUIDs to include

**Behavior:**
- All filter parameters are optional
- When no filter provided, defaults to last 12 months (backward compatible)
- Filters apply only to clustering operation (not embedding generation)
- Embeddings are generated for all achievements (cost optimization)
- Filter changes automatically trigger full re-clustering for accuracy
- Achievements outside current filters are auto-assigned to nearest workstreams

### Implementation Details

- **Minimum Requirements:** 20 achievements to enable feature
- **Clustering Algorithm:** DBSCAN with adaptive parameters
- **Data Enrichment:** Helper functions fetch detailed achievement summaries with project/company context
- **Cost Model:** ~$2/year per active user
- **Performance:** <500ms for typical datasets (<1000 achievements), ~50-100ms additional for data enrichment

**Helper Functions:**
- `getAchievementSummaries()` - Fetch achievements with project/company context using LEFT JOINs
- `buildAssignmentBreakdown()` - Group achievements by workstream for incremental responses
- `buildWorkstreamBreakdown()` - Format workstream details for full clustering responses

For detailed technical documentation, see:
- Database schema: `.claude/docs/tech/database.md` (includes generationParams and filteredAchievementCount)
- ML implementation: `.claude/docs/tech/ai-integration.md` (includes filtering strategy section)
- API patterns: `.claude/docs/tech/api-conventions.md` (includes detailed POST /api/workstreams/generate request/response with filters)
- UI components: `.claude/docs/tech/frontend-patterns.md`

---

## Testing

### Testing Setup

- **Framework:** Jest with ts-jest
- **React:** Testing Library
- **Mocking:** jest.mock() for modules

### Test Structure

```
__tests__/
├── api/              # API route tests
├── components/       # Component tests
└── lib/             # Utility function tests
```

### Running Tests

```bash
pnpm test              # All tests
pnpm test:watch        # Watch mode
pnpm test --coverage   # With coverage
pnpm test:cli          # CLI tests only
```

**Example API Route Test:**
```typescript
import { GET } from '@/app/api/achievements/route';
import { auth } from '@/app/(auth)/auth';

jest.mock('@/app/(auth)/auth');

describe('GET /api/achievements', () => {
  it('returns achievements for authenticated user', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-123' } });
    const request = new Request('http://localhost:3000/api/achievements');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

---

## Build Commands

### Development

```bash
pnpm dev                # All apps
pnpm dev:web            # Web app only
pnpm dev:marketing      # Marketing site only

# Database
pnpm db:generate        # Generate migration
pnpm db:push            # Apply to database
pnpm db:studio          # Open Drizzle Studio
```

### Building

```bash
pnpm build              # All packages and apps (uses Turbopack by default)
pnpm build --webpack    # Opt-out to webpack if needed
pnpm build:web          # Web app only
pnpm build:marketing    # Marketing site only
```

### Testing

```bash
pnpm test               # All tests
pnpm test:watch         # Watch mode
pnpm test:cli           # CLI tests only
```

### Linting & Formatting

```bash
pnpm lint               # Lint all
pnpm lint:fix           # Lint and fix
pnpm format             # Format all
```

### Database Commands

```bash
pnpm db:generate        # Generate migration from schema changes
pnpm db:migrate         # Run migrations programmatically (production workflow)
pnpm db:studio          # Open Drizzle Studio (GUI)
pnpm db:push            # Push schema directly (DEVELOPMENT ONLY - never use with production)
```

**Important:** Always use the migration-based workflow (`db:generate` → `db:migrate`) for production. The `db:push` command bypasses migrations and should only be used for local development.

See [docs/DATABASE-MIGRATIONS.md](docs/DATABASE-MIGRATIONS.md) for complete migration workflow documentation.

### Email Development

```bash
pnpm --filter=@bragdoc/web email:dev  # Start React Email preview (port 3002)
# Templates: apps/web/emails/
# Utilities: apps/web/lib/email/
```

---

## Code Style

### TypeScript

- Use TypeScript for all code with strict mode
- Prefer interfaces over types for object shapes
- Explicit return types on public functions

```typescript
// Good
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// Avoid
type User = {
  id: string;
  email: string;
};
```

### React

- Avoid `React.FC` - use proper type definitions
- Functional components only (no classes)
- Named exports instead of default exports
- Destructure props in function signature

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// Avoid
export const Button: React.FC<ButtonProps> = (props) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
```

### Naming

- **PascalCase:** Components, types, interfaces
- **camelCase:** Functions, variables, properties
- **SCREAMING_SNAKE_CASE:** Constants
- **lowercase-with-dashes:** Directories

### Imports

Use import aliases:

```typescript
// Good
import { Button } from '@/components/ui/button';
import { getUser } from '@/database/queries';

// Avoid
import { Button } from '../../../components/ui/button';
```

### File Organization

```typescript
// 1. External imports
import { useState } from 'react';
import { z } from 'zod';

// 2. Internal imports
import { Button } from '@/components/ui/button';
import { getUser } from '@/database/queries';

// 3. Types
interface ComponentProps {
  // ...
}

// 4. Component/function
export function Component({}: ComponentProps) {
  // ...
}
```

### Error Handling

- Throw errors in server code
- Return error states in client code
- Use try-catch around external calls
- Log errors with context

---

## Git Conventions

### Commit Messages

Follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting)

**Examples:**
```
feat: add project color picker
fix: resolve authentication redirect loop
docs: update API documentation
refactor: simplify achievement extraction logic
```

### Branch Strategy

- `main` - Production branch
- `v2` - Current development branch (if applicable)
- Feature branches as needed

### Changesets

```bash
pnpm changeset          # Create a changeset
pnpm changeset version  # Update versions
```

### Dependency Management

**Dependabot** automatically monitors and updates dependencies:

- **Configuration:** `.github/dependabot.yml`
- **Schedule:** Weekly updates on Mondays
- **Scope:** All workspaces (root, apps/*, packages/*) and GitHub Actions
- **Grouping:** Related dependencies grouped to reduce PR spam
- **Safety:** Major version updates ignored for critical dependencies (Next.js, React)

**When Dependabot creates PRs:**
1. Review changelog/release notes for breaking changes
2. Run tests locally: `pnpm test && pnpm build`
3. Test critical functionality in dev environment
4. Merge if all checks pass

---

## Additional Resources

### Important Files

- `FEATURES.md` - Feature documentation
- `TODO.md` - Project roadmap
- `features/` - Detailed feature specs
- `docs/` - Additional documentation
- `.claude/docs/tech/` - **Comprehensive technical documentation**
- `.claude/docs/standing-orders.md` - **Agent operational directives**

### Environment Variables

**Required:**
- `POSTGRES_URL` - Database connection string
- `BETTER_AUTH_SECRET` - Better Auth secret key (or `AUTH_SECRET` for backward compatibility)
- `BETTER_AUTH_URL` - Application URL (or `NEXTAUTH_URL` for backward compatibility)
- `OPENAI_API_KEY` - OpenAI API key (for LLM)
- `STRIPE_SECRET_KEY` - Stripe secret key

**Optional:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `MAILGUN_API_KEY` - Mailgun for emails
- `DEMO_MODE_ENABLED` - Enable demo mode backend
- `NEXT_PUBLIC_DEMO_MODE_ENABLED` - Enable demo mode UI (must match backend)
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host URL

### Useful Commands

```bash
# Setup project
pnpm setup

# Clean install
rm -rf node_modules .turbo .next && pnpm install

# Check for issues
pnpm lint && pnpm test && pnpm build

# Prepare demo data from user export
pnpm prepare-demo-data path/to/exported-data.json

# Deploy web app
pnpm --filter=@bragdoc/web deploy
```

The `prepare-demo-data` script automates the preparation of demo data by filtering projects to a whitelist, consolidating all companies into "Cyberdyne", updating all entity references, and validating the output against the export schema.

---

## Summary

This codebase follows modern full-stack TypeScript patterns with:

- **Monorepo architecture** for code sharing
- **Server Components** for optimal performance
- **Type-safe database access** via Drizzle ORM
- **Unified authentication** for web and CLI
- **AI-powered features** via multiple LLM providers
- **Component-driven UI** with shadcn/ui + Tailwind CSS

### When in Doubt

1. **Check technical documentation** in `.claude/docs/tech/` for detailed patterns
2. **Check existing patterns** in similar features
3. **Prefer server-side logic** over client-side
4. **Always validate user input** with Zod
5. **Always scope queries by userId** for security
6. **Use TypeScript strictly** with explicit types
7. **Write tests** for critical paths
8. **Document complex logic** in code and technical docs

### Quick Navigation

- **Need architecture info?** → [architecture.md](/.claude/docs/tech/architecture.md)
- **Need database patterns?** → [database.md](/.claude/docs/tech/database.md)
- **Need API patterns?** → [api-conventions.md](/.claude/docs/tech/api-conventions.md)
- **Need auth patterns?** → [authentication.md](/.claude/docs/tech/authentication.md)
- **Need frontend patterns?** → [frontend-patterns.md](/.claude/docs/tech/frontend-patterns.md)
- **Need AI/LLM patterns?** → [ai-integration.md](/.claude/docs/tech/ai-integration.md)
- **Need CLI patterns?** → [cli-architecture.md](/.claude/docs/tech/cli-architecture.md)
- **Need deployment info?** → [deployment.md](/.claude/docs/tech/deployment.md)
