import useSWR from 'swr';
import type { ProjectWithImpact } from '@/database/projects/queries';

interface TopProjectsResponse {
  projects: ProjectWithImpact[];
}

export function useTopProjects(limit = 5) {
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch top projects');
    }
    const data = await res.json();

    // Convert date strings to Date objects
    if (data.projects) {
      data.projects = data.projects.map((project: any) => ({
        ...project,
        startDate: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : null,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        company: project.company
          ? {
              ...project.company,
              startDate: new Date(project.company.startDate),
              endDate: project.company.endDate
                ? new Date(project.company.endDate)
                : null,
              createdAt: new Date(project.company.createdAt),
              updatedAt: new Date(project.company.updatedAt),
            }
          : null,
      }));
    }

    return data;
  };

  const { data, error, isLoading, mutate } = useSWR<TopProjectsResponse>(
    `/api/projects/top?limit=${limit}`,
    fetcher,
  );

  return {
    projects: data?.projects ?? [],
    error,
    isLoading,
    mutate,
  };
}
