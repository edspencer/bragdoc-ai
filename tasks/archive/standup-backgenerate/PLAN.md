# Standup Document Back-Generation Implementation Plan

## Overview

Add functionality to generate StandupDocuments for the last 7 days when a user first creates a Standup, allowing them to see historical standup summaries as if they had been using the feature all along.

## Requirements Summary

- Show "Generate Standups for last 7 days" button when:
  - No StandupDocuments exist for this Standup
  - At least one Achievement exists for the last 7 days
- Button triggers API endpoint that:
  - Calculates all standup occurrences in the last 7 days
  - Creates StandupDocument for each occurrence
  - Generates AI summaries for each document
  - Returns 400 if no achievements or if documents already exist

## Implementation Tasks

### Phase 1: Research and Analysis

- [x] 1. Read and understand existing standup document creation logic in `apps/web/app/api/standups/[standupId]/achievements-summary/route.ts`
- [x] 2. Read and understand existing date calculation functions in `apps/web/lib/scheduling/nextRun.ts` (computeNextRunUTC, computePreviousRunUTC, getStandupAchievementDateRange)
- [x] 3. Read `apps/web/lib/ai/standup-summary.ts` to understand generateStandupSummary function
- [x] 4. Read `apps/web/components/standups/recent-updates-table.tsx` to understand current UI structure
- [x] 5. Identify which database queries are used for fetching/creating StandupDocuments

### Phase 2: Create Shared Library Functions

- [x] 6. Create `apps/web/lib/standups/create-standup-document.ts` - Extract StandupDocument creation logic from achievements-summary route into reusable function:

  - Function signature: `createOrUpdateStandupDocument(standupId, userId, standup, targetDate, regenerate?)`
  - Gets or creates StandupDocument for target date
  - Fetches achievements for appropriate date range
  - Calls generateStandupSummary
  - Updates/creates document with summary
  - Returns created/updated document

- [x] 7. Create `apps/web/lib/standups/calculate-standup-occurrences.ts` - Function to calculate all standup occurrences in a date range:

  - Function signature: `calculateStandupOccurrences(startDate, endDate, timezone, meetingTime, daysMask)`
  - Uses existing computeNextRunUTC logic
  - Returns array of Date objects representing each standup occurrence
  - Handles edge cases (no occurrences, invalid dates)

- [x] 8. ~~Create `apps/web/lib/standups/check-achievements-exist.ts`~~ - Removed (unnecessary abstraction)
  - Check achievements directly in the API route by comparing array length to zero

### Phase 3: Update Existing API Route

- [x] 9. Refactor `apps/web/app/api/standups/[standupId]/achievements-summary/route.ts`:
  - Import and use new `createOrUpdateStandupDocument` function
  - Keep existing validation and error handling
  - Simplify route logic by delegating to shared function

### Phase 4: Create New API Endpoint

- [x] 10. Create `apps/web/app/api/standups/[standupId]/regenerate-standup-documents/route.ts`:
  - POST handler with authentication check
  - Verify standup belongs to user
  - Validate no StandupDocuments exist for last 7 days (return 400 if any exist)
  - Calculate 7-day date range (7 days ago to now)
  - Validate at least one achievement exists in range (return 400 if none)
  - Call `calculateStandupOccurrences` to get all standup dates in range
  - Filter out future dates
  - For each occurrence:
    - Call `createOrUpdateStandupDocument` with targetDate
    - Handle errors gracefully
  - Return array of created documents with status 200
  - Add OPTIONS handler for CORS

### Phase 5: Update Database Queries (if needed)

- [x] 11. Add query function in `packages/database/src/standups/queries.ts` if needed:
  - `hasStandupDocumentsInRange(standupId, startDate, endDate)` - Check if any documents exist in range
  - `getAchievementsCountInRange(userId, startDate, endDate, standup)` - Count achievements in range
  - Note: Not needed - used existing queries

### Phase 6: Update Frontend Component

- [x] 12. Update `apps/web/components/standups/recent-updates-table.tsx`:

  - Add props: `hasDocuments: boolean`, `hasRecentAchievements: boolean`, `onGenerateDocuments: () => Promise<void>`
  - Add conditional rendering logic:
    - If `!hasDocuments && hasRecentAchievements`, show centered button instead of table
    - Button text: "Generate Standups for last 7 days"
    - Center button with flexbox (flex, items-center, justify-center)
    - Add loading state during generation
    - Show success/error toast after completion
  - Otherwise show existing table

- [x] 13. Update `apps/web/components/standups/existing-standup-content.tsx`:
  - Add state for checking if documents/achievements exist
  - Add useEffect to check:
    - If documents.length === 0
    - Fetch achievement count for last 7 days
  - Create `handleGenerateDocuments` function:
    - Sets loading state
    - Calls POST `/api/standups/${standupId}/regenerate-standup-documents`
    - Refetches documents on success
    - Shows toast notification
    - Handles errors
  - Pass props to RecentUpdatesTable component

### Phase 7: Testing

- [ ] 14. Create test file `apps/web/test/api/standups/regenerate-standup-documents.test.ts`:

  - Test successful generation with multiple standup occurrences
  - Test 400 when no achievements exist
  - Test 400 when documents already exist
  - Test authentication requirement
  - Test handling of different daysMask configurations
  - Test timezone handling

- [ ] 15. Create test for new library functions:

  - Test `calculateStandupOccurrences` with various daysMask configurations
  - Test edge cases (no occurrences, past dates, future dates)
  - Test `createOrUpdateStandupDocument` success and error cases

- [ ] 16. Manual testing:
  - Create new standup with no documents
  - Add achievements for last 7 days
  - Verify button appears
  - Click button and verify documents are generated
  - Verify button disappears after generation
  - Test with different standup schedules (daily, M-F, custom days)

### Phase 8: Edge Cases and Error Handling

- [x] 17. Add comprehensive error handling:

  - Handle LLM API failures gracefully
  - Handle partial generation failures (some documents succeed, some fail)
  - Add proper transaction handling if creating multiple documents
  - Add rate limiting considerations for LLM calls

- [x] 18. Add UI loading states:
  - Disable button during generation
  - Show progress indicator
  - Show count of documents being generated ("Generating 3 standups...")

### Phase 9: Documentation and Cleanup

- [x] 19. Add JSDoc comments to all new functions
- [ ] 20. Update any relevant documentation about standup document generation
- [x] 21. Run linter and fix any issues: `pnpm lint:fix`
- [x] 22. Run full test suite: `pnpm test`
- [x] 23. Build all packages: `pnpm build`

## Key Files to Create/Modify

### New Files

- `apps/web/lib/standups/create-standup-document.ts`
- `apps/web/lib/standups/calculate-standup-occurrences.ts`
- ~~`apps/web/lib/standups/check-achievements-exist.ts`~~ (removed - unnecessary)
- `apps/web/app/api/standups/[standupId]/regenerate-standup-documents/route.ts`
- `apps/web/test/api/standups/regenerate-standup-documents.test.ts` (not created yet)

### Modified Files

- `apps/web/app/api/standups/[standupId]/achievements-summary/route.ts`
- `apps/web/components/standups/recent-updates-table.tsx`
- `apps/web/components/standups/existing-standup-content.tsx`
- `packages/database/src/standups/queries.ts` (possibly)

## Algorithm Details

### Document Generation Algorithm

```
1. startDate = now - 7 days
2. currentDate = computeNextRunUTC(startDate, tz, meetingTime, daysMask)
3. while currentDate < now:
     a. Calculate achievement date range for currentDate
     b. Fetch achievements for that range
     c. Generate AI summary
     d. Create StandupDocument with date=currentDate
     e. currentDate = computeNextRunUTC(currentDate + 1 minute, tz, meetingTime, daysMask)
4. Return all created documents
```

### Validation Logic

```
1. Check user owns standup (401 if not)
2. Query StandupDocuments for standup in last 7 days
3. If any exist, return 400 with error "Documents already exist"
4. Check achievements count in last 7 days
5. If count === 0, return 400 with error "No achievements found"
6. Proceed with generation
```

## Success Criteria

- [ ] Button appears only when conditions are met
- [ ] API endpoint creates correct number of documents
- [ ] Each document has proper date and AI-generated summary
- [ ] Button disappears after successful generation
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Handles all edge cases gracefully
- [ ] UI shows appropriate loading and success/error states

## Notes

- Use existing date calculation functions to avoid reimplementing timezone logic
- Leverage existing StandupDocument creation patterns from achievements-summary route
- Ensure AI summary generation uses same logic as current standup updates
- Consider LLM rate limits when generating multiple documents
- Each StandupDocument should use the date range appropriate for that specific standup occurrence
