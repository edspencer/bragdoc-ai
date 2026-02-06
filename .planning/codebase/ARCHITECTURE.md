# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Monorepo with layered architecture combining web application, CLI tool, and shared database layer.

**Key Characteristics:**
- TypeScript strict mode throughout (end-to-end type safety)
- Privacy-first design with local processing (Git analysis on user machine)
- Server Components by default for optimal performance
- Unified authentication supporting both browser sessions and CLI JWT tokens
- Multi-source achievement tracking via pluggable connector architecture
- AI-powered feature extraction using Vercel AI SDK with multi-provider support

## Layers

**Presentation Layer:**
- Purpose: User-facing interfaces for web and marketing
- Location: `apps/web/app/(app)/` and `apps/marketing/app/`
- Contains: Server Components, Client Components, layouts, pages, API routes
- Depends on: Database, Authentication, AI/LLM services
- Used by: End users via browser

**API Layer:**
- Purpose: RESTful endpoints for web app and CLI consumption
- Location: `apps/web/app/api/`
- Contains: Route handlers (GET/POST/PUT/DELETE), request validation with Zod, response formatting
- Depends on: Database queries, authentication, business logic
- Used by: Frontend, CLI tool, external integrations

**Business Logic Layer:**
- Purpose: Feature-specific operations and domain logic
- Location: `apps/web/lib/ai/`, `apps/web/lib/better-auth/`, `packages/cli/src/commands/`
- Contains: LLM providers, clustering algorithms, achievement extraction, authentication flows
- Depends on: Database, external services (OpenAI, GitHub, etc.)
- Used by: API routes, Server Components, CLI commands

**Data Access Layer:**
- Purpose: Type-safe database operations
- Location: `packages/database/src/`
- Contains: Drizzle schema definitions, query functions, migrations
- Depends on: PostgreSQL connection
- Used by: All applications (web, CLI)

**CLI Layer:**
- Purpose: Command-line interface for local achievement extraction
- Location: `packages/cli/src/`
- Contains: Commands (extract, projects, auth, standup), connectors (Git, GitHub), configuration management
- Depends on: Database queries, API client, local Git repositories
- Used by: Developers on their machines

## Data Flow

**User Achievement Creation (Manual):**

1. User navigates to achievements page in web app (`apps/web/app/(app)/achievements/page.tsx`)
2. Submits form (Server Action) with achievement details
3. Server validates input with Zod schema
4. Generates embedding via `generateAchievementEmbedding()` in `apps/web/lib/ai/embeddings.ts`
5. Writes to `Achievement` table in PostgreSQL
6. Triggers workstream incremental assignment if enabled
7. Response updates client-side state via revalidatePath()

**CLI Achievement Extraction (Automated):**

1. User runs `bragdoc extract` command
2. `extractCommand()` in `packages/cli/src/commands/extract.ts` initializes
3. Loads project configuration from `~/.bragdoc/config.yml`
4. Initializes connector (Git or GitHub) from `packages/cli/src/connectors/`
5. Git connector reads local commits since last cache update
6. Batches commits (max 100) and renders MDX prompt template
7. Sends to configured LLM provider (OpenAI, DeepSeek, Ollama, etc.)
8. Streams back structured achievements via Zod schema
9. For each achievement: POST to `POST /api/achievements` with JWT token
10. Updates local cache with processed commit hashes

**Authentication Flow (Web App):**

1. User visits login page (`apps/web/app/(auth)/`)
2. Chooses OAuth (Google/GitHub) or Magic Link (email)
3. Better Auth handles OAuth redirect or sends magic link email
4. User authorizes and is redirected to app
5. Better Auth creates database session with cookie caching
6. Session verified on subsequent requests via `auth.api.getSession()`

**Authentication Flow (CLI):**

1. User runs `bragdoc login`
2. Opens browser for OAuth flow
3. Better Auth generates JWT token (30-day expiry)
4. Token saved to `~/.bragdoc/config.yml`
5. Subsequent CLI requests include `Authorization: Bearer <token>` header
6. API endpoint validates JWT in `getAuthUser()` helper

**Workstream Clustering Flow:**

1. User triggers clustering via `POST /api/workstreams/generate`
2. Optional filters (time range, project IDs) applied to achievement query
3. All achievements passed through embedding generation (cost optimized)
4. Embeddings run through DBSCAN clustering algorithm
5. Clusters named via LLM (GPT-4) with context summaries
6. Cluster centroids cached in `Workstream` table
7. Achievements assigned to nearest cluster based on cosine similarity
8. Full clustering history stored in `WorkstreamMetadata`

**State Management:**

- **Server State:** PostgreSQL database (source of truth)
- **Session State:** Better Auth database sessions (browser)
- **Token State:** JWT tokens (CLI, ~/.bragdoc/config.yml)
- **Client State:** React hooks (temporary, form inputs, UI state)
- **Cache State:** Local Git commit cache (CLI only)

## Key Abstractions

**Achievement:**
- Purpose: Core unit representing completed work
- Examples: `apps/web/app/(app)/achievements/page.tsx`, `packages/database/src/achievements/utils.ts`
- Pattern: Database model with optional sourceId (for multi-source tracking), embedding vector, workstream assignment

**Source:**
- Purpose: Connection point for multi-source achievement imports
- Examples: `packages/database/src/schema.ts` (Source table), `packages/cli/src/connectors/`
- Pattern: Pluggable connector interface enabling Git, GitHub, Jira, etc.

**Project:**
- Purpose: Grouping for achievements with company context
- Examples: `apps/web/app/(app)/projects/[id]/page.tsx`, `packages/database/src/projects/queries.ts`
- Pattern: User-scoped with company association, metadata (repo URL, tech stack)

**LLM Provider:**
- Purpose: Abstraction over multiple AI providers
- Examples: `apps/web/lib/ai/llm-router.ts` (web), `packages/cli/src/commands/extract.ts` (CLI)
- Pattern: Vercel AI SDK wrapper selecting provider based on context (user level, subscription)

**Connector:**
- Purpose: Multi-source data extraction abstraction
- Examples: `packages/cli/src/connectors/git-connector.ts`, `packages/cli/src/connectors/github-connector.ts`
- Pattern: Interface-based implementation enabling new sources without core changes

**Workstream:**
- Purpose: Semantic clustering of achievements across projects
- Examples: `apps/web/lib/ai/workstreams.ts` (clustering logic), `apps/web/app/api/workstreams/` (API)
- Pattern: ML pipeline with embeddings, DBSCAN clustering, LLM naming, centroid caching

**Document:**
- Purpose: User-generated formatted export of achievements (standup, review, etc.)
- Examples: `apps/web/app/(app)/documents/page.tsx`, `apps/web/lib/ai/generate-document.ts`
- Pattern: Template-based generation via LLM, shareable via token

## Entry Points

**Web Application:**
- Location: `apps/web/app/layout.tsx` (root), `apps/web/app/(app)/layout.tsx` (authenticated)
- Triggers: Browser request to https://app.bragdoc.ai
- Responsibilities: Setup providers (Auth, DataStream, PostHog, Theme), render layout hierarchy

**CLI Tool:**
- Location: `packages/cli/src/index.ts`
- Triggers: User command `bragdoc <command>`
- Responsibilities: Parse commands, route to handlers, initialize configuration, manage authentication

**API Routes:**
- Location: `apps/web/app/api/[resource]/route.ts` (e.g., `achievements`, `projects`, `workstreams`)
- Triggers: HTTP requests from web app or CLI
- Responsibilities: Authenticate user, validate input, execute business logic, return JSON

**Database Migrations:**
- Location: `packages/database/src/migrations/`
- Triggers: Development (`pnpm db:push`), production (`pnpm db:migrate`)
- Responsibilities: Schema evolution, data transformations, backward compatibility

## Error Handling

**Strategy:** Layered with clear responsibility separation

**Patterns:**

1. **Client-Side Validation:** Zod schemas validate inputs before processing
   - Example: `apps/web/app/api/achievements/route.ts` lines 16-41

2. **Server Error Boundaries:** Try-catch wraps database operations
   - Logs errors with context (operation, user ID, etc.)
   - Returns appropriate HTTP status codes (400 bad request, 401 unauthorized, 500 server error)

3. **User Feedback:** Error messages returned as JSON or displayed in UI
   - API: `return NextResponse.json({ error: 'message' }, { status: 400 })`
   - Web: Toast notifications or form field errors

4. **Silent Failures:** Some operations (e.g., workstream assignment) gracefully degrade
   - Clustering failure doesn't prevent achievement save
   - Embedding generation errors logged but don't block API response

5. **Monitoring:** PostHog events track errors for visibility
   - Event: `captureServerEvent()` in `apps/web/lib/posthog-server.ts`
   - Allows trending of error patterns

## Cross-Cutting Concerns

**Logging:**
- Browser: Console logs (development), PostHog analytics events (production)
- Server: `console.error()` in try-catch blocks, written to `apps/web/.next-dev.log` in dev
- CLI: Winston logger in `packages/cli/` with configurable levels

**Validation:**
- Input: Zod schemas on all API endpoints and form handlers
- Schema: TypeScript types ensure runtime safety via Drizzle ORM
- Business Rules: Custom validators in query functions (e.g., uniqueSourceId for idempotence)

**Authentication:**
- Entry Point: `getAuthUser()` helper in `apps/web/lib/getAuthUser.ts`
- Scope: All queries filtered by userId at database level
- Fallback: Magic links for passwordless auth, OAuth for convenience
- Security: Environment variables (BETTER_AUTH_SECRET) never exposed

**Performance:**
- Caching: Better Auth session cookie caching (5-min TTL)
- Database: Indexes on userId, foreign keys, commonly filtered fields
- API: Pagination (limit/offset) for large result sets
- LLM: Batch processing (max 100 commits per request), streaming responses
- Build: Turborepo caching, Turbopack bundler, tree-shaking in production
