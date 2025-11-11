'use client';

import { useState } from 'react';
import { WorkstreamsGanttChart } from './workstreams-gantt-chart';
import { WorkstreamAchievementsTable } from './workstream-achievements-table';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import type { Workstream } from '@bragdoc/database';
import type { AchievementWithRelations } from '@/lib/types/achievement';

interface WorkstreamsClientProps {
  workstreams: Workstream[];
  achievements: AchievementWithRelations[];
  initialPreset: string;
}

/**
 * Convert preset string to absolute dates
 * @param preset - Preset string ('3m', '6m', '12m', '24m', or 'all')
 * @returns Object with startDate and endDate (undefined for 'all')
 */
function calculateDateRange(preset: string): {
  startDate: Date | undefined;
  endDate: Date | undefined;
} {
  const today = new Date();

  switch (preset) {
    case '3m': {
      const start = startOfDay(subMonths(today, 3));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '6m': {
      const start = startOfDay(subMonths(today, 6));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '12m': {
      const start = startOfDay(subMonths(today, 12));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '24m': {
      const start = startOfDay(subMonths(today, 24));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

export function WorkstreamsClient({
  workstreams,
  achievements,
  initialPreset,
}: WorkstreamsClientProps) {
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<
    string | null
  >(null);

  const { startDate, endDate } = calculateDateRange(initialPreset);

  // Use the hook for generation capabilities
  const { generateWorkstreams, isGenerating, generationStatus } =
    useWorkstreams(startDate, endDate);

  return (
    <>
      {/* Gantt Chart */}
      <WorkstreamsGanttChart
        workstreams={workstreams}
        achievements={achievements}
        selectedWorkstreamId={selectedWorkstreamId}
        onSelectWorkstream={setSelectedWorkstreamId}
        startDate={startDate}
        endDate={endDate}
        isLoading={false}
      />

      {/* Achievements Table */}
      <WorkstreamAchievementsTable
        achievements={achievements}
        workstreams={workstreams}
        selectedWorkstreamId={selectedWorkstreamId}
        onGenerateWorkstreams={generateWorkstreams}
        isGenerating={isGenerating}
        generationStatus={generationStatus}
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
}
