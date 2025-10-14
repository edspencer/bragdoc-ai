
---

## Reports & Documents ("For my manager")

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

1. User navigates to **"For my manager"** from the sidebar
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

| Feature | Free | Basic | Pro |
|---------|------|-------|-----|
| Report Generation | Limited | ✅ Unlimited | ✅ Unlimited |
| Custom Prompts | ❌ | ✅ | ✅ |
| AI Quality | Standard | Standard | Premium |
| Report History | Last 30 days | Last 90 days | Unlimited |

In open source mode (`PAYMENT_TOKEN_REQUIRED=false`), all report features are available to all users without restriction.

---
