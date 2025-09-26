'use client';

import * as React from 'react';
import { IconFolderCode, IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectDialog } from '@/components/project-dialog';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Project, Company } from '@/database/schema';

// Mock data for projects - replace with real data from your database
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'E-commerce Platform',
    description:
      'A full-stack e-commerce platform built with Next.js and Stripe integration',
    status: 'completed' as const,
    startDate: new Date('2023-01-15'),
    endDate: new Date('2023-06-30'),
    repoRemoteUrl: 'https://github.com/user/ecommerce-platform',
    companyId: '1',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-06-30'),
    userId: '1',
  },
  {
    id: '2',
    name: 'Task Management App',
    description:
      'A collaborative task management application with real-time updates',
    status: 'active' as const,
    startDate: new Date('2023-07-01'),
    endDate: null,
    repoRemoteUrl: 'https://github.com/user/task-manager',
    companyId: '2',
    createdAt: new Date('2023-07-01'),
    updatedAt: new Date('2023-06-30'),
    userId: '1',
  },
  {
    id: '3',
    name: 'Personal Portfolio',
    description: 'My personal portfolio website showcasing my work and skills',
    status: 'archived' as const,
    startDate: new Date('2022-03-15'),
    endDate: new Date('2022-05-30'),
    repoRemoteUrl: null,
    companyId: null,
    createdAt: new Date('2022-03-15'),
    updatedAt: new Date('2022-05-30'),
    userId: '1',
  },
];

// Mock companies data - in real app, fetch from database
const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Acme Corp',
    userId: '1',
    domain: null,
    role: '',
    startDate: new Date(),
    endDate: null,
  },
  {
    id: '2',
    name: 'TechStart Inc',
    userId: '1',
    domain: null,
    role: '',
    startDate: new Date(),
    endDate: null,
  },
  {
    id: '3',
    name: 'Innovation Labs',
    userId: '1',
    domain: null,
    role: '',
    startDate: new Date(),
    endDate: null,
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState(mockProjects);
  const [companies] = React.useState(mockCompanies);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(
    null
  );

  const handleAddProject = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
    toast.success('Project deleted successfully');
  };

  const handleSubmitProject = (data: Omit<Project, 'id' | 'companyName'>) => {
    const companyName = data.companyId
      ? companies.find((c) => c.id === data.companyId)?.name || null
      : null;

    if (editingProject) {
      // Update existing project
      setProjects((prev) =>
        prev.map((project) =>
          project.id === editingProject.id
            ? { ...data, id: editingProject.id, companyName }
            : project
        )
      );
      toast.success('Project updated successfully');
    } else {
      // Add new project
      const newProject = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        companyName,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: '1',
      };
      setProjects((prev) => [...prev, newProject]);
      toast.success('Project added successfully');
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
              />
            </div>
          </div>
        </div>
      </SidebarInset>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        companies={companies}
        onSubmit={handleSubmitProject}
      />
    </SidebarProvider>
  );
}
