'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { AppContent } from '@/components/shared/app-content';
import { ProjectDetailsContent } from '@/components/project-details-content';
import { ProjectActions } from './project-actions';
import { useDeleteProject } from '@/hooks/useProjects';
import type { ProjectWithCompany } from '@/database/projects/queries';

interface ProjectDetailsWrapperProps {
  project: ProjectWithCompany;
}

export function ProjectDetailsWrapper({ project }: ProjectDetailsWrapperProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();
  const deleteProject = useDeleteProject();

  const handleEditProject = () => {
    setEditDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      await deleteProject(project.id);
      router.refresh();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SiteHeader title="Project Details">
        <ProjectActions
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          isDeleting={isDeleting}
        />
      </SiteHeader>
      <AppContent>
        <ProjectDetailsContent
          project={project}
          editDialogOpen={editDialogOpen}
          onEditDialogChange={setEditDialogOpen}
          isDeleting={isDeleting}
        />
      </AppContent>
    </>
  );
}
