import { useCallback } from 'react';
import useSWR from 'swr';
import type {
  AchievementWithRelations,
  CreateAchievementRequest,
} from 'lib/types/achievement';

export interface AchievementFilters {
  companyId?: string;
  projectId?: string;
  source?: 'llm' | 'manual';
  isArchived?: boolean;
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
}

interface UseAchievementsOptions {
  page?: number;
  limit?: number;
  filters?: Partial<AchievementFilters>;
}

interface AchievementsResponse {
  achievements: AchievementWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useAchievements(options: UseAchievementsOptions = {}) {
  const { page = 1, limit = 20, filters } = options;

  // Build query string from filters
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.companyId) {
        params.set('companyId', filters.companyId);
      }
      if (filters.projectId) {
        params.set('projectId', filters.projectId);
      }
      if (filters.source) {
        params.set('source', filters.source);
      }
      if (typeof filters.isArchived === 'boolean') {
        params.set('isArchived', filters.isArchived.toString());
      }
      if (filters.searchQuery) {
        params.set('searchQuery', filters.searchQuery);
      }
      if (filters.startDate) {
        params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate.toISOString());
      }
    }

    return params.toString();
  }, [page, limit, filters]);

  const { data, error, isLoading, mutate } = useSWR<AchievementsResponse>(
    `/api/achievements?${buildQueryString()}`,
    null, // Use the default fetcher from SWR config
    {
      keepPreviousData: true,
    },
  );

  const createAchievement = useCallback(
    async (data: CreateAchievementRequest) => {
      try {
        const response = await fetch('/api/achievements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to create achievement');
        }

        const achievement = await response.json();
        await mutate();
        return achievement;
      } catch (error) {
        console.error('Error creating achievement:', error);
        throw error;
      }
    },
    [mutate],
  );

  const updateAchievement = useCallback(
    async (id: string, data: CreateAchievementRequest) => {
      try {
        const response = await fetch(`/api/achievements/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update achievement');
        }

        const achievement = await response.json();
        await mutate();
        return achievement;
      } catch (error) {
        console.error('Error updating achievement:', error);
        throw error;
      }
    },
    [mutate],
  );

  const deleteAchievement = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/achievements/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete achievement');
        }

        await mutate();
        return response.json();
      } catch (error) {
        console.error('Error deleting achievement:', error);
        throw error;
      }
    },
    [mutate],
  );

  return {
    achievements: data?.achievements ?? [],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
    createAchievement,
    updateAchievement,
    deleteAchievement,
  };
}
