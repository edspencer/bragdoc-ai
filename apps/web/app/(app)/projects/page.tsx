'use client';

import * as React from 'react';
import { IconFolderCode, IconPlus } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectDialog } from '@/components/project-dialog';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/use-companies';
import type { ProjectWithCompany } from '@/lib/db/projects/queries';

export default function ProjectsPage() {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { companies, isLoading: companiesLoading } = useCompanies();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectWithCompany | null>(
    null
  );

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
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <IconFolderCode className="size-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold">Projects</h1>
                    <p className="text-muted-foreground text-sm">
                      Manage your projects and track your work
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddProject}>
                  <IconPlus className="size-4" />
                  Add Project
                </Button>
              </div>

              <ProjectsTable
                data={projects}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                isLoading={projectsLoading}
              />
            </div>
          </div>
        </div>
      </SidebarInset>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        companies={companies || []}
        onSubmit={handleSubmitProject}
        isLoading={companiesLoading}
      />
    </SidebarProvider>
  );
}
