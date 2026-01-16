'use client';

import { useState, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { AchievementItem } from 'components/achievements/achievement-item';
import { AchievementDialog } from 'components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from 'components/achievements/delete-achievement-dialog';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievements } from '@/hooks/use-achievements';
import type { AchievementWithRelationsUI } from 'lib/types/achievement';
import type { Workstream } from '@bragdoc/database';

interface AchievementsSectionProps {
  achievements: AchievementWithRelationsUI[];
  workstreams?: Workstream[];
}

/**
 * AchievementsSection - Displays achievements for a performance review period
 *
 * Features:
 * - Interactive star ratings for impact
 * - Edit and delete functionality
 * - Shows project/company associations
 * - Sorted by event date (most recent first)
 */
export function AchievementsSection({
  achievements: initialAchievements,
  workstreams = [],
}: AchievementsSectionProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingAchievement, setEditingAchievement] =
    useState<AchievementWithRelationsUI | null>(null);
  const [deletingAchievement, setDeletingAchievement] =
    useState<AchievementWithRelationsUI | null>(null);
  const { updateAchievement, deleteAchievement } = useAchievementMutations();
  const { mutate } = useAchievements();

  // Create a map of workstreams by ID for quick lookup
  const workstreamMap = useMemo(() => {
    const map = new Map<string, Workstream>();
    workstreams.forEach((ws) => {
      map.set(ws.id, ws);
    });
    return map;
  }, [workstreams]);

  // Sort achievements by event date (most recent first)
  const sortedAchievements = useMemo(() => {
    return [...initialAchievements].sort((a, b) => {
      const aDate = a.eventStart ? new Date(a.eventStart).getTime() : 0;
      const bDate = b.eventStart ? new Date(b.eventStart).getTime() : 0;
      return bDate - aDate;
    });
  }, [initialAchievements]);

  const handleImpactChange = async (id: string, impact: number) => {
    setActionLoading(`impact-${id}`);

    try {
      await updateAchievement(id, {
        impact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });

      // Refresh achievements data
      mutate();
    } catch (error) {
      console.error('Error updating impact:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (achievement: AchievementWithRelationsUI) => {
    setEditingAchievement(achievement);
  };

  const handleUpdate = async (data: any) => {
    if (!editingAchievement) return;

    setActionLoading(`update-${editingAchievement.id}`);
    try {
      await updateAchievement(editingAchievement.id, data);
      mutate();
      setEditingAchievement(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (achievement: AchievementWithRelationsUI) => {
    setDeletingAchievement(achievement);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAchievement) return;

    setActionLoading(`delete-${deletingAchievement.id}`);
    try {
      await deleteAchievement(deletingAchievement.id);
      mutate();
      setDeletingAchievement(null);
    } finally {
      setActionLoading(null);
    }
  };

  if (sortedAchievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          No achievements found for this time period.
        </p>
        <p className="text-sm text-muted-foreground/75 mt-1">
          Achievements logged during this review period will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        <Trophy className="size-4" />
        <span>
          {sortedAchievements.length} achievement
          {sortedAchievements.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {sortedAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className="border-b border-border pb-4 last:border-b-0 last:pb-0"
          >
            <AchievementItem
              achievement={achievement}
              onImpactChange={handleImpactChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
              readOnly={!!actionLoading}
              showSourceBadge={false}
              linkToAchievements={false}
              workstream={
                achievement.workstreamId
                  ? (workstreamMap.get(achievement.workstreamId) ?? null)
                  : null
              }
            />
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <AchievementDialog
        mode="edit"
        achievement={editingAchievement || undefined}
        open={!!editingAchievement}
        onOpenChange={(open) => !open && setEditingAchievement(null)}
        onSubmit={handleUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAchievementDialog
        open={!!deletingAchievement}
        onOpenChange={(open) => !open && setDeletingAchievement(null)}
        achievement={deletingAchievement}
        onConfirm={handleConfirmDelete}
        isDeleting={actionLoading?.startsWith('delete-')}
      />
    </div>
  );
}
