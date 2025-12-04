import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ProjectStatus } from '@/database/types';
import { z } from 'zod/v3';

export interface ProjectFilters {
  status: ProjectStatus | 'all';
  companyId: string | 'all';
  search: string;
}

export interface FilterLoadingStates {
  status: boolean;
  company: boolean;
  search: boolean;
}

const defaultFilters: ProjectFilters = {
  status: 'all',
  companyId: 'all',
  search: '',
};

const defaultLoadingStates: FilterLoadingStates = {
  status: false,
  company: false,
  search: false,
};

// Validation schemas for URL parameters
const statusSchema = z.enum(['all', 'active', 'completed', 'archived']);
const companyIdSchema = z.string().min(1);
const searchSchema = z.string().max(100); // Reasonable limit for search query

/**
 * Safely parse and validate URL parameters
 */
function parseURLParams(searchParams: URLSearchParams): ProjectFilters {
  // Status validation
  let status: ProjectStatus | 'all' = 'all';
  const statusParam = searchParams.get('status');
  if (statusParam) {
    try {
      status = statusSchema.parse(statusParam);
    } catch (_error) {
      console.warn(`Invalid status parameter: ${statusParam}`);
    }
  }

  // Company ID validation
  let companyId = 'all';
  const companyParam = searchParams.get('company');
  if (companyParam && companyParam !== 'all') {
    try {
      companyIdSchema.parse(companyParam);
      companyId = companyParam;
    } catch (_error) {
      console.warn(`Invalid company parameter: ${companyParam}`);
    }
  }

  // Search validation
  let search = '';
  const searchParam = searchParams.get('search');
  if (searchParam) {
    try {
      search = searchSchema.parse(searchParam);
    } catch (_error) {
      console.warn(`Invalid search parameter: ${searchParam}`);
    }
  }

  return { status, companyId, search };
}

/**
 * Sanitize and validate filter values before updating state
 */
function sanitizeFilters(filters: Partial<ProjectFilters>): ProjectFilters {
  const sanitized = { ...defaultFilters };

  // Status validation
  if (filters.status) {
    try {
      sanitized.status = statusSchema.parse(filters.status);
    } catch (_error) {
      console.warn(`Invalid status value: ${filters.status}`);
    }
  }

  // Company ID validation
  if (filters.companyId && filters.companyId !== 'all') {
    try {
      companyIdSchema.parse(filters.companyId);
      sanitized.companyId = filters.companyId;
    } catch (_error) {
      console.warn(`Invalid company ID: ${filters.companyId}`);
    }
  }

  // Search validation
  if (filters.search) {
    try {
      sanitized.search = searchSchema.parse(filters.search);
    } catch (_error) {
      // For search, we'll truncate instead of rejecting
      sanitized.search = filters.search.slice(0, 100);
    }
  }

  return sanitized;
}

export function useProjectFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL or defaults
  const [filters, setFilters] = useState<ProjectFilters>(() => {
    return parseURLParams(searchParams);
  });

  // Loading states for each filter operation
  const [loading, setLoading] =
    useState<FilterLoadingStates>(defaultLoadingStates);

  // Update URL when filters change
  const updateURL = useCallback(
    async (
      newFilters: ProjectFilters,
      filterType: keyof FilterLoadingStates,
    ) => {
      setLoading((prev) => ({ ...prev, [filterType]: true }));

      try {
        const params = new URLSearchParams(searchParams.toString());
        const sanitizedFilters = sanitizeFilters(newFilters);

        // Update status
        if (sanitizedFilters.status === 'all') {
          params.delete('status');
        } else {
          params.set('status', sanitizedFilters.status);
        }

        // Update company
        if (sanitizedFilters.companyId === 'all') {
          params.delete('company');
        } else {
          params.set('company', sanitizedFilters.companyId);
        }

        // Update search
        if (!sanitizedFilters.search) {
          params.delete('search');
        } else {
          params.set('search', sanitizedFilters.search);
        }

        // Update URL without triggering navigation if filters are invalid
        const newURL = params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;

        if (newURL !== window.location.pathname + window.location.search) {
          await router.push(newURL, { scroll: false });
        }
      } catch (error) {
        console.error(`Error updating URL for ${filterType}:`, error);
      } finally {
        setLoading((prev) => ({ ...prev, [filterType]: false }));
      }
    },
    [pathname, router, searchParams],
  );

  // Filter update handlers with validation and loading states
  const setStatus = useCallback(
    async (status: ProjectStatus | 'all') => {
      try {
        const validStatus = statusSchema.parse(status);
        const newFilters = { ...filters, status: validStatus };
        setFilters(newFilters);
        await updateURL(newFilters, 'status');
      } catch (_error) {
        console.warn(`Invalid status: ${status}`);
        setLoading((prev) => ({ ...prev, status: false }));
      }
    },
    [filters, updateURL],
  );

  const setCompanyId = useCallback(
    async (companyId: string) => {
      const newFilters = { ...filters, companyId };
      if (companyId === 'all' || companyIdSchema.safeParse(companyId).success) {
        setFilters(newFilters);
        await updateURL(newFilters, 'company');
      } else {
        console.warn(`Invalid company ID: ${companyId}`);
        setLoading((prev) => ({ ...prev, company: false }));
      }
    },
    [filters, updateURL],
  );

  const setSearch = useCallback(
    async (search: string) => {
      try {
        const validSearch = searchSchema.parse(search);
        const newFilters = { ...filters, search: validSearch };
        setFilters(newFilters);
        await updateURL(newFilters, 'search');
      } catch (_error) {
        // For search, we'll truncate instead of rejecting
        const truncated = search.slice(0, 100);
        const newFilters = { ...filters, search: truncated };
        setFilters(newFilters);
        await updateURL(newFilters, 'search');
        console.warn(`Search query truncated to: ${truncated}`);
      }
    },
    [filters, updateURL],
  );

  const resetFilters = useCallback(async () => {
    // Set all loading states to true
    setLoading({ status: true, company: true, search: true });

    try {
      setFilters(defaultFilters);
      await updateURL(defaultFilters, 'status'); // We only need one update for reset
    } finally {
      // Reset all loading states
      setLoading(defaultLoadingStates);
    }
  }, [updateURL]);

  // Apply filters to projects with type safety
  const applyFilters = useCallback(
    <
      T extends {
        status: ProjectStatus;
        companyId?: string | null;
        name: string;
      },
    >(
      projects: T[],
    ) => {
      return projects.filter((project) => {
        // Status filter
        if (filters.status !== 'all' && project.status !== filters.status) {
          return false;
        }

        // Company filter
        if (
          filters.companyId !== 'all' &&
          project.companyId !== filters.companyId
        ) {
          return false;
        }

        // Search filter (case-insensitive)
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          return project.name.toLowerCase().includes(searchLower);
        }

        return true;
      });
    },
    [filters],
  );

  // Listen for external URL changes
  useEffect(() => {
    const newFilters = parseURLParams(searchParams);
    setFilters(newFilters);
  }, [searchParams]);

  return {
    filters,
    loading,
    setStatus,
    setCompanyId,
    setSearch,
    resetFilters,
    applyFilters,
  };
}
