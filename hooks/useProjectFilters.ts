import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ProjectStatus } from '@/lib/db/types';
import type { ProjectWithCompany } from '@/lib/db/projects/queries';

export function useProjectFilters() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState({
    status: false,
    company: false,
    search: false,
  });

  const status = (searchParams.get('status') as ProjectStatus | 'all') || 'all';
  const companyId = searchParams.get('company') || 'all';
  const searchQuery = searchParams.get('search') || '';

  const filterProjects = useCallback(
    (projects: ProjectWithCompany[]) => {
      return projects.filter((project) => {
        // Status filter
        if (status !== 'all' && project.status !== status) {
          return false;
        }

        // Company filter
        if (companyId !== 'all' && project.companyId !== companyId) {
          return false;
        }

        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          return (
            project.name.toLowerCase().includes(searchLower) ||
            project.description?.toLowerCase().includes(searchLower) ||
            project.company?.name.toLowerCase().includes(searchLower)
          );
        }

        return true;
      });
    },
    [status, companyId, searchQuery],
  );

  const updateSearchParams = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.pushState({}, '', url);
  }, []);

  const handleStatusChange = useCallback(
    (value: ProjectStatus | 'all') => {
      setLoading((prev) => ({ ...prev, status: true }));
      updateSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        status: value,
      });
      setLoading((prev) => ({ ...prev, status: false }));
    },
    [searchParams, updateSearchParams],
  );

  const handleCompanyChange = useCallback(
    (value: string) => {
      setLoading((prev) => ({ ...prev, company: true }));
      updateSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        company: value,
      });
      setLoading((prev) => ({ ...prev, company: false }));
    },
    [searchParams, updateSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLoading((prev) => ({ ...prev, search: true }));
      updateSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        search: value,
      });
      setLoading((prev) => ({ ...prev, search: false }));
    },
    [searchParams, updateSearchParams],
  );

  const handleReset = useCallback(() => {
    setLoading({ status: true, company: true, search: true });
    window.history.pushState({}, '', window.location.pathname);
    setLoading({ status: false, company: false, search: false });
  }, []);

  return {
    filters: {
      status,
      companyId,
      searchQuery,
    },
    loading,
    filterProjects,
    handleStatusChange,
    handleCompanyChange,
    handleSearchChange,
    handleReset,
  };
}
