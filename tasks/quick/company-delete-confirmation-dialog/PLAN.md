# Implementation Plan: Company Delete Confirmation Dialog with Cascade Options

## Summary

This plan implements an enhanced company deletion flow that allows users to optionally cascade delete related data (projects, achievements, documents, and standups). The current implementation only sets `companyId` to null on related records when a company is deleted. This enhancement adds a confirmation dialog with checkboxes for each type of related data, allowing users to choose whether to delete those records along with the company.

## High-Level Overview

The implementation follows a bottom-up approach:
1. **Database Layer**: Add query functions to count related data and perform cascade deletions within transactions
2. **API Layer**: Update the DELETE endpoint to accept cascade parameters and return deletion summaries
3. **Frontend Layer**: Replace the simple AlertDialog with a Dialog containing checkboxes for cascade options
4. **Testing**: Verify all scenarios work correctly

## Implementation Phases

- [Phase 1: Database Layer Changes](#phase-1-database-layer-changes)
- [Phase 2: API Endpoint Updates](#phase-2-api-endpoint-updates)
- [Phase 3: Frontend Component Updates](#phase-3-frontend-component-updates)
- [Phase 4: Testing and Verification](#phase-4-testing-and-verification)
- [Phase 5: Documentation](#phase-5-documentation)

---

## Phase 1: Database Layer Changes

### Context
The database layer is located at `/packages/database/src/queries.ts`. We need to add functions to:
1. Count related data for a company
2. Delete a company with optional cascade deletion

**Current Schema Relationships** (from `/packages/database/src/schema.ts`):
- `project.companyId` → `company.id` (onDelete: 'set null')
- `achievement.companyId` → `company.id` (onDelete: 'set null')
- `document.companyId` → `company.id` (onDelete: 'set null')
- `standup.companyId` → `company.id` (onDelete: 'set null')

**Existing deleteCompany function** (lines 764-783 in queries.ts):
```typescript
export async function deleteCompany({
  id,
  userId,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  db?: any;
}): Promise<Company> {
  try {
    const [deleted] = await db
      .delete(company)
      .where(and(eq(company.id, id), eq(company.userId, userId)))
      .returning();
    return deleted;
  } catch (error) {
    console.error('Error in deleteCompany:', error);
    throw error;
  }
}
```

### Tasks

- [x] **1.1**: Add TypeScript interfaces for cascade operations at the top of `/packages/database/src/queries.ts` (after existing imports):

```typescript
// Company cascade delete types
export interface RelatedDataCounts {
  projects: number;
  achievements: number;
  documents: number;
  standups: number;
}

export interface CascadeDeleteOptions {
  deleteProjects: boolean;
  deleteAchievements: boolean;
  deleteDocuments: boolean;
  deleteStandups: boolean;
}

export interface DeleteCompanyResult {
  company: Company;
  deletedCounts: {
    projects: number;
    achievements: number;
    documents: number;
    standups: number;
  };
}
```

- [x] **1.2**: Add function to count related data. Place this after the existing `deleteCompany` function (around line 783):

```typescript
export async function getCompanyRelatedDataCounts({
  companyId,
  userId,
  db = defaultDb,
}: {
  companyId: string;
  userId: string;
  db?: any;
}): Promise<RelatedDataCounts> {
  try {
    // Verify company belongs to user
    const companyData = await getCompanyById({ id: companyId, userId, db });
    if (!companyData) {
      throw new Error('Company not found');
    }

    // Count projects
    const [projectCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(project)
      .where(and(eq(project.companyId, companyId), eq(project.userId, userId)));

    // Count achievements
    const [achievementCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(achievement)
      .where(and(eq(achievement.companyId, companyId), eq(achievement.userId, userId)));

    // Count documents
    const [documentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(document)
      .where(and(eq(document.companyId, companyId), eq(document.userId, userId)));

    // Count standups (need to import standup from schema)
    const [standupCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(standup)
      .where(and(eq(standup.companyId, companyId), eq(standup.userId, userId)));

    return {
      projects: Number(projectCount?.count ?? 0),
      achievements: Number(achievementCount?.count ?? 0),
      documents: Number(documentCount?.count ?? 0),
      standups: Number(standupCount?.count ?? 0),
    };
  } catch (error) {
    console.error('Error in getCompanyRelatedDataCounts:', error);
    throw error;
  }
}
```

- [x] **1.3**: Import `standup` and `standupDocument` from schema at the top of the file. Update the import statement around line 18-31 to include:

```typescript
import {
  user,
  chat,
  type User,
  document,
  type Message,
  message,
  userMessage,
  achievement,
  type UserMessage as UserMessageType,
  type Achievement,
  company,
  project,
  standup,          // ADD THIS
  standupDocument,  // ADD THIS
} from './schema';
```

- [x] **1.4**: Add the cascade delete function. Place this after `getCompanyRelatedDataCounts`:

```typescript
export async function deleteCompanyWithCascade({
  id,
  userId,
  cascadeOptions,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  cascadeOptions: CascadeDeleteOptions;
  db?: any;
}): Promise<DeleteCompanyResult> {
  try {
    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx: any) => {
      // Verify company exists and belongs to user
      const companyData = await getCompanyById({ id, userId, db: tx });
      if (!companyData) {
        throw new Error('Company not found');
      }

      const deletedCounts = {
        projects: 0,
        achievements: 0,
        documents: 0,
        standups: 0,
      };

      // Delete projects if requested
      if (cascadeOptions.deleteProjects) {
        const deletedProjects = await tx
          .delete(project)
          .where(and(eq(project.companyId, id), eq(project.userId, userId)))
          .returning();
        deletedCounts.projects = deletedProjects.length;
      }

      // Delete achievements if requested
      if (cascadeOptions.deleteAchievements) {
        const deletedAchievements = await tx
          .delete(achievement)
          .where(and(eq(achievement.companyId, id), eq(achievement.userId, userId)))
          .returning();
        deletedCounts.achievements = deletedAchievements.length;
      }

      // Delete documents if requested
      if (cascadeOptions.deleteDocuments) {
        const deletedDocuments = await tx
          .delete(document)
          .where(and(eq(document.companyId, id), eq(document.userId, userId)))
          .returning();
        deletedCounts.documents = deletedDocuments.length;
      }

      // Delete standups if requested
      // Note: Need to delete standup documents first due to foreign key
      if (cascadeOptions.deleteStandups) {
        // Get standup IDs first
        const standups = await tx
          .select({ id: standup.id })
          .from(standup)
          .where(and(eq(standup.companyId, id), eq(standup.userId, userId)));

        const standupIds = standups.map((s: any) => s.id);

        // Delete standup documents first
        if (standupIds.length > 0) {
          await tx
            .delete(standupDocument)
            .where(inArray(standupDocument.standupId, standupIds));
        }

        // Now delete the standups
        const deletedStandups = await tx
          .delete(standup)
          .where(and(eq(standup.companyId, id), eq(standup.userId, userId)))
          .returning();
        deletedCounts.standups = deletedStandups.length;
      }

      // Finally, delete the company
      const [deletedCompany] = await tx
        .delete(company)
        .where(and(eq(company.id, id), eq(company.userId, userId)))
        .returning();

      if (!deletedCompany) {
        throw new Error('Failed to delete company');
      }

      return {
        company: deletedCompany,
        deletedCounts,
      };
    });

    return result;
  } catch (error) {
    console.error('Error in deleteCompanyWithCascade:', error);
    throw error;
  }
}
```

- [x] **1.5**: Export the new types and functions. Verify they're exported from `/packages/database/src/index.ts`. If not already exported, add them to the exports.

---

## Phase 2: API Endpoint Updates

### Context
The API endpoint is at `/apps/web/app/api/companies/[id]/route.ts`. The current DELETE handler (lines 92-121) simply calls `deleteCompany` and returns 204 on success.

### Tasks

- [ ] **2.1**: Add a new GET endpoint to fetch related data counts. Add this before the existing GET handler:

```typescript
// GET /api/companies/[id]/related-counts
// This is a separate route pattern - you'll need to create a new file
// at /apps/web/app/api/companies/[id]/related-counts/route.ts
```

Actually, let me revise this. It's better to include the counts in a query parameter on the existing endpoint.

- [x] **2.1**: Create a new API route file at `/apps/web/app/api/companies/[id]/related-counts/route.ts` with the following content:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { getCompanyRelatedDataCounts } from '@/database/queries';
import { db } from '@/database/index';

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const counts = await getCompanyRelatedDataCounts({
      companyId: id,
      userId: auth.user.id,
      db,
    });

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching company related counts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
```

- [x] **2.2**: Update the DELETE handler in `/apps/web/app/api/companies/[id]/route.ts`. Replace the existing DELETE function (lines 92-121) with:

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse cascade options from query parameters
    const searchParams = request.nextUrl.searchParams;
    const cascadeOptions = {
      deleteProjects: searchParams.get('deleteProjects') === 'true',
      deleteAchievements: searchParams.get('deleteAchievements') === 'true',
      deleteDocuments: searchParams.get('deleteDocuments') === 'true',
      deleteStandups: searchParams.get('deleteStandups') === 'true',
    };

    // Check if any cascade options are true
    const hasCascadeOptions = Object.values(cascadeOptions).some(Boolean);

    if (hasCascadeOptions) {
      // Use cascade delete
      const result = await deleteCompanyWithCascade({
        id,
        userId: auth.user.id,
        cascadeOptions,
        db,
      });

      // Return success with deletion summary
      return NextResponse.json({
        success: true,
        deletedCounts: result.deletedCounts,
      });
    } else {
      // Use simple delete (existing behavior)
      const company = await deleteCompany({
        id,
        userId: auth.user.id,
        db,
      });

      if (!company) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(null, { status: 204 });
    }
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
```

- [x] **2.3**: Add the import for `deleteCompanyWithCascade` at the top of the file. Update the imports around line 3-7 to include:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getCompanyById,
  updateCompany,
  deleteCompany,
  deleteCompanyWithCascade,  // ADD THIS
} from '@/database/queries';
import { z } from 'zod/v3';
import { db } from '@/database/index';
```

---

## Phase 3: Frontend Component Updates

### Context
The main files to update:
- `/apps/web/components/companies/company-actions.tsx` - Contains the delete button and dialog
- `/apps/web/hooks/use-companies.ts` - Contains the `useDeleteCompany` hook

**Existing Components Available**:
- Dialog components from `/apps/web/components/ui/dialog.tsx` (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger)
- Checkbox from `/apps/web/components/ui/checkbox.tsx`
- Label from `/apps/web/components/ui/label.tsx` (should exist)
- Button from `/apps/web/components/ui/button.tsx` (already imported)

### Tasks

- [x] **3.1**: Update the `useDeleteCompany` hook in `/apps/web/hooks/use-companies.ts`. Replace the existing function (lines 119-142) with:

```typescript
export function useDeleteCompany() {
  const { mutate: mutateList } = useCompanies();

  const deleteCompany = async (
    id: string,
    cascadeOptions?: {
      deleteProjects: boolean;
      deleteAchievements: boolean;
      deleteDocuments: boolean;
      deleteStandups: boolean;
    },
  ) => {
    try {
      // Build query string if cascade options provided
      const queryParams = new URLSearchParams();
      if (cascadeOptions) {
        if (cascadeOptions.deleteProjects)
          queryParams.append('deleteProjects', 'true');
        if (cascadeOptions.deleteAchievements)
          queryParams.append('deleteAchievements', 'true');
        if (cascadeOptions.deleteDocuments)
          queryParams.append('deleteDocuments', 'true');
        if (cascadeOptions.deleteStandups)
          queryParams.append('deleteStandups', 'true');
      }

      const queryString = queryParams.toString();
      const url = `/api/companies/${id}${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete company');
      }

      // Check if we have a JSON response (cascade delete) or empty response
      const contentType = res.headers.get('content-type');
      let deletedCounts = null;
      if (contentType?.includes('application/json')) {
        const data = await res.json();
        deletedCounts = data.deletedCounts;
      }

      await mutateList();

      // Show detailed toast if cascade delete occurred
      if (deletedCounts) {
        const deletedItems = [];
        if (deletedCounts.projects > 0)
          deletedItems.push(`${deletedCounts.projects} project${deletedCounts.projects > 1 ? 's' : ''}`);
        if (deletedCounts.achievements > 0)
          deletedItems.push(`${deletedCounts.achievements} achievement${deletedCounts.achievements > 1 ? 's' : ''}`);
        if (deletedCounts.documents > 0)
          deletedItems.push(`${deletedCounts.documents} document${deletedCounts.documents > 1 ? 's' : ''}`);
        if (deletedCounts.standups > 0)
          deletedItems.push(`${deletedCounts.standups} standup${deletedCounts.standups > 1 ? 's' : ''}`);

        if (deletedItems.length > 0) {
          toast.success(
            `Company deleted successfully. Also deleted: ${deletedItems.join(', ')}`,
          );
        } else {
          toast.success('Company deleted successfully');
        }
      } else {
        toast.success('Company deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
      throw error;
    }
  };

  return deleteCompany;
}
```

- [x] **3.2**: Add a hook to fetch related counts. Add this new hook after `useDeleteCompany` in `/apps/web/hooks/use-companies.ts`:

```typescript
export function useCompanyRelatedCounts(id: string | null) {
  const { data, error, mutate } = useSWR<{
    projects: number;
    achievements: number;
    documents: number;
    standups: number;
  }>(id ? `/api/companies/${id}/related-counts` : null, async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch counts');
    }
    return res.json();
  });

  return {
    counts: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

- [x] **3.3**: Completely rewrite `/apps/web/components/companies/company-actions.tsx` to use Dialog instead of AlertDialog. Replace the entire file content with:

```typescript
'use client';

import { Button } from 'components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'components/ui/dialog';
import { Checkbox } from 'components/ui/checkbox';
import { Label } from 'components/ui/label';
import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { useState, useEffect } from 'react';
import { useCompanyRelatedCounts } from 'hooks/use-companies';

interface CompanyActionsProps {
  companyId: string;
  companyName: string;
  onEdit: () => void;
  onDelete: (cascadeOptions: {
    deleteProjects: boolean;
    deleteAchievements: boolean;
    deleteDocuments: boolean;
    deleteStandups: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function CompanyActions({
  companyId,
  companyName,
  onEdit,
  onDelete,
  isLoading = false,
}: CompanyActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteProjects, setDeleteProjects] = useState(false);
  const [deleteAchievements, setDeleteAchievements] = useState(false);
  const [deleteDocuments, setDeleteDocuments] = useState(false);
  const [deleteStandups, setDeleteStandups] = useState(false);

  // Fetch counts when dialog opens
  const { counts, isLoading: countsLoading } = useCompanyRelatedCounts(
    isOpen ? companyId : null,
  );

  // Reset checkboxes when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteProjects(false);
      setDeleteAchievements(false);
      setDeleteDocuments(false);
      setDeleteStandups(false);
    }
  }, [isOpen]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete({
        deleteProjects,
        deleteAchievements,
        deleteDocuments,
        deleteStandups,
      });
      setIsOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        disabled={isLoading || isDeleting}
      >
        <Pencil1Icon className="size-4" />
        <span className="sr-only">Edit</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading || isDeleting}
            className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
          >
            <TrashIcon className="size-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{companyName}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              By default, related projects, achievements, documents, and standups
              will be preserved (their company association will be removed).
              Optionally, you can choose to delete related data:
            </p>

            {countsLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading related data...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-projects"
                    checked={deleteProjects}
                    onCheckedChange={(checked) =>
                      setDeleteProjects(checked === true)
                    }
                    disabled={!counts || counts.projects === 0}
                  />
                  <Label
                    htmlFor="delete-projects"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.projects ?? 0} associated project
                    {counts?.projects !== 1 ? 's' : ''}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-achievements"
                    checked={deleteAchievements}
                    onCheckedChange={(checked) =>
                      setDeleteAchievements(checked === true)
                    }
                    disabled={!counts || counts.achievements === 0}
                  />
                  <Label
                    htmlFor="delete-achievements"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.achievements ?? 0} associated achievement
                    {counts?.achievements !== 1 ? 's' : ''}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-documents"
                    checked={deleteDocuments}
                    onCheckedChange={(checked) =>
                      setDeleteDocuments(checked === true)
                    }
                    disabled={!counts || counts.documents === 0}
                  />
                  <Label
                    htmlFor="delete-documents"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.documents ?? 0} associated document
                    {counts?.documents !== 1 ? 's' : ''}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-standups"
                    checked={deleteStandups}
                    onCheckedChange={(checked) =>
                      setDeleteStandups(checked === true)
                    }
                    disabled={!counts || counts.standups === 0}
                  />
                  <Label
                    htmlFor="delete-standups"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Also delete {counts?.standups ?? 0} associated standup
                    {counts?.standups !== 1 ? 's' : ''}
                  </Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting || countsLoading}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
            >
              {isDeleting ? 'Deleting...' : 'Delete Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [x] **3.4**: Check if Label component exists. Run:
```bash
ls /Users/ed/Code/brag-ai/apps/web/components/ui/label.tsx
```
If it doesn't exist, create it using shadcn/ui CLI or copy from a similar project.

- [x] **3.5**: Update usages of CompanyActions component to pass the new required props. Search for usages:
```bash
grep -r "CompanyActions" apps/web --include="*.tsx" --include="*.ts"
```
Update each usage to include `companyId` and `companyName` props. The component likely appears in `/apps/web/components/companies/company-list.tsx` or similar.

For example, if the current usage is:
```typescript
<CompanyActions
  onEdit={() => handleEdit(company)}
  onDelete={() => handleDelete(company.id)}
/>
```

Update it to:
```typescript
<CompanyActions
  companyId={company.id}
  companyName={company.name}
  onEdit={() => handleEdit(company)}
  onDelete={(cascadeOptions) => handleDelete(company.id, cascadeOptions)}
/>
```

- [x] **3.6**: Find where `handleDelete` is defined (likely in the same file as CompanyActions usage) and update it to pass cascade options to the hook. For example:

```typescript
const deleteCompany = useDeleteCompany();

const handleDelete = async (
  id: string,
  cascadeOptions: {
    deleteProjects: boolean;
    deleteAchievements: boolean;
    deleteDocuments: boolean;
    deleteStandups: boolean;
  },
) => {
  await deleteCompany(id, cascadeOptions);
};
```

---

## Phase 4: Testing and Verification

### Tasks

Note: Automated tests passed successfully. Manual testing should be performed by the user.

- [ ] **4.1**: Test basic deletion without cascade options:
  - Navigate to companies page
  - Click delete on a company with no related data
  - Verify company is deleted
  - Verify success toast appears

- [ ] **4.2**: Test deletion with related data (no cascade):
  - Create a company with projects, achievements, etc.
  - Delete the company without checking any cascade options
  - Verify company is deleted
  - Verify related data still exists but with `companyId` set to null

- [ ] **4.3**: Test cascade deletion:
  - Create a company with related data
  - Open delete dialog and verify counts are displayed correctly
  - Check one or more cascade options
  - Delete the company
  - Verify both company and selected related data are deleted
  - Verify success toast shows correct deletion summary

- [ ] **4.4**: Test error handling:
  - Test with network error (disconnect network, try to delete)
  - Verify error toast appears
  - Verify dialog remains open on error

- [ ] **4.5**: Test disabled checkboxes:
  - Create a company with no related data
  - Open delete dialog
  - Verify all checkboxes show "(0)" and are disabled
  - Verify deletion still works

- [ ] **4.6**: Test dialog cancel:
  - Open delete dialog
  - Check some cascade options
  - Click cancel
  - Reopen dialog
  - Verify checkboxes are reset to unchecked

---

## Phase 5: Documentation

### Tasks

- [ ] **5.1**: Update `/docs/FEATURES.md` (if it exists) to document the enhanced company deletion feature:
  - Add a section under company management describing cascade deletion
  - Explain what data can be cascade deleted
  - Explain default behavior vs cascade behavior

- [ ] **5.2**: Check if there's a companies documentation file in `/docs/`. If not, create `/docs/companies.md`:

```markdown
# Companies Feature

## Overview
Companies represent organizations where the user has worked or is currently working. Each company can be associated with projects, achievements, documents, and standups.

## Company Deletion

### Default Behavior
When a company is deleted, the default behavior is to preserve all related data by removing the company association (setting `companyId` to null). This ensures no data loss.

### Cascade Deletion
Users can optionally choose to delete related data when deleting a company:
- Projects associated with this company
- Achievements associated with this company
- Documents associated with this company
- Standups associated with this company

The deletion dialog shows counts of each type of related data and allows independent selection of what to delete.

### Implementation Details
- Cascade deletion uses database transactions to ensure atomicity
- If any part of the cascade deletion fails, the entire operation is rolled back
- The API endpoint accepts query parameters: `deleteProjects`, `deleteAchievements`, `deleteDocuments`, `deleteStandups`
- The frontend displays a confirmation dialog with checkboxes for each cascade option
```

- [ ] **5.3**: Check if README.md or cli/README.md need updates. In this case, the changes are internal to the web app, so CLI documentation likely doesn't need updates. README.md might need a brief mention if it documents features.

---

## CLAUDE.md Updates

- [ ] **6.1**: Review `/CLAUDE.md` to determine if any sections need updates. Specifically check:
  - Database query patterns section - may need to mention cascade delete pattern
  - API conventions section - may need to mention query parameter patterns for complex operations
  - Component patterns section - may need to mention the Dialog usage pattern

- [ ] **6.2**: If cascade delete becomes a common pattern (e.g., used for projects, achievements, etc.), add a section to CLAUDE.md under "Database Layer" explaining the pattern:

```markdown
#### Cascade Delete Pattern

For entities that have multiple foreign key relationships, implement optional cascade deletion:

1. Create a counts function to fetch related data counts
2. Create a cascade delete function that uses transactions
3. Accept cascade options as boolean flags
4. Return deletion summary including counts

Example:
\`\`\`typescript
export interface CascadeDeleteOptions {
  deleteRelatedA: boolean;
  deleteRelatedB: boolean;
}

export async function deleteEntityWithCascade({
  id,
  userId,
  cascadeOptions,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  cascadeOptions: CascadeDeleteOptions;
  db?: any;
}): Promise<DeleteResult> {
  return await db.transaction(async (tx) => {
    // Delete related entities if requested
    // Then delete main entity
    // Return summary
  });
}
\`\`\`
```

However, only add this if it makes sense as a reusable pattern. For now, this might be company-specific.

---

## Instructions for Implementation

1. **Follow the phases in order**: The implementation is structured bottom-up (database → API → frontend) to ensure each layer is complete before the next depends on it.

2. **Mark completed tasks**: As you complete each checkbox task, mark it with an `[x]` in the PLAN.md file.

3. **Test incrementally**: After each phase, do basic verification that the changes work before moving to the next phase. Use manual testing or write simple tests.

4. **Type safety**: Ensure all TypeScript types are properly defined and used. Run `pnpm typecheck` or your IDE's type checking after each phase.

5. **Database transactions**: Pay special attention to the transaction logic in Phase 1, Task 1.4. Transactions must complete fully or roll back entirely.

6. **Error handling**: Follow existing error handling patterns in the codebase. Log errors with context and throw with meaningful messages.

7. **Imports**: When adding new imports, verify they exist and are exported properly. Run the dev server to catch import errors early.

8. **Code style**: Follow the existing code style in each file. Use the same indentation, naming conventions, and patterns you see in the surrounding code.

9. **UI testing**: For Phase 3, test the dialog UI thoroughly in both light and dark mode, and on mobile and desktop viewports.

10. **Keep CLAUDE.md updated**: As you understand more about the codebase patterns, update CLAUDE.md if you discover conventions that should be documented.

## Reference Documentation

- **BragDoc Conventions**: Read `/CLAUDE.md` for full understanding of project structure, patterns, and conventions
- **Database Patterns**: See "Database Layer" section in CLAUDE.md
- **API Conventions**: See "API Conventions" section in CLAUDE.md
- **Component Patterns**: See "Component Patterns" section in CLAUDE.md
- **Shadcn/ui Docs**: Reference shadcn/ui documentation for Dialog and Checkbox components if needed
- **Drizzle ORM**: Reference Drizzle documentation for transaction patterns
