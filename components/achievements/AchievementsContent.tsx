'use client';

import { useState } from 'react';
import { useAchievementFilters } from '@/hooks/use-achievement-filters';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import { AchievementList } from '@/components/achievements/AchievementList';
import { AchievementFilters } from '@/components/achievements/achievement-filters';
import { AchievementDialog } from './AchievementDialog';

export function AchievementsContent() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, clearFilters } = useAchievementFilters();
  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mt-8">
      <AchievementFilters
        companyId={filters.companyId || 'all'}
        onCompanyChange={(value) =>
          setFilter('companyId', value === 'all' ? undefined : value)
        }
        projectId={filters.projectId || 'all'}
        onProjectChange={(value) =>
          setFilter('projectId', value === 'all' ? undefined : value)
        }
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

      <div className="mt-6">
        <AchievementList
          page={page}
          onPageChange={setPage}
          filters={filters}
          onCreateClick={() => setDialogOpen(true)}
        />
      </div>

      <AchievementDialog
        mode="create"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (data) => {
          // Handle achievement creation
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
