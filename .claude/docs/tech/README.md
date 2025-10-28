# BragDoc Technical Documentation

**Location:** `.claude/docs/tech/`

This directory contains comprehensive technical documentation for the BragDoc project, optimized for consumption by LLMs and AI assistants working on the codebase.

## Purpose

These documents are maintained as living documentation that:
- Captures architectural decisions and their rationale
- Documents implementation patterns and conventions
- Provides context for AI-assisted development
- Serves as a reference for onboarding and troubleshooting

## Documentation Structure

### Core Architecture
- **[architecture.md](./architecture.md)** - System architecture, technology stack, and monorepo structure
- **[database.md](./database.md)** - Database schema, query patterns, and Drizzle ORM usage
- **[authentication.md](./authentication.md)** - Authentication implementation for web and CLI

### API & Integration
- **[api-conventions.md](./api-conventions.md)** - RESTful API routes, request/response patterns, and validation
- **[ai-integration.md](./ai-integration.md)** - LLM providers, prompt engineering, and AI features

### Application Layers
- **[frontend-patterns.md](./frontend-patterns.md)** - React patterns, component architecture, and styling
- **[cli-architecture.md](./cli-architecture.md)** - CLI tool structure, commands, and Git operations

### Operations
- **[deployment.md](./deployment.md)** - Build process, deployment targets, and environment configuration

## Project Overview

**BragDoc** is an AI-powered platform for tracking and documenting professional achievements. The system consists of:

1. **Web Application** (Next.js 15 + React 19)
   - Server Components with App Router
   - PostgreSQL via Drizzle ORM
   - Better Auth authentication
   - AI-powered document generation

2. **CLI Tool** (@bragdoc/cli)
   - Git repository analysis
   - Local achievement extraction
   - API integration with web app
   - Multi-LLM provider support

3. **Shared Packages**
   - Database layer
   - Email templates
   - TypeScript configurations

## Key Technologies

- **Runtime**: Node.js 18+, Edge Runtime (Cloudflare Workers)
- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL via Drizzle ORM (Neon serverless)
- **Auth**: Better Auth v1.3.33 (database-backed sessions with cookie caching)
- **AI**: Vercel AI SDK v5 (OpenAI, DeepSeek, Google, Anthropic, Ollama)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Monorepo**: Turborepo + pnpm workspaces
- **Deployment**: Cloudflare Workers via OpenNext

## Development Workflow

1. **Task Management**: Tasks are planned in `./tasks/` with SPEC.md, PLAN.md, and LOG.md
2. **Dev Server**: Runs on port 3000, logs to `./apps/web/.next-dev.log`
3. **Database Changes**: Use `pnpm db:generate` and `pnpm db:push`
4. **Testing**: Jest + Testing Library via `pnpm test`
5. **Building**: Turborepo orchestration via `pnpm build`

## Core Principles

### Privacy-First Architecture
- Code stays on user's machine (CLI-based extraction)
- Optional self-hosting
- Local LLM support via Ollama
- Data export/portability

### Type Safety
- Strict TypeScript throughout
- Drizzle ORM for type-safe queries
- Zod validation on API boundaries
- Explicit return types on public functions

### Security
- All queries scoped by `userId`
- Unified authentication helper (`getAuthUser`)
- JWT tokens for CLI (30-day expiration)
- CORS headers for cross-origin requests

### Performance
- Server Components by default
- Edge Runtime compatibility
- Turborepo build caching
- Database query optimization

## Common Patterns

### API Routes
```typescript
import { getAuthUser } from 'lib/getAuthUser';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await db.select()
    .from(table)
    .where(eq(table.userId, auth.user.id));

  return NextResponse.json(data);
}
```

### Database Queries
```typescript
import { db, achievement, eq, desc } from '@bragdoc/database';

export async function getAchievements(userId: string) {
  return db.select()
    .from(achievement)
    .where(eq(achievement.userId, userId))
    .orderBy(desc(achievement.createdAt));
}
```

### Component Structure
```typescript
// Server Component (default)
export async function ServerComponent() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// Client Component (when needed)
'use client';
export function ClientComponent({ data }: Props) {
  const [state, setState] = useState(data);
  return <div>{/* interactive UI */}</div>;
}
```

## Environment Setup

### Required Variables
```env
POSTGRES_URL=postgresql://...
AUTH_SECRET=<generate-with-openssl>
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_...
```

### Optional Variables
```env
GOOGLE_CLIENT_ID=...          # Google OAuth
GITHUB_CLIENT_ID=...          # GitHub OAuth
DEEPSEEK_API_KEY=...          # Alternative LLM
DEMO_MODE_ENABLED=true        # Demo features
```

## Quick Reference

### Commands
```bash
# Development
pnpm dev                      # Run all apps
pnpm dev:web                  # Web app only

# Database
pnpm db:generate              # Generate migration
pnpm db:push                  # Apply to database
pnpm db:studio                # Open Drizzle Studio

# Testing
pnpm test                     # Run all tests
pnpm test:watch               # Watch mode
pnpm test:cli                 # CLI tests only

# Building
pnpm build                    # Build all packages/apps
pnpm lint                     # Lint all code
```

### File Locations
- **Auth**: `apps/web/app/(auth)/auth.ts`, `apps/web/lib/getAuthUser.ts`
- **Database**: `packages/database/src/schema.ts`, `packages/database/src/queries.ts`
- **AI**: `apps/web/lib/ai/extract-achievements.ts`, `apps/web/lib/ai/llm-router.ts`
- **CLI**: `packages/cli/src/index.ts`, `packages/cli/src/commands/`
- **API**: `apps/web/app/api/*/route.ts`

## Maintenance

These documents should be updated when:
- Architectural decisions are made or changed
- New major features are implemented
- API conventions evolve
- Database schema undergoes significant changes
- New dependencies or technologies are adopted

## Contributing

When updating documentation:
1. Keep language precise and technical
2. Include code examples for patterns
3. Document the "why" behind decisions
4. Update related documents for consistency
5. Maintain LLM-friendly formatting (clear headings, code blocks)

---

**Last Updated**: 2025-10-21
**Version**: Initial documentation baseline
**Maintainer**: Development team
