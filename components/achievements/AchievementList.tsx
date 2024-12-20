import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { AchievementDialog } from './AchievementDialog';
import { AchievementActions } from './achievement-actions';
import { AchievementListSkeleton } from './achievement-list-skeleton';
import type { AchievementWithRelations as Achievement, AchievementFilters as AchievementFiltersType } from '@/lib/types/achievement';
import { useAchievements } from '@/hooks/use-achievements';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AchievementListProps {
  page: number;
  onPageChange: (page: number) => void;
  filters?: Partial<AchievementFiltersType>;
  onCreateClick: () => void;
}

type DialogState = {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  achievement?: Achievement;
};

export function AchievementList({
  page,
  onPageChange,
  filters,
  onCreateClick,
}: AchievementListProps) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    mode: 'create',
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { achievements, pagination, isLoading, mutate } = useAchievements({
    page,
    filters,
  });

  const { createAchievement, updateAchievement, deleteAchievement } = useAchievementMutations();

  const handleCreate = async (data: any) => {
    setActionLoading('create');
    try {
      await createAchievement(data);
      mutate();
      setDialog((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async (data: any) => {
    if (dialog.achievement) {
      setActionLoading(`update-${dialog.achievement.id}`);
      try {
        await updateAchievement(dialog.achievement.id, data);
        mutate();
        setDialog((prev) => ({ ...prev, isOpen: false }));
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      await deleteAchievement(id);
      mutate();
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string, isArchived: boolean) => {
    setActionLoading(`archive-${id}`);
    try {
      await updateAchievement(id, { isArchived: !isArchived });
      mutate();
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <AchievementListSkeleton />;
  }

  if (achievements.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          No achievements
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding your first achievement.
        </p>
        <div className="mt-6">
          <Button onClick={onCreateClick}>
            <PlusIcon className="mr-2 size-4" />
            New Achievement
          </Button>
        </div>

        <AchievementDialog
          mode="create"
          open={dialog.isOpen}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, isOpen: open }))}
          onSubmit={handleCreate}
        />
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Achievement</TableHead>
              <TableHead className="min-w-[120px]">Company</TableHead>
              <TableHead className="min-w-[120px]">Project</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {achievements.map((achievement) => (
              <TableRow key={achievement.id}>
                <TableCell>{achievement.title}</TableCell>
                <TableCell>{achievement.company?.name ?? '-'}</TableCell>
                <TableCell>{achievement.project?.name ?? '-'}</TableCell>
                <TableCell>
                  <AchievementActions
                    onEdit={() =>
                      setDialog({
                        isOpen: true,
                        mode: 'edit',
                        achievement,
                      })
                    }
                    onDelete={() => handleDelete(achievement.id)}
                    isLoading={actionLoading === `delete-${achievement.id}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AchievementDialog
        mode={dialog.mode}
        achievement={dialog.achievement}
        open={dialog.isOpen}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, isOpen: open }))}
        onSubmit={dialog.mode === 'create' ? handleCreate : handleUpdate}
      />
    </div>
  );
}
