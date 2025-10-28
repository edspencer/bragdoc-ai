# BragDoc Development Guide

This document provides comprehensive guidance for developing BragDoc, an AI-powered platform for tracking and documenting professional achievements.

## Table of Contents

- [Technical Documentation](#technical-documentation)
- [Task Management](#task-management)
- [Standing Orders](#standing-orders)
- [Project Architecture](#project-architecture)
- [Monorepo Structure](#monorepo-structure)
- [Apps](#apps)
- [Packages](#packages)
- [Database Layer](#database-layer)
- [API Conventions](#api-conventions)
- [Authentication](#authentication)
- [Component Patterns](#component-patterns)
- [Styling](#styling)
- [Testing](#testing)
- [AI/LLM Integration](#aillm-integration)
- [CLI Tool](#cli-tool)
- [Build Commands](#build-commands)
- [Code Style](#code-style)
- [Git Conventions](#git-conventions)

---

## Technical Documentation

**IMPORTANT:** Comprehensive technical documentation is maintained in `.claude/docs/tech/` for LLM consumption and reference.

This documentation provides detailed information about:

- **[architecture.md](/.claude/docs/tech/architecture.md)** - System architecture, technology stack, monorepo structure, and deployment
- **[database.md](/.claude/docs/tech/database.md)** - Complete database schema, query patterns, and Drizzle ORM usage
- **[authentication.md](/.claude/docs/tech/authentication.md)** - NextAuth configuration, OAuth providers, CLI auth flow
- **[api-conventions.md](/.claude/docs/tech/api-conventions.md)** - RESTful API patterns, request/response formats, validation
- **[ai-integration.md](/.claude/docs/tech/ai-integration.md)** - LLM providers, prompt engineering, AI SDK usage
- **[cli-architecture.md](/.claude/docs/tech/cli-architecture.md)** - CLI tool structure, commands, Git operations
- **[frontend-patterns.md](/.claude/docs/tech/frontend.md)** - React patterns, Server Components, Tailwind CSS
- **[deployment.md](/.claude/docs/tech/deployment.md)** - Build process, deployment targets, environment setup

**When implementing features:** Always review the relevant technical documentation before starting work, and update it after completing significant changes. Plans should include specific tasks to update technical documentation when patterns or architecture change.

**When creating plans:** Reference these documents to understand existing patterns and ensure consistency with established conventions.

## Task Management

Some tasks are planned out in the ./tasks directory (this is source controlled currently). There are a variety of Claude Code Agents and SlashCommands that are used to specify, plan, implement and review tasks. Generally speaking, each such task gets the following files:

./tasks/TASK-NAME/

- SPEC.md
- PLAN.md
- LOG.md

The SPEC.md file is the specification for the task. It should be written in markdown and should include a clear description of the task, the expected outcome, and any relevant context. It is generally expected to start with a clear "Task: <task name>" heading, and then fairly freeform description, though special attention is paid to level 2 markdown headings for Background Reading and Specific Requirements, so use those headings when possible.

The PLAN.md file is the plan for the task. It is typically written by the spec-planner Claude Code agent, which in turn will delegate parts of the task to other SlashCommands or Agents.

The LOG.md file is the log for the task. As the `implement` SlashCommand (as used by the `plan-executor` Claude Code agent) runs, it will update the LOG.md file with the progress of the task.

### Agent System v2

**Note:** On 2025-10-28, the BragDoc agent system underwent a major refactoring to establish the Writer/Checker pattern. This "Agent System v2" standardized naming conventions, introduced quality assurance workflows, and created a Standing Orders system for cross-cutting concerns.

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

**Documentation:** See the complete after-action report at `.claude/docs/after-action-reports/2025-10-28-agent-alignment-refactoring.md` for details on the refactoring process, lessons learned, and recommendations for future improvements.

## Standing Orders

**All agents check `.claude/docs/standing-orders.md` before beginning work.** This document contains cross-cutting concerns and project-wide directives that apply to all agents, ensuring consistent behavior across the team.

**Purpose:** Standing orders capture operational requirements that span multiple agents and would otherwise need to be duplicated across agent definitions. They serve as a single source of truth for:

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
- Update relevant documentation after code changes (technical docs, user docs, CLAUDE.md)
- Use strategic context window management (delegate when >75% full or when specialized expertise needed)
- Follow systematic error handling (log, analyze root cause, check patterns, verify fix, document)
- Complete pre-completion checklist (TypeScript errors, tests, patterns, security, docs, logs, verification)

**Usage:** Agents automatically reference standing orders at startup. When creating or updating agents, the agent-maker ensures the standing orders check is present in the agent body structure.

## Dev server and logs

The dev server is almost always running whenever you are working. The server runs on port 3000, and its logs are continually written to ./apps/web/.next-dev.log in the root of the project. Scan this file for errors and warnings, and use it to debug issues.

## Project Architecture

BragDoc is a full-stack TypeScript monorepo using:

- **Framework**: Next.js 16 (App Router with React 19+ Server Components)
- **Monorepo**: Turborepo with pnpm workspaces
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: NextAuth.js with JWT strategy
- **AI**: Vercel AI SDK with multiple LLM providers (OpenAI, DeepSeek, Google)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Cloudflare Workers (via OpenNext)

### Key Technologies

- **Runtime**: Node.js + Edge Runtime (Cloudflare)
- **Type Safety**: TypeScript with strict mode
- **Testing**: Jest with Testing Library
- **Linting**: Biome + ESLint
- **Package Manager**: pnpm 9.5.0

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
├── features/         # Feature documentation
├── docs/            # Additional documentation
├── turbo.json       # Turborepo configuration
└── package.json     # Root workspace configuration
```

### Workspace Configuration

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

All packages are managed via pnpm workspaces and orchestrated by Turborepo for optimal build caching and parallelization.

---

## Apps

### @bragdoc/web

**Location**: `apps/web/`

The main application built with Next.js 16 App Router.

#### Directory Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (app)/             # Main app layout group
│   │   ├── achievements/  # Achievements pages
│   │   ├── projects/      # Projects pages
│   │   ├── companies/     # Companies pages
│   │   ├── reports/       # Reports pages ("For my manager")
│   │   └── ...
│   ├── (auth)/            # Auth layout group (login, register)
│   ├── api/               # API routes
│   │   ├── achievements/  # Achievement CRUD
│   │   ├── projects/      # Project CRUD
│   │   ├── companies/     # Company CRUD
│   │   ├── documents/     # Document CRUD + AI generation
│   │   ├── cli/           # CLI-specific endpoints
│   │   ├── auth/          # NextAuth endpoints
│   │   └── ...
│   ├── cli-auth/          # CLI authentication flow
│   └── unsubscribed/      # Email unsubscribe page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── achievements/     # Achievement-specific components
│   ├── projects/         # Project-specific components
│   ├── companies/        # Company-specific components
│   ├── dashboard/        # Dashboard components
│   └── ...
├── emails/               # React Email templates
│   └── welcome.tsx      # Welcome email template
├── lib/                  # Utility functions
│   ├── ai/              # AI/LLM utilities
│   │   ├── prompts/     # MDX prompt files
│   │   ├── llm-router.ts
│   │   └── extract-achievements.ts
│   ├── email/           # Email utilities
│   │   ├── client.ts         # sendEmail, sendWelcomeEmail, renderWelcomeEmail
│   │   ├── process-incoming.ts  # processIncomingEmail for achievement extraction
│   │   ├── unsubscribe.ts    # Unsubscribe token management
│   │   └── types.ts          # Email type definitions
│   ├── stripe/          # Stripe integration
│   └── getAuthUser.ts   # Unified authentication helper
├── hooks/               # Custom React hooks
├── __tests__/          # Test files
└── public/             # Static assets
```

#### Key Features

- **Server Components**: Default for all components unless client interactivity needed
- **API Routes**: RESTful endpoints with unified authentication
- **Route Groups**: `(app)` for authenticated pages, `(auth)` for login/register
- **Middleware**: Authentication checks, CORS handling

#### Dependencies

Key dependencies include:

- `@bragdoc/database` - Database access
- `@react-email/components` - React Email component primitives
- `@react-email/render` - Server-side email rendering
- `mailgun.js` - Mailgun email service client
- `ai` - Vercel AI SDK
- `next-auth` - Authentication
- `stripe` - Payment processing
- `mdx-prompt` - Prompt engineering with MDX

### @bragdoc/marketing

**Location**: `apps/marketing/`

Marketing and landing pages with similar Next.js structure but focused on public content.

#### SEO Implementation

The marketing site implements comprehensive SEO optimizations:

**Metadata Requirements:**
- All pages must have unique `title`, `description`, and `keywords`
- Include `alternates.canonical` to prevent duplicate content
- Add Open Graph and Twitter Card tags for social sharing
- See `.claude/docs/tech/frontend-patterns.md` for metadata pattern

**Schema.org Structured Data:**
- **Location**: `apps/marketing/components/structured-data/`
- **Available schemas**: Organization, SoftwareApplication, FAQ, BlogPosting, HowTo, Offer
- **Usage**: Import and render schema component at top of page
- **Validation**: Test with https://search.google.com/test/rich-results

**Sitemap & Robots:**
- **Sitemap**: Auto-generated from `apps/marketing/app/sitemap.ts`
- **robots.txt**: Static file at `apps/marketing/public/robots.txt`
- **Adding pages**: Update `staticPages` array in `sitemap.ts`

**Image Optimization:**
- Enabled in `next.config.mjs` with AVIF and WebP formats
- Always use Next.js `<Image>` component
- Provide descriptive alt text with keywords

**Maintenance Guide:**
- Full documentation at `apps/marketing/docs/SEO.md`
- Technical patterns in `.claude/docs/tech/frontend-patterns.md`

---

## Packages

### @bragdoc/database

**Location**: `packages/database/`

Centralized database layer using Drizzle ORM.

#### Structure

```
packages/database/src/
├── schema.ts           # Database schema definitions
├── queries.ts          # Reusable query functions
├── index.ts           # Public API exports
├── migrations/        # SQL migrations
│   ├── 0000_*.sql
│   ├── 0001_*.sql
│   └── meta/
├── projects/
│   └── queries.ts     # Project-specific queries
├── achievements/
│   └── utils.ts       # Achievement utilities
└── types/
    └── achievement.ts # Type definitions
```

#### Schema Patterns

All tables use:

- **UUID primary keys**: `uuid('id').primaryKey().notNull().defaultRandom()`
- **Timestamps**: `createdAt`, `updatedAt` with `.defaultNow()`
- **Soft deletes**: Where applicable (e.g., `isArchived` flags)
- **Foreign keys**: With cascade delete `{ onDelete: 'cascade' }`

Example:

```typescript
export const achievement = pgTable('Achievement', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // ... other fields
});
```

#### Query Patterns

- **Always scope by userId** for security
- **Use transactions** for multi-table operations
- **Return typed results** using Drizzle's `InferSelectModel`
- **Export reusable query functions**

Example:

```typescript
export async function getProjectsByUserId(
  userId: string
): Promise<ProjectWithCompany[]> {
  const results = await db
    .select({
      /* ... */
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(eq(project.userId, userId))
    .orderBy(desc(project.startDate));

  return results.map((row) => ({
    ...row,
    company: row.company || null,
  }));
}
```

#### Migrations

- **Generated via Drizzle Kit**: `pnpm db:generate`
- **Applied via custom script**: `packages/database/src/migrate.ts`
- **Never edit migrations manually** after generation
- **Version control all migrations**

### @bragdoc/cli

**Location**: `packages/cli/`

Command-line tool for local Git repository analysis.

#### Structure

```
packages/cli/src/
├── index.ts              # CLI entry point
├── commands/            # CLI commands
│   ├── auth.ts         # Login/logout
│   ├── repos.ts        # Repository management
│   ├── extract.ts      # Achievement extraction
│   └── cache.ts        # Cache management
├── api/
│   └── client.ts       # API client for web app
├── config/             # Configuration management
│   ├── types.ts        # Config type definitions
│   ├── index.ts        # Config CRUD
│   └── paths.ts        # Path utilities
├── git/                # Git operations
│   ├── operations.ts   # Git command wrappers
│   └── types.ts
├── utils/              # Utilities
│   ├── logger.ts       # Winston logger
│   └── device.ts       # Device info
└── ai/                 # AI integration (for local processing)
```

#### CLI Commands

- `bragdoc login` - Authenticate with web app (opens browser, receives JWT)
- `bragdoc init` - Initialize repository (alias for `repos add`)
- `bragdoc repos add` - Add repository and sync with web app
- `bragdoc extract` - Extract achievements from commits
- `bragdoc cache clear` - Clear commit cache

#### API Integration

The CLI uses a unified API client that:

- Authenticates via JWT tokens (stored in `~/.bragdoc/config.yml`)
- Makes requests to `/api/*` endpoints
- Handles authentication errors gracefully
- Syncs `projectId` between CLI and web app

### @bragdoc/config

**Location**: `packages/config/`

Shared configuration types and utilities.

### @repo/typescript-config

**Location**: `packages/typescript-config/`

Shared TypeScript configurations:

- `base.json` - Base config
- `nextjs.json` - Next.js specific
- `react-library.json` - React library config

---

## Database Layer

### Drizzle ORM Usage

#### Connection

```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql);
```

#### Querying

```typescript
// Simple select
const users = await db.select().from(user).where(eq(user.id, userId));

// With joins
const projects = await db
  .select({
    id: project.id,
    name: project.name,
    company: company,
  })
  .from(project)
  .leftJoin(company, eq(project.companyId, company.id))
  .where(eq(project.userId, userId));

// With aggregations
const stats = await db
  .select({
    projectId: achievement.projectId,
    count: count(),
    avgImpact: avg(achievement.impact),
  })
  .from(achievement)
  .where(eq(achievement.userId, userId))
  .groupBy(achievement.projectId);
```

#### Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.insert(project).values({
    /* ... */
  });
  await tx.insert(achievement).values({
    /* ... */
  });
});
```

### Schema Organization

- **Core tables**: `user`, `session`, `account`, `verificationToken`
- **Business tables**: `achievement`, `project`, `company`, `userMessage`
- **Relations**: Defined via Drizzle's relations API
- **Enums**: TypeScript enums exported alongside schema

Example:

```typescript
export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived',
}

export const project = pgTable('Project', {
  status: varchar('status', { length: 32 }).notNull().default('active'),
  // ...
});
```

---

## API Conventions

### Route Structure

All API routes in `apps/web/app/api/` follow RESTful conventions:

```
/api/achievements       GET (list), POST (create)
/api/achievements/[id]  GET (read), PUT (update), DELETE (delete)
/api/projects           GET (list), POST (create)
/api/projects/[id]      GET (read), PUT (update), DELETE (delete)
/api/documents          GET (list), POST (create)
/api/documents/[id]     GET (read), PUT (update), DELETE (delete)
/api/documents/generate POST (generate document from achievements via AI)
```

### Authentication

All API routes use the **unified authentication helper**:

```typescript
import { getAuthUser } from 'lib/getAuthUser';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // auth.user contains user data
  // auth.source is 'session' (browser) or 'jwt' (CLI)
}
```

This supports both:

- **Browser sessions**: Via NextAuth cookies
- **CLI requests**: Via JWT in `Authorization: Bearer <token>` header

### Request/Response Patterns

#### Standard Success Response

```typescript
return NextResponse.json(data, { status: 200 });
```

#### Error Responses

```typescript
// Validation error
return NextResponse.json(
  { error: 'Validation Error', details: zodError.errors },
  { status: 400 }
);

// Not found
return NextResponse.json({ error: 'Not Found' }, { status: 404 });

// Server error
return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
```

#### Pagination

```typescript
const { achievements, total } = await getAchievements({
  userId,
  limit: 10,
  offset: (page - 1) * 10,
});

return NextResponse.json({
  achievements,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
});
```

### Validation

Use Zod for all request validation:

```typescript
const createSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']),
});

const body = await request.json();
const validatedData = createSchema.parse(body); // Throws on error
```

### CORS

For CLI requests, API routes return appropriate CORS headers:

```typescript
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

---

## Authentication

### NextAuth Configuration

**Location**: `apps/web/app/(auth)/auth.ts`

#### Providers

- **Magic Links** (passwordless email authentication via NextAuth Email provider)
- **Google OAuth**
- **GitHub OAuth**

#### Session Strategy

Uses JWT strategy for stateless authentication:

```typescript
{
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account }) {
      // Populate JWT with user data
      if (user) {
        token.id = user.id;
        token.preferences = user.preferences;
        // ...
      }
      return token;
    },
    async session({ session, token }) {
      // Populate session from JWT
      session.user.id = token.id;
      session.user.preferences = token.preferences;
      // ...
      return session;
    },
  },
}
```

### CLI Authentication Flow

1. User runs `bragdoc login`
2. CLI starts local server on port 5556
3. Opens browser to `/cli-auth?state=[random]&port=5556`
4. User authenticates via NextAuth in browser
5. Web app generates JWT token via `/api/cli/token`
6. Token sent to CLI's local server
7. CLI validates state and saves token to `~/.bragdoc/config.yml`
8. Future CLI requests include `Authorization: Bearer <token>` header

### Unified Auth Helper

**Location**: `apps/web/lib/getAuthUser.ts`

Checks both session cookies (browser) and JWT tokens (CLI):

```typescript
export async function getAuthUser(request: Request) {
  // Try session first
  const session = await auth();
  if (session?.user?.id) {
    return { user: session.user, source: 'session' };
  }

  // Check JWT in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET!,
      salt: '',
    });
    if (decoded?.id) {
      return { user: decoded as User, source: 'jwt' };
    }
  }

  return null;
}
```

### Protected Routes

Use proxy middleware for page-level protection:

```typescript
// proxy.ts (Next.js 16+)
import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import type { NextMiddleware } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth as NextMiddleware;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Note:** Prior to Next.js 16, this file was named `middleware.ts`.

---

## Component Patterns

### Directory Organization

- **Feature-based**: Group related components (`achievements/`, `projects/`)
- **UI primitives**: Generic components in `ui/` (from shadcn/ui)
- **Shared components**: Top-level `components/` for cross-feature usage

### Naming Conventions

- **PascalCase** for component files: `AchievementCard.tsx`
- **camelCase** for utility files: `formatDate.ts`
- **lowercase-with-dashes** for directories: `form-wizard/`

### Component Patterns

#### Server Components (Default)

```typescript
// app/achievements/page.tsx
export default async function AchievementsPage() {
  const session = await auth();
  const achievements = await getAchievementsByUserId(session.user.id);

  return <AchievementsTable data={achievements} />;
}
```

**IMPORTANT**: Never use `redirect()` from `next/navigation` in Server Components. This breaks Cloudflare Workers builds. Use fallback UI instead:

```typescript
// ❌ WRONG - Breaks Cloudflare Workers build
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect('/login'); // ❌ Build error
  }
  // ...
}

// ✅ CORRECT - Use fallback UI
export default async function Page() {
  const session = await auth();
  if (!session) {
    return <div className="p-4">Please log in.</div>; // ✅ Works
  }
  // ...
}
```

The proxy middleware at `apps/web/proxy.ts` handles authentication redirects at the route level, so this fallback UI is rarely shown to users. See `apps/web/app/cli-auth/page.tsx` for a complete example.

#### Client Components

Use `'use client'` directive only when needed:

```typescript
'use client';

import { useState } from 'react';

export function InteractiveComponent() {
  const [state, setState] = useState(0);
  // ...
}
```

#### Zero State Components

Zero states guide new users through initial setup when they have no data. Located in `components/[feature]/[feature]-zero-state.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function DashboardZeroState() {
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const handleCheckForData = async () => {
    setIsChecking(true);
    router.refresh(); // Re-fetch server component data
    setTimeout(() => setIsChecking(false), 1000);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center">Welcome!</h1>
        {/* Setup instructions */}
        <Button onClick={handleCheckForData} disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Check for data'}
        </Button>
      </div>
    </div>
  );
}
```

**Zero State Pattern**:
- Centered layout with `max-w-2xl` constraint
- Step-by-step instructions for initial setup
- Interactive button uses `router.refresh()` to re-check data
- Conditionally rendered based on data availability

**Example Usage in Server Component**:
```typescript
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please log in.</div>;
  }

  const stats = await getAchievementStats({ userId: session.user.id });
  const hasNoData = stats.totalAchievements === 0;

  return (
    <div>
      {hasNoData ? <DashboardZeroState /> : <DashboardContent />}
    </div>
  );
}
```

See `.claude/docs/tech/frontend-patterns.md` for comprehensive zero state documentation.

#### Detail Page Pattern

For entity detail pages (e.g., `/reports/:id`, `/projects/:id`), use a split pattern:

- **Server Component**: Fetches entity data with joins, handles authentication, returns 404 if not found
- **Client Component**: Manages interactivity, local state, optimistic updates

```typescript
// Server component (page.tsx)
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return <div>Please log in.</div>;

  const entity = await fetchEntityWithJoins(id, session.user.id);
  if (!entity) notFound();

  return <DetailView initialEntity={entity} />;
}

// Client component (detail-view.tsx)
'use client';
export function DetailView({ initialEntity }: Props) {
  const [entity, setEntity] = useState(initialEntity);
  // Handle user interactions, optimistic updates
}
```

See `.claude/docs/tech/frontend-patterns.md` for comprehensive detail page patterns including canvas editor integration, print-ready rendering, and metadata edit dialogs.

#### Server Actions

For mutations, prefer server actions over API routes:

```typescript
'use server';

export async function createAchievement(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Validate and create
  const achievement = await db.insert(achievement).values({
    userId: session.user.id,
    title: formData.get('title'),
    // ...
  });

  revalidatePath('/achievements');
  return achievement;
}
```

### Component Composition

Use composition over prop drilling:

```typescript
// Good
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Avoid
<Card title="Title" content="Content" />
```

### Prop Types

Prefer interfaces over types:

```typescript
// Good
interface AchievementCardProps {
  achievement: Achievement;
  onEdit?: (id: string) => void;
}

// Avoid
type AchievementCardProps = {
  achievement: Achievement;
  onEdit?: (id: string) => void;
};
```

### Export Patterns

Use **named exports** instead of default exports:

```typescript
// Good
export function AchievementCard({ achievement }: AchievementCardProps) {}

// Avoid
export default function AchievementCard({
  achievement,
}: AchievementCardProps) {}
```

---

## Styling

### Tailwind CSS

Configuration: `apps/web/tailwind.config.js`

#### Custom Theme

Uses CSS variables for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

Access via Tailwind classes:

```tsx
<div className="bg-background text-foreground">
  <h1 className="text-primary">Title</h1>
</div>
```

### shadcn/ui

All UI components are from shadcn/ui, installed via CLI and customized locally.

**Location**: `apps/web/components/ui/`

Components include:

- `button.tsx`, `input.tsx`, `label.tsx`
- `dialog.tsx`, `popover.tsx`, `dropdown-menu.tsx`
- `table.tsx`, `card.tsx`, `tabs.tsx`
- And many more...

### Styling Conventions

1. **Use Tailwind utilities** over custom CSS
2. **Use `cn()` helper** for conditional classes:

   ```typescript
   import { cn } from '@/lib/utils';

   <div className={cn(
     "base-classes",
     isActive && "active-classes",
     className
   )} />
   ```

3. **Responsive design**: Mobile-first with Tailwind breakpoints
4. **Dark mode**: Use `dark:` variant for dark mode styles
5. **Spacing**: Use Tailwind's spacing scale (p-4, mt-2, etc.)

### Typography

Uses **Geist font** (sans and mono):

```tsx
<div className="font-sans">Sans serif text</div>
<code className="font-mono">Monospace code</code>
```

---

## Testing

### Testing Setup

- **Framework**: Jest with ts-jest
- **React**: Testing Library
- **Mocking**: jest.mock() for modules

### Test Structure

```
__tests__/
├── api/
│   └── achievements/
│       └── route.test.ts
├── components/
│   └── AchievementCard.test.tsx
└── lib/
    └── utils.test.ts
```

### API Route Tests

```typescript
import { GET } from '@/app/api/achievements/route';
import { auth } from '@/app/(auth)/auth';

jest.mock('@/app/(auth)/auth');

describe('GET /api/achievements', () => {
  it('returns achievements for authenticated user', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-123' },
    });

    const request = new Request('http://localhost:3000/api/achievements');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.achievements).toBeDefined();
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { AchievementCard } from './AchievementCard';

describe('AchievementCard', () => {
  it('renders achievement title', () => {
    render(<AchievementCard achievement={{ title: 'Test' }} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test --coverage

# CLI tests
pnpm test:cli
```

---

## AI/LLM Integration

### LLM Router

**Location**: `apps/web/lib/ai/llm-router.ts`

Dynamically selects LLM provider based on:

- Task type (extraction, generation, chat)
- User's subscription level
- Provider availability

```typescript
import { getLLM } from '@/lib/ai/llm-router';

const llm = await getLLM(user, 'extraction');
const result = await generateText({
  model: llm,
  prompt: '...',
});
```

### Prompt Engineering

Uses **mdx-prompt** for structured prompts:

**Location**: `apps/web/lib/ai/prompts/*.prompt.mdx`

Example:

```mdx
---
model: gpt-4
temperature: 0.7
---

Extract achievements from the following commits:

{commits}

Return as JSON array.
```

Usage:

```typescript
import { execute } from 'mdx-prompt';
import extractPrompt from './prompts/extract.prompt.mdx';

const result = await execute(extractPrompt, { commits });
```

### Achievement Extraction

**Location**: `apps/web/lib/ai/extract-achievements.ts`

Processes Git commits and extracts achievements:

1. **Fetch commits** from repository
2. **Batch process** (max 100 commits at a time)
3. **Send to LLM** with structured prompt
4. **Parse response** (JSON array of achievements)
5. **Save to database** with metadata

### Streaming Responses

For chat features, use streaming:

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: llm,
  messages,
  onFinish: async ({ text }) => {
    await saveMessage(text);
  },
});

return result.toDataStreamResponse();
```

---

## CLI Tool

### Architecture

The CLI is a standalone Node.js application that:

- Reads Git history locally
- Communicates with web app via API
- Stores configuration in `~/.bragdoc/config.yml`
- Caches processed commits to avoid duplication

### Configuration

**Location**: `~/.bragdoc/config.yml`

```yaml
auth:
  token: 'jwt-token-here'
  expiresAt: 1234567890
repositories:
  - path: /path/to/repo
    name: My Project
    enabled: true
    maxCommits: 300
    cronSchedule: '0 18 * * *'
    projectId: 'uuid-from-web-app'
settings:
  defaultTimeRange: '30d'
  maxCommitsPerBatch: 10
  defaultMaxCommits: 300
  cacheEnabled: true
  apiBaseUrl: 'https://www.bragdoc.ai'
```

#### Extraction Configuration

Projects and global settings can specify extraction detail levels:

```yaml
settings:
  defaultExtraction:
    detailLevel: 'standard'  # minimal | standard | detailed | comprehensive

projects:
  - path: /path/to/repo
    extraction:
      includeStats: true
      includeDiff: true
      maxDiffLinesPerCommit: 1000
      excludeDiffPatterns: ['*.lock', 'dist/**']
      prioritizeDiffPatterns: ['src/**']
```

Detail levels:
- **minimal**: Commit messages only
- **standard**: Messages + file statistics (default)
- **detailed**: Messages + stats + limited diffs
- **comprehensive**: Messages + stats + extensive diffs

### Command Structure

Each command is a separate module in `packages/cli/src/commands/`:

```typescript
// commands/repos.ts
import { Command } from 'commander';

export const reposCommand = new Command('repos')
  .description('Manage repositories')
  .addCommand(addCommand)
  .addCommand(listCommand)
  .addCommand(removeCommand);
```

### API Client

**Location**: `packages/cli/src/api/client.ts`

```typescript
const client = await createApiClient(); // Loads config automatically

const projects = await client.get('/api/projects');
const newProject = await client.post('/api/projects', { name: 'My Project' });
```

### Git Operations

**Location**: `packages/cli/src/git/operations.ts`

Wraps Git commands using `execSync`:

```typescript
export function getRepositoryInfo(path = '.'): RepositoryInfo {
  const remoteUrl = execSync('git config --get remote.origin.url', {
    cwd: path,
  })
    .toString()
    .trim();

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: path,
  })
    .toString()
    .trim();

  return { remoteUrl, currentBranch, path };
}
```

#### Enhanced Collection

```typescript
import { collectGitCommitsEnhanced } from '../git/operations';

const commits = collectGitCommitsEnhanced(
  branch,
  maxCommits,
  repository,
  extractionConfig  // Optional ExtractionConfig
);
```

Supports optional file statistics and code diffs with intelligent size limiting.

---

## Analytics

### PostHog Integration

BragDoc uses PostHog for privacy-first product analytics with GDPR-compliant cookieless tracking.

**Marketing Site (`apps/marketing`):**
- **Cookieless mode**: `persistence: 'memory'` - no cookies or localStorage
- **No consent banner required**: Fully GDPR compliant without user consent
- **Session-only tracking**: Analytics data not persisted between visits
- **Automatic pageviews**: Tracks page navigation

**Web App (`apps/web`):**
- **Conditional persistence**: Memory-only before authentication, `localStorage+cookie` after login
- **User identification**: Automatic `identify()` call on authentication with email and name
- **Session-aware**: Reacts to NextAuth session changes
- **Cross-domain tracking**: Same PostHog key as marketing site enables session attribution

### Client-Side Tracking

**Marketing Site Pattern:**

```typescript
// hooks/use-posthog.ts
'use client';

import { usePostHog } from 'posthog-js/react';

export function useTracking() {
  const posthog = usePostHog();

  const trackCTAClick = (location: string, ctaText: string, destinationUrl: string) => {
    posthog?.capture('marketing_cta_clicked', {
      location,
      cta_text: ctaText,
      destination_url: destinationUrl,
    });
  };

  return { trackCTAClick };
}
```

**Usage:**
```typescript
'use client';

import { useTracking } from '@/hooks/use-posthog';

export function HeroCTA() {
  const { trackCTAClick } = useTracking();

  return (
    <Button
      onClick={() => trackCTAClick('homepage_hero', 'Get Started Free', '/register')}
    >
      Get Started Free
    </Button>
  );
}
```

**Web App Pattern:**

```typescript
'use client';

import { usePostHog } from 'posthog-js/react';

export function FeatureButton() {
  const posthog = usePostHog();

  const handleClick = () => {
    posthog?.capture('feature_used', {
      feature_name: 'achievement_export',
      source: 'dashboard',
    });
    // ... feature logic
  };

  return <button onClick={handleClick}>Export</button>;
}
```

### Server-Side Tracking

**Location**: `apps/web/lib/posthog-server.ts`

**HTTP API Approach** (optimized for Cloudflare Workers):

```typescript
export async function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/capture/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event,
          properties: {
            ...properties,
            distinct_id: userId,
          },
          timestamp: new Date().toISOString(),
        }),
      }
    );
  } catch (error) {
    console.error('PostHog error:', error);
  }
}
```

**Usage in API Routes:**

```typescript
import { captureServerEvent } from '@/lib/posthog-server';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  // ... create achievement

  // Track first achievement
  const [{ count: achievementCount }] = await db
    .select({ count: count() })
    .from(achievement)
    .where(eq(achievement.userId, auth.user.id));

  if (achievementCount === 1) {
    await captureServerEvent(auth.user.id, 'first_achievement_created', {
      source: 'manual',
    });
  }

  return NextResponse.json(newAchievement);
}
```

### Event Naming Conventions

**Marketing Events:**
- `marketing_cta_clicked` - CTA button/link clicks
- `feature_explored` - Feature page interactions
- `plan_comparison_interacted` - Pricing page engagement

**Authentication Events:**
- `user_signed_up` - New user registration
- `user_logged_in` - User login

**Feature Adoption Events:**
- `first_achievement_created` - First achievement (any source)
- `first_project_created` - First project
- `first_report_generated` - First document generation

**CLI Events:**
- `cli_installed` - CLI authentication completed
- `cli_extract_completed` - Achievement extraction via CLI

### Environment Variables

```bash
# PostHog Analytics (same project for cross-domain tracking)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Important**: Both apps must use the same `NEXT_PUBLIC_POSTHOG_KEY` for cross-domain tracking.

### Privacy & Compliance

**GDPR Compliance:**
- Marketing site: Cookieless mode (no consent banner needed)
- Web app: No tracking before authentication
- IP anonymization: PostHog default
- No PII in event properties: Never include passwords, achievement content, or document text

**Legal Pages:**
- Privacy Policy at `/privacy-policy` discloses PostHog usage
- Terms of Service at `/terms` requires acceptance
- ToS acceptance tracked with `tosAcceptedAt` timestamp in database

### Testing Analytics

**Development:**
- PostHog automatically enables debug mode in development
- Check browser console for PostHog initialization messages

**Browser DevTools:**
1. Open Network tab, filter by "posthog"
2. See POST requests to `/capture/` endpoint
3. Inspect request payload for event data

**PostHog Dashboard:**
1. Navigate to Live Events
2. See events appear within 30 seconds
3. Verify event properties are correct

**Why HTTP API Instead of posthog-node:**
- **Cloudflare Workers**: Stateless isolates with no persistent process
- **Immediate delivery**: No batching or flush cycles needed
- **No shutdown lifecycle**: Each request completes independently
- **Simpler**: No singleton management or cleanup

---

## Build Commands

### Development

```bash
# All apps
pnpm dev

# Specific app
pnpm dev:web
pnpm dev:marketing

# Database changes
pnpm db:generate    # Generate migration
pnpm db:push        # Apply to database
pnpm db:studio      # Open Drizzle Studio
```

### Building

```bash
# All packages and apps (uses Turbopack bundler by default as of Next.js 16)
pnpm build

# Opt-out to webpack if needed
pnpm build --webpack

# Specific targets
pnpm build:web
pnpm build:marketing
```

### Testing

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# CLI tests only
pnpm test:cli
```

### Linting & Formatting

```bash
# Lint all
pnpm lint

# Lint and fix
pnpm lint:fix

# Format all
pnpm format
```

### Database Commands

```bash
# Generate migration from schema changes
pnpm db:generate

# Push migration to database
pnpm db:push

# Open Drizzle Studio (GUI)
pnpm db:studio

# Run migrations programmatically
pnpm db:migrate
```

### Email Development

```bash
# Start React Email preview server (port 3002)
pnpm --filter=@bragdoc/web email:dev

# Email templates location
# apps/web/emails/

# Email utilities location
# apps/web/lib/email/
```

---

## Code Style

### TypeScript

- **Use TypeScript** for all code
- **Prefer interfaces** over types for object shapes
- **Explicit return types** on public functions
- **Strict mode** enabled

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

- **Avoid `React.FC`** - Use proper type definitions
- **Functional components** only (no classes)
- **Named exports** instead of default exports
- **Destructure props** in function signature

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

- **PascalCase**: Components, types, interfaces
- **camelCase**: Functions, variables, properties
- **SCREAMING_SNAKE_CASE**: Constants
- **lowercase-with-dashes**: Directories

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

- **Throw errors** in server code
- **Return error states** in client code
- **Use try-catch** around external calls
- **Log errors** with context

```typescript
// Server
async function serverFunction() {
  try {
    const result = await externalAPI();
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error('Failed to fetch data');
  }
}

// Client
function ClientComponent() {
  const [error, setError] = useState<string | null>(null);

  try {
    // ...
  } catch (err) {
    setError(err.message);
  }
}
```

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

Examples:

```
feat: add project color picker
fix: resolve authentication redirect loop
docs: update API documentation
refactor: simplify achievement extraction logic
```

### Branch Strategy

- `main` - Production branch
- `v2` - Current development branch
- Feature branches as needed

### Changesets

Use changesets for versioning:

```bash
pnpm changeset          # Create a changeset
pnpm changeset version  # Update versions
```

### Dependency Management

**Dependabot** is configured to automatically monitor and update dependencies across the monorepo:

- **Configuration**: `.github/dependabot.yml`
- **Schedule**: Weekly updates on Mondays
- **Scope**: Monitors all workspaces (root, apps/*, packages/*) and GitHub Actions
- **Grouping**: Related dependencies are grouped together to reduce PR spam:
  - Next.js ecosystem
  - React and types
  - Radix UI components
  - AI SDK packages
  - Auth (NextAuth, @auth/*)
  - Database (Drizzle, Postgres)
  - Stripe
  - Testing libraries
  - Linting tools
  - Tailwind CSS
  - MDX packages
  - Vercel packages
  - ProseMirror
- **Safety**: Major version updates are ignored for critical dependencies to prevent breaking changes:
  - `next`, `@next/mdx`, `@next/third-parties` (Next.js ecosystem)
  - `react`, `react-dom` (React)
- **Review**: All Dependabot PRs should be reviewed and tested before merging

When Dependabot creates PRs:

1. Review the changelog/release notes for breaking changes
2. Run tests locally: `pnpm test && pnpm build`
3. Test critical functionality in the dev environment
4. Merge if all checks pass and no regressions are found

**Note**: The eval workflow is configured to skip Dependabot PRs since dependency updates don't affect AI prompt evaluations and to avoid exposing API secrets to automated PRs

---

## Additional Resources

### Important Files

- `FEATURES.md` - Feature documentation
- `TODO.md` - Project roadmap
- `features/` - Detailed feature specs
- `docs/` - Additional documentation

### Environment Variables

Required:

- `POSTGRES_URL` - Database connection string
- `AUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL
- `OPENAI_API_KEY` - OpenAI API key (for LLM)
- `STRIPE_SECRET_KEY` - Stripe secret key (for payments)

Optional:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `MAILGUN_API_KEY` - Mailgun for emails
- `DEMO_MODE_ENABLED` - Set to 'true' to enable demo mode (allows users to try the app with pre-populated data) - controls backend API routes and server actions
- `NEXT_PUBLIC_DEMO_MODE_ENABLED` - Set to 'true' to show demo mode UI prompts (frontend client components) - must match DEMO_MODE_ENABLED value

### Useful Commands

```bash
# Setup project
pnpm setup

# Clean install
rm -rf node_modules .turbo .next && pnpm install

# Check for issues
pnpm lint && pnpm test && pnpm build

# Deploy web app
pnpm --filter=@bragdoc/web deploy
```

---

## Summary

This codebase follows modern full-stack TypeScript patterns with:

- **Monorepo architecture** for code sharing
- **Server Components** for optimal performance
- **Type-safe database access** via Drizzle
- **Unified authentication** for web and CLI
- **AI-powered features** via multiple LLM providers
- **Component-driven UI** with shadcn/ui + Tailwind

When in doubt:

1. Check existing patterns in similar features
2. Prefer server-side logic over client-side
3. Always validate user input
4. Always scope queries by userId
5. Use TypeScript strictly
6. Write tests for critical paths
7. Document complex logic

For questions, refer to specific feature documentation in the `features/` directory.
