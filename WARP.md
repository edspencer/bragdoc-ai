# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

BragDoc AI is an AI-powered chatbot that helps users maintain brag documents for performance reviews and career advancement. The application tracks achievements, generates performance review documents, and integrates with GitHub and email systems.

## Monorepo Structure

This is a pnpm workspace with the following key packages:

- `apps/web` - Main Next.js web application with chat interface and document generation
- `apps/marketing` - Marketing website and landing pages
- `packages/cli` - Command-line tool for interacting with BragDoc
- `packages/database` - Drizzle ORM schemas and database utilities
- `packages/email` - Email templates and sending utilities
- `packages/ui` - Shared shadcn/ui components
- `packages/config` - Shared configuration utilities

## Development Commands

### Core Development
```bash
# Setup project (install + generate DB + push schema)
pnpm setup

# Run all apps in development
pnpm dev

# Run specific apps
pnpm dev:web          # Web app only
pnpm dev:marketing    # Marketing site only
pnpm dev:web-only     # Web + database only
pnpm dev:marketing-only  # Marketing only

# Build applications
pnpm build
pnpm build:web
pnpm build:marketing
```

### Testing
```bash
# Set up test environment
pnpm test:setup

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run CLI-specific tests
pnpm test:cli

# Run single test file
jest path/to/file.test.ts

# Run tests in IDE mode (for development)
pnpm test:ide

# Run LLM evaluations
pnpm eval
```

### Code Quality
```bash
# Lint with Biome and ESLint
pnpm lint
pnpm lint:fix

# Format code with Biome
pnpm format
```

### Database Operations
```bash
# Generate Drizzle migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Pull schema from database
pnpm db:pull

# Open Drizzle Studio
pnpm db:studio

# Run migration scripts
pnpm db:migrate

# Check migration status
pnpm db:check
```

### CLI Development
```bash
cd packages/cli

# Build CLI
pnpm build

# Run CLI tests
pnpm test

# Link CLI globally for testing
pnpm link-cli

# Create changeset for versioning
pnpm changeset

# Release CLI to npm
pnpm release
```

## Architecture Overview

### Core Data Model

The application revolves around these key entities:

- **User** - Authenticated users with subscription levels (free/basic/pro)
- **Company** - User's employers with roles and date ranges
- **Project** - Work projects, optionally linked to GitHub repositories
- **Achievement** - Individual accomplishments extracted from user messages
- **UserMessage** - Original text input from users
- **Document** - Generated performance review documents
- **Chat** - Conversational sessions with the AI

### Achievement Flow

1. User submits text via chat interface describing accomplishments
2. LLM extracts one or more Achievement records from the message
3. Achievements are categorized by company, project, impact level, and duration
4. Users can generate Documents summarizing achievements over date ranges

### Authentication Architecture

- **Web App**: NextAuth.js with email/password, Google, and GitHub providers
- **CLI**: OAuth-like flow where CLI opens browser, user authenticates, token returned to local CLI server
- **GitHub Integration**: OAuth tokens stored for repository access and commit history parsing

### Tech Stack Integration

- **Frontend**: Next.js 15 App Router with React Server Components
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Drizzle ORM with PostgreSQL (Vercel Postgres)
- **AI**: Vercel AI SDK supporting OpenAI, Anthropic, Google, and DeepSeek models
- **File Storage**: Vercel Blob for document attachments
- **Email**: React Email with Mailgun for transactional emails
- **Payments**: Stripe integration for subscription management
- **Testing**: Jest with Braintrust for LLM evaluations

### Key Application Patterns

#### LLM Integration
- Use `mdx-prompt` for structured AI prompts
- Achievement extraction and document generation via streaming
- Model provider switching via environment variables
- LLM evaluation framework with Braintrust

#### Database Patterns
- Drizzle ORM with type-safe queries
- Multi-tenant data isolation by userId
- Soft deletion with archive flags
- Timestamp-based event tracking for achievements

#### API Architecture
- Next.js App Router API routes in `/app/api/`
- Server Actions for form handling
- CLI API endpoints for token-based authentication
- Webhook handlers for Stripe and Mailgun

#### Canvas Document Editing
- ProseMirror-based rich text editor
- Real-time collaborative editing between user and AI
- Document versioning and publishing workflows

### Development Workflow

#### Code Style (from CLAUDE.md)
- TypeScript throughout, prefer interfaces over types
- 2-space indentation, trailing commas, single quotes
- PascalCase for components, camelCase for utilities
- Named exports preferred over default exports
- Biome for formatting and linting

#### Git Conventions
- `feat:` for new features
- `fix:` for bug fixes  
- `docs:` for documentation
- `refactor:` for code improvements
- `test:` for testing changes
- `chore:` for maintenance

#### Testing Strategy
- Unit tests for business logic and utilities
- API route testing with mocked dependencies
- CLI command testing with mock filesystems
- LLM evaluation tests for prompt quality

### Environment Setup

Environment variables are managed via Vercel or `.env` file:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Authentication secret
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - LLM providers
- `STRIPE_SECRET_KEY` - Payment processing
- `MAILGUN_API_KEY` - Email sending
- `GITHUB_CLIENT_ID/SECRET` - GitHub OAuth

### CLI Authentication Flow

1. CLI runs `bragdoc login`
2. Creates local server on port 5556
3. Opens browser to `/cli-auth?state=[random]&port=5556`
4. User authenticates via NextAuth
5. Token retrieved from `/api/cli/token`
6. Token sent back to CLI and stored in `~/.config/bragdoc/config.yaml`
7. Subsequent API calls use Authorization header

### Common Development Tasks

#### Adding New Achievement Types
1. Update database schema in `packages/database/src/schema.ts`
2. Run `pnpm db:generate` and `pnpm db:push`
3. Update AI prompts in `apps/web/lib/ai/`
4. Add extraction logic and tests

#### Implementing New Document Types
1. Create templates in `apps/web/lib/ai/prompts/`
2. Add generation logic in `apps/web/lib/ai/generate-document.ts`
3. Update Canvas editor for new document structure
4. Add publishing options if needed

#### CLI Command Development
1. Add command in `packages/cli/src/commands/`
2. Register in `packages/cli/src/index.ts`
3. Add tests in `packages/cli/src/commands/__tests__/`
4. Update CLI authentication if API access needed

## Important Notes

- **GitHub Integration**: Supports retroactive repository scanning for commit-based achievements (Premium feature)
- **Email Integration**: Bi-directional - users can email achievements to `hello@bragdoc.ai`
- **Multi-Company Support**: Users can track achievements across different employers
- **Subscription Tiers**: Free (limited), Basic ($3/month), Pro ($9/month) with different GitHub repo limits
- **Document Publishing**: Supports URL sharing, Google Docs integration, and email distribution