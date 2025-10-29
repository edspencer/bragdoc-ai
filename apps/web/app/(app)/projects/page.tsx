'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectDialog } from '@/components/project-dialog';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/use-companies';
import type { ProjectWithCompany } from '@/database/projects/queries';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';

export default function ProjectsPage() {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { companies, isLoading: companiesLoading } = useCompanies();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] =
    React.useState<ProjectWithCompany | null>(null);

  const handleAddProject = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const handleEditProject = (project: ProjectWithCompany) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
    } catch (error) {
      // Error is handled in the hook
      console.error('Failed to delete project:', error);
    }
  };

  const handleSubmitProject = async (data: any) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
      } else {
        await createProject(data);
      }
      setDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      // Error is handled in the hooks
      console.error('Failed to submit project:', error);
    }
  };

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Projects">
          <Button onClick={handleAddProject}>
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">Add Project</span>
          </Button>
        </SiteHeader>
        <AppContent>
          <ProjectsTable
            data={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            isLoading={projectsLoading}
          />
        </AppContent>
      </SidebarInset>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        companies={companies || []}
        onSubmit={handleSubmitProject}
        isLoading={companiesLoading}
        existingProjectCount={projects?.length || 0}
      />
    </AppPage>
  );
}
