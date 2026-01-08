'use client';

import { useState, useMemo } from 'react';
import { WorkstreamsGanttChart } from '@/components/workstreams/workstreams-gantt-chart';
import { WorkstreamAchievementsTable } from '@/components/workstreams/workstream-achievements-table';
import { WorkstreamSelectionZeroState } from '@/components/workstreams/workstream-selection-zero-state';
import type { Workstream } from '@bragdoc/database';
import type { AchievementWithRelations } from '@/lib/types/achievement';

interface WorkstreamsTimelineProps {
  workstreams: Workstream[];
  achievements: AchievementWithRelations[];
  startDate: Date;
  endDate: Date;
}

/**
 * Workstreams Timeline component for Performance Review pages.
 *
 * Displays the Gantt chart timeline and allows clicking on workstreams
 * to see their achievements underneath. This is a simplified version
 * of WorkstreamsClient that doesn't include generation capabilities.
 */
export function WorkstreamsTimeline({
  workstreams,
  achievements,
  startDate,
  endDate,
}: WorkstreamsTimelineProps) {
  // Track selection: null = zero state, string ID = selected workstream
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<
    string | null
  >(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

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

  // If no workstreams have achievements in the date range, show a message
  const hasWorkstreamsWithAchievements = useMemo(() => {
    return workstreams.some((ws) =>
      achievements.some((a) => a.workstreamId === ws.id),
    );
  }, [workstreams, achievements]);

  if (workstreams.length === 0 || !hasWorkstreamsWithAchievements) {
    return (
      <p className="text-sm text-muted-foreground">
        No workstreams found for this review period.
      </p>
    );
  }

  return (
    <div className="space-y-6">
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
          onClose={showUnassigned ? handleCloseUnassigned : undefined}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}
