'use client';

import { useState, useMemo } from 'react';
import { WorkstreamsGanttChart } from './workstreams-gantt-chart';
import { WorkstreamAchievementsTable } from './workstream-achievements-table';
import { WorkstreamSelectionZeroState } from './workstream-selection-zero-state';
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
  // Track selection: null = zero state, 'unassigned' = show unassigned, string ID = selected workstream
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<
    string | null
  >(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const { startDate, endDate } = calculateDateRange(initialPreset);

  // Use the hook for generation capabilities
  const { generateWorkstreams, isGenerating, generationStatus } =
    useWorkstreams(startDate, endDate);

  // Calculate unassigned count
  const unassignedCount = useMemo(() => {
    return achievements.filter((a) => !a.workstreamId).length;
  }, [achievements]);

  // Handle workstream selection from Gantt chart
  const handleSelectWorkstream = (workstreamId: string | null) => {
    setSelectedWorkstreamId(workstreamId);
    setShowUnassigned(false);
  };

  // Handle "show unassigned" button click
  const handleShowUnassigned = () => {
    setShowUnassigned(true);
    setSelectedWorkstreamId(null);
  };

  // Handle closing the unassigned view
  const handleCloseUnassigned = () => {
    setShowUnassigned(false);
    setSelectedWorkstreamId(null);
  };

  // Determine what to show in the bottom section
  const showZeroState = !selectedWorkstreamId && !showUnassigned;

  return (
    <>
      {/* Gantt Chart */}
      <WorkstreamsGanttChart
        workstreams={workstreams}
        achievements={achievements}
        selectedWorkstreamId={selectedWorkstreamId}
        onSelectWorkstream={handleSelectWorkstream}
        startDate={startDate}
        endDate={endDate}
        isLoading={false}
      />

      {/* Zero State or Achievements Table */}
      {showZeroState ? (
        <WorkstreamSelectionZeroState
          unassignedCount={unassignedCount}
          onShowUnassigned={handleShowUnassigned}
        />
      ) : (
        <WorkstreamAchievementsTable
          achievements={achievements}
          workstreams={workstreams}
          selectedWorkstreamId={showUnassigned ? null : selectedWorkstreamId}
          onGenerateWorkstreams={generateWorkstreams}
          onClose={showUnassigned ? handleCloseUnassigned : undefined}
          isGenerating={isGenerating}
          generationStatus={generationStatus}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </>
  );
}
