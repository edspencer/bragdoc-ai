# Recent Achievements Component - Implementation Plan

## Overview
Consolidate three existing components (two `StandupAchievementsTable` instances and `RecentUpdatesTable`) into a single unified `RecentAchievementsTable` component that displays achievements grouped by standup documents for the last 7 days, with week navigation and collapsible sections.

## Implementation Status

✅ **Phase 1 Complete**: Database & Schema
- Added `standupDocumentId` column to Achievement table
- Created update functions for linking achievements to documents
- Exported functions from database package

✅ **Phase 2 Complete**: Backend Logic
- Updated `create-standup-document.ts` to automatically link achievements
- Enhanced API endpoints to support date range filtering
- Fixed type safety issues

✅ **Phase 3 Complete**: New Component
- Created `RecentAchievementsTable` component with full functionality
- Implemented week navigation with prev/next buttons
- Added data fetching with dual API calls
- Built document sections with collapsible UI
- Implemented 10-star impact rating
- Added nested collapsibles for summary/WIP
- Included orphaned achievements section
- Added "Generate Standups" button

✅ **Phase 4 Complete**: Integration
- Replaced three old components with new unified component
- Removed obsolete state and effects
- Updated imports and component structure
- Build passes successfully

🔲 **Phase 5 Remaining**: Testing & Cleanup
- Browser testing required (steps 21-24)
- Delete old component files (steps 25)
- Polish styling and edge cases (steps 26-30)

---

## 1. Database Schema Changes

### Add `standupDocumentId` to Achievement

✅ **COMPLETED** - Column added and migration pushed via drizzle push

**Schema Update:** `packages/database/src/schema.ts`

```typescript
export const achievement = pgTable('Achievement', {
  // ... existing fields
  standupDocumentId: uuid('standup_document_id').references(() => standupDocument.id, { onDelete: 'set null' }),
});
```

**Notes:**
- Nullable field (not all achievements are linked to standup documents)
- SET NULL on delete (preserve achievements if standup document is deleted)
- Index for efficient querying by standupDocumentId

---

## 2. Shared Logic Extraction

### Standup Occurrence Calculation

**Current State:**
- Logic exists in `apps/web/lib/standups/calculate-standup-occurrences.ts` (created in recent commit)
- Used by `apps/web/app/api/standups/[standupId]/regenerate-standup-documents/route.ts`

**Action Required:**
Ensure this shared logic is properly exported and can be used by:
1. Backend API endpoint (existing usage)
2. New frontend component (new usage)

**Function Signature:**
```typescript
export function calculateStandupOccurrences(
  standup: Standup,
  startDate: Date,
  endDate: Date
): Date[] {
  // Returns array of standup occurrence dates in range
}
```

**No action needed if already exists.** Otherwise, extract from the regenerate endpoint.

---

## 3. Database Query Functions

### Update Achievement StandupDocumentId

**Location:** `packages/database/src/queries.ts` or achievements-specific file

```typescript
export async function updateAchievementStandupDocument(
  achievementId: string,
  standupDocumentId: string,
  dbInstance = defaultDb
): Promise<void> {
  await dbInstance
    .update(achievement)
    .set({ standupDocumentId })
    .where(eq(achievement.id, achievementId));
}

export async function bulkUpdateAchievementStandupDocument(
  achievementIds: string[],
  standupDocumentId: string,
  dbInstance = defaultDb
): Promise<void> {
  // Bulk update for efficiency
  await dbInstance
    .update(achievement)
    .set({ standupDocumentId })
    .where(inArray(achievement.id, achievementIds));
}
```

**Notes:**
- These functions are used by `create-standup-document.ts` to link achievements to documents
- No special combined query needed - component will fetch from two separate endpoints

---

## 4. Backend Changes

### Update `create-standup-document.ts`

**Location:** `apps/web/lib/standups/create-standup-document.ts`

**Current behavior:**
1. Fetches achievements in date range
2. Generates AI summary
3. Updates document with achievementsSummary

**New behavior:**
After successfully updating the document with summary (line ~75), add:

```typescript
// Link achievements to this standup document
if (achievements.length > 0) {
  const achievementIds = achievements.map(a => a.id);
  await bulkUpdateAchievementStandupDocument(achievementIds, document.id);
}
```

**Import required:**
```typescript
import { bulkUpdateAchievementStandupDocument } from '@bragdoc/database';
```

---

## 5. New Component: RecentAchievementsTable

### Component Structure

**Location:** `apps/web/components/standups/recent-achievements-table.tsx`

**Props:**
```typescript
interface RecentAchievementsTableProps {
  standupId: string;
  standup: Standup; // For calculating occurrences
  onImpactChange: (achievementId: string, impact: number) => void;
}
```

**State:**
```typescript
const [weekOffset, setWeekOffset] = useState(0); // 0 = current, -1 = prev week
const [documents, setDocuments] = useState<StandupDocument[]>([]);
const [achievementsByDocument, setAchievementsByDocument] = useState<Map<string, Achievement[]>>(new Map());
const [orphanedAchievements, setOrphanedAchievements] = useState<Achievement[]>([]);
const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
const [expandedWips, setExpandedWips] = useState<Set<string>>(new Set());
const [isLoading, setIsLoading] = useState(true);
const [hasRecentAchievements, setHasRecentAchievements] = useState(false);
const [isGenerating, setIsGenerating] = useState(false);
```

### UI Structure

```
┌─────────────────────────────────────────────────────────┐
│ Recent Achievements                      [◀ Prev | Next ▶] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ▼ Thu, Oct 9 at 10am                                    │
│    Completed authentication refactor and added tests    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ▸ Achievements Summary                                │
│                                                          │
│   Achievement Title                           ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ │
│   Another Achievement                         ⭐⭐⭐⭐⭐⭐⭐☆☆☆ │
│                                                          │
│   ▸ Work in Progress                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ▼ Wed, Oct 8 at 2pm                                     │
│    Fixed critical bug in payment flow                   │
├─────────────────────────────────────────────────────────┤
│   ... (same structure)                                  │
└─────────────────────────────────────────────────────────┘

[OR if no documents but achievements exist:]

┌─────────────────────────────────────────────────────────┐
│           [Generate Standups for last 7 days]           │
└─────────────────────────────────────────────────────────┘
```

### Component Sections

**1. Header Section:**
- Title: "Recent Achievements"
- Week navigation: "◀ Prev" and "Next ▶" buttons
- Date range display (optional): "Oct 3-9, 2025"

**2. StandupDocument Sections (foreach document, most recent first):**
- **Main header (collapsible):**
  - Toggle arrow icon (▼ expanded, ▶ collapsed)
  - Date + time: "Thu, Oct 9 at 10am"
  - Summary: StandupDocument.summary (1-line AI summary)

- **Collapsible content (default: expanded):**

  - **Nested section: Achievements Summary**
    - Smaller sub-header: "▸ Achievements Summary" (collapsible)
    - Content: StandupDocument.achievementsSummary (multi-paragraph AI summary)
    - Default: collapsed

  - **Achievement list:**
    - Each achievement row:
      - Title
      - 10-star impact rating (interactive)
      - NO source pill ("llm" badge removed)
    - If no achievements: "No achievements recorded"

  - **Nested section: Work in Progress**
    - Smaller sub-header: "▸ Work in Progress" (collapsible)
    - Content: StandupDocument.wip (user-entered text)
    - Default: collapsed
    - If empty: Don't show this section at all

**3. Orphaned Achievements Section (if any):**
- Show below all document sections
- Header: "Other Achievements (not assigned to standup)"
- Same achievement list format

**4. Generate Button (conditional):**
- Show if: `documents.length === 0 && orphanedAchievements.length > 0`
- Button: "Generate Standups for last 7 days"
- Icon: Sparkles icon
- On click: Call `/api/standups/[standupId]/regenerate-standup-documents`
- Show loading state while generating

---

## 6. Component Integration

### Update `existing-standup-content.tsx`

**Location:** `apps/web/components/standups/existing-standup-content.tsx`

**Changes:**

1. **Remove old components** (lines ~367-391):
   ```tsx
   // DELETE these three component instances:
   <StandupAchievementsTable ... />
   <StandupAchievementsTable ... />
   <RecentUpdatesTable ... />
   ```

2. **Add new component:**
   ```tsx
   <RecentAchievementsTable
     standupId={standup.id}
     standup={standup}
     onImpactChange={handleImpactChange}
   />
   ```

3. **Remove old state/effects:**
   - Remove `achievements` state (only used by first table)
   - Remove `achievements7Days` state (used by second table)
   - Remove `documents` state (moved to new component)
   - Remove corresponding useEffect hooks
   - Keep `handleImpactChange` (still needed)

4. **Simplify layout:**
   - May need to adjust grid layout since we're consolidating from 3 to 1 component
   - Consider if new component should span full width or remain in left column

### Delete Old Components

After successful integration and testing:

**Files to delete:**
- `apps/web/components/standups/standup-achievements-table.tsx`
- `apps/web/components/standups/recent-updates-table.tsx`

---

## 7. Styling Considerations

### Visual Hierarchy

**Level 1: Main component**
- Background: Card with border
- Padding: Standard card padding

**Level 2: StandupDocument header**
- Font size: `text-base` or `text-lg`
- Font weight: `font-semibold`
- Color: Standard text color
- Background: Slightly different shade on hover
- Spacing: `py-3 px-4`

**Level 3: Nested sections (Summary/WIP)**
- Font size: `text-sm`
- Font weight: `font-medium`
- Color: Muted text color
- Indentation: `ml-4` or `ml-6`
- Spacing: `py-2`

**Level 4: Achievement rows**
- Font size: `text-sm`
- Standard table/list styling
- Spacing: `py-2`

### Collapse/Expand Icons
- Use Tabler icons: `IconChevronDown` / `IconChevronRight`
- Rotate transition: `transition-transform duration-200`
- Position: Left of text

### Impact Stars
- Reuse existing star component from `StandupAchievementsTable`
- 10 stars, clickable
- Show current impact value
- On click: Call `onImpactChange` callback

---

## 8. Week Navigation Logic

### Date Range Calculation

```typescript
function getWeekDateRange(weekOffset: number): { startDate: Date; endDate: Date } {
  const now = new Date();
  const startDate = addDays(now, weekOffset * 7 - 7);
  const endDate = addDays(now, weekOffset * 7);

  return {
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
  };
}
```

### Navigation Handlers

```typescript
const handlePrevWeek = () => {
  setWeekOffset(offset => offset - 1);
  // Fetch data will trigger via useEffect
};

const handleNextWeek = () => {
  setWeekOffset(offset => offset + 1);
  // Fetch data will trigger via useEffect
};

// Disable "Next" if weekOffset === 0 (can't go into future)
const canGoNext = weekOffset < 0;
```

### Optional: Date Range Display

Show current date range in header:
```tsx
<div className="text-sm text-muted-foreground">
  {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
</div>
```

---

## 9. Data Fetching Strategy

### Dual Fetch Approach

Use existing endpoints in parallel:
1. `/api/standups/[standupId]/documents?startDate=X&endDate=Y`
2. `/api/standups/[standupId]/achievements?startDate=X&endDate=Y`

**Implementation:**
```typescript
useEffect(() => {
  async function fetchData() {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getWeekDateRange(weekOffset);

      const [documentsRes, achievementsRes] = await Promise.all([
        fetch(`/api/standups/${standupId}/documents?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        fetch(`/api/standups/${standupId}/achievements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
      ]);

      const documents = await documentsRes.json();
      const achievements = await achievementsRes.json();

      // Group achievements by standupDocumentId
      // ... (grouping logic)

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  fetchData();
}, [standupId, weekOffset]);
```

**Endpoint Updates Needed:**
- Both endpoints may need to accept `startDate` and `endDate` query parameters
- Verify existing endpoints support date range filtering

---

## 10. Implementation Steps

### Phase 1: Database & Schema

[x] **1. Verify schema changes**
   - Confirm `standupDocumentId` column exists in Achievement table
   - Check `packages/database/src/schema.ts` includes the field
   - Run `pnpm --filter=@bragdoc/database build` to regenerate types

[x] **2. Add achievement update functions**
   - **File:** `packages/database/src/queries.ts`
   - Add `updateAchievementStandupDocument(achievementId, standupDocumentId)` function
   - Add `bulkUpdateAchievementStandupDocument(achievementIds[], standupDocumentId)` function
   - Import required: `inArray` from drizzle-orm
   - Reference the code example in Section 3 above

[x] **3. Export new functions**
   - **File:** `packages/database/src/index.ts`
   - Add both functions to the exports list
   - Verify exports work: `pnpm --filter=@bragdoc/web build`

---

### Phase 2: Backend Logic

[x] **4. Verify standup occurrence calculation**
   - **File:** `apps/web/lib/standups/calculate-standup-occurrences.ts`
   - Confirm file exists (created in recent commit)
   - Verify it exports `calculateStandupOccurrences(standup, startDate, endDate)` function
   - If missing, extract logic from `regenerate-standup-documents/route.ts`

[x] **5. Link achievements to standup documents**
   - **File:** `apps/web/lib/standups/create-standup-document.ts`
   - After line ~75 (after `updateStandupDocumentAchievementsSummary` succeeds)
   - Add import: `import { bulkUpdateAchievementStandupDocument } from '@bragdoc/database';`
   - Add code block:
     ```typescript
     // Link achievements to this standup document
     if (achievements.length > 0) {
       const achievementIds = achievements.map(a => a.id);
       await bulkUpdateAchievementStandupDocument(achievementIds, document.id);
     }
     ```

[x] **6. Update documents endpoint for date range**
   - **File:** `apps/web/app/api/standups/[standupId]/documents/route.ts`
   - Add query params: `startDate` (optional) and `endDate` (optional)
   - Parse as ISO date strings: `const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : null`
   - Update query to filter by date range if provided
   - Current query likely filters by standupId only - add date filtering

[x] **7. Update achievements endpoint for date range**
   - **File:** `apps/web/app/api/standups/[standupId]/achievements/route.ts`
   - Check if already supports date range (may have `range` param)
   - Add/update query params: `startDate` and `endDate` (ISO strings)
   - Filter achievements by `eventStart` date within range
   - Ensure response includes `standupDocumentId` field

[ ] **8. Test backend changes** (Ready for testing - backend is implemented)
   - Run standup document generation: Click "Generate Standups for last 7 days"
   - Verify achievements get `standupDocumentId` assigned
   - Test documents endpoint with date range: `/api/standups/[id]/documents?startDate=...&endDate=...`
   - Test achievements endpoint with date range: `/api/standups/[id]/achievements?startDate=...&endDate=...`
   - Check database to confirm `standup_document_id` is populated

---

### Phase 3: New Component

[x] **9. Create component file and basic structure**
   - **File:** `apps/web/components/standups/recent-achievements-table.tsx`
   - Add `'use client';` directive at top
   - Create interface for props (standupId, standup, onImpactChange)
   - Set up state variables (see Section 5 for full list)
   - Create empty component shell with Card wrapper
   - Export component

[x] **10. Implement week navigation logic**
   - Add `weekOffset` state (default: 0)
   - Create `getWeekDateRange(weekOffset)` helper function (see Section 8)
   - Add Prev/Next buttons in header
   - Disable "Next" when `weekOffset === 0`
   - Add click handlers that update weekOffset

[x] **11. Implement data fetching**
   - Add useEffect that watches `weekOffset` and `standupId`
   - Calculate date range from weekOffset
   - Fetch from both endpoints in parallel using Promise.all
   - Handle loading and error states
   - Reference code example in Section 9

[x] **12. Group achievements by document**
   - After fetching data, create Map<documentId, Achievement[]>
   - Separate achievements with standupDocumentId vs orphaned
   - Store in state: `achievementsByDocument` and `orphanedAchievements`

[x] **13. Implement StandupDocument sections**
   - Map over documents array (sorted by date descending)
   - Use shadcn/ui Collapsible component
   - Show date + time formatted (e.g., "Thu, Oct 9 at 10am")
   - Show `document.summary` below date/time
   - Add chevron icon that rotates on expand/collapse
   - Default: all expanded (initialize expandedDocuments Set with all IDs)

[x] **14. Implement achievement list within each document**
   - Inside CollapsibleContent, map over achievements for that document
   - Show achievement title
   - Implement 10-star impact rating (reference existing StandupAchievementsTable)
   - Make stars clickable, call `onImpactChange(achievementId, newImpact)`
   - **Remove** source/impactSource pill display

[x] **15. Implement nested collapsible sections**
   - **Achievements Summary sub-section:**
     - Smaller Collapsible inside main CollapsibleContent
     - Header: "Achievements Summary" with chevron
     - Content: `document.achievementsSummary` (multiline text)
     - Default: collapsed
     - Use smaller font size (text-sm)
   - **Work in Progress sub-section:**
     - Same pattern as above
     - Header: "Work in Progress"
     - Content: `document.wip`
     - Only show if wip is not null/empty
     - Default: collapsed

[x] **16. Add orphaned achievements section**
   - Render below all document sections
   - Only show if `orphanedAchievements.length > 0`
   - Header: "Other Achievements (not assigned to standup)"
   - List achievements with same format (title + impact stars)

[x] **17. Add "Generate Standups" button**
   - Show button if: `documents.length === 0 && orphanedAchievements.length > 0`
   - Center in empty state area
   - Use Sparkles icon
   - On click: POST to `/api/standups/${standupId}/regenerate-standup-documents`
   - Show loading state while generating
   - On success: refetch data to show new documents

[x] **18. Add loading and empty states**
   - Loading skeleton while `isLoading === true`
   - Empty state: "No achievements recorded for this week"
   - Empty state for no documents: "No standups scheduled for this week"

---

### Phase 4: Integration

[x] **19. Update existing-standup-content.tsx**
   - **File:** `apps/web/components/standups/existing-standup-content.tsx`
   - Import new component: `import { RecentAchievementsTable } from './recent-achievements-table';`
   - Find the three old components (lines ~367-391)
   - **Delete:**
     ```tsx
     <StandupAchievementsTable
       achievements={achievements}
       ...
     />
     <StandupAchievementsTable
       achievements={achievements7Days}
       ...
     />
     <RecentUpdatesTable
       documents={documents}
       ...
     />
     ```
   - **Replace with:**
     ```tsx
     <RecentAchievementsTable
       standupId={standup.id}
       standup={standup}
       onImpactChange={handleImpactChange}
     />
     ```

[x] **20. Remove obsolete state and effects**
   - Remove state: `achievements`, `setAchievements`
   - Remove state: `achievements7Days`, `setAchievements7Days`
   - Remove state: `documents`, `setDocuments`
   - Remove state: `isLoadingAchievements`, `isLoadingAchievements7Days`, `isLoadingDocuments`
   - Remove state: `hasRecentAchievements`, `isGenerating`
   - Remove state: `selectedAchievements`, `setSelectedAchievements` (if only used by deleted components)
   - Remove corresponding useEffect hooks for fetching achievements and documents
   - **Keep:** `handleImpactChange`, `companies`, `projects`

[ ] **21. Test in browser - basic functionality** (READY FOR TESTING)
   - Navigate to standup page
   - Verify new component renders
   - Check for console errors
   - Verify achievements and documents load

[ ] **22. Test week navigation** (READY FOR TESTING)
   - Click "Prev" button - should show previous week's data
   - Click "Next" button - should return to current week
   - Verify "Next" disabled when at current week
   - Check that data updates correctly

[ ] **23. Test collapsible sections** (READY FOR TESTING)
   - Expand/collapse document sections
   - Expand/collapse nested summary/wip sections
   - Verify smooth transitions
   - Check state persists during interaction

[ ] **24. Test impact rating updates** (READY FOR TESTING)
   - Click stars to change impact rating
   - Verify API call is made
   - Check that rating updates in UI
   - Test across multiple achievements

---

### Phase 5: Cleanup & Polish

[ ] **25. Delete old component files**
   - Delete: `apps/web/components/standups/standup-achievements-table.tsx`
   - Delete: `apps/web/components/standups/recent-updates-table.tsx`
   - Verify no other files import these components: `grep -r "StandupAchievementsTable" apps/web`
   - Verify no other files import these components: `grep -r "RecentUpdatesTable" apps/web`

[ ] **26. Add proper styling**
   - Review visual hierarchy (Section 7)
   - Ensure collapsible icons rotate smoothly
   - Add hover states for interactive elements
   - Check spacing and indentation
   - Test dark mode appearance

[ ] **27. Add loading skeletons**
   - Create skeleton placeholders for document sections
   - Show during initial load
   - Show when navigating between weeks

[ ] **28. Test edge cases**
   - No documents exist yet (show generate button)
   - No achievements in date range (show empty message)
   - Single document with many achievements
   - Document with no achievements
   - Empty summary or WIP fields
   - Multiple weeks of data

[ ] **29. Test "Generate Standups" flow**
   - Start with no documents but some achievements
   - Click "Generate Standups for last 7 days"
   - Verify documents are created
   - Verify achievements get assigned to documents
   - Verify UI updates to show new documents

[ ] **30. Final verification**
   - Run `pnpm lint` - fix any linting errors
   - Run `pnpm build` - verify build succeeds
   - Test full user flow end-to-end
   - Verify no console errors or warnings
   - Check mobile responsiveness

---

## Implementation Notes for Developers

### Key Dependencies
- `date-fns`: For date manipulation (addDays, startOfDay, endOfDay, format)
- `@tabler/icons-react`: For icons (IconChevronDown, IconChevronRight, IconSparkles)
- `shadcn/ui`: Collapsible, Card, Button components

### Important Patterns
1. **Always fetch with Promise.all** - Keeps documents and achievements in sync
2. **Group after fetching** - Don't rely on backend grouping
3. **Default expand state** - All documents expanded, nested sections collapsed
4. **Disable next button** - Can't navigate into the future (weekOffset >= 0)

### Common Pitfalls
- Forgetting to export new functions from database package
- Not handling null/undefined for optional fields (summary, wip)
- Mixing up standupId vs standupDocumentId
- Not clearing old state when integrating new component
- Forgetting to make stars clickable in achievement list

### Testing Checklist
- [ ] Generate standup documents → achievements get linked
- [ ] Week navigation → data updates correctly
- [ ] Collapse/expand → smooth transitions
- [ ] Impact rating → updates persist
- [ ] Empty states → show appropriate messages
- [ ] Loading states → no layout shift

---

## 11. Edge Cases & Considerations

### No StandupDocuments Exist Yet
- Show orphaned achievements (if any)
- Show "Generate Standups" button
- Message: "Generate standup documents to organize your achievements"

### No Achievements in Date Range
- Show message: "No achievements recorded for this week"
- Still show navigation buttons
- Don't show "Generate Standups" button

### Multiple Achievements per Document
- Common case, handle gracefully
- Show all achievements in list
- Consider showing count in document header: "(3 achievements)"

### Empty Summary or WIP
- Summary: Show message "No summary generated"
- WIP: Hide section entirely if null/empty

### Future Week Navigation
- Disable "Next" button when weekOffset === 0
- Can navigate back indefinitely (but data will be sparse)

### Performance
- Collapsible sections help with large datasets
- Consider pagination if single week has 20+ documents
- Lazy load achievement details if needed

### Assignment Conflicts
- What if achievement date doesn't match standup document date?
- Trust the assignment (standupDocumentId takes precedence)
- Future: Add "Reassign" button if needed

---

## 12. Styling Details

### Collapsible Transitions
```tsx
// Use shadcn/ui Collapsible component
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Smooth expand/collapse
<CollapsibleContent className="CollapsibleContent">
  {/* Use data-state for CSS transitions */}
</CollapsibleContent>
```

### Icon Rotation
```tsx
<IconChevronDown
  className={cn(
    "h-4 w-4 transition-transform duration-200",
    isExpanded ? "rotate-0" : "-rotate-90"
  )}
/>
```

### Visual Separation
- Border between document sections: `border-b`
- Nested section indentation: `ml-6` or `pl-6`
- Achievement rows: subtle hover effect `hover:bg-muted/50`

### Impact Stars Styling
- Reuse existing component (check `StandupAchievementsTable` implementation)
- Size: `h-5 w-5` or `h-4 w-4`
- Color: Filled stars use `text-yellow-400` or `text-primary`
- Interactive: `cursor-pointer hover:scale-110`

---

## 13. Testing Plan

### Unit Tests
- Week offset calculation
- Date range computation
- Achievement grouping by documentId
- Collapse/expand state management

### Integration Tests
- Fetch data for date range
- Generate standup documents
- Update achievement impact
- Navigate between weeks

### Component Tests
- Render with various data states (empty, single doc, multiple docs)
- Collapse/expand interactions
- Week navigation interactions
- Impact star clicks

### E2E Tests
- Full user flow: view achievements, navigate weeks, update impact
- Generate standups and verify achievements are assigned
- Test across multiple standups

---

## 14. Open Questions & Decisions

### 1. Should collapsed sections remember state across navigations?
**Decision:** No, reset to defaults when changing weeks. Simpler UX.

### 2. Should orphaned achievements be auto-assigned?
**Decision:** Not automatically. They appear in "Other Achievements" section.
Future enhancement: Add "Assign" button.

### 3. What if standup has no occurrences in date range?
**Decision:** Show empty state: "No standups scheduled for this week"

### 4. Should we show achievement count in document header?
**Decision:** Yes, helpful for quick scanning: "Thu, Oct 9 at 10am (3 achievements)"

### 5. Default expand state for nested sections?
**Decision:** All StandupDocument sections expanded, nested summary/wip collapsed.

---

## 15. Files to Create/Modify

### New Files
- `apps/web/components/standups/recent-achievements-table.tsx` (main component)

### Modified Files
- `packages/database/src/schema.ts` (✅ standupDocumentId already added)
- `packages/database/src/index.ts` (export new update functions)
- `packages/database/src/queries.ts` (add updateAchievementStandupDocument functions)
- `apps/web/lib/standups/create-standup-document.ts` (set standupDocumentId after summary generation)
- `apps/web/components/standups/existing-standup-content.tsx` (integrate new component)
- `apps/web/app/api/standups/[standupId]/achievements/route.ts` (add startDate/endDate query params)
- `apps/web/app/api/standups/[standupId]/documents/route.ts` (add startDate/endDate query params)

### Files to Delete
- `apps/web/components/standups/standup-achievements-table.tsx`
- `apps/web/components/standups/recent-updates-table.tsx`

### Files to Verify/Reference
- `apps/web/lib/standups/calculate-standup-occurrences.ts` (should already exist)
- `apps/web/app/api/standups/[standupId]/regenerate-standup-documents/route.ts` (reference for logic)

---

## 16. Summary

This refactoring consolidates three separate components into one unified view that:

1. **Links achievements to specific standup meetings** via `standupDocumentId`
2. **Shows 7-day window** with week navigation (prev/next buttons)
3. **Groups achievements by standup document** with collapsible sections
4. **Displays contextual information** (summary, WIP) for each standup
5. **Maintains existing functionality** (impact rating, generate button)
6. **Simplifies the codebase** by removing duplicate components

The implementation reuses existing logic for standup occurrence calculation and builds on the existing `StandupDocument` infrastructure. Achievement assignment happens automatically when standup documents are generated.

**Key Benefits:**
- Single, cohesive component instead of three
- Better organization of achievements by standup meeting
- Week-by-week navigation for historical review
- Cleaner UI with collapsible sections
- Automatic linking of achievements to standups
