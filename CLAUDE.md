# BragDoc Development Guide

## Build Commands

- `pnpm dev` - Run development server with turbo
- `pnpm build` - Build Next.js app
- `pnpm lint` - Run ESLint and Biome linting
- `pnpm format` - Format code with Biome
- `pnpm test` - Run all tests (requires setup)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cli` - Run CLI-specific tests
- `jest path/to/file.test.ts` - Run single test file
- `pnpm tsx path/to/file.ts` - Run TypeScript files directly

## CLI Commands

- `cd cli && pnpm build` - Build CLI
- `cd cli && pnpm test` - Run CLI tests
- `cd cli && pnpm dev` - Run CLI in dev mode
- `pnpm changeset` - Create changelogs with Changesets

## Code Style

- Use TypeScript for all code; prefer interfaces over types
- Avoid using React.FC; use proper type definitions
- Single quotes for strings, double quotes for JSX
- 2-space indentation, trailing commas
- PascalCase for component files (e.g., VisibilitySelector.tsx)
- camelCase for utility files (e.g., formatDate.ts)
- Lowercase with dashes for directories (e.g., form-wizard)
- Use named exports instead of default exports
- Use import/export instead of require/module.exports
- Use Next.js App Router conventions
- React 19+ with Server Components
- Import aliases: use `@/` for project root imports
- Use shadcn/ui components with Tailwind
- Handle API errors with clear error messages
- Prefer named exports over default exports
- Use mdx-prompt for AI prompts

## Git Commit Conventions

- "fix:" - Bug fixes
- "feat:" - New features
- "docs:" - Documentation changes
- "refactor:" - Code refactoring
- "test:" - Adding/updating tests
- "chore:" - Changes not modifying src/test
- "perf:" - Performance improvements
- "style:" - Non-functional code changes

## Project Structure

- Components in `/components` directory
- Reusable UI components in `/components/ui`
- Database schema and queries in `/lib/db`
- AI/LLM functions in `/lib/ai`
- Testing in `/test` directory
- Feature documentation in `/features/{feature-name}`

## Tech Stack

- Next.js App Router with Server Components
- Tailwind CSS for styling with shadcn/ui components
- Drizzle ORM for database access
- Vercel AI SDK for LLM integration
- NextAuth.js for authentication
- Braintrust for LLM evaluation

## CLI Authentication Flow

- CLI runs `bragdoc login` command
- CLI creates local server on port 5556
- Opens browser to `/cli-auth?state=[random_state]&port=5556`
- Browser authenticates user via NextAuth
- Web app gets token from `/api/cli/token` endpoint
- Token sent back to local CLI server
- CLI validates state parameter and stores token
- Token stored in `~/.config/bragdoc/config.yaml`
- API requests include token in Authorization header
