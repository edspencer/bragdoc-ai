'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import { Button } from 'components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { ProjectDialog } from './project-dialog';
import { ProjectListSkeleton } from './project-list-skeleton';
import { useState } from 'react';
import type { ProjectFormData } from './project-form';
import { motion } from 'framer-motion';
import { Badge } from 'components/ui/badge';
import type { ProjectStatus } from '@/database/schema';
import { ProjectActions } from './project-actions';
import type { ProjectWithCompany } from '@/database/projects/queries';
import { CRUDHeader } from '../shared/page-header';

interface ProjectListProps {
  projects: ProjectWithCompany[];
  onCreateProject: (data: ProjectFormData) => Promise<boolean>;
  onUpdateProject: (id: string, data: ProjectFormData) => Promise<boolean>;
  onDeleteProject: (id: string) => Promise<boolean>;
  isLoading?: boolean;
  companies: Array<{ id: string; name: string }>;
}

const statusColors: Record<ProjectStatus, string> = {
  active: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
  completed: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
  archived: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20',
};

export function ProjectList({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  isLoading = false,
  companies = [],
}: ProjectListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectWithCompany | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      const success = await onCreateProject(data);
      if (success) {
        setCreateDialogOpen(false);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateProject = async (id: string, data: ProjectFormData) => {
    setActionLoading(`update-${id}`);
    try {
      const success = await onUpdateProject(id, data);
      if (success) {
        setEditProject(null);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProject = async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      return await onDeleteProject(id);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <CRUDHeader
        title="Projects"
        description="Manage your projects and track achievements"
      >
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Add Project
        </Button>
      </CRUDHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Start Date</TableHead>
              <TableHead className="hidden sm:table-cell">End Date</TableHead>
              <TableHead className="sm:w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No projects found. Create your first project to get started.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group"
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.company?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[project.status as ProjectStatus]}
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="sm:table-cell hidden">
                    {format(new Date(project.startDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="sm:table-cell hidden">
                    {project.endDate
                      ? format(new Date(project.endDate), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <ProjectActions
                      project={project}
                      onEdit={() => setEditProject(project)}
                      onDelete={() => handleDeleteProject(project.id)}
                      isLoading={actionLoading === `delete-${project.id}`}
                    />
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateProject}
        isLoading={actionLoading === 'create'}
        companies={companies}
      />

      {editProject && (
        <ProjectDialog
          open={!!editProject}
          onOpenChange={(open) => !open && setEditProject(null)}
          onSubmit={(data) => handleUpdateProject(editProject.id, data)}
          defaultValues={editProject}
          isLoading={actionLoading === `update-${editProject.id}`}
          companies={companies}
        />
      )}
    </div>
  );
}
