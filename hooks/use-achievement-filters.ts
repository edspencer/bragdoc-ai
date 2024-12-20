import { useState, useCallback, useMemo } from 'react';
import type { AchievementFilters } from '@/lib/types/achievement';

interface UseAchievementFiltersOptions {
  initialFilters?: Partial<AchievementFilters>;
  onChange?: (filters: Partial<AchievementFilters>) => void;
}

export function useAchievementFilters(options: UseAchievementFiltersOptions = {}) {
  const { initialFilters = {}, onChange } = options;
  const [filters, setFilters] = useState<Partial<AchievementFilters>>(initialFilters);

  const setFilter = useCallback(
    <K extends keyof AchievementFilters>(
      key: K,
      value: AchievementFilters[K] | undefined
    ) => {
      const newFilters = {
        ...filters,
        [key]: value,
      };

      // Remove undefined values
      Object.keys(newFilters).forEach((key) => {
        if (newFilters[key as keyof AchievementFilters] === undefined) {
          delete newFilters[key as keyof AchievementFilters];
        }
      });

      setFilters(newFilters);
      onChange?.(newFilters);
    },
    [filters, onChange]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    onChange?.({});
  }, [onChange]);

  const hasActiveFilters = useMemo(
    () => Object.keys(filters).length > 0,
    [filters]
  );

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}
