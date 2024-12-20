'use client';

import { useState } from 'react';
import { useAchievementFilters } from '@/hooks/use-achievement-filters';
import { AchievementList } from '@/components/achievements/AchievementList';
import { AchievementFilters } from '@/components/achievements/AchievementFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function AchievementsContent() {
  const [page, setPage] = useState(1);
  const { filters } = useAchievementFilters();

  return (
    <div className="mt-8">
      <div className="flex justify-end mb-6">
        <Button>
          <Plus className="mr-2 size-4" />
          New Achievement
        </Button>
      </div>

      <AchievementFilters />

      <AchievementList
        page={page}
        onPageChange={setPage}
        filters={filters}
      />
    </div>
  );
}
