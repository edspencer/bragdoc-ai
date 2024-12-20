# Achievement Management Feature Requirements

## Overview
Add a complete CRUD interface for Achievement Management in the settings screen, allowing users to manage their achievements directly. Achievements can be optionally linked to companies and projects, providing organizational context for each accomplishment.

## Database Schema
The Achievement UI will use the existing Brag model:
```typescript
brag = pgTable('Brag', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  companyId: uuid('company_id')
    .references(() => company.id),
  projectId: uuid('project_id')
    .references(() => project.id),
  userMessageId: uuid('user_message_id')
    .references(() => userMessage.id),
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  details: text('details'),
  eventStart: timestamp('event_start'),
  eventEnd: timestamp('event_end'),
  eventDuration: varchar('event_duration', { 
    enum: ['day', 'week', 'month', 'quarter', 'half year', 'year'] 
  }).notNull(),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

Note: While the UI will refer to these as "Achievements", the underlying data model will continue to use the "Brag" terminology until a future migration renames it.

## API Routes
- `GET /api/achievements` - List all achievements (internally querying Brag table)
- `POST /api/achievements` - Create a new achievement (internally creating Brag)
- `GET /api/achievements/[id]` - Get achievement details (internally fetching Brag)
- `PUT /api/achievements/[id]` - Update achievement (internally updating Brag)
- `DELETE /api/achievements/[id]` - Delete achievement (internally deleting Brag)

## Data Migration & Handling
### userMessageId Handling
- For LLM-extracted achievements, userMessageId links to the original message
- For manually created achievements, userMessageId is optional
- When duplicating an achievement, do not copy the userMessageId

### Database Changes
```sql
-- Make userMessageId optional for manually created achievements
ALTER TABLE "Brag" ALTER COLUMN "user_message_id" DROP NOT NULL;
```

## Type Definitions
### API Types
```typescript
// Base types from Drizzle schema
type Achievement = InferSelectModel<typeof brag>;

// Type with resolved relations
type AchievementWithRelations = Achievement & {
  company: Company | null;
  project: Project | null;
};

// API request types - only the fields that can be set via API
type CreateAchievementRequest = Pick<Achievement, 
  | 'title' 
  | 'summary' 
  | 'details' 
  | 'eventStart' 
  | 'eventEnd' 
  | 'eventDuration' 
  | 'companyId' 
  | 'projectId'
>;

type UpdateAchievementRequest = Partial<CreateAchievementRequest> & {
  isArchived?: boolean;
};
```

### Zod Schemas
```typescript
const achievementRequestSchema = z.object({
  title: z.string().min(1).max(256),
  summary: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  eventStart: z.date().nullable().optional(),
  eventEnd: z.date().nullable().optional(),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']),
  companyId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  isArchived: z.boolean().optional(),
});
```

## React Hooks
### useAchievements
```typescript
const useAchievements = (options?: {
  limit?: number;
  offset?: number;
  companyId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  duration?: Achievement['eventDuration'];
  includeArchived?: boolean;
}) => {
  // Returns { achievements, isLoading, error, mutate }
}
```

### useAchievement
```typescript
const useAchievement = (id: string) => {
  // Returns { achievement, isLoading, error, mutate }
}
```

## UI Components

### AchievementList
- Display achievements in a table with sortable columns:
  - Title
  - Summary
  - Event Start Date
  - Event Duration
  - Company
  - Project
- Filter capabilities:
  - By date range (event start/end)
  - By company
  - By project
  - By duration
  - Show/hide archived
- Bulk selection for operations
- Export functionality for review documents
- Empty state with helpful onboarding

### AchievementForm
Form component rendered in a dialog/modal for creating/editing achievements with fields:
- Title (required, varchar 256)
- Summary (optional)
- Details (optional)
- Event Start (optional)
- Event End (optional)
- Event Duration (required, select from: day, week, month, quarter, half year, year)
- Company (optional, select from user's companies)
- Project (optional, select from user's projects, filtered by selected company)
- Archive Status (toggle)

### AchievementDialog
Modal component for create/edit/view with:
- Form validation using Zod
- Rich text editor for details field
- Date pickers for event start/end
- Company and project select dropdowns
- Preview mode
- Different modes:
  - Create: Empty form
  - Edit: Pre-populated form
  - View: Read-only display

## Error Handling
### API Error Responses
- 400 Bad Request - Invalid input data
- 401 Unauthorized - User not authenticated
- 403 Forbidden - User not authorized to access achievement
- 404 Not Found - Achievement not found
- 429 Too Many Requests - Rate limit exceeded

### UI Error States
- Form validation errors with inline messages
- Loading states with skeletons
- Error boundaries for component failures
- Toast notifications for action results
- Retry mechanisms for failed requests

## URL Structure
- `/achievements` - Main achievements list view with modal dialogs for create/edit/view

## Testing Requirements
- Jest unit tests for all API endpoints
- Component testing with React Testing Library
- Integration tests for form submission and validation
- Test cases for achievement filtering and sorting
- Test export functionality

## Security Considerations
- Ensure achievements are only accessible by their owner
- Validate all input data
- Sanitize rich text content
- Rate limit API endpoints
- Audit logging for sensitive operations

## Performance Requirements
- Pagination for achievement list
- Optimistic updates for better UX
- Cached company and project lookups
- Efficient filtering implementation
- Lazy loading for achievement details

## Future Considerations
- Achievement templates
- Batch import functionality
- Advanced search capabilities
- Integration with version control systems
- AI-powered achievement suggestions
