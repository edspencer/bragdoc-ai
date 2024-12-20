import { useCallback } from 'react';
import useSWR from 'swr';
import type { BragWithRelations } from '@/lib/db/queries';

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
  achievements: BragWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useAchievements(options: UseAchievementsOptions = {}) {
  const { page = 1, limit = 10, filters } = options;

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
    }
  );

  return {
    achievements: data?.achievements ?? [],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
  };
}
