import useSWR, { mutate } from 'swr';
import type { ProjectFormData } from '@/components/projects/project-form';
import type { ProjectWithCompany } from '@/lib/db/projects/queries';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }
  return response.json();
};

export function useProjects() {
  const {
    data: projects,
    error: projectsError,
    isLoading: projectsLoading,
  } = useSWR<ProjectWithCompany[]>('/api/projects', fetcher);

  const {
    data: companies,
    error: companiesError,
    isLoading: companiesLoading,
  } = useSWR<Array<{ id: string; name: string }>>('/api/companies', fetcher);

  const createProject = async (data: ProjectFormData): Promise<boolean> => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create project');
      const newProject = await response.json();

      // Update the cache optimistically
      mutate(
        '/api/projects',
        projects ? [...projects, newProject] : [newProject],
        false,
      );

      // Revalidate
      mutate('/api/projects');
      return true;
    } catch (error) {
      console.error('Error creating project:', error);
      return false;
    }
  };

  const updateProject = async (
    id: string,
    data: ProjectFormData,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update project');
      const updatedProject = await response.json();

      // Update the cache optimistically
      mutate(
        '/api/projects',
        projects?.map((p) => (p.id === id ? updatedProject : p)),
        false,
      );

      // Revalidate
      mutate('/api/projects');
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');

      // Update the cache optimistically
      mutate(
        '/api/projects',
        projects?.filter((p) => p.id !== id),
        false,
      );

      // Revalidate
      mutate('/api/projects');
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  };

  return {
    projects: projects || [],
    companies: companies || [],
    isLoading: projectsLoading || companiesLoading,
    error: projectsError || companiesError,
    createProject,
    updateProject,
    deleteProject,
  };
}
