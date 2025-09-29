'use client';

import * as React from 'react';
import {
  IconFolderCode,
  IconCalendar,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconGitBranch,
  IconBuilding,
} from '@tabler/icons-react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectWithCompany } from '@/database/projects/queries';

interface ProjectsTableProps {
  data: ProjectWithCompany[];
  onEdit: (project: ProjectWithCompany) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  archived: { label: 'Archived', variant: 'outline' as const },
};

export function ProjectsTable({
  data,
  onEdit,
  onDelete,
  isLoading = false,
}: ProjectsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns: ColumnDef<ProjectWithCompany>[] = [
    {
      accessorKey: 'name',
      header: 'Project',
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <IconFolderCode className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{project.name}</div>
              {project.description && (
                <div className="text-muted-foreground text-sm truncate">
                  {project.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Badge variant={config.variant} className="font-normal">
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'companyId',
      header: 'Company',
      cell: ({ row }) => {
        const project = row.original;
        return project.companyId ? (
          <div className="flex items-center gap-2">
            <IconBuilding className="size-4 text-muted-foreground" />
            <span className="text-sm">{project.companyId}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Personal</span>
        );
      },
    },
    {
      accessorKey: 'startDate',
      header: 'Duration',
      cell: ({ row }) => {
        const project = row.original;
        const startDate = format(project.startDate, 'MMM yyyy');
        const endDate = project.endDate
          ? format(project.endDate, 'MMM yyyy')
          : 'Present';
        const isActive = project.status === 'active';

        return (
          <div className="flex items-center gap-2">
            <IconCalendar className="size-4 text-muted-foreground" />
            <span className="text-sm">
              {startDate} - {endDate}
            </span>
            {isActive && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'repoRemoteUrl',
      header: 'Repository',
      cell: ({ row }) => {
        const project = row.original;
        return project.repoRemoteUrl ? (
          <a
            href={project.repoRemoteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <IconGitBranch className="size-4" />
            <span className="text-sm">View Code</span>
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">No repository</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const project = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground size-8"
                size="icon"
              >
                <IconDotsVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <IconEdit className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(project.id)}
              >
                <IconTrash className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search projects..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No projects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {table.getRowModel().rows.length} of {data.length} projects
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
    </div>
  );
}
