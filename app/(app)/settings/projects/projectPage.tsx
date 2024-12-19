'use client';

import { useProjects } from '@/hooks/useProjects';
import { ProjectList } from '@/components/projects/project-list';
import { toast } from 'sonner';
import type { ProjectFormData } from '@/components/projects/project-form';
import { ProjectListSkeleton } from '@/components/projects/project-list-skeleton';

export default function ProjectPage() {
  const { 
    projects, 
    isLoading, 
    error, 
    createProject, 
    updateProject, 
    deleteProject 
  } = useProjects();

  const handleCreateProject = async (data: ProjectFormData): Promise<boolean> => {
    const success = await createProject(data);
    if (success) {
      toast.success('Project created successfully');
    } else {
      toast.error('Failed to create project');
    }
    return success;
  };

  const handleUpdateProject = async (id: string, data: ProjectFormData): Promise<boolean> => {
    const success = await updateProject(id, data);
    if (success) {
      toast.success('Project updated successfully');
    } else {
      toast.error('Failed to update project');
    }
    return success;
  };

  const handleDeleteProject = async (id: string): Promise<boolean> => {
    const success = await deleteProject(id);
    if (success) {
      toast.success('Project deleted successfully');
    } else {
      toast.error('Failed to delete project');
    }
    return success;
  };

  if (error) {
    toast.error('Failed to load projects');
  }

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  return (
    <div className="p-6">
      <ProjectList
        projects={projects}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        isLoading={isLoading}
      />
    </div>
  );
}
