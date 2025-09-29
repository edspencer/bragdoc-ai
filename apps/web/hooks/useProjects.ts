import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { useConfetti } from 'hooks/useConfetti';
import type { ProjectFormData } from 'components/projects/project-form';
import type { ProjectWithCompany } from 'lib/db/projects/queries';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }
  return response.json();
};

const fetchProjects = async (url: string): Promise<ProjectWithCompany[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch projects');
  }
  const data = await res.json();
  return data.map((project: any) => ({
    ...project,
    startDate: new Date(project.startDate),
    endDate: project.endDate ? new Date(project.endDate) : null,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    company: project.company ? {
      ...project.company,
      startDate: new Date(project.company.startDate),
      endDate: project.company.endDate ? new Date(project.company.endDate) : null,
    } : null,
  }));
};

export function useProjects() {
  const { data, error, mutate: mutateProjects } = useSWR<ProjectWithCompany[]>(
    '/api/projects',
    fetchProjects,
  );

  return {
    projects: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate: mutateProjects,
  };
}

export function useCreateProject() {
  const { mutate: mutateList } = useProjects();
  const { fire: fireConfetti } = useConfetti();

  const createProject = async (data: ProjectFormData) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to create project');
      }

      await mutateList();
      toast.success('Project created successfully');
      fireConfetti();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      throw error;
    }
  };

  return createProject;
}

export function useUpdateProject() {
  const { mutate: mutateList } = useProjects();

  const updateProject = async (id: string, data: ProjectFormData) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to update project');
      }

      await mutateList();
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      throw error;
    }
  };

  return updateProject;
}

export function useDeleteProject() {
  const { mutate: mutateList } = useProjects();

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete project');
      }

      await mutateList();
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      throw error;
    }
  };

  return deleteProject;
}
