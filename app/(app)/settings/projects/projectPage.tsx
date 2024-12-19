'use client';

import { useProjects } from '@/hooks/useProjects';
import { useRetry } from '@/hooks/useRetry';
import { ProjectList } from '@/components/projects/project-list';
import { toast } from 'sonner';
import type { ProjectFormData } from '@/components/projects/project-form';
import { ProjectListSkeleton } from '@/components/projects/project-list-skeleton';
import { ErrorBoundary } from "@/components/error-boundary";

export default function ProjectPage() {
  const { 
    projects, 
    isLoading, 
    error, 
    createProject, 
    updateProject, 
    deleteProject 
  } = useProjects();
  const { executeWithRetry } = useRetry<boolean>();

  const handleCreateProject = async (data: ProjectFormData): Promise<boolean> => {
    try {
      const success = await executeWithRetry(() => createProject(data));
      if (success) {
        toast.success('Project created successfully');
      } else {
        toast.error('Failed to create project');
      }
      return success;
    } catch (error) {
      toast.error('Failed to create project after multiple attempts');
      return false;
    }
  };

  const handleUpdateProject = async (id: string, data: ProjectFormData): Promise<boolean> => {
    try {
      const success = await executeWithRetry(() => updateProject(id, data));
      if (success) {
        toast.success('Project updated successfully');
      } else {
        toast.error('Failed to update project');
      }
      return success;
    } catch (error) {
      toast.error('Failed to update project after multiple attempts');
      return false;
    }
  };

  const handleDeleteProject = async (id: string): Promise<boolean> => {
    try {
      const success = await executeWithRetry(() => deleteProject(id));
      if (success) {
        toast.success('Project deleted successfully');
      } else {
        toast.error('Failed to delete project');
      }
      return success;
    } catch (error) {
      toast.error('Failed to delete project after multiple attempts');
      return false;
    }
  };

  if (error) {
    toast.error('Failed to load projects');
  }

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <ErrorBoundary>
          <ProjectList
            projects={projects}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            isLoading={isLoading}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
