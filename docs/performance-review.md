# Performance Review Feature

## Overview

The Performance Review feature enables users to generate comprehensive performance review documents based on their tracked achievements and workstreams. The feature provides a guided workflow for configuring review parameters, generating AI-powered content, and refining the output through an interactive chat interface.

**Current Status:** UI-only implementation with fake data. Backend integration is pending.

## Three-Page Structure

### 1. Index Page (`/performance`)

The landing page for the Performance Review feature displaying a list of saved performance reviews.

**Features:**
- List of existing performance reviews with name, date range, and status
- "Create New Review" action button
- Zero state for users with no reviews yet

### 2. New Review Page (`/performance/new`)

Entry point for creating a new performance review (to be implemented with backend).

**Future functionality:**
- Create review with initial name and date range
- Redirect to edit page after creation

### 3. Edit Page (`/performance/[id]`)

The primary workspace for configuring and generating performance review documents.

**Layout:**
- **Fixed Header:** Sticky at top with inline-editable name, delete button, date range picker, and project filter
- **Scrollable Content:** Three collapsible sections for Workstreams, Instructions, and Document

## Edit Page Components

### Header Section

| Component | Purpose |
|-----------|---------|
| **Inline-editable Name** | Click-to-edit input styled as heading text |
| **Delete Button** | Opens confirmation dialog, navigates to index on confirm |
| **DateRangePicker** | Dual calendar popover for start/end date selection |
| **ProjectFilter** | Multi-select dropdown for filtering by projects |

### Collapsible Sections

#### Workstreams Section

Displays work themes during the review period with visual timeline representation.

**Features:**
- Color-coded workstream rows
- Date range for each workstream
- Achievement count badges
- Progress bar based on relative achievement counts

#### Instructions Section

Customizable text area for generation instructions with optional persistence.

**Features:**
- Multi-line textarea with helpful placeholder
- "Save for future reviews" checkbox
- localStorage persistence when checkbox is enabled

#### Document Section

Two-state UI for document generation and refinement.

**Zero State:**
- Centered "Generate Document" button with sparkles icon
- Dashed border visual indicator

**Generated State:**
- Split layout: Document panel (2/3) + Chat panel (1/3)
- Document editor with Preview/Edit tabs
- Markdown rendering in Preview tab
- Chat interface for AI refinement (disabled in fake data UI)

## localStorage Keys

The following localStorage keys are used by the Performance Review feature:

| Key | Purpose | Values |
|-----|---------|--------|
| `performance-review-instructions` | Stores the user's custom generation instructions | String (textarea content) |
| `performance-review-save-instructions` | User's preference for persisting instructions | `'true'` or `'false'` |

### Persistence Behavior

- **When checkbox is checked:** Both instructions and preference are saved to localStorage
- **When checkbox is unchecked:** Preference flag is updated but stored instructions are retained (non-destructive)
- **On page load with preference enabled:** Instructions are restored from localStorage
- **On page load with preference disabled:** Textarea starts empty

## Component File Structure

```
apps/web/
├── app/(app)/performance/
│   ├── page.tsx                    # Index page (list view)
│   └── [id]/
│       ├── page.tsx                # Server component wrapper
│       └── performance-review-edit.tsx  # Main client component
├── components/performance-review/
│   ├── collapsible-section.tsx     # Expandable card sections
│   ├── date-range-picker.tsx       # Two-date range picker
│   ├── project-filter.tsx          # Multi-select project dropdown
│   ├── workstreams-section.tsx     # Workstream display with progress
│   ├── instructions-section.tsx    # Textarea with save toggle
│   ├── document-section.tsx        # Document zero/generated states
│   ├── document-editor.tsx         # Tabs for preview/edit
│   └── chat-interface.tsx          # Chat UI for refinement
└── lib/
    └── performance-review-fake-data.ts  # Mock data and types
```

## Fake Data Types

```typescript
interface FakePerformanceReview {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  projectIds: string[];
  document: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeProject {
  id: string;
  name: string;
  color: string;
}

interface FakeWorkstream {
  id: string;
  name: string;
  color: string;
  achievementCount: number;
  startDate: Date;
  endDate: Date;
}

interface FakeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

## Future Backend Integration

When backend integration is implemented, the following will be added:

1. **Database Schema:** New `performanceReview` table with relationships to users, projects, and documents
2. **API Routes:**
   - `GET/POST /api/performance-reviews` - List and create reviews
   - `GET/PUT/DELETE /api/performance-reviews/[id]` - CRUD operations
   - `POST /api/performance-reviews/[id]/generate` - AI document generation
   - `POST /api/performance-reviews/[id]/chat` - Chat refinement
3. **Real Data Fetching:** Replace fake data imports with SWR hooks or server-side queries
4. **AI Integration:** Connect to existing AI SDK for document generation and chat

## Related Documentation

- **Frontend Patterns:** `.claude/docs/tech/frontend-patterns.md` - Component patterns including CollapsibleSection, DateRangePicker, and localStorage persistence
- **AI Integration:** `.claude/docs/tech/ai-integration.md` - LLM providers and prompt patterns
- **Database Schema:** `.claude/docs/tech/database.md` - When backend schema is added

---

**Last Updated:** 2026-01-06
**Status:** UI-only with fake data (backend integration pending)
