'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { IconBuilding, IconCalendar, IconGitBranch } from '@tabler/icons-react';
import { Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectWithCompany } from '@/database/projects/queries';

/**
 * ProjectItem - Displays a single project in clean, modern format
 *
 * Layout:
 * - Row 1: [Project Name Link] | spacer | [Edit] [Delete]
 * - Row 2: [Repository icon + URL] (if exists)
 * - Row 3: [Status Badge]
 * - Row 4: [Company icon + Name] (if exists)
 * - Row 5: [Calendar icon + Dates]
 *
 * @param project - The project to display (includes company information)
 * @param onEdit - Callback when edit button is clicked
 * @param onDelete - Callback when delete button is clicked
 * @param onView - Optional callback when view button is clicked
 */
interface ProjectItemProps {
  project: ProjectWithCompany;
  onEdit: (project: ProjectWithCompany) => void;
  onDelete: (id: string) => void;
  onView?: (project: ProjectWithCompany) => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  archived: { label: 'Archived', variant: 'outline' as const },
};

export function ProjectItem({
  project,
  onEdit,
  onDelete,
  onView,
}: ProjectItemProps) {
  const status = project.status;
  const statusInfo = statusConfig[status as keyof typeof statusConfig];
  const startDate = format(project.startDate, 'MMM yyyy');
  const endDate = project.endDate
    ? format(project.endDate, 'MMM yyyy')
    : 'Present';

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: Project Name | Edit/Delete Actions */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="text-lg font-medium hover:underline"
        >
          {project.name}
        </Link>
        <div className="shrink-0 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(project)}
            aria-label="Edit project"
            className="h-9 w-9 p-0"
          >
            <Edit2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(project.id)}
            aria-label="Delete project"
            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Row 2: Repository Link (if exists) */}
      {project.repoRemoteUrl && (
        <a
          href={project.repoRemoteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <IconGitBranch className="size-3" />
          <span>{project.repoRemoteUrl}</span>
        </a>
      )}

      {/* Row 3: Status Badge */}
      <div>
        <Badge variant={statusInfo.variant} className="font-normal text-xs">
          {statusInfo.label}
        </Badge>
      </div>

      {/* Row 4: Company (if exists) */}
      {project.company && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div
            className="flex size-5 items-center justify-center rounded"
            style={{
              backgroundColor: `${project.color}20`,
            }}
          >
            <IconBuilding className="size-3" style={{ color: project.color }} />
          </div>
          <span>{project.company.name}</span>
        </div>
      )}

      {/* Row 5: Dates */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <IconCalendar className="size-3" />
        <span>
          {startDate} - {endDate}
        </span>
      </div>
    </div>
  );
}
