'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { WorkstreamsGanttChart } from './workstreams-gantt-chart';
import { WorkstreamAchievementsTable } from './workstream-achievements-table';
import { WorkstreamSelectionZeroState } from './workstream-selection-zero-state';
import { WorkstreamDialog } from './workstream-dialog';
import { DeleteWorkstreamDialog } from './delete-workstream-dialog';
import { useWorkstreamsActions } from '@/hooks/use-workstreams';
import { startOfDay, endOfDay, subMonths } from 'date-fns';
import type { Workstream } from '@bragdoc/database';
import type { AchievementWithRelationsUI } from '@/lib/types/achievement';

interface WorkstreamsClientProps {
  workstreams: Workstream[];
  achievements: AchievementWithRelationsUI[];
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

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkstream, setEditingWorkstream] = useState<Workstream | null>(
    null,
  );

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWorkstream, setDeletingWorkstream] =
    useState<Workstream | null>(null);

  const { startDate, endDate } = calculateDateRange(initialPreset);

  // Use the hook for generation capabilities only (data comes from server props)
  const {
    autoAssignWorkstreams,
    isGenerating,
    generationStatus,
    updateWorkstream,
    deleteWorkstream,
  } = useWorkstreamsActions();

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

  // Handle edit workstream from achievement table
  const handleEditWorkstream = (workstream: Workstream) => {
    setEditingWorkstream(workstream);
    setEditDialogOpen(true);
  };

  // Handle edit dialog submission
  const handleEditDialogSubmit = async (data: {
    name: string;
    description?: string;
    color: string;
    selectedAchievementIds?: string[];
  }) => {
    if (!editingWorkstream) return;

    try {
      await updateWorkstream(editingWorkstream.id, {
        name: data.name,
        description: data.description,
        color: data.color,
      });

      toast.success('Workstream updated');
      setEditDialogOpen(false);
      setEditingWorkstream(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update workstream: ${errorMessage}`);
      console.error(error);
    }
  };

  // Handle delete workstream from achievement table
  const handleDeleteWorkstream = (workstream: Workstream) => {
    setDeletingWorkstream(workstream);
    setDeleteDialogOpen(true);
  };

  // Handle delete dialog confirmation
  const handleDeleteDialogConfirm = async () => {
    if (!deletingWorkstream) return;

    await deleteWorkstream(deletingWorkstream.id);
    // Clear selection since the workstream was deleted
    setSelectedWorkstreamId(null);
    setDeleteDialogOpen(false);
    setDeletingWorkstream(null);
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
        <>
          <WorkstreamAchievementsTable
            achievements={achievements}
            workstreams={workstreams}
            selectedWorkstreamId={showUnassigned ? null : selectedWorkstreamId}
            onGenerateWorkstreams={() => autoAssignWorkstreams()}
            onClose={showUnassigned ? handleCloseUnassigned : undefined}
            isGenerating={isGenerating}
            generationStatus={generationStatus}
            startDate={startDate}
            endDate={endDate}
            onEditWorkstream={handleEditWorkstream}
            onDeleteWorkstream={handleDeleteWorkstream}
          />

          {/* Edit Workstream Dialog */}
          <WorkstreamDialog
            mode="edit"
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            workstream={editingWorkstream}
            achievements={[]}
            onSubmit={handleEditDialogSubmit}
          />

          {/* Delete Workstream Dialog */}
          <DeleteWorkstreamDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            workstream={deletingWorkstream}
            onConfirm={handleDeleteDialogConfirm}
          />
        </>
      )}
    </>
  );
}
