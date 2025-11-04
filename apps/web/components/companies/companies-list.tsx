'use client';

import * as React from 'react';
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { CompanyItem } from './company-item';
import { Button } from '@/components/ui/button';
import type { Company } from '@/database/schema';

/**
 * CompaniesList - Mobile-friendly list view for companies with pagination
 *
 * Uses TanStack React Table for filtering and pagination, matching the
 * CompaniesTable functionality but with a card-based mobile layout.
 *
 * @param companies - Array of companies to display
 * @param onEdit - Callback when edit button is clicked
 * @param onDelete - Callback when delete button is clicked with cascade options
 * @param globalFilter - Global search filter string
 * @param isLoading - Whether companies are loading
 */
interface CompaniesListProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (
    id: string,
    cascadeOptions: {
      deleteProjects: boolean;
      deleteAchievements: boolean;
      deleteDocuments: boolean;
      deleteStandups: boolean;
    },
  ) => Promise<void>;
  globalFilter?: string;
  isLoading?: boolean;
}

export function CompaniesList({
  companies,
  onEdit,
  onDelete,
  globalFilter = '',
  isLoading = false,
}: CompaniesListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [internalGlobalFilter, setInternalGlobalFilter] =
    React.useState(globalFilter);

  // Sync external globalFilter with internal state
  React.useEffect(() => {
    setInternalGlobalFilter(globalFilter);
  }, [globalFilter]);

  // Simple column definition for table instance
  // We only need this for TanStack React Table's filtering/pagination logic
  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: 'name',
      header: 'Company',
    },
  ];

  const table = useReactTable({
    data: companies,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: internalGlobalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setInternalGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  if (isLoading) {
    // Show loading skeleton
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-lg p-4 space-y-3 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty State */}
      {rows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No companies found.</p>
        </div>
      ) : (
        <>
          {/* Company Items List */}
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.original.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <CompanyItem
                  company={row.original}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>

          {/* Pagination Info and Controls */}
          <div className="flex flex-col gap-4 items-start sm:items-center sm:justify-between sm:flex-row">
            <div className="text-muted-foreground text-sm">
              Showing {rows.length} of {companies.length} companies
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
