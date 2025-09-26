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

  const swrKey = `/api/achievements?${buildQueryString()}`;

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch achievements');
    }
    const data = await res.json();

    // Convert date strings to Date objects
    if (data.achievements) {
      data.achievements = data.achievements.map((achievement: any) => ({
        ...achievement,
        createdAt: new Date(achievement.createdAt),
        updatedAt: new Date(achievement.updatedAt),
        eventStart: achievement.eventStart
          ? new Date(achievement.eventStart)
          : null,
        eventEnd: achievement.eventEnd ? new Date(achievement.eventEnd) : null,
        impactUpdatedAt: achievement.impactUpdatedAt
          ? new Date(achievement.impactUpdatedAt)
          : null,
        // Handle nested company dates
        company: achievement.company
          ? {
              ...achievement.company,
              startDate: new Date(achievement.company.startDate),
              endDate: achievement.company.endDate
                ? new Date(achievement.company.endDate)
                : null,
            }
          : null,
        // Handle nested project dates
        project: achievement.project
          ? {
              ...achievement.project,
              startDate: new Date(achievement.project.startDate),
              endDate: achievement.project.endDate
                ? new Date(achievement.project.endDate)
                : null,
              createdAt: new Date(achievement.project.createdAt),
              updatedAt: new Date(achievement.project.updatedAt),
            }
          : null,
        // Handle nested userMessage dates
        userMessage: achievement.userMessage
          ? {
              ...achievement.userMessage,
              createdAt: new Date(achievement.userMessage.createdAt),
            }
          : null,
      }));
    }

    return data;
  };

  const { data, error, isLoading, mutate } = useSWR<AchievementsResponse>(
    swrKey,
    fetcher,
    {
      keepPreviousData: true,
    }
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
    [mutate]
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
    [mutate]
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
    [mutate]
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
