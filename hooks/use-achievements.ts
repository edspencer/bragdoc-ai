import { useCallback } from 'react';
import useSWR from 'swr';
import type { AchievementWithRelations as Achievement, AchievementFilters } from '@/lib/types/achievement';

interface UseAchievementsOptions {
  page?: number;
  limit?: number;
  filters?: Partial<AchievementFilters>;
}

interface AchievementsResponse {
  achievements: Achievement[];
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
      if (filters.dateRange) {
        params.set('startDate', filters.dateRange.start.toISOString());
        params.set('endDate', filters.dateRange.end.toISOString());
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
