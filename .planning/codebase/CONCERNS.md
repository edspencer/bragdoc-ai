# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Console Logging in Production Code:**
- Issue: Extensive use of `console.log()`, `console.error()`, and `console.warn()` throughout codebase for debugging and ML pipeline tracing
- Files: `apps/web/lib/ai/workstreams.ts` (15+ log statements), `apps/web/lib/email/process-incoming.ts`, multiple API routes, CLI code
- Impact: Debugging statements leak into production logs, creating noise and potentially exposing sensitive information; makes tracing user activity harder
- Fix approach: Replace with structured logging using a logger utility (similar to `packages/cli/src/utils/logger.ts`); conditional logging based on environment; centralize logging configuration

**Type Assertions (`as any`) Throughout Codebase:**
- Issue: Multiple `as any` type assertions indicate incomplete type safety
- Files: `apps/web/lib/getAuthUser.ts`, `apps/web/app/(app)/reports/actions.ts`, `apps/web/lib/ai/workstreams.ts`, `packages/cli/src/commands/extract.ts`, `packages/cli/src/config/index.ts`, test files
- Examples: Auth payload type casting, CLI data loading, test mocks
- Impact: Defeats TypeScript strict mode benefits; makes code harder to refactor safely; hides type mismatches
- Fix approach: Properly define interfaces for JWT payloads, CLI config, and test fixtures; create specific types instead of using `any`

**Incomplete Email Integration:**
- Issue: Email processing pipeline is stubbed out with TODO comment
- Files: `apps/web/lib/email/process-incoming.ts` (line 79)
- Status: Function exists but AI-powered extraction is disabled; only logs emails without processing
- Impact: Email-to-achievement feature doesn't work; users can't extract achievements via email
- Fix approach: Implement the AI extraction logic using existing LLM infrastructure; integrate with `generateAchievements` tool

**Multiple Type Safety Escape Hatches:**
- Issue: `@ts-expect-error` comments used for JSX element type mismatches in prompt generation
- Files: `packages/cli/src/ai/prompts/elements.tsx` (7 instances), `apps/web/lib/ai/prompts/elements.tsx`
- Impact: Custom JSX element handling for prompt rendering bypasses type checking
- Fix approach: Create proper TypeScript types for AI prompt JSX elements or migrate to text-based prompt generation

**Unscoped Database Query:**
- Issue: `getUser()` query in email processing doesn't scope by organization/workspace
- Files: `apps/web/lib/email/process-incoming.ts` (line 44)
- Impact: Potential information disclosure if email user lookup returns multiple users across workspace boundaries
- Fix approach: Review email authentication flow and ensure proper scoping; validate email permissions

## Known Bugs

**Deleted Projects/Companies Referenced in Achievements:**
- Problem: No cascade delete or referential integrity when projects or companies are deleted
- Files: `packages/database/src/schema.ts`, achievement creation logic in `apps/web/app/api/achievements/route.ts`
- Trigger: Delete a project or company that has linked achievements
- Current behavior: Achievements remain with dangling references; foreign key constraints may fail
- Workaround: Soft delete achievements or validate references before deletion
- Fix approach: Add cascade delete on project/company deletion OR soft delete pattern; add test for orphaned achievements

**Navigation Counts Don't Update Real-Time:**
- Problem: Achievement/project/company counts in sidebar don't refresh on add/delete without page reload
- Files: `apps/web/components/sidebar.tsx`, count calculation likely in `apps/web/app/api/counts/route.ts`
- Trigger: Create/delete achievement, project, or company; observe sidebar counts remain stale
- Impact: User confusion about actual data state
- Fix approach: Implement real-time count updates via WebSocket/polling OR trigger client-side cache invalidation after mutations

**Better Auth Account Linking Non-Functional:**
- Problem: OAuth account linking for existing credentials users doesn't work
- Files: `apps/web/lib/better-auth/config.ts`
- Impact: Users with email/password accounts can't connect OAuth providers
- Fix approach: Review Better Auth v1.3.33 account linking implementation; check OAuth provider configurations

**LLM-Generated Testimonials Missing Quality Assurance:**
- Problem: Marketing site displays AI-generated testimonials without human review or accuracy verification
- Files: `apps/marketing/` (testimonial components)
- Impact: Could contain false or misleading claims about product
- Fix approach: Replace with real user testimonials or clearly label as AI-generated for transparency

**Achievement Company Assignment Logic:**
- Problem: When creating achievement with projectId but no companyId, should auto-assign company from project
- Files: `apps/web/app/api/achievements/route.ts` (lines 123-140) - logic is IMPLEMENTED
- Status: Already fixed in POST handler; verify GET/PATCH endpoints also handle this correctly

## Security Considerations

**Redirect Usage in Server Components:**
- Risk: `redirect()` function used in some Server Components breaks Cloudflare Workers builds
- Files: `apps/web/app/(app)/reports/page.tsx`, `apps/web/app/(app)/documents/page.tsx`, `apps/web/app/(app)/page.tsx`
- Current mitigation: Some routes documented with warning comments about not using `redirect()`
- Recommendations:
  - Audit all Server Components for `redirect()` usage
  - Replace with fallback UI pattern: `if (!auth) return <LoginRequired />`
  - Document pattern in `frontend-patterns.md`
  - Add lint rule to prevent future `redirect()` usage in Server Components

**Type Casting in Authentication:**
- Risk: JWT payload fields cast `as any` in `getAuthUser()` instead of being properly typed
- Files: `apps/web/lib/getAuthUser.ts` (lines 82-84)
- Current mitigation: Runtime error handling exists but type safety is lost
- Recommendations: Create `DecodedJWTPayload` interface matching Better Auth token structure; update auth validation

**Unvalidated Environment Variables:**
- Risk: Missing validation for critical environment variables at startup
- Files: Multiple files access `process.env` directly without validation
- Examples: `OPENAI_API_KEY`, `POSTGRES_URL`, `BETTER_AUTH_SECRET`
- Current mitigation: None detected (errors occur at runtime)
- Recommendations:
  - Create centralized config validation at app startup
  - Use `zod` for environment variable schema validation
  - Fail fast if required vars missing
  - Document all required vs optional env vars

## Performance Bottlenecks

**Workstreams ML Pipeline Logging:**
- Problem: Excessive console logging in `apps/web/lib/ai/workstreams.ts` (1273 lines, contains 15+ log statements) during clustering operations
- Impact: Slows down workstream generation; log I/O overhead on each clustering operation
- Files: `apps/web/lib/ai/workstreams.ts` (lines 594, 606, 611, 659, 686, 863, 915, 946, 950, 980, 1011, 1048, 1060, 1098, etc.)
- Current performance: <500ms for typical datasets (<1000 achievements)
- Recommendations: Conditional logging for debug mode only; remove progress logs from production

**Embedding Generation Overhead:**
- Problem: All embeddings generated upfront even when filters apply (optimized in code but still CPU-intensive)
- Files: `apps/web/lib/ai/embeddings.ts`
- Impact: For large achievement sets, embedding generation is bottleneck before clustering
- Current optimization: Helper functions `getAchievementSummaries()` and filtering applied post-clustering
- Recommendations: Consider lazy embedding generation or caching stale embeddings

**Large Component Files:**
- Problem: Single components exceed 800+ lines, making them hard to maintain
- Files:
  - `apps/web/components/standups/recent-achievements-table.tsx` (829 lines)
  - `apps/web/components/ui/sidebar.tsx` (728 lines)
  - `apps/web/components/data-table.tsx` (806 lines)
  - `apps/web/lib/ai/workstreams.ts` (1273 lines)
- Impact: Harder to test, understand, and modify; potential memory pressure in React
- Fix approach: Break into smaller sub-components using composition; extract reusable hooks

## Fragile Areas

**Demo Mode System:**
- Files: `apps/web/lib/demo-mode.ts`, `apps/web/lib/demo-mode-utils.ts`, `apps/web/components/demo-toggle-wrapper.tsx`
- Why fragile: Complex cookie/session handling; manual parsing of auth tokens; fallback behavior for disabled state
- Unsafe modifications: Changing auth flow requires updating demo mode checks; session logic highly coupled
- Test coverage: Limited test coverage for demo mode edge cases
- Safe modification approach: Encapsulate demo mode checks in `getAuthUser()` helper; avoid scatter pattern across routes

**Workstreams Clustering Logic:**
- Files: `apps/web/lib/ai/workstreams.ts`, `apps/web/lib/ai/clustering.ts`, `apps/web/lib/ai/embeddings.ts`
- Why fragile: Complex multi-step ML pipeline with decision trees for incremental vs full re-clustering
- Decision logic: Percentage thresholds (10%), absolute thresholds (50 achievements), time thresholds (30 days) - hard to tune
- Test coverage: 1551 lines of tests (extensive) but algorithm tuning still risky
- Unsafe modifications: Changing DBSCAN parameters affects all existing workstreams; centroid calculations must be exact
- Safe modification approach: Create migration path for parameter changes; use feature flags for algorithm updates; test on shadow data first

**Chat-to-Achievement Extraction:**
- Files: `apps/web/app/api/performance-review/chat/route.ts`, AI prompt integration
- Why fragile: LLM output parsing; depends on specific prompt structure; minor prompt changes affect extraction
- Unsafe modifications: Changing system prompts can break achievement extraction; missing validation on LLM output
- Test coverage: Prompt behavior covered by evals but integration tests limited
- Safe modification approach: Add structured output parsing; implement fallback handling for malformed LLM responses

**Account Deletion System:**
- Files: `apps/web/app/api/account/delete/route.ts`
- Why fragile: Cascading deletes across users, achievements, projects, companies, documents, workstreams
- No detected safeguards: Risk of partial deletion on error; no audit trail
- Safe modification approach: Implement transactional deletes; add soft delete option; create deletion audit log

## Scaling Limits

**OpenAI Embeddings API Rate Limiting:**
- Current capacity: ~1500 embeddings per user before hitting OpenAI API limits
- Limit: API rate limits on embedding generation; each workstream regeneration calls API
- Files: `apps/web/lib/ai/embeddings.ts`
- Impact: Users with 5000+ achievements may timeout on workstream generation
- Scaling path:
  - Implement batching to respect rate limits
  - Cache embeddings with TTL
  - Use local embeddings model for batch operations
  - Consider capped workstream generation

**PostgreSQL Vector Search Performance:**
- Current capacity: pgvector extension handles up to ~500K embeddings efficiently
- Limit: Vector similarity search on 1M+ embeddings becomes slow; HNSW index required for production
- Files: `packages/database/src/schema.ts` (embedding vector columns)
- Current setup: Using pgvector without HNSW index
- Scaling path: Add HNSW index on `embedding` column; monitor query performance at scale; consider vector DB migration

**Database Connection Pool:**
- Current setup: Using Vercel Postgres with default pool settings
- Limit: Default connections (~10-20 concurrent) insufficient for high-traffic workloads
- Impact: Connection exhaustion under peak load; timeout errors on API
- Scaling path: Configure connection pooling in Drizzle ORM; monitor connection usage; consider PgBouncer proxy

## Test Coverage Gaps

**API Route Error Handling:**
- Untested area: Error scenarios in 50+ API routes
- Files: `apps/web/app/api/**/*.ts`
- Specific gaps:
  - Database constraint violations (unique email, foreign keys)
  - Invalid input validation (malformed dates, out-of-range numbers)
  - Authorization failures (non-owned resources, deleted users)
  - External API failures (OpenAI timeout, embeddings API down)
- Risk: User-facing errors not properly handled; potential 500 responses instead of 4xx
- Priority: **High** - affects user experience and API reliability

**Frontend Component Error Boundaries:**
- Untested area: React error boundaries and fallback UI
- Files: Root layout, error.tsx files
- Risk: Component crashes cascade to full page blank state instead of graceful degradation
- Priority: **Medium** - edge case but impacts user experience

**CLI Integration Tests:**
- Untested area: End-to-end CLI extraction with real repositories
- Files: `packages/cli/__tests__/**/*.ts`
- Coverage: Unit tests exist but full integration with Git/GitHub extraction untested
- Risk: Connector bugs not caught until production
- Priority: **Medium** - critical for CLI reliability but limited by test environment setup

**Database Migration Safety:**
- Untested area: Zero-downtime migration paths for schema changes
- Files: `packages/database/src/migrations/`
- Risk: Large table migrations could cause downtime
- Priority: **High** - affects production stability

**Account Deletion E2E:**
- Untested area: Full account deletion cascade with UI verification
- Files: `apps/web/app/api/account/delete/route.ts`
- Risk: Partial deletion, data leaks, or orphaned records undetected
- Priority: **High** - data integrity and privacy critical

## Dependencies at Risk

**Better Auth v1.3.33 (Early Version):**
- Risk: Not production-ready; bugs and breaking changes likely
- Impact: Auth features unstable (account linking broken); upgrades risky
- Current issues: Account linking doesn't work; session management complex
- Migration plan: Monitor v2 releases; test major upgrades in staging; maintain auth facade for easier switching

**Density Clustering Library:**
- Risk: Small maintenance footprint; may not handle edge cases
- Impact: DBSCAN algorithm implementation in `apps/web/lib/ai/clustering.ts` relies on single npm package
- Workaround: Embedded fallback clustering implementation to reduce dependency
- Migration plan: Consider ml.js or scikit-learn-js alternatives if library abandoned

**Drizzle ORM ^0.44.6 (Rapid Development):**
- Risk: Frequent breaking changes in early versions
- Current override: `drizzle-orm` pinned to exact version in `pnpm` overrides (0.44.6)
- Impact: Type-safety improvements and new features may require code changes
- Scaling risk: New features may not handle 100K+ achievement datasets efficiently
- Migration plan: Plan major version upgrades quarterly; test on production-like datasets

## Missing Critical Features

**API Documentation Gap:**
- Problem: OpenAPI spec exists but not automated or hosted
- Files: Referenced in TODO.md but implementation incomplete
- Blocks: Third-party integrations that need API contract documentation
- Impact: Developers can't build integrations confidently
- Recommendation: Set up automatic OpenAPI spec generation from route.ts files; host on GitHub Pages

**Rate Limiting for APIs:**
- Problem: No rate limiting implemented on public/authenticated endpoints
- Files: All API routes lack middleware
- Blocks: Production deployment (TODO in CLAUDE.md)
- Impact: Vulnerability to abuse, excessive API costs from batch requests
- Recommendation: Implement Cloudflare rate limiting or middleware-based approach

**Background Job Queue:**
- Problem: No async job processing system (TODO in CLAUDE.md)
- Files: None (feature missing)
- Blocks: Email scheduling, heavy processing (document generation, workstream clustering)
- Impact: API response times slow for heavy operations; no scheduled jobs capability
- Recommendation: Evaluate Bull/BullMQ or AWS SQS; integrate with existing architecture

**Caching Strategy:**
- Problem: No Redis/caching layer implemented (TODO in CLAUDE.md)
- Impact: Repeated queries (achievements list, workstreams, project summaries) hit database every request
- Cost: Higher database load, slower user experience, higher infrastructure costs
- Recommendation: Add Redis caching layer for frequently accessed data

**User Preferences System:**
- Problem: Feature partially designed but not implemented
- Files: TODO.md outlines schema but code missing
- Scope: Language preferences, email settings, document formatting preferences
- Impact: Can't customize user experience per preferences
- Timeline: Blocking email preferences configuration

---

*Concerns audit: 2026-02-06*
