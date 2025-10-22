# System Architecture

## Overview

BragDoc is a full-stack TypeScript application built as a monorepo that combines a web application, CLI tool, and shared packages. The architecture emphasizes privacy, type safety, and AI-powered automation.

## Core Architectural Principles

### 1. Privacy-First Design
- **Local Git Analysis**: CLI tool processes Git commits on user's machine
- **Minimal Data Transmission**: Only extracted achievements sent to server
- **Local LLM Support**: Optional Ollama integration for completely offline operation
- **Data Ownership**: Export functionality and optional self-hosting

### 2. Type Safety Throughout
- **Strict TypeScript**: All code uses TypeScript strict mode
- **Database Type Safety**: Drizzle ORM provides end-to-end type safety
- **Schema Validation**: Zod schemas at API boundaries
- **Shared Types**: Common types defined in shared packages

### 3. Monorepo Architecture
- **Code Sharing**: Database, config, and types shared across apps
- **Independent Deployment**: Apps can be deployed separately
- **Optimized Builds**: Turborepo caching and parallelization
- **Version Management**: Changesets for coordinated releases

## Technology Stack

### Frontend/Web Framework
```
Next.js 15.1.8
├── React 19.0.0 (Server Components)
├── App Router (file-based routing)
├── Server Actions (mutations)
└── Edge Runtime compatible
```

**Key Features:**
- Server Components by default (optimal performance)
- Client Components only when interactivity needed
- Streaming with Suspense boundaries
- Built-in API routes

### Backend/Runtime
```
Node.js 18+
├── Next.js API Routes (RESTful endpoints)
├── Server Actions (form mutations)
├── Edge Runtime (Cloudflare Workers via OpenNext)
└── Serverless PostgreSQL (Neon)
```

**Architecture Pattern:**
- RESTful API for CLI and external integrations
- Server Actions for form submissions and mutations
- Server Components for data fetching
- Edge Runtime for global low-latency

### Database Layer
```
PostgreSQL
├── Drizzle ORM v0.34.1 (type-safe queries)
├── Neon Serverless (@neondatabase/serverless)
├── Alternative: Vercel Postgres (@vercel/postgres)
└── Migrations (version-controlled SQL)
```

**Design Decisions:**
- **Drizzle over Prisma**: Better TypeScript inference, lighter weight
- **Neon**: Serverless, edge-compatible, branching support
- **UUID Primary Keys**: Better for distributed systems
- **Soft Deletes**: `isArchived` flags preserve data integrity

### Authentication
```
NextAuth.js v5.0.0-beta.25
├── JWT Strategy (stateless)
├── OAuth Providers (Google, GitHub)
├── Credentials Provider (email/password)
└── CLI Token Generation
```

**Dual Authentication:**
1. **Web Browser**: Session cookies via NextAuth
2. **CLI Tool**: JWT tokens in Authorization header

### AI/LLM Integration
```
Vercel AI SDK v5.0.0
├── Multiple Providers (OpenAI, DeepSeek, Google, Anthropic)
├── Local Support (Ollama)
├── Streaming (streamText, streamObject)
├── Structured Output (Zod schemas)
└── MDX Prompts (mdx-prompt v0.4.1)
```

**Provider Selection:**
- Web app uses LLM router for intelligent selection
- CLI uses user-configured provider
- Fallback chain for availability
- Temperature tuning per task type

### Styling
```
Tailwind CSS v4.1.9
├── Custom Theme (CSS variables)
├── Dark Mode (next-themes)
├── shadcn/ui Components (Radix UI)
├── Geist Font (sans + mono)
└── Framer Motion (animations)
```

**Design System:**
- Mobile-first responsive design
- Consistent spacing scale
- Semantic color tokens
- Accessibility-first (Radix primitives)

## Monorepo Structure

```
brag-ai/
├── apps/
│   ├── web/              # Main Next.js application (Port 3000)
│   │   ├── app/         # App Router pages and API routes
│   │   ├── components/  # React components
│   │   ├── lib/         # Utilities and AI logic
│   │   ├── hooks/       # Custom React hooks
│   │   └── __tests__/   # Test files
│   │
│   ├── marketing/       # Marketing website (separate Next.js app)
│   │   └── ...
│   │
│   └── marketing2/      # Marketing v2 (in development)
│       └── ...
│
├── packages/
│   ├── database/        # Shared database layer
│   │   ├── src/
│   │   │   ├── schema.ts      # Drizzle schema definitions
│   │   │   ├── queries.ts     # Reusable query functions
│   │   │   ├── migrations/    # SQL migration files
│   │   │   └── index.ts       # Public exports
│   │   └── package.json
│   │
│   ├── cli/             # Command-line tool
│   │   ├── src/
│   │   │   ├── index.ts       # CLI entry point
│   │   │   ├── commands/      # CLI command implementations
│   │   │   ├── api/           # API client
│   │   │   ├── git/           # Git operations
│   │   │   ├── config/        # Config management
│   │   │   └── utils/         # Utilities
│   │   └── package.json       # Published to npm as @bragdoc/cli
│   │
│   ├── email/           # Email templates
│   │   ├── components/  # React Email components
│   │   └── package.json
│   │
│   ├── config/          # Shared configuration types
│   │   └── src/
│   │       └── types.ts
│   │
│   └── typescript-config/  # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       └── react-library.json
│
├── features/            # Feature documentation
├── tasks/              # Task planning and logs
├── .claude/            # Claude Code configuration
│   ├── docs/user/      # Technical documentation (this directory)
│   └── commands/       # Custom slash commands
│
├── turbo.json          # Turborepo pipeline configuration
├── package.json        # Workspace root
└── pnpm-workspace.yaml # pnpm workspace configuration
```

## Package Dependencies

### Workspace Configuration
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Dependency Flow:**
```
apps/web
├── @bragdoc/database (workspace:*)
├── @bragdoc/email (workspace:*)
└── @bragdoc/config (workspace:*)

apps/marketing
└── @bragdoc/config (workspace:*)

packages/cli
├── @bragdoc/database (workspace:*)
└── @bragdoc/config (workspace:*)

packages/database
└── (no internal dependencies)
```

### External Dependencies

**Web App (`apps/web/package.json`):**
```json
{
  "dependencies": {
    "next": "15.1.8",
    "react": "19.0.0",
    "next-auth": "5.0.0-beta.25",
    "ai": "5.0.0",
    "@ai-sdk/openai": "^1.0.10",
    "@ai-sdk/google": "^1.0.15",
    "@ai-sdk/deepseek": "^1.0.0",
    "drizzle-orm": "^0.34.1",
    "@neondatabase/serverless": "^0.10.5",
    "zod": "^3.24.1",
    "stripe": "^17.5.0",
    "tailwindcss": "^4.1.9",
    "mdx-prompt": "^0.4.1"
  }
}
```

**CLI (`packages/cli/package.json`):**
```json
{
  "dependencies": {
    "commander": "^13.0.0",
    "inquirer": "^12.2.0",
    "chalk": "^5.4.1",
    "winston": "^3.19.0",
    "yaml": "^2.7.0",
    "ollama-ai-provider-v2": "^1.5.0",
    "@ai-sdk/openai": "^1.0.10",
    "@ai-sdk/anthropic": "^1.0.9"
  }
}
```

**Database (`packages/database/package.json`):**
```json
{
  "dependencies": {
    "drizzle-orm": "^0.34.1",
    "@neondatabase/serverless": "^0.10.5",
    "postgres": "^3.5.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.25.0"
  }
}
```

## Application Flow

### Web Application Request Flow

```
User Request
    ↓
Next.js Middleware (auth check)
    ↓
    ├─→ Server Component (data fetching)
    │       ↓
    │   Database Query (scoped by userId)
    │       ↓
    │   Render with data
    │
    ├─→ API Route (external requests)
    │       ↓
    │   getAuthUser() (session or JWT)
    │       ↓
    │   Validate with Zod
    │       ↓
    │   Database Operation
    │       ↓
    │   JSON Response
    │
    └─→ Server Action (form submission)
            ↓
        Validate input
            ↓
        Database Mutation
            ↓
        revalidatePath()
            ↓
        Return/Redirect
```

### CLI Workflow

```
User Command
    ↓
Commander.js Parser
    ↓
    ├─→ Auth Commands (login, logout)
    │       ↓
    │   Browser OAuth Flow
    │       ↓
    │   JWT Token Storage (~/.bragdoc/config.yml)
    │
    ├─→ Git Commands (extract, wip)
    │       ↓
    │   Read Local Git History
    │       ↓
    │   Filter New Commits (cache check)
    │       ↓
    │   Send to LLM (configured provider)
    │       ↓
    │   Stream Achievements
    │       ↓
    │   POST to API (/api/achievements)
    │       ↓
    │   Update Cache
    │
    └─→ Data Commands (fetch, sync)
            ↓
        GET from API (with JWT)
            ↓
        Cache Locally
            ↓
        Display Results
```

### AI Extraction Flow

```
Git Commits
    ↓
CLI Batch Processing (max 100 commits)
    ↓
Render MDX Prompt
    ↓
    ├─→ LLM Router (web app)
    │   ├── Check user subscription level
    │   ├── Select provider (OpenAI, DeepSeek, etc.)
    │   └── Return configured model
    │
    └─→ User Config (CLI)
        ├── Read ~/.bragdoc/config.yml
        └── Use configured provider/model
    ↓
streamObject() with Zod Schema
    ↓
Stream Achievements (one at a time)
    ↓
Validate Structure
    ↓
Save to Database (userId scoped)
    ↓
Update UI (web) or Console (CLI)
```

## Data Flow Architecture

### User Data Lifecycle

```
1. User Registration
   ├── OAuth (Google/GitHub) or Email/Password
   ├── NextAuth creates session
   ├── User record in database
   └── Preferences initialized

2. CLI Setup
   ├── User runs `bragdoc login`
   ├── Browser authentication
   ├── JWT token generated (30-day expiry)
   └── Token saved to ~/.bragdoc/config.yml

3. Project Setup
   ├── CLI: `bragdoc init` in Git repo
   ├── Extract repo metadata
   ├── POST /api/projects (creates Project + Company)
   ├── Store projectId in config.yml
   └── Sync enabled

4. Achievement Extraction
   ├── CLI: `bragdoc extract` (manual or scheduled)
   ├── Read Git commits since last extraction
   ├── Send to LLM (batched)
   ├── Stream achievements back
   ├── POST /api/achievements (batch)
   ├── Update commit cache
   └── Achievements visible in web app

5. Document Generation
   ├── User selects achievements in web app
   ├── Choose document type (standup, review, etc.)
   ├── POST /api/documents/generate
   ├── LLM generates formatted document
   ├── Stream response to client
   └── Document saved with shareToken

6. Standup Automation
   ├── CLI: `bragdoc standup enable`
   ├── Configure schedule (cron)
   ├── Install system scheduler (crontab/Task Scheduler)
   ├── Automated `bragdoc standup wip` runs
   ├── Extract WIP from uncommitted changes
   └── POST to /api/standups/{id}/documents
```

## Deployment Architecture

### Development Environment
```
Developer Machine
├── pnpm dev (Turborepo)
├── Port 3000 (Next.js web)
├── Port 5173 (Marketing v2, if running)
├── PostgreSQL (Neon serverless)
└── Logs: ./apps/web/.next-dev.log
```

### Production Environment (Cloudflare Workers)
```
Cloudflare Edge Network
├── Next.js via OpenNext adapter
├── Static assets on CDN
├── API routes on Workers
├── Server Components rendered at edge
└── Database: Neon (serverless PostgreSQL)

External Services
├── Stripe (payments)
├── Mailgun (emails)
├── OAuth Providers (Google, GitHub)
└── LLM APIs (OpenAI, DeepSeek, Google)
```

### Alternative: Vercel Deployment
```
Vercel Edge Network
├── Zero-config Next.js deployment
├── Edge Runtime by default
├── Vercel Postgres integration
└── Environment variables via dashboard
```

## Performance Considerations

### Build Optimization
- **Turborepo Caching**: Remote and local caching of build artifacts
- **Parallel Builds**: Independent packages build concurrently
- **Incremental Builds**: Only changed packages rebuild
- **Tree Shaking**: Unused code eliminated in production

### Runtime Optimization
- **Server Components**: Reduced JavaScript bundle size
- **Edge Runtime**: Low-latency global distribution
- **Database Connection Pooling**: Neon serverless handles automatically
- **Static Generation**: Marketing pages pre-rendered

### Database Optimization
- **Indexed Queries**: Primary keys, foreign keys, and user scopes indexed
- **Query Scoping**: All queries filtered by userId at database level
- **Connection Management**: Serverless Neon handles pooling
- **Pagination**: Limit/offset for large result sets

## Security Architecture

### Authentication Security
- **JWT Secret**: Strong random secret (AUTH_SECRET)
- **Token Expiration**: 30-day CLI tokens, session-based web
- **Password Hashing**: bcrypt with salt rounds
- **OAuth**: Delegated authentication to trusted providers

### Authorization
- **Row-Level Security**: All queries scoped by userId
- **API Validation**: Zod schemas on all inputs
- **CORS**: Restricted to necessary origins
- **Rate Limiting**: (TODO: implement for production)

### Data Security
- **HTTPS Only**: All production traffic encrypted
- **Environment Variables**: Secrets never committed
- **Database Encryption**: At-rest encryption via Neon
- **Share Tokens**: UUIDs for document sharing (unguessable)

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: JWT-based auth, no server-side sessions
- **Edge Distribution**: Cloudflare Workers globally distributed
- **Database**: Neon autoscaling and branching
- **Caching**: (TODO: Redis for API responses)

### Vertical Scaling
- **Database Connections**: Serverless pooling handles concurrency
- **LLM Rate Limits**: Multiple provider fallbacks
- **File Processing**: Batch commits in chunks
- **Background Jobs**: (TODO: queue system for heavy tasks)

## Technology Decisions & Rationale

### Why Next.js 15?
- **Server Components**: Optimal performance, reduced bundle size
- **App Router**: Modern file-based routing, layouts, nested routes
- **Edge Runtime**: Global low-latency via Cloudflare/Vercel
- **Built-in API**: No need for separate backend framework

### Why Drizzle ORM?
- **Type Safety**: Superior TypeScript inference vs. Prisma
- **Performance**: Lighter weight, closer to SQL
- **Flexibility**: Raw SQL when needed
- **Edge Compatible**: Works with serverless PostgreSQL

### Why NextAuth v5?
- **JWT Strategy**: Stateless, edge-compatible
- **Multiple Providers**: OAuth + credentials
- **CLI Support**: Token generation for external clients
- **Active Development**: Well-maintained, Next.js integration

### Why Vercel AI SDK?
- **Multi-Provider**: Unified interface for OpenAI, Google, Anthropic, etc.
- **Streaming**: First-class streaming support
- **Structured Output**: Zod schema validation
- **Active Ecosystem**: Regular updates, good documentation

### Why Turborepo?
- **Caching**: Massive speed improvements on rebuilds
- **Parallelization**: Utilize all CPU cores
- **Task Pipelines**: Define dependencies between tasks
- **Remote Caching**: Share cache across team/CI

### Why pnpm?
- **Disk Efficiency**: Content-addressable storage
- **Speed**: Faster installs than npm/yarn
- **Workspace Support**: Native monorepo support
- **Strict**: Prevents phantom dependencies

## Future Architecture Considerations

### Planned Enhancements
- **Queue System**: Background job processing (BullMQ, Inngest)
- **Caching Layer**: Redis for API responses and session data
- **Real-time Updates**: WebSocket or SSE for live collaboration
- **CDN Integration**: Cloudflare R2 for user file uploads
- **Observability**: OpenTelemetry for distributed tracing
- **Rate Limiting**: Upstash Redis for API rate limiting

### Scalability Roadmap
- **Multi-tenant**: Database sharding by user/organization
- **Microservices**: Extract heavy processing (LLM, PDF generation) to separate services
- **Event-Driven**: Event bus for decoupled architecture
- **Analytics**: Separate OLAP database for usage analytics

---

**Last Updated**: 2025-10-21
**Next Review**: When major architectural changes are planned
