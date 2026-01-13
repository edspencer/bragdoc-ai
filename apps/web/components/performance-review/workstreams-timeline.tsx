'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-1 flex-col items-center p-8 pt-16">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Workstreams</h2>
          </div>
          <p className="text-muted-foreground text-center">
            No workstreams were found for this review period. Workstreams are
            collections of related achievements that make performance review
            document writing easier.
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/workstreams">Create Workstreams</Link>
            </Button>
          </div>
        </div>
      </div>
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
