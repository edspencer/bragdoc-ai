'use client';

import { useState } from 'react';
import { useAchievementFilters } from '@/hooks/use-achievement-filters';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import { AchievementList } from '@/components/achievements/AchievementList';
import { AchievementFilters } from '@/components/achievements/achievement-filters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function AchievementsContent() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, clearFilters } = useAchievementFilters();
  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const { projects, isLoading: isLoadingProjects } = useProjects();

  return (
    <div className="mt-8">
      <div className="flex justify-end mb-6">
        <Button>
          <Plus className="mr-2 size-4" />
          New Achievement
        </Button>
      </div>

      <AchievementFilters
        companyId={filters.companyId || 'all'}
        onCompanyChange={(value) => setFilter('companyId', value === 'all' ? undefined : value)}
        projectId={filters.projectId || 'all'}
        onProjectChange={(value) => setFilter('projectId', value === 'all' ? undefined : value)}
        searchQuery={filters.searchQuery || ''}
        onSearchChange={(value) => setFilter('searchQuery', value || undefined)}
        startDate={filters.startDate}
        onStartDateChange={(date) => setFilter('startDate', date)}
        endDate={filters.endDate}
        onEndDateChange={(date) => setFilter('endDate', date)}
        companies={companies || []}
        projects={projects || []}
        onReset={clearFilters}
        loading={{
          company: isLoadingCompanies,
          project: isLoadingProjects,
          search: false,
        }}
      />

      <AchievementList
        page={page}
        onPageChange={setPage}
        filters={filters}
      />
    </div>
  );
}
