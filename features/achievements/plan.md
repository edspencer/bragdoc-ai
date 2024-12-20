# Achievement Feature Implementation Plan

## Phase 1: Data Migration & Types 
1. Create migration for optional userMessageId:
   ```sql
   -- Make userMessageId optional
   ALTER TABLE "Brag" ALTER COLUMN "user_message_id" DROP NOT NULL;
   ```
2. Create type definitions in `lib/types/achievement.ts`:
   ```typescript
   // Export types from Drizzle schema
   export type { Achievement } from '@/lib/db/schema'
   
   // Define relation and request types
   export type AchievementWithRelations = ...
   export type CreateAchievementRequest = ...
   export type UpdateAchievementRequest = ...
   ```
3. Update schema in `lib/db/schema.ts`:
   ```typescript
   userMessageId: uuid('user_message_id')
     .references(() => userMessage.id),
   archived: boolean('archived').notNull().default(false),
   ```
4. Add source tracking:
   - Add UI indicator for LLM-extracted vs manually created achievements
   - Add filter for achievement source (LLM/Manual)

5. Create UserMessage handling in `lib/db/achievements/utils.ts`:
   ```typescript
   export async function createSystemUserMessage(userId: string, title: string, summary?: string) {
     // Create system message for manually created achievements
   }
   ```

6. Add migration utilities:
   - Function to create UserMessages for existing Brags if needed
   - Function to validate data consistency

## Phase 2: API Layer 
1. Create API route handlers in `app/api/achievements/route.ts`:
   - GET handler with filtering and pagination
   - POST handler for creation (handle userMessageId)
   - PUT handler for updates
   - DELETE handler for deletion
   - GET /export handler for generating review documents

2. Create API utilities in `lib/db/achievements/queries.ts`:
   - `getAchievementsByUserId` with filters:
     - Date range (eventStart/eventEnd)
     - Company
     - Project
     - Duration
     - Archive status
   - `createAchievement` (with userMessageId creation)
   - `updateAchievement`
   - `deleteAchievement`
   - `bulkUpdateAchievements` (for bulk operations)
   - `getDuration` for calculating achievement duration

## Phase 3: React Hooks & UI 
### React Hooks 
1. Create `hooks/use-achievements.ts`:
   - List achievements with filtering
   - SWR configuration
   - Optimistic updates
   - Bulk selection state
   - Export functionality

2. Create achievement mutation hooks:
   - `useCreateAchievement`
   - `useUpdateAchievement`
   - `useDeleteAchievement`
   - `useBulkUpdateAchievements`
   - `useExportAchievements`

3. Create filter hooks:
   - `useAchievementFilters` for managing filter state
   - `useDateRangeFilter` for date range handling

### UI Components 
1. Create base components:
   ```
   components/achievements/
   ├── achievement-dialog.tsx     # Modal for create/edit/view
   ├── achievement-form.tsx       # Form fields and validation
   ├── achievement-list.tsx       # Main list view
   ├── achievement-filters.tsx    # Filter controls
   ├── bulk-actions.tsx          # Bulk operation controls
   ├── export-dialog.tsx         # Export options dialog
   └── columns.tsx               # Table column definitions
   ```

2. Implement AchievementDialog:
   - Create/Edit/View modes
   - Rich text editor integration
   - Date picker components
   - Company/Project selectors
   - Archive toggle

3. Implement AchievementList: ✅
   - Card-based layout with pagination ✅
   - Filtering controls: 🚧
     - Date range picker
     - Company/Project selectors
     - Duration filter (day/week/month)
     - Archive status toggle
     - Source filter (LLM/Manual)
   - Empty states with helpful messages ✅
   - Loading and error states ✅
   - Toast notifications for actions ✅

4. Error Handling Components:
   - API error display component ✅
   - Form validation error messages
   - Offline state handling
   - Rate limit error handling
   - Retry mechanism UI

## Phase 4: Export & Integration 
1. Add export functionality:
   - Export to Markdown
   - Export to PDF
   - Export to CSV

2. Integrate with existing chat UI:
   - Add achievement suggestions from chat

## Phase 5: Page Implementation 
1. Create `/app/achievements/page.tsx`:
   - Layout structure
   - List integration
   - Dialog state management
   - Filter state management
   - Bulk selection state

## Phase 6: Testing 
1. API Tests:
   - Unit tests for API routes
   - Unit tests for database queries
   - Duration calculation tests
   - Archive status tests
   - Validation tests
   - UserMessage creation tests
   - Export functionality tests
   - Bulk operation tests
   - Error response format tests

2. Component Tests:
   - Achievement dialog modes
   - Form validation
   - List filtering
   - Bulk selection
   - Export dialog
   - Error states
   - Archive functionality
   - Keyboard navigation
   - Screen reader compatibility

3. Integration Tests:
   - End-to-end flow tests
   - API integration tests
   - Filter combination tests
   - Export generation tests
   - Error handling flows
   - Offline functionality

4. Accessibility Testing:
   - Screen reader testing
   - Keyboard navigation testing
   - Color contrast checking
   - ARIA label verification
   - Focus management testing

## Phase 7: Polish 
1. Error Handling:
   - Error boundaries for each major component
   - Toast notifications with retry options
   - Loading states and skeletons
   - Retry mechanisms with exponential backoff
   - Validation error messages
   - Offline mode support
   - Rate limit handling

2. Performance:
   - Implement pagination
   - Add loading skeletons
   - Optimize re-renders
   - Cache filter results
   - Debounce filter changes
   - Lazy load rich text editor

3. Export Templates:
   - Create default templates
   - Template customization UI
   - PDF generation
   - Markdown export
   - Duration formatting

4. Accessibility:
   - ARIA labels for all interactive elements
   - Keyboard shortcuts with visual indicators
   - Focus management system
   - High contrast mode support
   - Screen reader announcements
   - Skip navigation links

5. Final Testing:
   - Cross-browser testing
   - Mobile responsiveness
   - Accessibility audit
   - Performance testing
   - Error scenario testing

## Dependencies 
- ShadcnUI components:
  - Dialog
  - Form
  - Table
  - Calendar
  - Select
  - Button
  - Input
  - Textarea
  - Checkbox (for bulk selection)
  - DateRangePicker
- Additional packages:
  - TipTap for rich text editing
  - date-fns for date handling
  - SWR for data fetching
  - react-pdf for PDF export
  - marked for Markdown export
