# BragDoc Development Guide

This document provides comprehensive guidance for developing BragDoc, an AI-powered platform for tracking and documenting professional achievements.

## Table of Contents

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

## Project Architecture

BragDoc is a full-stack TypeScript monorepo using:

- **Framework**: Next.js 15 (App Router with React 19+ Server Components)
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
│   ├── email/        # Email templates (React Email)
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

The main application built with Next.js 15 App Router.

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
├── lib/                  # Utility functions
│   ├── ai/              # AI/LLM utilities
│   │   ├── prompts/     # MDX prompt files
│   │   ├── llm-router.ts
│   │   └── extract-achievements.ts
│   ├── email/           # Email utilities
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
- `@bragdoc/email` - Email templates
- `ai` - Vercel AI SDK
- `next-auth` - Authentication
- `stripe` - Payment processing
- `mdx-prompt` - Prompt engineering with MDX

### @bragdoc/marketing

**Location**: `apps/marketing/`

Marketing and landing pages with similar Next.js structure but focused on public content.

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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
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
    .select({ /* ... */ })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(eq(project.userId, userId))
    .orderBy(desc(project.startDate));

  return results.map(row => ({
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

### @bragdoc/email

**Location**: `packages/email/`

Email templates using React Email.

#### Usage

```typescript
import { WelcomeEmail } from '@bragdoc/email';
import { render } from '@react-email/render';

const html = render(<WelcomeEmail username="John" />);
```

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
  await tx.insert(project).values({ /* ... */ });
  await tx.insert(achievement).values({ /* ... */ });
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

- **Google OAuth**
- **GitHub OAuth**
- **Credentials** (email/password with bcrypt)

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
    const decoded = await decode({ token, secret: process.env.AUTH_SECRET!, salt: '' });
    if (decoded?.id) {
      return { user: decoded as User, source: 'jwt' };
    }
  }

  return null;
}
```

### Protected Routes

Use middleware for page-level protection:

```typescript
// middleware.ts
export { auth as middleware } from '@/app/(auth)/auth';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

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
export default function AchievementCard({ achievement }: AchievementCardProps) {}
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
  token: "jwt-token-here"
  expiresAt: 1234567890
repositories:
  - path: /path/to/repo
    name: My Project
    enabled: true
    maxCommits: 300
    cronSchedule: "0 18 * * *"
    projectId: "uuid-from-web-app"
settings:
  defaultTimeRange: "30d"
  maxCommitsPerBatch: 10
  defaultMaxCommits: 300
  cacheEnabled: true
  apiBaseUrl: "https://www.bragdoc.ai"
```

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
  }).toString().trim();

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: path,
  }).toString().trim();

  return { remoteUrl, currentBranch, path };
}
```

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
# All packages and apps
pnpm build

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
export function Component({ }: ComponentProps) {
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
