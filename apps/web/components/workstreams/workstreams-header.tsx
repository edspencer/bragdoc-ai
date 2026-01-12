'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { HeaderAddButton } from '@/components/shared/header-add-button';
import type { Workstream } from '@bragdoc/database';
import {
  useWorkstreamsActions,
  type AchievementForSelection,
} from '@/hooks/use-workstreams';
import { WorkstreamConfigDialog } from './workstream-config-dialog';
import { WorkstreamDialog } from './workstream-dialog';

interface WorkstreamsHeaderProps {
  showFilters: boolean;
  storedProjectIds?: string[];
  storedTimeRange?: { startDate: string; endDate: string };
  filterDisplay?: React.ReactNode;
  workstreams?: Workstream[];
  onEditWorkstream?: (workstream: Workstream) => void;
}

export function WorkstreamsHeader({
  showFilters,
  storedProjectIds,
  storedTimeRange,
  filterDisplay,
  workstreams = [],
  onEditWorkstream,
}: WorkstreamsHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workstreamDialogOpen, setWorkstreamDialogOpen] = useState(false);
  const [workstreamDialogMode, setWorkstreamDialogMode] = useState<
    'create' | 'edit'
  >('create');
  const [editingWorkstream, setEditingWorkstream] = useState<Workstream | null>(
    null,
  );
  const [achievementsForCreation, setAchievementsForCreation] = useState<
    AchievementForSelection[]
  >([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);

  const {
    createWorkstream,
    updateWorkstream,
    assignWorkstream,
    getUnassignedAchievements,
  } = useWorkstreamsActions();

  const handleAddWorkstream = async () => {
    setWorkstreamDialogMode('create');
    setEditingWorkstream(null);
    setIsLoadingAchievements(true);
    try {
      // Pass workstream metadata filters to only show unassigned achievements
      // that match the configured project/time filters
      const achievements = await getUnassignedAchievements({
        projectIds: storedProjectIds,
        timeRange: storedTimeRange,
      });
      setAchievementsForCreation(achievements);
    } catch (error) {
      toast.error('Failed to load achievements');
      console.error(error);
    } finally {
      setIsLoadingAchievements(false);
      setWorkstreamDialogOpen(true);
    }
  };

  const _handleEditWorkstream = (workstream: Workstream) => {
    setEditingWorkstream(workstream);
    setWorkstreamDialogMode('edit');
    setAchievementsForCreation([]);
    setWorkstreamDialogOpen(true);
  };

  const handleDialogSubmit = async (data: {
    name: string;
    description?: string;
    color: string;
    selectedAchievementIds?: string[];
  }) => {
    try {
      if (workstreamDialogMode === 'create') {
        // Create workstream
        const newWorkstream = await createWorkstream({
          name: data.name,
          description: data.description,
          color: data.color,
        });

        // Assign achievements if any selected
        if (
          data.selectedAchievementIds &&
          data.selectedAchievementIds.length > 0
        ) {
          for (const achievementId of data.selectedAchievementIds) {
            await assignWorkstream(achievementId, newWorkstream.id);
          }
        }

        // Show success toast
        const count = data.selectedAchievementIds?.length ?? 0;
        const achievementText = count === 1 ? 'achievement' : 'achievements';
        toast.success(
          `Workstream '${data.name}' created with ${count} ${achievementText}`,
        );
      } else if (workstreamDialogMode === 'edit' && editingWorkstream) {
        // Update workstream
        await updateWorkstream(editingWorkstream.id, {
          name: data.name,
          description: data.description,
          color: data.color,
        });

        toast.success('Workstream updated');
      }

      setWorkstreamDialogOpen(false);
      // router.refresh() called by hook functions
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(
        `Failed to ${workstreamDialogMode === 'create' ? 'create' : 'update'} workstream: ${errorMessage}`,
      );
      console.error(error);
    }
  };

  if (!showFilters) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {filterDisplay}
      <HeaderAddButton
        label="Add Workstream"
        onClick={handleAddWorkstream}
        isLoading={isLoadingAchievements}
        disabled={isLoadingAchievements}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDialogOpen(true)}
        title="Configure workstream generation filters"
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <WorkstreamConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentFilters={
          storedProjectIds || storedTimeRange
            ? {
                projectIds: storedProjectIds,
                timeRange: storedTimeRange,
              }
            : undefined
        }
      />

      <WorkstreamDialog
        mode={workstreamDialogMode}
        open={workstreamDialogOpen}
        onOpenChange={setWorkstreamDialogOpen}
        workstream={editingWorkstream}
        achievements={achievementsForCreation}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}
