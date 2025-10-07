# Standup Feature Integration Plan

## Overview
Integrating the Standup feature into BragDoc, including:
- Web UI for creating and managing standups
- API endpoints for CRUD operations
- CLI commands for WIP extraction
- Scheduled jobs for achievement summary generation
- Proper timezone handling throughout

---

## Phase 1: Foundation & Utilities

### 1.1 Create Shared Utilities Package ✅
- [x] Create `packages/lib/scheduling/weekdayMask.ts` with weekday bit mask utilities
  - Export `Weekday` constants (Mon=1<<0, Tue=1<<1, etc.)
  - Export `toMask()` and `fromMask()` functions
  - Export `orderedDays` array for UI
- [x] Create `packages/lib/scheduling/nextRun.ts` with `computeNextRunUTC()` function
  - Use date-fns for date manipulation
  - Handle timezone conversion with date-fns-tz
  - Implement weekday matching logic
- [x] Create `packages/lib/scheduling/index.ts` to export all scheduling utilities
- [x] Add required dependencies to packages/lib:
  - date-fns
  - date-fns-tz

### 1.2 Database Queries Layer ✅
- [x] Create `packages/database/src/standups/queries.ts` with standup query functions:
  - `getStandupsByUserId(userId: string): Promise<Standup[]>`
  - `getStandupById(id: string, userId: string): Promise<Standup | null>`
  - `createStandup(data: StandupInsert): Promise<Standup>`
  - `updateStandup(id: string, userId: string, data: Partial<StandupInsert>): Promise<Standup>`
  - `deleteStandup(id: string, userId: string): Promise<void>`
- [x] Create `packages/database/src/standups/documents.ts` with document query functions:
  - `getStandupDocumentsByStandupId(standupId: string, limit?: number): Promise<StandupDocument[]>`
  - `getCurrentOrCreateStandupDocument(standupId: string, userId: string): Promise<StandupDocument>`
  - `updateStandupDocumentWip(documentId: string, wip: string): Promise<StandupDocument>`
  - `updateStandupDocumentAchievementsSummary(documentId: string, summary: string): Promise<StandupDocument>`
  - `getRecentAchievementsForStandup(standupId: string, userId: string, since?: Date): Promise<Achievement[]>`
- [x] Export standup queries from `packages/database/src/index.ts`
- [x] Create `packages/database/src/standups/types.ts` for standup-specific types
  - `StandupInsert` type
  - `StandupWithRelations` type (includes company/projects)
  - `StandupDocumentWithDetails` type

---

## Phase 2: API Endpoints ✅

### 2.1 Standup CRUD Endpoints ✅
- [x] Create `apps/web/app/api/standups/route.ts`:
  - `GET /api/standups` - List all standups for authenticated user
  - `POST /api/standups` - Create new standup
  - Validate authentication using `getAuthUser()`
  - Validate request data with Zod schema
  - Return proper error responses
- [x] Create `apps/web/app/api/standups/[standupId]/route.ts`:
  - `GET /api/standups/:standupId` - Get single standup
  - `PUT /api/standups/:standupId` - Update standup
  - `DELETE /api/standups/:standupId` - Delete standup
  - Verify userId matches for security

### 2.2 StandupDocument Endpoints ✅
- [x] Create `apps/web/app/api/standups/[standupId]/wip/route.ts`:
  - `POST /api/standups/:standupId/wip` - Update WIP for current document
  - Get or create current StandupDocument
  - Update wip field
  - Return updated document
- [x] Create `apps/web/app/api/standups/[standupId]/achievements-summary/route.ts`:
  - `POST /api/standups/:standupId/achievements-summary` - Update achievements summary
  - Get or create current StandupDocument
  - Generate AI summary from recent achievements
  - Update achievementsSummary field
  - Return updated document

### 2.3 Helper Endpoints ✅
- [x] Create `apps/web/app/api/standups/[standupId]/achievements/route.ts`:
  - `GET /api/standups/:standupId/achievements` - Get recent achievements
  - Filter by standup's companyId or projectIds
  - Filter by date range (since last standup)
  - Return formatted achievements for display
- [x] Create `apps/web/app/api/standups/[standupId]/documents/route.ts`:
  - `GET /api/standups/:standupId/documents` - Get recent standup documents
  - Support pagination via limit query param
  - Return documents with proper formatting

---

## Phase 3: Web UI Components ✅

### 3.1 Copy and Adapt v0 Components ✅
- [x] Copy UI components from temp-v0-app to apps/web/components/standups/:
  - `standup-form.tsx` - Form for creating/editing standups
  - `existing-standup-content.tsx` - Main standup page layout
  - `standup-achievements-table.tsx` - Table showing recent achievements
  - `recent-updates-table.tsx` - Table showing recent documents
  - `standup-update-section.tsx` - Section for editing current summary
  - `wip-section.tsx` - Section for editing WIP
  - `company-project-selector.tsx` - Selector for companies/projects
- [x] Update all imports in copied components to match app structure
- [x] Replace mock data with actual API calls
  - standup-form calls POST/PUT /api/standups
  - existing-standup-content fetches from /api/standups/[id]/achievements and /api/standups/[id]/documents
  - standup-update-section calls POST /api/standups/[id]/achievements-summary
  - wip-section calls POST /api/standups/[id]/wip
- [x] Update component to use proper TypeScript types from database schema
- [x] Add proper error handling and loading states

### 3.2 Integrate with Existing UI Components ✅
- [x] Update `apps/web/components/app-sidebar.tsx`:
  - Add "Standup" nav item between Dashboard and Achievements
  - Import appropriate icon (Users from tabler-icons)
- [x] Use proper AppPage layout wrapper for consistency

### 3.3 Create Main Standup Page ✅
- [x] Create `apps/web/app/(app)/standup/page.tsx`:
  - Server component that fetches standup data
  - Show zero-state if no standup exists
  - Show standup page if standup exists
  - Use `getStandupsByUserId()` to fetch data server-side
  - Proper AppPage/SidebarInset/SiteHeader layout
- [ ] Create `apps/web/app/(app)/standup/loading.tsx` - Loading skeleton (OPTIONAL)
- [ ] Create `apps/web/app/(app)/standup/error.tsx` - Error boundary (OPTIONAL)

---

## Phase 4: CLI Commands ✅

### 4.1 Create Standup CLI Commands Structure ✅
- [x] Create `packages/cli/src/commands/standup.ts`:
  - Main `standup` command group
  - `enable` subcommand - Interactive setup with standup selection
  - `disable` subcommand - Remove scheduling
  - `status` subcommand - Show current configuration
  - `wip` subcommand - Extract and submit WIP on demand
- [x] Register standup commands in `packages/cli/src/index.ts`
- [x] Update `packages/cli/src/config/types.ts` to add StandupConfig interface

### 4.2 Implement `bragdoc standup enable` ✅
- [x] Fetch available standups from API (`GET /api/standups`)
- [x] Show interactive selector for user to choose standup
- [x] Calculate cron schedule (10 mins before meeting time)
- [x] Convert daysMask to cron weekdays format
- [x] Optionally configure repository path for WIP extraction
- [x] Save configuration to CLI config (~/.bragdoc/config.yml)
- [x] Integrate with existing system scheduling (reuse repos.ts patterns):
  - Unix/Linux/Mac: Install crontab entry
  - Windows: Install Task Scheduler task
- [x] Display success message with schedule details

### 4.3 Implement `bragdoc standup disable` ✅
- [x] Mark standup as disabled in CLI config
- [x] Update system scheduling to remove standup cron job
- [x] Display confirmation message

### 4.4 Git WIP Extraction Logic ✅
- [x] Create `packages/cli/src/git/wip.ts`:
  - `extractWip()` - Get git status and diff
  - `isGitRepository()` - Check if directory is a git repo
  - `generateSimpleSummary()` - Create human-readable summary of changes
- [x] Track modified files, untracked files, and line changes
- [x] Generate simple text summary (file lists + line counts)

### 4.5 Implement `bragdoc standup wip` Command ✅
- [x] Extract WIP from configured repository or current directory
- [x] Check if standup is enabled
- [x] Validate git repository
- [x] Extract uncommitted changes
- [x] Submit WIP summary to API (`POST /api/standups/:id/wip`)
- [x] Handle authentication and error cases

### 4.6 System Scheduling Integration ✅
- [x] Reuse existing cron utilities from repos.ts
- [x] Update `installSystemCrontab()` to handle standup schedules
- [x] Update `installWindowsScheduling()` to create standup tasks
- [x] Maintain both repository extraction and standup WIP schedules
- [x] Clean removal of old entries when updating

---

## Phase 5: Scheduled Jobs (Upstash)

### 5.1 Set Up Upstash QStash Integration
- [ ] Add @upstash/qstash dependency to web app
- [ ] Add QSTASH_TOKEN to environment variables
- [ ] Add QSTASH_CURRENT_SIGNING_KEY to environment variables
- [ ] Add QSTASH_NEXT_SIGNING_KEY to environment variables

### 5.2 Create Scheduled Job Handler
- [ ] Create `apps/web/app/api/cron/standup-summary/route.ts`:
  - Verify QStash signature for security
  - Fetch all active standups
  - For each standup, check if it's time to generate summary
  - Get achievements since last standup document
  - Generate AI summary using LLM
  - Create or update StandupDocument with summary
  - Handle errors gracefully

### 5.3 Configure QStash Schedule
- [ ] Create script or manual process to register cron job with QStash
- [ ] Schedule to run every 5-10 minutes
- [ ] Job checks all standups and processes those due

### 5.4 AI Summary Generation
- [ ] Create `apps/web/lib/ai/standup-summary.ts`:
  - `generateStandupSummary(achievements: Achievement[], instructions?: string)`
  - Use existing LLM router from `lib/ai/llm-router.ts`
  - Create prompt for standup summary generation
  - Return formatted summary text

---

## Phase 6: Timezone Handling

### 6.1 Ensure Proper Timezone Support
- [ ] Verify database stores timezone strings (IANA format)
- [ ] Verify meeting times are stored as local time (without timezone)
- [ ] Frontend uses user's browser timezone for display
- [ ] Backend converts between timezones correctly for scheduling

### 6.2 Update Components for Timezone Display
- [ ] Format meeting times with timezone in UI
- [ ] Show "next standup" time in user's local timezone
- [ ] Ensure date pickers work with user's timezone

---

## Phase 7: Database Migration

### 7.1 Verify Schema and Generate Migration
- [ ] Run `pnpm db:generate` to ensure migration exists for Standup tables
- [ ] Review generated migration SQL
- [ ] Test migration on development database
- [ ] Run `pnpm db:push` to apply migration

---

## Phase 8: Testing

### 8.1 API Endpoint Tests
- [ ] Write tests for GET/POST /api/standups
- [ ] Write tests for standup CRUD operations
- [ ] Write tests for WIP and achievements-summary endpoints
- [ ] Test authentication and authorization
- [ ] Test error handling

### 8.2 Component Tests
- [ ] Test StandupForm component
- [ ] Test zero-state display
- [ ] Test existing standup page
- [ ] Test achievement selection
- [ ] Test WIP editing

### 8.3 CLI Tests
- [ ] Test standup enable command
- [ ] Test standup disable command
- [ ] Test WIP extraction
- [ ] Test API communication

### 8.4 Integration Tests
- [ ] Test complete flow: create standup → generate summary → view in UI
- [ ] Test CLI WIP submission → view in UI
- [ ] Test timezone handling across different timezones
- [ ] Test scheduled job execution

---

## Phase 9: Documentation & Polish

### 9.1 Update Documentation
- [ ] Update CLAUDE.md with standup feature details
- [ ] Document API endpoints
- [ ] Document CLI commands
- [ ] Add standup feature to README

### 9.2 Polish UI
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error messages
- [ ] Improve responsive design
- [ ] Add tooltips and help text

### 9.3 Polish CLI
- [ ] Add helpful error messages
- [ ] Add command examples
- [ ] Improve interactive prompts
- [ ] Add confirmation messages

---

## Phase 10: Deployment Preparation

### 10.1 Environment Configuration
- [ ] Add required environment variables to deployment
- [ ] Configure QStash in production
- [ ] Test cron job scheduling in production

### 10.2 Final Checks
- [ ] Run full test suite
- [ ] Test in production-like environment
- [ ] Verify all database migrations
- [ ] Check performance of scheduled jobs
- [ ] Verify timezone handling works globally

---

## Notes

- Database schema already includes Standup and StandupDocument tables
- Use existing patterns from achievements and projects for consistency
- Leverage existing AI/LLM integration for summary generation
- Follow existing authentication patterns with `getAuthUser()`
- Use existing UI components (shadcn/ui) for consistency
- CLI should follow existing command patterns

## Dependencies to Add

### Web App (apps/web)
- @upstash/qstash (for scheduled jobs)

### CLI (packages/cli)
- node-cron (for local cron job scheduling)
- inquirer (if not already present, for interactive prompts)

### Shared Library (packages/lib)
- date-fns
- date-fns-tz

## Estimated Completion Order

1. Phase 1 & 2: Database & API (Core backend) - 1-2 hours
2. Phase 3: Web UI (Frontend) - 1-2 hours
3. Phase 4: CLI Commands - 1-2 hours
4. Phase 5: Scheduled Jobs - 1 hour
5. Phase 6-10: Testing, Polish, Deployment - 1-2 hours

Total estimated time: 6-10 hours
