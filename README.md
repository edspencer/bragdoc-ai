# BragDoc

**AI-powered achievement tracking for career success.**

BragDoc helps you track, document, and showcase your professional achievements automatically. Never forget your wins again—whether for performance reviews, resume updates, or weekly check-ins with your manager.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🚀 What is BragDoc?

BragDoc is a complete platform for managing your professional achievements:

- **📝 Chat Interface**: Naturally tell an AI chatbot about your work, and it extracts structured achievements
- **🤖 Git Integration**: Automatically extract achievements from your commit history via CLI
- **📊 Smart Organization**: Track achievements by company, project, and time period
- **📄 Document Generation**: Create performance reviews, weekly updates, and more with AI assistance
- **✉️ Email Integration**: Send achievements via email directly to `hello@bragdoc.ai`

### Why BragDoc?

**You're doing great work, but you'll forget most of it.** When performance review season comes around, you'll struggle to remember what you accomplished 6 months ago. BragDoc captures your wins as they happen—whether through Git commits, chat conversations, or quick emails—so you always have a record of your impact.

### Key Features

- **🎯 Achievement Tracking**: Log accomplishments individually or in batches
- **🔗 Multi-Company Support**: Organize achievements as you change jobs
- **📈 Impact Scoring**: AI-powered analysis ranks importance of your work
- **📅 Time-Based Summaries**: Generate reports for any time period
- **🔄 Git Integration**: Automatic achievement extraction from repositories
- **📧 Email Integration**: Send achievements to `hello@bragdoc.ai`
- **🌙 Dark Mode**: Beautiful UI with full dark mode support
- **🔐 Secure**: Multiple auth providers, data encryption

---

## 📦 What's in This Repository?

This is a **TypeScript monorepo** containing the complete BragDoc platform:

```
brag-ai/
├── apps/
│   ├── web/           # Main Next.js web application
│   └── marketing/     # Marketing website
├── packages/
│   ├── cli/          # Command-line tool for Git integration
│   ├── database/      # Shared database layer (Drizzle ORM)
│   ├── email/        # Email templates (React Email)
│   └── config/       # Shared configuration
└── features/         # Feature documentation
```

### Technology Stack

- **Frontend**: Next.js 15 with React 19 Server Components
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: NextAuth.js with multiple providers
- **AI**: Vercel AI SDK (OpenAI, DeepSeek, Google)
- **Styling**: Tailwind CSS + shadcn/ui
- **CLI**: Node.js with Commander
- **Deployment**: Cloudflare Workers via OpenNext

---

## 🎯 Getting Started with BragDoc

### Option 1: Use BragDoc Cloud (Recommended)

The easiest way to get started:

1. **Sign up** at [bragdoc.ai](https://bragdoc.ai)
2. **Install the CLI** to track Git achievements:
   ```bash
   npm install -g @bragdoc/cli
   ```
3. **Authenticate**:
   ```bash
   bragdoc login
   ```
4. **Initialize your repository**:
   ```bash
   cd /path/to/your/project
   bragdoc init
   ```

That's it! Your Git commits will now be automatically analyzed and converted into achievements.

### CLI Features

The CLI automatically:

- Extracts meaningful achievements from commit messages
- Syncs with your BragDoc web account
- Caches processed commits to avoid duplicates
- Supports scheduled automatic extractions

```bash
# Initialize repository
bragdoc init

# Extract achievements manually
bragdoc extract

# List configured repositories
bragdoc repos list

# Check authentication
bragdoc auth status
```

See the [CLI documentation](packages/cli/README.md) for full details.

---

## 🏠 Self-Hosting BragDoc

Want to run your own instance? BragDoc is designed to be self-hosted.

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key (or other LLM provider)
- Email service (Mailgun recommended)

### Quick Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/edspencer/bragdoc-ai.git
   cd bragdoc-ai
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Database
   POSTGRES_URL="postgresql://..."

   # Authentication
   AUTH_SECRET="generate-with-openssl-rand-base64-32"
   NEXTAUTH_URL="http://localhost:3000"

   # LLM Provider
   OPENAI_API_KEY="sk-..."

   # Email (optional)
   MAILGUN_API_KEY="your-key"
   MAILGUN_DOMAIN="mg.yourdomain.com"

   # OAuth (optional)
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   GITHUB_CLIENT_ID="..."
   GITHUB_CLIENT_SECRET="..."

   # Payments (optional)
   STRIPE_SECRET_KEY="sk_..."
   ```

4. **Set up the database**:

   ```bash
   pnpm db:push
   ```

5. **Start the development server**:

   ```bash
   pnpm dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

BragDoc is optimized for deployment to **Cloudflare Workers**:

```bash
# Build and deploy
pnpm --filter=@bragdoc/web deploy
```

You can also deploy to:

- **Vercel**: Standard Next.js deployment
- **AWS**: Using OpenNext
- **Any Node.js host**: Using `pnpm build && pnpm start`

See [deployment documentation](docs/deployment.md) for detailed instructions.

---

## 🏗️ Architecture Overview

### Monorepo Structure

BragDoc uses **Turborepo** for efficient builds and caching across multiple packages:

- **Apps**: User-facing applications
- **Packages**: Shared libraries and tools
- **Workspace**: pnpm for dependency management

### Core Components

#### 1. Web Application (`apps/web`)

Next.js 15 application with:

- **App Router**: Modern routing with layouts and nested routes
- **Server Components**: Optimal performance with React Server Components
- **API Routes**: RESTful endpoints for all operations
- **Canvas Mode**: Collaborative document editing with AI

**Key Routes**:

- `/` - Dashboard with achievement overview (includes welcoming zero state for new users)
- `/achievements` - Achievement management
- `/projects` - Project tracking
- `/companies` - Company/employer management
- `/chat` - Interactive AI chat interface
- `/api/*` - RESTful API endpoints

#### 2. CLI Tool (`packages/cli`)

Standalone Node.js application:

- **Git Analysis**: Parses commit history locally
- **API Client**: Syncs with web app via authenticated API
- **Caching**: Avoids reprocessing commits
- **Scheduling**: Optional automated extraction (cron/Task Scheduler)

**Configuration**: Stored in `~/.bragdoc/config.yml`

#### 3. Database Layer (`packages/database`)

Centralized data access with **Drizzle ORM**:

- **Schema**: PostgreSQL tables with TypeScript types
- **Queries**: Reusable, type-safe query functions
- **Migrations**: Version-controlled schema changes

**Core Tables**:

- `user` - User accounts and authentication
- `achievement` - Individual achievements
- `project` - Projects (linked to Git repos)
- `company` - Employers/companies
- `userMessage` - Chat history

#### 4. Authentication

**NextAuth.js** with JWT strategy:

- **Providers**: Google, GitHub, Email/Password
- **Unified Auth**: Same system for web and CLI
- **CLI Auth Flow**: Browser-based OAuth with JWT token issuance

### AI/LLM Integration

**Vercel AI SDK** with intelligent routing:

```typescript
// Automatically selects optimal LLM based on task and user tier
const llm = await getLLM(user, 'extraction');
const achievements = await extractAchievements(commits, llm);
```

**Prompt Engineering**:

- MDX-based prompts for maintainability
- Structured outputs with JSON schemas
- Context-aware achievement extraction

**Supported Providers**:

- OpenAI (GPT-4, GPT-3.5)
- DeepSeek
- Google (Gemini)

### Data Flow

#### Git → Achievements

```
1. CLI reads Git commits locally
2. Sends batch to API: POST /api/cli/commits
3. API processes with LLM (extract meaningful achievements)
4. Saves to database with project/user association
5. Returns achievement IDs to CLI
6. CLI caches processed commit hashes
```

#### Chat → Achievements

```
1. User sends message in chat UI
2. API routes to LLM with conversation context
3. LLM extracts achievements from message
4. Saves achievements and chat message
5. Returns formatted response with achievement cards
```

#### Document Generation

```
1. User requests document (e.g., "6-month performance review")
2. API queries achievements for time period
3. LLM generates structured document
4. Canvas mode allows collaborative editing
5. Export to PDF, share via link, or email
```

---

## 🛠️ Development

### Setup

```bash
# Install dependencies
pnpm install

# Set up database
pnpm db:generate  # Generate migrations
pnpm db:push      # Apply to database

# Start all apps in dev mode
pnpm dev

# Start specific app
pnpm dev:web
pnpm dev:marketing
```

### Commands

```bash
# Development
pnpm dev              # Run all apps
pnpm dev:web          # Web app only
pnpm dev:marketing    # Marketing site only

# Building
pnpm build            # Build all packages and apps
pnpm build:web        # Web app only

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:cli         # CLI tests only

# Database
pnpm db:generate      # Generate migration
pnpm db:push          # Apply migration
pnpm db:studio        # Open Drizzle Studio

# Linting
pnpm lint             # Lint all packages
pnpm lint:fix         # Lint and auto-fix
pnpm format           # Format with Biome
```

### Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (app)/             # Main application pages
│   ├── (auth)/            # Auth pages (login/register)
│   ├── api/               # API routes
│   └── cli-auth/          # CLI authentication flow
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── achievements/     # Feature-specific components
│   └── ...
├── lib/                  # Utilities and helpers
│   ├── ai/              # AI/LLM integration
│   ├── email/           # Email utilities
│   └── ...
└── hooks/               # Custom React hooks

packages/cli/
├── src/
│   ├── commands/        # CLI command implementations
│   ├── api/            # API client
│   ├── git/            # Git operations
│   └── config/         # Configuration management

packages/database/
├── src/
│   ├── schema.ts       # Database schema
│   ├── queries.ts      # Query functions
│   └── migrations/     # SQL migrations
```

### Code Style

- **TypeScript**: Strict mode, explicit types
- **React**: Functional components, Server Components by default
- **Naming**: PascalCase for components, camelCase for functions
- **Imports**: Use `@/` alias for clean imports
- **Testing**: Jest + Testing Library

See [CLAUDE.md](CLAUDE.md) for comprehensive development documentation.

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete technical documentation
- **[CLI README](packages/cli/README.md)** - CLI tool documentation
- **[FEATURES.md](FEATURES.md)** - Detailed feature specifications
- **[features/](features/)** - Individual feature documentation

---

## 💰 Pricing & Subscription Tiers

### Free

- Basic achievement tracking
- Limited LLM usage
- Manual Git extraction only

### Basic Bragger ($3/month or $30/year)

- One GitHub repository integration
- Unlimited achievements and documents
- Advanced LLM models

### Pro Bragger ($9/month or $90/year)

- Unlimited GitHub repositories
- Scheduled automated extractions
- Publishing options (URL sharing, Google Docs, email)
- Priority support

Payments via Stripe with Link for seamless checkout.

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Write tests if applicable
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feat/my-feature`
7. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:

- [Next.js](https://nextjs.org)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [NextAuth.js](https://next-auth.js.org)

---

## 🔗 Links

- **Website**: [bragdoc.ai](https://bragdoc.ai)
- **Documentation**: [CLAUDE.md](CLAUDE.md)
- **CLI Package**: [@bragdoc/cli on npm](https://www.npmjs.com/package/@bragdoc/cli)
- **Issues**: [GitHub Issues](https://github.com/edspencer/bragdoc-ai/issues)

---

## 📞 Support

- **Email**: hello@bragdoc.ai
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: See [CLAUDE.md](CLAUDE.md) for technical details

---

**Made with ❤️ for developers who want to remember their wins**
