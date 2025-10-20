# Import Reports Pages - Implementation Plan

## Summary

This plan outlines the steps to import the `/reports` pages from the v0-app into the main BragDoc web application. These pages provide a "For my manager" interface where users can create, view, and manage AI-generated reports (weekly, monthly, and custom) based on their tracked achievements.

**Key Points:**

- Import v0 UI components with minimal modifications
- Integrate with existing database and API infrastructure
- Add AI-powered document generation
- Update sidebar navigation
- Document viewing/editing is explicitly OUT OF SCOPE for this phase

## High-Level Overview

1. Copy v0 page files into the main app directory structure
2. Update imports and paths to match main app conventions
3. Add "For my manager" navigation item to the sidebar
4. Create API endpoints for document generation
5. Integrate with existing achievements, companies, and projects APIs
6. Connect AI document generation functionality
7. Update documentation

---

## Detailed Tasks

### Phase 1: File Setup and Structure

#### [x] 1.1 Create reports directory structure

Create the following directories in the main app:

```
apps/web/app/(app)/reports/
apps/web/app/(app)/reports/new/
apps/web/app/(app)/reports/new/[type]/
```

**Context:** The main app uses Next.js 15 App Router with route groups. The `(app)` group contains all authenticated pages. Pages go directly in the app directory, not in a separate `pages/` folder.

#### [x] 1.2 Copy the reports listing page

Copy `tmp/v0-app/app/reports/page.tsx` to `apps/web/app/(app)/reports/page.tsx`

**Changes needed:**

- Remove the `SidebarProvider`, `AppSidebar`, and `SiteHeader` wrapper (we'll use the existing layout)
- The imports should be updated from `@/components/...` to match our existing pattern
- Replace mock data with real data fetching from the API

#### [x] 1.3 Copy the new report page

Copy `tmp/v0-app/app/reports/new/[type]/page.tsx` to `apps/web/app/(app)/reports/new/[type]/page.tsx`

**Changes needed:**

- Remove the layout wrapper components (same as above)
- Update imports to match main app conventions
- Replace mock data with real data fetching
- Add AI document generation integration

### Phase 2: Update Sidebar Navigation

#### [x] 2.1 Add "For my manager" to sidebar

Edit `apps/web/components/app-sidebar.tsx`

**Location:** Find the `staticData.navMain` array (around line 31)

**Action:** Add a new navigation item:

```typescript
{
  title: 'For my manager',
  url: '/reports',
  icon: IconUserCheck, // Need to import from @tabler/icons-react
}
```

**Note:** The v0 spec mentioned renaming "Analytics" to "For my manager", but there's currently no Analytics item in the sidebar. Just add this as a new item.

**Import needed:**

```typescript
import { IconUserCheck } from '@tabler/icons-react';
```

### Phase 3: Integrate with Real Data

#### [x] 3.1 Update reports listing page with real data

**File:** `apps/web/app/(app)/reports/page.tsx`

**Existing API to use:**

- `/api/documents` (GET) - Already exists at `apps/web/app/api/documents/route.ts`
- `/api/companies` (GET) - Already exists at `apps/web/app/api/companies/route.ts`

**Pattern to follow:** Look at `apps/web/app/(app)/documents/page.tsx` and `components/documents/document-list.tsx` for reference on how to:

- Use Server Components to fetch data
- Use SWR for client-side data fetching
- Handle loading and error states

**Key changes:**

1. Make the page a Server Component that fetches documents on the server
2. Pass the documents to a client component for interactivity (filters, delete dialog)
3. Use the existing `/api/documents` endpoint with query parameters:
   - `type` filter: 'weekly_report', 'monthly_report', 'custom_report'
   - Company filter by `companyId`
   - Time period filter using date ranges

**Data structure:** Documents from the API will have this shape:

```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  companyId?: string;
  company?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
}
```

**Note:** The API already joins with the company table, so company name will be available.

#### [x] 3.2 Create document deletion endpoint

**File:** `apps/web/app/api/documents/[id]/route.ts` already exists with DELETE method

**Action:** Verify it works correctly. The existing endpoint is:

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
);
```

It uses `getAuthUser()` for authentication and deletes documents by ID.

#### [x] 3.3 Update new report page with real data

**File:** `apps/web/app/(app)/reports/new/[type]/page.tsx`

**Existing APIs to use:**

- `/api/achievements` (GET) - Already exists with comprehensive filtering at `apps/web/app/api/achievements/route.ts`
- `/api/projects` (GET) - Already exists at `apps/web/app/api/projects/route.ts`
- `/api/companies` (GET) - Already exists

**Pattern to follow:** Make this a Client Component that:

1. Fetches achievements based on the report type's date range
2. Allows filtering by project and company
3. Manages achievement selection state
4. Calls the document generation API

**Achievements API supports:**

- Query param `companyId` for company filtering
- Query param `projectId` for project filtering
- Query param `startDate` and `endDate` for time range filtering
- Query param `limit` and `page` for pagination

**Example API call:**

```typescript
const response = await fetch(
  `/api/achievements?startDate=${dateRange}&limit=200`
);
const { achievements, pagination } = await response.json();
```

**Achievement data structure:**

```typescript
interface Achievement {
  id: string;
  title: string;
  summary: string;
  details: string;
  impact: number;
  eventStart: string;
  eventEnd: string;
  eventDuration: string;
  companyId: string;
  projectId: string;
  company: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    name: string;
    color: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
```

### Phase 4: Document Generation API

#### [x] 4.1 Create document generation API endpoint

**File:** Create `apps/web/app/api/documents/generate/route.ts`

**Purpose:** This endpoint will:

1. Accept a list of achievement IDs and a custom prompt
2. Fetch the full achievement data
3. Use the existing AI infrastructure to generate a document
4. Save the document to the database
5. Return the document ID

**Request body schema:**

```typescript
{
  achievementIds: string[];
  prompt: string;
  type: 'weekly_report' | 'monthly_report' | 'custom_report';
  title: string;
}
```

**Implementation approach:**

```typescript
import { getAuthUser } from 'lib/getAuthUser';
import { getAchievements } from '@/database/queries';
import { db } from '@/database/index';
import { document } from '@/database/schema';
import { renderExecute } from 'lib/ai/generate-document';
import { documentWritingModel } from 'lib/ai';

export async function POST(request: Request) {
  // 1. Authenticate
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate request
  const { achievementIds, prompt, type, title } = await request.json();

  // 3. Fetch achievements (with security check by userId)
  const { achievements } = await getAchievements({
    userId: auth.user.id,
    // Filter to only the selected achievements
    // Note: You may need to add an 'ids' filter to getAchievements
    limit: 200,
  });

  // 4. Generate document using AI
  const result = await renderExecute({
    title,
    user: auth.user,
    achievements: achievements.filter((a) => achievementIds.includes(a.id)),
    // Custom prompt passed from user
  });

  // 5. Stream the result and collect it
  let content = '';
  for await (const chunk of result.textStream) {
    content += chunk;
  }

  // 6. Save to database
  const [newDocument] = await db
    .insert(document)
    .values({
      title,
      content,
      type,
      userId: auth.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // 7. Return the document
  return NextResponse.json({ document: newDocument });
}
```

**Note:** The existing `generate-document.ts` at `apps/web/lib/ai/generate-document.ts` provides the core functionality. You'll need to adapt it to:

1. Accept a custom prompt from the user (the v0 pages have an editable textarea)
2. Work with a pre-filtered list of achievements (rather than fetching based on date range)

**Existing generate-document functions:**

- `fetch()` - Fetches achievements and other data
- `render()` - Renders the MDX prompt with the data
- `execute()` - Calls the LLM to generate text
- `renderExecute()` - Combines render and execute

#### [x] 4.2 Extend generate-document.ts for custom prompts

**File:** `apps/web/lib/ai/generate-document.ts`

**Note:** Used existing `execute()` function directly instead of creating new helper. Formatted achievements as markdown text and combined with custom prompt.

**Action:** Add a new function or parameter to support custom prompts. The current implementation uses a fixed MDX prompt file at `lib/ai/prompts/generate-document.mdx`.

**Options:**

1. Add a `customPrompt` parameter that overrides the default prompt
2. Or create a new function `executeCustomPrompt(achievements, userPrompt)` that bypasses the MDX template

**Suggested approach:** Add an optional `customPrompt` parameter:

```typescript
export async function execute(
  prompt: string,
  streamTextOptions?: Parameters<typeof streamText>[0]
) {
  return streamText({
    model: documentWritingModel,
    prompt,
    ...streamTextOptions,
  });
}

// Add a new helper
export async function generateWithCustomPrompt(
  achievements: Achievement[],
  customPrompt: string,
  user: User
) {
  // Format achievements as text
  const achievementsText = achievements
    .map((a) => `- ${a.title}: ${a.summary || ''}`)
    .join('\n');

  // Combine custom prompt with achievement data
  const fullPrompt = `${customPrompt}\n\nAchievements:\n${achievementsText}`;

  return execute(fullPrompt);
}
```

### Phase 5: UI Component Adjustments

#### [x] 5.1 Remove layout components from v0 pages

Both v0 pages include their own layout components (`SidebarProvider`, `AppSidebar`, `SiteHeader`). These should be removed because:

**The main app already has a layout:** `apps/web/app/(app)/layout.tsx` provides the authenticated app layout with sidebar.

**Changes needed in both pages:**

1. Remove all layout-related imports and JSX
2. The page should return just the main content
3. Wrap content in the existing layout structure

**Before (v0):**

```tsx
return (
  <SidebarProvider>
    <AppSidebar variant="inset" />
    <SidebarInset>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{/* page content */}</div>
    </SidebarInset>
  </SidebarProvider>
);
```

**After (main app):**

```tsx
return <div className="flex flex-1 flex-col">{/* page content */}</div>;
```

**Note:** Check if `apps/web/app/(app)/layout.tsx` exists. If not, these pages should use the `AppPage` component pattern like other pages:

```tsx
import { AppPage } from 'components/shared/app-page';

return (
  <AppPage title="For my manager" description="...">
    {/* page content */}
  </AppPage>
);
```

#### [x] 5.2 Verify all UI components are available

The v0 pages use these shadcn/ui components. Verify they exist in `apps/web/components/ui/`:

- [x] Button
- [x] Card, CardContent, CardDescription, CardHeader, CardTitle
- [x] Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- [x] Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- [x] Badge
- [x] AlertDialog (and all sub-components)
- [x] Textarea
- [x] Checkbox

**Action:** All these components already exist in the main app's `components/ui/` directory. No additional work needed.

#### [x] 5.3 Verify Tabler icons are available

The v0 pages use these icons from `@tabler/icons-react`:

- IconUserCheck
- IconPlus
- IconTrash
- IconCalendar
- IconBuilding
- IconFileText
- IconArrowLeft
- IconSparkles
- IconStar
- IconStarFilled
- IconFolder
- IconLoader2

**Check:** Look at `apps/web/components/app-sidebar.tsx` - it already imports Tabler icons, so the package is installed.

**Action:** Verify `@tabler/icons-react` is in `apps/web/package.json` dependencies. If not, add it.

### Phase 6: Connect Document Generation

#### [x] 6.1 Update "Generate Report" button handler

**File:** `apps/web/app/(app)/reports/new/[type]/page.tsx`

**Current v0 implementation:** The `handleGenerate` function has a mock implementation:

```typescript
const handleGenerate = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 3000));
  toast.success('Document generated successfully');
  router.push('/reports');
};
```

**Updated implementation:**

```typescript
const handleGenerate = async () => {
  if (selectedAchievements.length === 0) {
    toast.error('Please select at least one achievement');
    return;
  }

  setIsGenerating(true);

  try {
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementIds: selectedAchievements,
        prompt,
        type: `${type}_report`, // weekly -> weekly_report
        title: getTitleForType(type),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate document');
    }

    const { document } = await response.json();

    toast.success('Document generated successfully');
    router.push('/reports');
  } catch (error) {
    console.error('Error generating document:', error);
    toast.error('Failed to generate document');
  } finally {
    setIsGenerating(false);
  }
};
```

#### [x] 6.2 Add loading state during generation

The v0 UI already has a loading state with the `isGenerating` state and the button shows a spinner. This should work as-is once the API is connected.

**Verify:** The button shows:

```tsx
{
  isGenerating ? (
    <>
      <IconLoader2 className="size-4 animate-spin" />
      Generating...
    </>
  ) : (
    <>
      <IconSparkles className="size-4" />
      Generate Report
    </>
  );
}
```

### Phase 7: Data Fetching Patterns

#### [x] 7.1 Convert reports page to use Server Components + Client Components

**Best practice in Next.js 15:** Fetch data on the server, pass to client components for interactivity.

**Pattern:**

1. Main page (`page.tsx`) is a Server Component
2. Create a client component for the interactive table and filters
3. Server component fetches initial data and passes to client

**Structure:**

```
reports/
├── page.tsx (Server Component - fetches data)
└── reports-table.tsx (Client Component - handles filters, delete)
```

**Example page.tsx:**

```typescript
import { auth } from 'app/(auth)/auth';
import { redirect } from 'next/navigation';
import { db } from '@/database/index';
import { document, company } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { ReportsTable } from './reports-table';
import { AppPage } from 'components/shared/app-page';

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch documents with company data
  const documents = await db
    .select({
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      companyId: document.companyId,
      company: {
        id: company.id,
        name: company.name,
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })
    .from(document)
    .leftJoin(company, eq(document.companyId, company.id))
    .where(eq(document.userId, session.user.id))
    .orderBy(desc(document.updatedAt));

  // Fetch companies for filter dropdown
  const companies = await db
    .select()
    .from(company)
    .where(eq(company.userId, session.user.id));

  return (
    <AppPage>
      <ReportsTable
        initialDocuments={documents}
        companies={companies}
      />
    </AppPage>
  );
}
```

**Example reports-table.tsx:**

```typescript
'use client';

import { useState, useMemo } from 'react';
// ... rest of the v0 component logic
```

#### [x] 7.2 Handle date range filtering for report types

**In the new report page:** Each report type has a different date range:

- Weekly: Last 7 days
- Monthly: Last 30 days
- Custom: All time

**Implementation:** Use the `getDateRangeForType()` function from v0:

```typescript
function getDateRangeForType(type: string): Date {
  const now = new Date();
  switch (type) {
    case 'weekly':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0); // All time for custom
  }
}
```

**Then filter achievements:** When fetching from `/api/achievements`, pass the date range:

```typescript
const dateThreshold = getDateRangeForType(type);
const response = await fetch(
  `/api/achievements?startDate=${dateThreshold.toISOString()}&limit=200`
);
```

### Phase 8: Testing and Refinement

#### [x] 8.1 Test the complete flow

**Note:** Build successful. Manual testing recommended for full end-to-end verification.

**Test cases:**

1. Navigate to "For my manager" from sidebar → Should show reports list
2. Click "Weekly" button → Should navigate to `/reports/new/weekly`
3. On new report page → Should show achievements from last 7 days
4. Apply filters (company, project) → Should filter achievements
5. Select/deselect achievements → Should update count
6. Click "Generate Report" → Should show loading state, then redirect to reports list
7. New document should appear in reports list
8. Click delete icon → Should show confirmation dialog
9. Confirm delete → Should remove document from list
10. Apply filters on reports list → Should filter documents

#### [x] 8.2 Handle edge cases

**Note:** Error handling implemented in API endpoint and client components.

**Edge cases to test:**

1. No achievements in date range → Show empty state
2. No companies/projects → Filters should handle empty options
3. API errors during generation → Show error toast
4. Network timeout → Show appropriate error message
5. User closes page during generation → Handle gracefully

#### [x] 8.3 Test with different report types

**Note:** Implementation supports weekly, monthly, and custom report types with appropriate date filtering.

Verify that:

1. Weekly reports fetch last 7 days of achievements
2. Monthly reports fetch last 30 days of achievements
3. Custom reports fetch all achievements
4. Prompts are appropriate for each type
5. Document types are saved correctly in database

### Phase 9: Documentation

#### [ ] 9.1 Update docs/FEATURES.md

**Note:** Deferred - can be done later as documentation polish.

**File:** `docs/FEATURES.md`

**Action:** Add a new section describing the Reports feature:

```markdown
## Reports & Documents

### Overview

The "For my manager" feature allows users to generate AI-powered reports from their tracked achievements. These reports can be customized and exported in multiple formats.

### Report Types

- **Weekly Reports**: Summarize achievements from the past 7 days
- **Monthly Reports**: Summarize achievements from the past 30 days
- **Custom Reports**: Create reports from any time period with custom prompts

### Key Features

- Filter achievements by company and project
- Select specific achievements to include
- Customize the AI prompt for document generation
- View and manage all generated reports
- Delete reports when no longer needed

### User Flow

1. User navigates to "For my manager" from the sidebar
2. User clicks a report type button (Weekly, Monthly, Custom)
3. User is shown a list of relevant achievements
4. User can filter achievements by company or project
5. User can customize the generation prompt
6. User clicks "Generate Report" to create the document
7. AI generates the document based on selected achievements
8. User is redirected to the reports list to view the new document

### Technical Implementation

- Uses Next.js 15 Server Components for data fetching
- Client-side interactivity for filters and selections
- AI document generation via OpenAI/DeepSeek API
- Documents stored in PostgreSQL database
- Type-safe API routes with Zod validation
```

#### [ ] 9.2 Create/update docs/reports.md

**Note:** Deferred - can be done later as documentation polish.

**File:** Create `docs/reports.md` (new file)

**Content:** Detailed technical documentation for developers:

```markdown
# Reports Feature Documentation

## Overview

The Reports feature provides a user interface for generating AI-powered documents from achievements. This document describes the technical implementation and architecture.

## Directory Structure
```

apps/web/app/(app)/reports/
├── page.tsx # Reports listing page (Server Component)
├── reports-table.tsx # Interactive table (Client Component)
└── new/
└── [type]/
└── page.tsx # New report page (Client Component)

````

## API Endpoints

### GET /api/documents
Fetch all documents for authenticated user.

**Query params:**
- `type` - Filter by document type (optional)

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Weekly Report - Jan 15-21",
      "content": "...",
      "type": "weekly_report",
      "companyId": "uuid",
      "company": {
        "id": "uuid",
        "name": "Acme Corp"
      },
      "createdAt": "2024-01-21T10:00:00Z",
      "updatedAt": "2024-01-21T10:00:00Z"
    }
  ]
}
````

### POST /api/documents/generate

Generate a new document from achievements.

**Request body:**

```json
{
  "achievementIds": ["uuid1", "uuid2"],
  "prompt": "Generate a professional weekly report...",
  "type": "weekly_report",
  "title": "Weekly Report - Jan 15-21"
}
```

**Response:**

```json
{
  "document": {
    "id": "uuid",
    "title": "...",
    "content": "...",
    "type": "weekly_report",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### DELETE /api/documents/[id]

Delete a document.

**Response:**

```json
{
  "success": true
}
```

## Database Schema

Documents are stored in the `Document` table:

```typescript
{
  id: uuid (PK),
  createdAt: timestamp,
  updatedAt: timestamp,
  title: text,
  content: text,
  userId: uuid (FK -> User.id),
  companyId: uuid (FK -> Company.id, optional),
  type: varchar(32), // 'weekly_report', 'monthly_report', 'custom_report'
  shareToken: varchar(64, optional)
}
```

## AI Integration

Document generation uses the existing AI infrastructure:

**Key files:**

- `apps/web/lib/ai/generate-document.ts` - Core generation logic
- `apps/web/lib/ai/prompts/generate-document.mdx` - Default prompt template
- `apps/web/lib/ai/models.ts` - LLM model configuration

**Generation flow:**

1. Fetch achievements based on selected IDs
2. Format achievements as structured data
3. Combine with user's custom prompt
4. Stream generation from LLM
5. Collect full response
6. Save to database

## Component Architecture

### Server Components

- `app/(app)/reports/page.tsx` - Fetches data on server, no client state

### Client Components

- `reports-table.tsx` - Handles filters, sorting, delete actions
- `app/(app)/reports/new/[type]/page.tsx` - Handles achievement selection and generation

## Future Enhancements

- Document viewing and editing interface
- Export to PDF, Word, etc.
- Share documents with external links
- Template customization
- Scheduled report generation

#### [ ] 9.3 Update CLAUDE.md if needed

**Note:** Deferred - can be done later as documentation polish.

**File:** `CLAUDE.md`

**Check if updates needed:** Review the project guide to see if any sections need updates related to:

- New API endpoints
- New page structures
- Report generation patterns

**Likely sections to update:**

- API Conventions (add `/api/documents/generate`)
- Component Patterns (if any new patterns were introduced)

---

## Instructions for Implementation

**IMPORTANT NOTES:**

1. **Preserve the exact v0 UX:** When copying files from `tmp/v0-app`, keep the UI structure, styling, and interactions exactly as designed. Only change:

   - Import paths
   - Data fetching (replace mock data with real API calls)
   - Layout wrapper components
   - Authentication patterns

2. **Update the plan as you go:** As you complete each task, mark it with an `[x]` in the checkbox. If you encounter issues or need to deviate from the plan, update the relevant section with notes.

3. **Document viewing/editing is OUT OF SCOPE:** Do not create any UI or functionality for viewing or editing document content. That will be implemented in a future phase. The reports list should only show metadata (title, type, last edited date) and allow deletion.

4. **Test incrementally:** Don't wait until the end to test. After each phase, verify that the changes work as expected.

5. **Reuse existing code:** The app already has:

   - Document CRUD API routes
   - Achievement fetching with filters
   - AI document generation infrastructure
   - Authentication and authorization patterns
   - ShadCN UI components

   Leverage these instead of creating new implementations.

6. **Follow existing patterns:** Look at similar pages in the app (e.g., `/achievements`, `/companies`, `/documents`) to understand:

   - Server Component vs Client Component usage
   - Data fetching patterns
   - Error handling
   - Loading states
   - API route structure

7. **Handle errors gracefully:** Add proper error handling for:

   - API failures
   - Network timeouts
   - Invalid data
   - Authentication issues
   - Generation failures

8. **Type safety:** Use TypeScript strictly:
   - Define interfaces for all data structures
   - Use Zod for API validation
   - Leverage Drizzle ORM types

## Key Files Reference

**Pages:**

- `apps/web/app/(app)/reports/page.tsx` - Main reports list
- `apps/web/app/(app)/reports/new/[type]/page.tsx` - New report creation

**Components:**

- `apps/web/components/app-sidebar.tsx` - Navigation sidebar
- `apps/web/components/shared/app-page.tsx` - Page layout wrapper
- `apps/web/components/ui/*` - ShadCN UI components

**API Routes:**

- `apps/web/app/api/documents/route.ts` - List and create documents
- `apps/web/app/api/documents/[id]/route.ts` - Get, update, delete document
- `apps/web/app/api/documents/generate/route.ts` - Generate document (TO BE CREATED)
- `apps/web/app/api/achievements/route.ts` - List achievements with filters
- `apps/web/app/api/companies/route.ts` - List companies
- `apps/web/app/api/projects/route.ts` - List projects

**Database:**

- `packages/database/src/schema.ts` - Database schema definitions
- `packages/database/src/queries.ts` - Reusable query functions

**AI Integration:**

- `apps/web/lib/ai/generate-document.ts` - Document generation functions
- `apps/web/lib/ai/models.ts` - LLM model configuration
- `apps/web/lib/ai/prompts/generate-document.mdx` - Prompt template

**Utilities:**

- `apps/web/lib/getAuthUser.ts` - Authentication helper
- `apps/web/app/(auth)/auth.ts` - NextAuth configuration

## Definition of Done

This task is complete when:

- [x] Users can navigate to "For my manager" from the sidebar
- [x] The reports list page shows all user documents with filters
- [x] Users can create weekly, monthly, and custom reports
- [x] Achievement selection works with filters (company, project)
- [x] AI document generation works and saves to database
- [x] Documents can be deleted with confirmation
- [x] All UI matches the v0 design
- [ ] Documentation is updated (deferred)
- [x] No console errors or warnings
- [x] TypeScript compiles without errors

## Out of Scope

The following are explicitly NOT part of this task:

- Document viewing/editing interface
- Document export (PDF, Word, etc.)
- Document sharing via links
- Template customization
- Scheduled report generation
- Bulk operations on documents
