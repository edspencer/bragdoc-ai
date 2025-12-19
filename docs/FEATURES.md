---

## CLI GitHub Connector

### Overview

The GitHub Connector enables the BragDoc CLI to extract achievements directly from GitHub repositories without requiring a local clone. Using the GitHub CLI (`gh`), it fetches commits, merged pull requests, and closed issues, providing richer context for achievement extraction.

### When to Use GitHub vs Git Connector

| Scenario | Recommended |
|----------|-------------|
| Want PRs and issues, not just commits | **GitHub Connector** |
| Need full code diffs for analysis | **Git Connector** |
| No local clone of the repository | **GitHub Connector** |
| Working offline | **Git Connector** |
| Non-GitHub repo (GitLab, Bitbucket) | **Git Connector** |

### Setup Requirements

1. **Install GitHub CLI**: Download from https://cli.github.com/
2. **Authenticate**: Run `gh auth login` and follow the prompts
3. **Initialize project**: Run `bragdoc init` and select "GitHub" when prompted

### Configuration Options

When initializing a project with the GitHub connector, you can configure:

- **Repository** (`owner/repo`): The GitHub repository to extract from
- **Include Commits**: Extract achievements from commits (default: yes)
- **Include PRs**: Extract achievements from merged pull requests (default: yes)
- **Include Issues**: Extract achievements from closed issues you authored (default: no)
- **Commit Stats**: Include file-level statistics for commits (default: yes, but slower)

### Data Extracted

**From Commits:**
- Commit message (title and body)
- Author information
- Timestamp
- File statistics (additions, deletions, files changed)

**From Pull Requests:**
- PR title and description
- Merge date
- Code changes summary (additions, deletions, files changed)
- Source and target branches

**From Issues:**
- Issue title and body
- Close date
- Labels

### Technical Details

- Uses `gh` CLI commands under the hood (not direct API calls)
- Caches processed items to avoid duplicates
- Cache keys formatted as `{type}-{id}` (e.g., `commit-abc123`, `pr-456`)
- Automatically detects GitHub URLs from local Git remotes

---

## Navigation Structure

### Careers Section

The sidebar navigation includes a **Careers** section that groups career-related features:

- **Standup** (`/standup`) - Daily/weekly standup report generation
- **Reports** (`/reports`) - Generate reports from achievements for managers
- **Performance Review** (`/performance`) - Coming soon: AI-powered performance review generation
- **Workstreams** (`/workstreams`) - Coming soon: Automatic discovery of thematic patterns in work

The Documents feature (`/documents`) remains accessible via direct URL but is no longer displayed in the sidebar navigation. Documents are accessible when generated through the Reports flow.

---

## Reports & Documents

### Overview

The Reports feature allows users to generate AI-powered reports from their tracked achievements. These reports are designed to help users communicate their accomplishments to managers, during performance reviews, or for personal career documentation.

### Report Types

BragDoc supports three types of reports, each designed for different use cases:

#### Weekly Reports

- **Time Range:** Last 7 days of achievements
- **Use Case:** Weekly check-ins, sprint retrospectives, status updates
- **Default Prompt:** Focus on key accomplishments, progress on ongoing projects, blockers, and plans for next week

#### Monthly Reports

- **Time Range:** Last 30 days of achievements
- **Use Case:** Monthly performance summaries, milestone tracking, progress reports
- **Default Prompt:** Emphasize significant achievements, project completions, measurable impact, and growth areas

#### Custom Reports

- **Time Range:** All achievements (user can filter manually)
- **Use Case:** Performance reviews, promotion packets, portfolio updates, year-end summaries
- **Default Prompt:** Comprehensive review highlighting career progression, major contributions, and professional development

### Key Features

#### Achievement Selection

- **Automatic filtering** by time range based on report type
- **Manual filtering** by company and project
- **Individual selection** of specific achievements to include
- **Select all** toggle for convenience
- **Visual indicators** showing achievement impact (star ratings)

#### Customizable Generation

- **Editable prompts** - Users can customize the AI generation instructions
- **Smart defaults** - Type-specific prompts optimized for each report type
- **Preference persistence** - Custom instructions are saved for future use
- **Professional tone** - Generated reports maintain business-appropriate language

#### Report Management

- **List view** showing all generated reports
- **Filter by type** - Weekly, monthly, or custom
- **Filter by company** - See reports for specific companies
- **Filter by time period** - Last 7 days, 30 days, 90 days, or all time
- **Delete reports** with confirmation dialog
- **Quick creation** - One-click buttons to start new reports

### User Flow

1. User navigates to **"Reports"** from the sidebar
2. User sees a list of previously generated reports (if any)
3. User clicks a report type button (**Weekly**, **Monthly**, or **Custom**)
4. System fetches relevant achievements based on the report type's time range
5. User can filter achievements by company or project
6. User selects specific achievements to include (or selects all)
7. User can customize the AI generation prompt (optional)
8. User clicks **"Generate Report"** to create the document
9. AI generates the report content based on selected achievements and instructions
10. User is redirected to the reports list to see the new document

### Technical Implementation

#### Frontend

- **Server Components** for initial data fetching (reports list)
- **Client Components** for interactivity (filters, selection, generation)
- **Next.js 15 App Router** with dynamic routes `/reports/new/[type]`
- **Responsive design** with Tailwind CSS and shadcn/ui components

#### Backend

- **RESTful API endpoints** for CRUD operations
- **AI document generation** via OpenAI/DeepSeek/Google models
- **Streaming responses** for better perceived performance
- **Type-safe validation** with Zod schemas
- **PostgreSQL storage** via Drizzle ORM

#### API Endpoints

- `GET /api/documents` - List all reports for authenticated user
- `POST /api/documents/generate` - Generate new report from achievements
- `DELETE /api/documents/[id]` - Delete a report
- `GET /api/achievements` - Fetch achievements with filtering
- `GET /api/projects` - List projects for filter dropdown
- `GET /api/companies` - List companies for filter dropdown

#### Database Schema

Reports are stored in the `Document` table with the following key fields:

- `id` - UUID primary key
- `userId` - Foreign key to User (cascade delete)
- `title` - Report title (e.g., "Weekly Report - Jan 15-21")
- `content` - Generated markdown/text content
- `type` - Report type enum (weekly_report, monthly_report, custom_report)
- `companyId` - Optional foreign key to Company
- `createdAt`, `updatedAt` - Timestamps

### AI Integration

#### Generation Pipeline

1. **Fetch** relevant achievements from database
2. **Format** achievements as structured data (title, summary, impact, dates)
3. **Render** MDX prompt template with user instructions and achievement data
4. **Execute** LLM generation with streaming response
5. **Collect** full response text
6. **Save** generated document to database

#### Prompt Engineering

- Uses **mdx-prompt** for structured, maintainable prompts
- Supports **user instructions** passed from frontend
- Falls back to **user preferences** if available
- Includes **achievement context** (company, project, impact)
- Optimized for **professional business writing**

#### Model Selection

Uses the `documentWritingModel` from the LLM router which selects the appropriate model based on:

- User's subscription level
- Task type (document generation)
- Provider availability
- Cost optimization

### Security & Privacy

- ✅ **Authentication required** - All endpoints verify user session/JWT
- ✅ **User isolation** - All queries scoped to `userId`
- ✅ **Input validation** - Zod schemas validate all request data
- ✅ **No data leakage** - Users can only see their own reports
- ✅ **Secure deletion** - Cascade deletes clean up related data

### Future Enhancements (Out of Current Scope)

The following features are planned for future releases:

- **Document viewing/editing interface** - In-app editor for generated reports
- **Export formats** - PDF, Word (.docx), plain text
- **Sharing capabilities** - Generate shareable links with optional expiration
- **Template customization** - User-defined report templates
- **Scheduled generation** - Automated weekly/monthly report creation
- **Version history** - Track changes to edited reports
- **Bulk operations** - Generate multiple reports at once
- **Email delivery** - Send reports directly to managers

### Payment Gating (Commercial Mode)

When `PAYMENT_TOKEN_REQUIRED=true`, report generation may be gated by subscription level:

| Feature           | Free         | Basic        | Pro          |
| ----------------- | ------------ | ------------ | ------------ |
| Report Generation | Limited      | ✅ Unlimited | ✅ Unlimited |
| Custom Prompts    | ❌           | ✅           | ✅           |
| AI Quality        | Standard     | Standard     | Premium      |
| Report History    | Last 30 days | Last 90 days | Unlimited    |

In open source mode (`PAYMENT_TOKEN_REQUIRED=false`), all report features are available to all users without restriction.

---

## Authentication & Legal

### OAuth Terms of Service Compliance

**Implemented:** 2025-10-24

BragDoc ensures legal compliance for OAuth-based signups (Google and GitHub) using the industry-standard implicit acceptance pattern.

#### Overview

When users sign up via OAuth providers (Google or GitHub), they see prominent Terms of Service acceptance text above the OAuth buttons. By clicking the OAuth button, users take affirmative action after being presented with the terms, constituting legal acceptance.

#### Implementation

**ToS Acceptance Text:**

- Displayed on both `/login` and `/register` pages
- Text: "By continuing with Google or GitHub, you agree to our Terms of Service and Privacy Policy"
- Links to Terms and Privacy Policy open in new tabs
- Supports light and dark mode themes

**Automatic Timestamp:**

- All new signups (OAuth and email/password) automatically have `tosAcceptedAt` timestamp set
- Set via `createUser` event handler in NextAuth configuration
- Event fires only for new users, eliminating need to check if user is existing

**Analytics Tracking:**

- `tos_accepted` event tracked in PostHog for all new signups
- Includes provider method (google/github/credentials) and timestamp
- Provides audit trail for compliance

#### Technical Details

**Component:** `apps/web/components/social-auth-buttons.tsx`

- Displays ToS text above OAuth buttons
- Uses `NEXT_PUBLIC_MARKETING_SITE_HOST` environment variable for links
- Follows BragDoc styling conventions with proper dark mode support

**Database Field:** `tosAcceptedAt` on User table

- Type: `timestamp('tos_accepted_at')`
- Nullable (NULL for users who signed up before this feature)
- Set automatically for all new signups

**Event Handler:** NextAuth `createUser` event

- Sets `tosAcceptedAt` timestamp
- Tracks `tos_accepted` event in PostHog
- Fails gracefully (registration never blocked by ToS tracking errors)

#### Legal Sufficiency

This approach is legally sufficient because:

1. **Informed Consent**: Users see ToS acceptance text before clicking OAuth button
2. **Affirmative Action**: Clicking OAuth button is an affirmative action
3. **Industry Standard**: Pattern used by major companies (Google, Microsoft, Slack, Linear, Notion)
4. **Timestamped**: `tosAcceptedAt` provides audit trail
5. **Link Access**: Users can review full terms before proceeding

**Existing Users:**

- Users who signed up before this feature have `tosAcceptedAt = NULL`
- This is acceptable - they signed up under previous terms
- Only new signups (after 2025-10-24) have timestamp populated

See `.claude/docs/tech/authentication.md` for complete technical documentation.

---

## Guided Demo Tour

### Overview

**Implemented:** 2025-12-18

BragDoc includes a guided product tour for demo mode users that introduces key dashboard features. The tour automatically appears on first visit and walks users through the main UI elements with educational content and a CLI installation call-to-action.

### Target Audience

The demo tour is specifically designed for:

- **Demo mode visitors** exploring BragDoc functionality
- **First-time users** who need orientation to the dashboard
- **Evaluators** assessing BragDoc before signing up

The tour is **not shown** to:

- Regular authenticated users (non-demo mode)
- Users who have already completed or skipped the tour
- Users on pages other than the dashboard

### Tour Experience

The tour consists of 4 steps highlighting key dashboard elements:

1. **Your Achievements** - Introduces achievements as career building blocks, explains CLI extraction and manual entry options
2. **Track Your Impact Over Time** - Explains the impact point system (1-10 scale) and trend visualization
3. **Organize by Project** - Shows project organization and includes CLI installation commands
4. **Rate Your Impact** - Demonstrates the interactive star rating system

### User Interactions

**Navigation:**

- **Next/Back buttons** - Step through the tour
- **Skip button (X)** - Close tour and mark as completed
- **Finish button** - Complete tour on final step
- **Escape key** - Close tour at any time

**Persistence:**

- Tour completion is stored in localStorage (`demo-tour-completed`)
- Once completed or skipped, the tour does not appear again in that browser
- Clearing localStorage will reset the tour state

### Auto-Start Behavior

The tour automatically starts when all conditions are met:

1. User is in demo mode (`isDemoMode === true`)
2. User is on the dashboard page (`/dashboard`)
3. Tour has not been completed (`localStorage` check)
4. Dashboard elements have rendered (500ms delay)

### Technical Implementation

**Library:** [Onborda](https://www.onborda.dev/) - Next.js product tour library

**Key Files:**

| File | Purpose |
|------|---------|
| `apps/web/lib/demo-tour-config.tsx` | Step definitions and constants |
| `apps/web/components/demo-tour/demo-tour-provider.tsx` | Onborda wrapper and lifecycle |
| `apps/web/components/demo-tour/tour-card.tsx` | Custom styled tour card |
| `apps/web/hooks/use-demo-tour.ts` | State management with localStorage |

**Integration Point:** `apps/web/app/(app)/layout.tsx` wraps content with `DemoTourProvider`

### Accessibility

- **Keyboard navigation:** Full keyboard support for tour controls
- **Escape key:** Closes tour immediately
- **ARIA attributes:** Dialog role and labels on tour card
- **Focus management:** Handled by Onborda library

### Future Enhancements

Potential future improvements (not currently implemented):

- Restart tour button in settings or demo banner
- Additional tours for specific features (workstreams, reports, etc.)
- Tours for newly launched features
- Admin-configurable tour content

See `.claude/docs/tech/frontend-patterns.md` for complete technical documentation and patterns.

---
