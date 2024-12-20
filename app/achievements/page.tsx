'use client';

import { useState } from 'react';
import { useAchievementFilters } from '@/hooks/use-achievement-filters';
import { AchievementList } from '@/components/achievements/AchievementList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AchievementsPage() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, clearFilters } = useAchievementFilters();

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Achievement
        </Button>
      </div>

      {/* TODO: Add filter UI here */}

      <AchievementList
        page={page}
        onPageChange={setPage}
        filters={filters}
      />
    </div>
  );
}
