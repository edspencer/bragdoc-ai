# Import Reports Pages - Implementation Plan

## Summary

This plan outlines the steps to import the Reports feature from the v0-generated prototype (`tmp/v0-app/app/reports`) into the main BragDoc application (`apps/web/app/(app)/reports`). The Reports feature, branded as "For my manager," allows users to create AI-generated documents (Weekly, Monthly, and Custom reports) based on their achievements. This implementation focuses on setting up the UI and data integration, but explicitly excludes document viewing and editing functionality for now.

## High-Level Overview

1. **Page Migration**: Copy the two report pages from v0-app to the main app
2. **Component Integration**: Update imports to use existing app components (AppSidebar, SiteHeader, etc.)
3. **Data Integration**: Replace mock data with real API calls to fetch documents, achievements, companies, and projects
4. **Sidebar Update**: Add "For my manager" navigation link to the app sidebar
5. **API Integration**: Wire up the document creation flow to use existing Document APIs
6. **Documentation**: Update internal documentation with new feature details

## Instructions for Implementation

### Important Guidelines

- **IMPORTANT**: Use the exact UX from the tmp/v0-app pages. Don't change the layout, styling, or user experience when bringing it into apps/web.
- **Update this plan document** as you go. Each time you complete a task, mark it as done using the checkbox `[x]`.
- **Test incrementally**: After completing each major section, verify the pages load and render correctly before moving to the next section.
- **Follow existing patterns**: Look at how other pages in `apps/web/app/(app)/` are structured and follow the same patterns.
- **Use existing APIs**: Do not create new API endpoints. Use the existing `/api/documents` and `/api/achievements` endpoints.

## Implementation Tasks

### Phase 1: Setup and Page Structure

- [ ] **Task 1.1**: Create the reports directory structure
  - Create directory: `apps/web/app/(app)/reports`
  - Create subdirectory: `apps/web/app/(app)/reports/new/[type]`
  - Verify the (app) route group structure is correct

- [ ] **Task 1.2**: Copy the main reports page
  - Copy `tmp/v0-app/app/reports/page.tsx` to `apps/web/app/(app)/reports/page.tsx`
  - Do not modify the content yet, just copy it as-is

- [ ] **Task 1.3**: Copy the new report creation page
  - Copy `tmp/v0-app/app/reports/new/[type]/page.tsx` to `apps/web/app/(app)/reports/new/[type]/page.tsx`
  - Do not modify the content yet, just copy it as-is

### Phase 2: Component Import Updates

- [ ] **Task 2.1**: Update imports in reports/page.tsx
  - Change `@/components/app-sidebar` to use the real component from `@/components/app-sidebar`
  - Change `@/components/site-header` to use the real component from `@/components/site-header`
  - Verify all `@/components/ui/*` imports point to `apps/web/components/ui/*`
  - Remove any unused imports from v0-app
  - The AppSidebar in the real app doesn't take mock data; remove any data props being passed to it

- [ ] **Task 2.2**: Update imports in reports/new/[type]/page.tsx
  - Change `@/components/app-sidebar` to use the real component from `@/components/app-sidebar`
  - Change `@/components/site-header` to use the real component from `@/components/site-header`
  - Verify all `@/components/ui/*` imports point to `apps/web/components/ui/*`
  - Remove any unused imports from v0-app
  - The AppSidebar in the real app doesn't take mock data; remove any data props being passed to it

- [ ] **Task 2.3**: Verify UI components exist
  - Check that all shadcn/ui components used in the pages exist in `apps/web/components/ui/`:
    - Button, Card, Table, Select, Badge, AlertDialog, Textarea, Checkbox
  - If any are missing, add them using the shadcn CLI: `pnpm dlx shadcn@latest add [component-name]`

### Phase 3: Data Integration - Reports Listing Page

**Context**: The main reports page (`reports/page.tsx`) currently uses mock data. We need to integrate it with the real `/api/documents` endpoint.

**Existing API**:
- Endpoint: `GET /api/documents`
- Location: `apps/web/app/api/documents/route.ts`
- Returns: `{ documents: Document[] }` where Document has:
  ```typescript
  {
    id: string;
    title: string;
    content: string;
    type?: string; // 'weekly_report', 'monthly_report', 'custom_report', etc.
    companyId?: string;
    company?: { name: string };
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
    shareToken?: string;
  }
  ```

**Existing Query Function**:
- Location: `packages/database/src/queries.ts`
- Function: `getDocumentsById({ id }: { id: string })` - gets documents by ID
- Note: There's no `getDocumentsByUserId` function yet, but the API handles this automatically via the authenticated session

- [ ] **Task 3.1**: Add data fetching to reports page
  - Import `useSWR` from 'swr' (already used in DocumentList component at `apps/web/components/documents/document-list.tsx:16`)
  - Replace the mock data state with `useSWR<{ documents: Document[] }>('/api/documents')`
  - Update the Document interface to match the real API response (see above)
  - Handle loading state by showing a skeleton or loading indicator
  - Handle error state by showing an error message

- [ ] **Task 3.2**: Filter documents by type
  - The API returns all documents, so filtering needs to happen client-side
  - Filter the documents array to only show those where `type` is one of: 'weekly_report', 'monthly_report', or 'custom_report'
  - This ensures only "For my manager" documents appear on this page

- [ ] **Task 3.3**: Integrate company data into filters
  - Import company fetching: The companies should be fetched from `/api/companies`
  - Use `useSWR<{ companies: Company[] }>('/api/companies')` to fetch companies
  - Company type structure (from `packages/database/src/queries.ts:753`):
    ```typescript
    {
      id: string;
      name: string;
      userId: string;
      domain?: string;
      role: string;
      startDate: Date;
      endDate?: Date;
    }
    ```
  - Replace mock companies data with real API data
  - The company filter should work with the real company IDs

- [ ] **Task 3.4**: Wire up document deletion
  - When delete button is clicked, make a DELETE request to `/api/documents/[id]`
  - The API is at: `apps/web/app/api/documents/[id]/route.ts`
  - After successful deletion, call `mutate()` to refresh the document list
  - The delete dialog is already implemented, just wire up the API call

### Phase 4: Data Integration - New Report Creation Page

**Context**: The new report page (`reports/new/[type]/page.tsx`) needs to fetch real achievements, companies, and projects.

**Existing APIs**:
- Achievements: `GET /api/achievements`
  - Location: `apps/web/app/api/achievements/route.ts`
  - Query params: `companyId`, `projectId`, `startDate`, `endDate`, `limit`, `page`
  - Returns: `{ achievements: Achievement[], pagination: {...} }`
  - Achievement structure (from `packages/database/src/queries.ts:537-646`):
    ```typescript
    {
      id: string;
      title: string;
      summary: string | null;
      details: string | null;
      impact: number | null; // 1-10
      projectId: string | null;
      companyId: string | null;
      eventStart: Date;
      eventEnd: Date;
      createdAt: Date;
      project: { id, name, description, ... } | null;
      company: { id, name, domain, ... } | null;
    }
    ```
- Projects: `GET /api/projects`
  - Location: `apps/web/app/api/projects/route.ts` (verify this exists)
  - Returns projects with company relationship
  - Project query function: `packages/database/src/projects/queries.ts`
- Companies: `GET /api/companies` (already covered above)

- [ ] **Task 4.1**: Fetch achievements with date filtering
  - Import `useSWR` from 'swr'
  - Build the query URL based on the report type:
    - For weekly: `startDate` = 7 days ago
    - For monthly: `startDate` = 30 days ago
    - For custom: `startDate` = undefined (all time)
  - Use `useSWR` with query params: `/api/achievements?startDate=${startDate}&limit=1000`
  - Replace mock achievements with real data
  - Update Achievement interface to match the real API response

- [ ] **Task 4.2**: Fetch projects for filtering
  - Use `useSWR<{ projects: Project[] }>('/api/projects')` to fetch all user's projects
  - Replace mock projects data with real API data
  - Projects come with company relationship already populated

- [ ] **Task 4.3**: Fetch companies for filtering
  - Use `useSWR<{ companies: Company[] }>('/api/companies')` to fetch companies
  - Replace mock companies data with real API data

- [ ] **Task 4.4**: Implement report generation API call
  - When "Generate Report" button is clicked, collect:
    - Selected achievement IDs
    - The prompt text
    - The report type
  - Make a POST request to `/api/documents` with:
    ```typescript
    {
      title: string, // Generate based on type, e.g., "Weekly Report - Jan 15-21"
      content: string, // For now, just combine achievement titles. AI generation comes later
      type: string, // 'weekly_report', 'monthly_report', or 'custom_report'
      companyId?: string // Optional, from filters if only one company selected
    }
    ```
  - The API is at: `apps/web/app/api/documents/route.ts`
  - On success, navigate back to `/reports` using `router.push('/reports')`
  - On error, show toast notification with error message

- [ ] **Task 4.5**: Generate document title and initial content
  - Create a helper function to generate appropriate title based on type:
    - Weekly: `Weekly Report - ${format(startDate, 'MMM dd')}-${format(endDate, 'dd, yyyy')}`
    - Monthly: `Monthly Report - ${format(month, 'MMMM yyyy')}`
    - Custom: `Custom Report - ${format(new Date(), 'MMM dd, yyyy')}`
  - For initial content (before AI generation is added):
    - Concatenate selected achievements' titles and summaries
    - Format as a bulleted list
    - This is a placeholder until AI generation is implemented in a future task

### Phase 5: Navigation Integration

- [ ] **Task 5.1**: Add "For my manager" to sidebar navigation
  - Open `apps/web/components/app-sidebar.tsx`
  - In the `staticData.navMain` array (around line 31-57), add a new entry:
    ```typescript
    {
      title: 'For my manager',
      url: '/reports',
      icon: IconUserCheck, // Import from '@tabler/icons-react'
    }
    ```
  - Import `IconUserCheck` at the top: `import { IconUserCheck } from '@tabler/icons-react';`
  - Place it after "Achievements" and before "Companies" in the nav order

- [ ] **Task 5.2**: Test navigation
  - Start the dev server: `pnpm dev:web`
  - Verify the "For my manager" link appears in the sidebar
  - Click it and verify it navigates to `/reports`
  - Verify the page renders without errors

### Phase 6: Polish and Error Handling

- [ ] **Task 6.1**: Add loading states
  - In reports/page.tsx: Show skeleton loading UI while documents are being fetched
  - In reports/new/[type]/page.tsx: Show loading UI while achievements/projects/companies are being fetched
  - Reference the loading pattern used in `apps/web/components/documents/document-list.tsx:49-51`

- [ ] **Task 6.2**: Add error states
  - In reports/page.tsx: If document fetch fails, show error message with retry button
  - In reports/new/[type]/page.tsx: If any data fetch fails, show error message with retry button
  - Reference the error pattern used in `apps/web/components/documents/document-list.tsx:38-46`

- [ ] **Task 6.3**: Add empty states
  - In reports/page.tsx: If no documents exist, show an empty state with a message like "No reports yet. Create your first report!"
  - In reports/new/[type]/page.tsx: If no achievements exist for the selected time period, show helpful message

- [ ] **Task 6.4**: Test all user flows
  - Test creating a weekly report
  - Test creating a monthly report
  - Test creating a custom report
  - Test filtering documents by type, company, and time period
  - Test deleting a document
  - Test achievement selection and filtering
  - Verify all date formatting displays correctly

### Phase 7: Authentication and Route Protection

- [ ] **Task 7.1**: Verify authentication
  - Both pages should check for authentication
  - Add at the top of both page components:
    ```typescript
    import { auth } from 'app/(auth)/auth';
    import { redirect } from 'next/navigation';

    // In the component:
    const session = await auth();
    if (!session?.user) {
      redirect('/login');
    }
    ```
  - If the pages are already client components, this won't work. In that case, verify the middleware at `apps/web/middleware.ts` is protecting the `/reports` route

- [ ] **Task 7.2**: Test authentication
  - Log out and verify you can't access `/reports` or `/reports/new/weekly`
  - Verify you're redirected to the login page
  - Log back in and verify you can access the pages

### Phase 8: Documentation

- [ ] **Task 8.1**: Update FEATURES.md
  - Open `docs/FEATURES.md`
  - Add a new section for "Reports / For My Manager" feature:
    ```markdown
    ## Reports (For My Manager)

    **Location**: `/reports`
    **Status**: ✅ Implemented

    ### Overview
    The Reports feature allows users to generate AI-assisted documents for their manager based on their tracked achievements. Reports can be Weekly, Monthly, or Custom.

    ### Key Features
    - View all manager-focused reports in a table format
    - Filter reports by type (weekly/monthly/custom), company, and time period
    - Create new reports from achievements within specific date ranges
    - Select which achievements to include in each report
    - Filter achievements by company and project
    - Delete reports with confirmation dialog

    ### User Flow
    1. User navigates to "For my manager" in the sidebar
    2. User sees a list of existing reports with filters
    3. User clicks "Weekly", "Monthly", or "Custom" to create a new report
    4. User reviews pre-filled prompt and selected achievements
    5. User can filter achievements and modify selection
    6. User clicks "Generate Report" to create the document
    7. User is redirected back to the reports list

    ### Technical Details
    - Uses existing Document schema with `type` field set to 'weekly_report', 'monthly_report', or 'custom_report'
    - Fetches achievements from `/api/achievements` with date range filtering
    - Creates documents via `/api/documents` POST endpoint
    - Client-side filtering for companies and projects
    - Future enhancement: AI-powered content generation from achievements
    ```

- [ ] **Task 8.2**: Create or update Reports UI documentation
  - Check if `docs/ui-components.md` or similar exists
  - If it exists, add a section describing the Reports UI components
  - If it doesn't exist, create `docs/reports-feature.md` with:
    - Screenshots or descriptions of the Reports list page
    - Screenshots or descriptions of the New Report page
    - Description of the filtering capabilities
    - Description of the achievement selection interface
    - Any important UX considerations

- [ ] **Task 8.3**: Update CLAUDE.md if needed
  - Open `CLAUDE.md`
  - Check if the reports pages need to be mentioned in the "Apps > @bragdoc/web > Directory Structure" section
  - If yes, add under `app/(app)/`: `reports/ # Manager-focused report generation`

- [ ] **Task 8.4**: Update TODO.md or project roadmap
  - Open `TODO.md` (if it exists)
  - Mark the "Import Reports pages" task as complete
  - Add follow-up tasks for future enhancements:
    - [ ] Implement AI-powered report content generation
    - [ ] Add document viewing and editing capabilities
    - [ ] Add document sharing functionality
    - [ ] Add export to PDF/Word functionality

## Notes for Future Implementation

### Not Included in This Plan

The following features are explicitly **not** included in this implementation plan and should be addressed in future work:

1. **Document Viewing**: The ability to view full document content
2. **Document Editing**: The ability to edit document title and content after creation
3. **AI Content Generation**: Currently, the document content is just a simple concatenation of achievements. True AI-powered content generation should be added later
4. **Document Sharing**: The share functionality (already exists in API but not exposed in UI)
5. **Export Functionality**: Export reports to PDF, Word, or other formats

### Technical Debt and Future Improvements

1. **Server Components**: Consider converting the pages to Server Components for better performance, if the interactivity can be moved to child Client Components
2. **Pagination**: The reports list may need pagination if users create many documents
3. **Search**: Add search functionality to filter documents by title or content
4. **Sorting**: Add ability to sort documents by different fields (date, title, type)
5. **Bulk Actions**: Add ability to delete multiple documents at once
6. **Templates**: Add ability to save custom prompts as templates
7. **Preview**: Add preview of generated report before saving

### API Enhancement Opportunities

1. **Document Query Optimization**: Consider adding a database query function like `getDocumentsByUserIdAndType(userId, type)` to filter documents server-side instead of client-side
2. **Achievement Aggregation**: Consider adding an API endpoint specifically for report generation that fetches and formats achievements in one call
3. **Report Generation**: Consider adding a dedicated `/api/reports/generate` endpoint that handles the AI generation logic

## Definition of Done

This implementation is considered complete when:

- [ ] All tasks above are checked off
- [ ] Both pages render without errors
- [ ] Navigation from sidebar works correctly
- [ ] Users can view existing reports with all filters working
- [ ] Users can create new weekly, monthly, and custom reports
- [ ] Achievement selection and filtering works correctly
- [ ] Document creation successfully saves to database
- [ ] Document deletion works with confirmation
- [ ] All loading and error states are handled gracefully
- [ ] Authentication is properly enforced
- [ ] Documentation is updated
- [ ] Code follows existing patterns and conventions in the codebase
- [ ] No console errors or warnings in development mode
- [ ] The UX matches the original v0-app design

## Questions and Issues

Track any questions or issues that arise during implementation here:

- [ ] Question: Should we add the reports link to NavDocuments section instead of NavMain?
  - Resolution: TBD

- [ ] Question: Do we need to create a new icon for the reports feature, or is IconUserCheck appropriate?
  - Resolution: TBD

- [ ] Issue: If discovered during implementation, document here

---

**Plan Created**: 2025-10-14
**Last Updated**: 2025-10-14
**Status**: Ready for implementation
