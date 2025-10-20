# Task: Company Delete Confirmation Dialog with Cascade Options

## Background Reading

- Current company deletion: `/apps/web/components/companies/company-actions.tsx`
- API endpoint: `/apps/web/app/api/companies/[id]/route.ts`
- Database schema: `/packages/database/src/schema.ts` (lines 93-305)
- Current hook: `/apps/web/hooks/use-companies.ts`
- Similar pattern: AlertDialog already used in CompanyActions component

## Database Relationships

From the schema analysis, the following tables reference `company.id`:

1. **Projects** (`project.companyId`): `onDelete: 'set null'`
2. **Achievements** (`achievement.companyId`): `onDelete: 'set null'`
3. **Documents** (`document.companyId`): `onDelete: 'set null'`
4. **Standups** (`standup.companyId`): `onDelete: 'set null'`

Currently, all foreign key relationships use `onDelete: 'set null'`, meaning when a company is deleted, related records have their `companyId` set to null rather than being deleted.

## Specific Requirements

### Functional Requirements

1. **Dialog UI**:
   - Replace the current simple AlertDialog with a more sophisticated Dialog that includes checkboxes
   - Display clear heading: "Delete Company"
   - Show the company name being deleted
   - Include explanatory text about what will happen by default (companyId will be set to null on related records)
   - Include 4 independent checkboxes for cascade deletion options:
     - "Also delete associated Projects"
     - "Also delete associated Achievements"
     - "Also delete associated Documents"
     - "Also delete associated Standups"
   - Each checkbox should be optional and independent
   - Include cancel and confirm buttons
   - Confirm button should be styled as a destructive action (red)
   - Show loading state on confirm button while deletion is in progress

2. **Data Fetching**:
   - Before showing the dialog, fetch counts of related data to display to the user
   - Show counts in the checkbox labels (e.g., "Also delete 3 associated Projects")
   - If count is 0, disable that checkbox or show "(0)" to indicate no data

3. **API Changes**:
   - Modify DELETE `/api/companies/[id]` to accept query parameters:
     - `deleteProjects=true|false`
     - `deleteAchievements=true|false`
     - `deleteDocuments=true|false`
     - `deleteStandups=true|false`
   - Default behavior (all false): existing behavior - set companyId to null
   - When true: delete the related records within a transaction
   - Use database transactions to ensure atomicity

4. **Error Handling**:
   - If any part of the cascade delete fails, roll back the entire operation
   - Show clear error messages to the user
   - Don't delete the company if cascade deletions fail

5. **User Feedback**:
   - Show success toast with summary of what was deleted
   - Example: "Company deleted successfully. Also deleted: 3 projects, 15 achievements, 2 documents, 1 standup"

### Technical Requirements

#### Files to Modify

1. `/apps/web/components/companies/company-actions.tsx`:
   - Replace AlertDialog with Dialog
   - Add state for checkbox selections
   - Add API call to fetch counts before showing dialog
   - Pass cascade delete options to delete handler

2. `/apps/web/hooks/use-companies.ts`:
   - Update `useDeleteCompany` to accept optional cascade parameters
   - Build query string with parameters
   - Update success toast to show what was deleted

3. `/apps/web/app/api/companies/[id]/route.ts`:
   - Update DELETE handler to read query parameters
   - Implement cascade delete logic within transaction
   - Return summary of what was deleted

4. `/packages/database/src/queries.ts`:
   - Create new function `deleteCompanyWithCascade` that accepts cascade options
   - Implement transaction-based deletion
   - Return counts of deleted records

#### New Components

- Consider extracting the checkbox selection UI into a reusable component if it becomes complex

#### shadcn/ui Components to Use

- `Dialog` (instead of AlertDialog) - for more flexibility
- `Checkbox` - for cascade options
- `Label` - for checkbox labels
- `Button` - for cancel/confirm actions

#### TypeScript Types

```typescript
interface CascadeDeleteOptions {
  deleteProjects: boolean;
  deleteAchievements: boolean;
  deleteDocuments: boolean;
  deleteStandups: boolean;
}

interface RelatedDataCounts {
  projects: number;
  achievements: number;
  documents: number;
  standups: number;
}

interface DeleteResult {
  company: Company;
  deletedCounts: {
    projects: number;
    achievements: number;
    documents: number;
    standups: number;
  };
}
```

### UI/UX Requirements

1. **Dialog Design**:
   - Modal dialog that blocks interaction with the rest of the page
   - Clear visual hierarchy with company name prominent
   - Checkboxes should be easy to read and select
   - Disabled checkboxes should have visual indication
   - Loading state should prevent multiple submissions

2. **Responsive Design**:
   - Dialog should work on mobile and desktop
   - Use standard shadcn/ui Dialog responsive behavior

3. **Visual Feedback**:
   - Loading spinner or text on confirm button
   - Disabled state for all controls during deletion
   - Success toast with detailed information

4. **Information Hierarchy**:
   ```
   Delete Company
   [Company Name]

   Warning text explaining default behavior

   Optional cascade deletions:
   ☐ Also delete X associated Projects
   ☐ Also delete X associated Achievements
   ☐ Also delete X associated Documents
   ☐ Also delete X associated Standups

   [Cancel] [Delete Company]
   ```

### Testing Requirements

1. **Manual Testing Scenarios**:
   - Delete company with no related data
   - Delete company with related data but no cascade options selected
   - Delete company with one cascade option selected
   - Delete company with all cascade options selected
   - Cancel deletion
   - Test with disabled checkboxes (0 count)

2. **Error Scenarios**:
   - API failure during deletion
   - Transaction rollback scenarios
   - Network errors

### Success Criteria

1. Dialog successfully displays with checkboxes
2. Counts are fetched and displayed accurately
3. API correctly handles cascade delete parameters
4. Database transaction ensures atomicity
5. Success toast accurately reflects what was deleted
6. Error handling works correctly and provides clear feedback
7. UI remains responsive and prevents double-submission
8. Code follows BragDoc patterns (TypeScript types, error handling, transactions)

## Implementation Notes

- The current schema uses `onDelete: 'set null'` which is safe behavior
- The cascade delete is an opt-in enhancement
- Must use database transactions to ensure data integrity
- Should validate userId on all delete operations for security
- Follow existing patterns in the codebase for similar operations
