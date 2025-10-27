# Reports Feature - Technical Documentation

## Overview

The Reports feature ("For my manager") provides a comprehensive interface for generating AI-powered reports from tracked achievements. This document describes the technical implementation, architecture, and patterns used.

---

## Table of Contents

- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Frontend Components](#frontend-components)
- [AI Integration](#ai-integration)
- [Code Patterns](#code-patterns)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Architecture

The Reports feature follows Next.js 15 best practices with a hybrid rendering approach:

- **Reports listing page** - Server Component (SSR)
- **Reports table** - Client Component (interactivity)
- **New report page** - Client Component (complex state)
- **API routes** - RESTful endpoints with proper authentication

### Design Principles

1. **Server-first data fetching** - Fetch data on server where possible
2. **Type safety** - TypeScript strict mode with Zod validation
3. **Security by default** - All routes authenticated, all queries scoped to userId
4. **Reusable patterns** - Leverage existing code (`fetchRenderExecute`, `getAuthUser`)
5. **Progressive enhancement** - Core functionality works, enhanced with AI

---

## Directory Structure

```
apps/web/
├── app/
│   ├── (app)/
│   │   └── reports/
│   │       ├── page.tsx                    # Reports listing (Server Component)
│   │       ├── reports-table.tsx           # Interactive table (Client Component)
│   │       └── new/
│   │           └── [type]/
│   │               └── page.tsx            # New report page (Client Component)
│   └── api/
│       └── documents/
│           ├── route.ts                    # GET /api/documents (list)
│           ├── [id]/
│           │   └── route.ts                # DELETE /api/documents/[id]
│           └── generate/
│               └── route.ts                # POST /api/documents/generate
├── components/
│   ├── app-sidebar.tsx                     # Navigation (includes "For my manager")
│   └── nav-main.tsx                        # Main nav items (enhanced active state)
└── lib/
    └── ai/
        ├── generate-document.ts            # Core AI generation logic
        └── prompts/
            ├── types.ts                    # Type definitions
            └── generate-document.mdx       # MDX prompt template
```

---

## Data Flow

### Viewing Reports List

```
1. User clicks "For my manager" in sidebar
2. Browser navigates to /reports
3. Server Component:
   - Authenticates user (auth())
   - Fetches documents with Drizzle ORM
   - Joins with Company table
   - Passes data to Client Component
4. Client Component:
   - Renders table with filters
   - Handles client-side filtering
   - Manages delete dialog state
```

### Creating New Report

```
1. User clicks "Create Weekly Report" button
2. Browser navigates to /reports/new/weekly
3. Client Component mounts:
   - Fetches achievements from /api/achievements?startDate=...&endDate=...
   - Fetches projects from /api/projects
   - Fetches companies from /api/companies
   - Selects all achievements by default
4. User filters/selects achievements, edits prompt
5. User clicks "Generate Report"
6. Frontend calls POST /api/documents/generate:
   - Sends achievementIds, title, type, userInstructions
7. Backend:
   - Validates request (Zod)
   - Calls fetchRenderExecute() with achievement IDs
   - Streams AI generation
   - Collects full response
   - Saves to database
   - Returns document
8. Frontend:
   - Shows success toast
   - Redirects to /reports
9. User sees new report in list
```

### Deleting Report

```
1. User clicks trash icon on report row
2. Confirmation dialog appears
3. User clicks "Delete"
4. Frontend calls DELETE /api/documents/[id]
5. Backend:
   - Validates user owns document
   - Deletes from database (cascade)
6. Frontend:
   - Removes from UI
   - Shows success toast
```

---

## API Endpoints

### GET /api/documents

**Purpose:** List all documents for authenticated user

**Authentication:** Required (session or JWT)

**Query Parameters:**
- `type` (optional) - Filter by document type

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
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Database error

---

### POST /api/documents/generate

**Purpose:** Generate a new document from achievements using AI

**Authentication:** Required (session or JWT)

**Request Body:**
```json
{
  "achievementIds": ["uuid1", "uuid2", "uuid3"],
  "title": "Weekly Report - Jan 15-21",
  "type": "weekly_report",
  "userInstructions": "Focus on backend improvements...",
  "defaultInstructions": "Please write a concise weekly report..."
}
```

**Validation Schema (Zod):**
```typescript
const generateSchema = z.object({
  achievementIds: z.array(z.string().uuid()),
  type: z.enum([
    'weekly_report',
    'monthly_report',
    'custom_report',
    'quarterly_report',
    'performance_review',
  ]),
  title: z.string().min(1),
  userInstructions: z.string().optional(),
  defaultInstructions: z.string().optional(),
});
```

**Processing Steps:**
1. Validate request body with Zod
2. Check at least one achievement selected
3. Save custom instructions to user preferences (if different from defaults)
4. Call `fetchRenderExecute()` with achievement IDs
5. Stream AI response and collect
6. Save document to database
7. Return document

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "title": "Weekly Report - Jan 15-21",
    "content": "# Weekly Report\n\nThis week I accomplished...",
    "type": "weekly_report",
    "userId": "uuid",
    "createdAt": "2024-01-21T10:00:00Z",
    "updatedAt": "2024-01-21T10:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error or no achievements selected
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - AI generation or database error

---

### DELETE /api/documents/[id]

**Purpose:** Delete a document

**Authentication:** Required (session or JWT)

**Authorization:** User must own the document

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Document doesn't exist or user doesn't own it
- `500 Internal Server Error` - Database error

---

## Database Schema

### Document Table

```sql
CREATE TABLE "Document" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  company_id UUID REFERENCES "Company"(id) ON DELETE SET NULL,
  type VARCHAR(32) NOT NULL,
  share_token VARCHAR(64)
);

CREATE INDEX idx_document_user_id ON "Document"(user_id);
CREATE INDEX idx_document_type ON "Document"(type);
CREATE INDEX idx_document_created_at ON "Document"(created_at DESC);
```

### Drizzle Schema Definition

```typescript
export const document = pgTable('Document', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => company.id, {
    onDelete: 'set null',
  }),
  type: varchar('type', { length: 32 }).notNull(),
  shareToken: varchar('share_token', { length: 64 }),
});
```

### Query Examples

**Fetch documents with company:**
```typescript
const documents = await db
  .select({
    id: document.id,
    title: document.title,
    type: document.type,
    company: {
      id: company.id,
      name: company.name,
    },
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  })
  .from(document)
  .leftJoin(company, eq(document.companyId, company.id))
  .where(eq(document.userId, userId))
  .orderBy(desc(document.updatedAt));
```

**Insert new document:**
```typescript
const [newDocument] = await db
  .insert(document)
  .values({
    title,
    content,
    type,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .returning();
```

**Delete document:**
```typescript
await db
  .delete(document)
  .where(and(eq(document.id, id), eq(document.userId, userId)));
```

---

## Frontend Components

### Reports Listing Page

**File:** `apps/web/app/(app)/reports/page.tsx`

**Type:** Server Component

**Responsibilities:**
- Authenticate user
- Fetch documents from database
- Join with company table
- Pass data to Client Component

**Key Code:**
```typescript
export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // Fetch on server
  const documents = await db
    .select(...)
    .from(document)
    .leftJoin(company, ...)
    .where(eq(document.userId, session.user.id));

  return (
    <AppPage>
      <SidebarInset>
        <ReportsTable initialDocuments={documents} companies={companies} />
      </SidebarInset>
    </AppPage>
  );
}
```

---

### Reports Table Component

**File:** `apps/web/app/(app)/reports/reports-table.tsx`

**Type:** Client Component (`'use client'`)

**Props:**
```typescript
interface ReportsTableProps {
  initialDocuments: DocumentWithCompany[];
  companies: Company[];
}
```

**State Management:**
```typescript
const [documents, setDocuments] = useState(initialDocuments);
const [typeFilter, setTypeFilter] = useState<string>('all');
const [companyFilter, setCompanyFilter] = useState<string>('all');
const [timePeriodFilter, setTimePeriodFilter] = useState<string>('all');
const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

**Filtering Logic (useMemo):**
```typescript
const filteredDocuments = React.useMemo(() => {
  return documents.filter((doc) => {
    // Type filter
    if (typeFilter !== 'all' && doc.type !== typeFilter) return false;

    // Company filter
    if (companyFilter !== 'all' && doc.companyId !== companyFilter) return false;

    // Time period filter
    if (timePeriodFilter !== 'all') {
      const docDate = new Date(doc.updatedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));

      if (timePeriodFilter === '7d' && daysDiff > 7) return false;
      if (timePeriodFilter === '30d' && daysDiff > 30) return false;
      if (timePeriodFilter === '90d' && daysDiff > 90) return false;
    }

    return true;
  });
}, [documents, typeFilter, companyFilter, timePeriodFilter]);
```

---

### New Report Page

**File:** `apps/web/app/(app)/reports/new/[type]/page.tsx`

**Type:** Client Component (`'use client'`)

**Dynamic Route:** `/reports/new/[type]` where type is `weekly`, `monthly`, or `custom`

**State Management:**
```typescript
const [achievements, setAchievements] = useState<Achievement[]>([]);
const [projects, setProjects] = useState<Project[]>([]);
const [companies, setCompanies] = useState<Company[]>([]);
const [selectedAchievements, setSelectedAchievements] = useState<string[]>([]);
const [companyFilter, setCompanyFilter] = useState<string>('all');
const [projectFilter, setProjectFilter] = useState<string>('all');
const [userInstructions, setUserInstructions] = useState<string>('');
const [isGenerating, setIsGenerating] = useState(false);
```

**Data Fetching (useEffect):**
```typescript
React.useEffect(() => {
  async function fetchData() {
    const dateThreshold = getDateRangeForType(type);
    const now = new Date();

    const [achievementsRes, projectsRes, companiesRes] = await Promise.all([
      fetch(`/api/achievements?startDate=${dateThreshold.toISOString()}&endDate=${now.toISOString()}&limit=200`),
      fetch('/api/projects'),
      fetch('/api/companies'),
    ]);

    const achievementsData = await achievementsRes.json();
    const projectsData = await projectsRes.json();
    const companiesData = await companiesRes.json();

    setAchievements(achievementsData.achievements || []);
    setProjects(projectsData || []); // API returns array directly
    setCompanies(companiesData || []); // API returns array directly

    // Select all by default
    setSelectedAchievements(achievementsData.achievements.map(a => a.id));
  }

  fetchData();
}, [type]);
```

**Generation Handler:**
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
        title: `${getTitleForType(type)} - ${formatDate(new Date())}`,
        type: `${type}_report`,
        userInstructions,
        defaultInstructions: getDefaultInstructionsForType(type),
      }),
    });

    if (!response.ok) throw new Error('Failed to generate');

    toast.success('Document generated successfully');
    router.push('/reports');
  } catch (error) {
    toast.error('Failed to generate document');
  } finally {
    setIsGenerating(false);
  }
};
```

---

## AI Integration

### Generation Pipeline

The Reports feature uses the existing `generate-document.ts` pipeline with extensions for custom prompts and achievement ID filtering.

**Function:** `fetchRenderExecute()`

**Purpose:** Complete pipeline from data fetching to AI execution

**Parameters:**
```typescript
interface GenerateDocumentFetcherProps {
  title: string;
  days?: number;                  // Default: 7 (ignored if achievementIds provided)
  user: User;
  projectId?: string;
  companyId?: string;
  achievementIds?: string[];      // NEW: Filter to specific achievements
  userInstructions?: string;      // NEW: Custom generation instructions
  chatHistory?: Message[];
}
```

**Pipeline Steps:**

1. **Fetch** (`fetch()` function)
   - Fetches achievements from database
   - If `achievementIds` provided, fetches all and filters client-side
   - Otherwise filters by date range and project/company
   - Fetches project and company details if IDs provided
   - Uses `userInstructions` or falls back to `user.preferences.documentInstructions`

2. **Render** (`render()` function)
   - Loads MDX prompt template from `lib/ai/prompts/generate-document.mdx`
   - Injects data (achievements, user info, instructions) into template
   - Returns rendered prompt string

3. **Execute** (`execute()` function)
   - Calls `streamText()` with `documentWritingModel`
   - Streams response from LLM
   - Returns async iterable

**Usage in API endpoint:**
```typescript
const result = await fetchRenderExecute({
  title,
  user: session.user,
  achievementIds,
  userInstructions,
});

// Collect stream
let content = '';
for await (const chunk of result.textStream) {
  content += chunk;
}

// Save to database
await db.insert(document).values({ title, content, type, userId });
```

---

### Prompt Template

**File:** `apps/web/lib/ai/prompts/generate-document.mdx`

The prompt template uses MDX for structured, maintainable prompts. It receives:

- `docTitle` - Title of the document
- `days` - Number of days covered
- `user` - User object (name, email, preferences)
- `project` - Project details (optional)
- `company` - Company details (optional)
- `achievements` - Array of achievements with full details
- `userInstructions` - Custom instructions from user

**Template Structure:**
```mdx
---
model: gpt-4
temperature: 0.7
---

You are a professional career coach helping {user.name} write a {docTitle}.

{userInstructions}

## Achievements

{achievements.map(a => (
  <Achievement>
    <Title>{a.title}</Title>
    <Summary>{a.summary}</Summary>
    <Impact>{a.impact}/10</Impact>
    <Project>{a.project?.name}</Project>
    <Company>{a.company?.name}</Company>
  </Achievement>
))}

Generate a professional document that highlights these achievements...
```

---

### Model Selection

Uses `documentWritingModel` from `lib/ai/models.ts`:

```typescript
export const documentWritingModel = createLLMRouter({
  taskType: 'document_generation',
  models: {
    openai: openai('gpt-4o-mini'),
    deepseek: deepseek('deepseek-chat'),
    google: google('gemini-1.5-flash'),
  },
  fallback: openai('gpt-4o-mini'),
});
```

Model selection considers:
- User's subscription level
- Cost optimization
- Provider availability
- Quality requirements

---

## Code Patterns

### Server Component Pattern

```typescript
// apps/web/app/(app)/reports/page.tsx
export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // Fetch data on server
  const data = await db.select(...);

  // Pass to Client Component
  return <ClientComponent data={data} />;
}
```

**Benefits:**
- Better performance (no client-side fetching)
- SEO-friendly
- Reduces JavaScript bundle size

---

### Client Component Pattern

```typescript
// apps/web/app/(app)/reports/reports-table.tsx
'use client';

export function ReportsTable({ initialData }) {
  const [data, setData] = useState(initialData);

  // Client-side interactivity
  return <div>...</div>;
}
```

**Use when:**
- Component needs state (`useState`, `useReducer`)
- Component needs effects (`useEffect`)
- Component uses browser APIs
- Component needs event handlers

---

### API Route Pattern

```typescript
// apps/web/app/api/documents/generate/route.ts
export async function POST(request: Request) {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid' }, { status: 400 });
  }

  // 3. Process
  const result = await doWork(parsed.data);

  // 4. Return
  return Response.json(result);
}
```

---

### Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/...');

  if (!response.ok) {
    throw new Error('Request failed');
  }

  const data = await response.json();
  toast.success('Success!');

} catch (error) {
  console.error('Operation failed:', error);
  toast.error('Failed to complete operation');
}
```

---

## Testing

### Manual Testing Checklist

See `tasks/import-reports/REVIEW.md` for comprehensive manual testing checklist.

### Automated Testing (Future)

**API Route Tests:**
```typescript
describe('POST /api/documents/generate', () => {
  it('requires authentication', async () => {
    const response = await POST(requestWithoutAuth);
    expect(response.status).toBe(401);
  });

  it('validates request body', async () => {
    const response = await POST(requestWithInvalidBody);
    expect(response.status).toBe(400);
  });

  it('generates document from achievements', async () => {
    const response = await POST(validRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.document.content).toBeTruthy();
  });
});
```

**Component Tests:**
```typescript
describe('ReportsTable', () => {
  it('filters documents by type', () => {
    render(<ReportsTable initialDocuments={mockDocs} companies={[]} />);
    fireEvent.click(screen.getByText('Weekly'));
    expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    expect(screen.queryByText('Monthly Report')).not.toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Issue: Dropdowns not populated

**Symptoms:** Projects and companies dropdowns are empty

**Cause:** API response structure mismatch

**Solution:**
- Achievements API returns `{ achievements: [...], pagination: {...} }`
- Projects API returns array directly `[...]`
- Companies API returns array directly `[...]`

```typescript
// Correct handling
setAchievements(achievementsData.achievements || []);
setProjects(projectsData || []); // Not projectsData.projects
setCompanies(companiesData || []); // Not companiesData.companies
```

---

### Issue: Date filtering not working

**Symptoms:** Weekly/monthly reports show all achievements

**Cause:** Missing `endDate` parameter

**Solution:**
```typescript
// WRONG - only startDate
fetch(`/api/achievements?startDate=${date.toISOString()}`)

// CORRECT - both startDate and endDate
const now = new Date();
fetch(`/api/achievements?startDate=${date.toISOString()}&endDate=${now.toISOString()}`)
```

The `getAchievements()` query uses `between(achievement.eventStart, startDate, endDate)` which requires BOTH parameters.

---

### Issue: Sidebar not showing active for nested routes

**Symptoms:** "For my manager" not highlighted when on `/reports/new/weekly`

**Cause:** Exact pathname matching

**Solution:**
```typescript
// WRONG - exact match
const isActive = pathname === item.url;

// CORRECT - prefix match
const isActive = pathname.startsWith(item.url);
```

**File:** `apps/web/components/nav-main.tsx`

---

### Issue: User instructions not saving

**Symptoms:** Custom prompts reset on page refresh

**Cause:** Not saving to user preferences

**Solution:** API endpoint should save instructions when different from defaults:

```typescript
if (
  userInstructions !== undefined &&
  defaultInstructions !== undefined &&
  userInstructions !== defaultInstructions &&
  userInstructions !== session.user.preferences?.documentInstructions
) {
  await db.update(user).set({
    preferences: {
      ...session.user.preferences,
      documentInstructions: userInstructions,
    },
  });
}
```

---

## Future Enhancements

### Document Viewing Interface

**Plan:** In-app document viewer/editor with markdown rendering

**Implementation approach:**
- Route: `/reports/[id]`
- Component: Rich text editor (e.g., Tiptap, Lexical)
- Save drafts to database
- Version history tracking

---

### Export Functionality

**Plan:** Export reports to PDF, Word, plain text

**Implementation approach:**
- Backend: Use libraries for document generation (PDF, Word)
- API: `POST /api/documents/[id]/export?format=pdf`
- Frontend: Download button with format selector

---

### Sharing Links

**Plan:** Generate shareable public links for documents

**Implementation approach:**
- Add `shareToken` field (already in schema)
- Route: `/share/[token]`
- Public endpoint: `GET /api/documents/share/[token]`
- Optional expiration dates

---

### Scheduled Reports

**Plan:** Automated weekly/monthly report generation

**Implementation approach:**
- Background job system (e.g., cron, BullMQ)
- User preferences for schedule
- Email delivery integration
- Notification system

---

## Additional Resources

- **Implementation Log:** `tasks/import-reports/LOG.md`
- **Implementation Review:** `tasks/import-reports/REVIEW.md`
- **Plan Document:** `tasks/import-reports/PLAN.md`
- **Project Guide:** `CLAUDE.md`
- **Feature Configuration:** `docs/FEATURES.md`

---

**Last Updated:** 2025-10-14
**Maintainer:** BragDoc Team
