import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from 'components/ui/button';
import { AchievementDialog } from './AchievementDialog';
import { AchievementActions } from './achievement-actions';
import { AchievementListSkeleton } from './achievement-list-skeleton';
import type {
  AchievementWithRelations as Achievement,
  AchievementFilters as AchievementFiltersType,
} from 'lib/types/achievement';
import { useAchievements } from 'hooks/use-achievements';
import { useAchievementMutations } from 'hooks/use-achievement-mutations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from 'components/ui/pagination';
import { ImpactRating } from 'components/ui/impact-rating';

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

  const { createAchievement, updateAchievement, deleteAchievement } =
    useAchievementMutations();

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

  const handleImpactChange = async (id: string, impact: number) => {
    setActionLoading(`impact-${id}`);

    if (!achievements || !pagination) return;

    // Optimistically update the UI
    const optimisticData = {
      achievements: achievements.map((achievement) =>
        achievement.id === id
          ? {
              ...achievement,
              impact,
              impactSource: 'user' as const,
              impactUpdatedAt: new Date(),
            }
          : achievement,
      ),
      pagination: {
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      },
    };

    try {
      // Optimistically update the cache
      mutate(optimisticData, false);

      await updateAchievement(id, {
        impact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });

      // After successful update, revalidate the data
      mutate();
    } catch (error) {
      // Revert optimistic update on error
      mutate();
      console.error('Error updating impact:', error);
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
          onOpenChange={(open) =>
            setDialog((prev) => ({ ...prev, isOpen: open }))
          }
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
              <TableHead>Impact</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell ">Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="sm:w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {achievements.map((achievement) => (
              <TableRow key={achievement.id}>
                <TableCell className="py-1 sm:p-2">
                  <ImpactRating
                    value={achievement.impact}
                    source={achievement.impactSource}
                    updatedAt={achievement.impactUpdatedAt}
                    onChange={(value) =>
                      handleImpactChange(achievement.id, value)
                    }
                    readOnly={!!actionLoading}
                  />
                </TableCell>
                <TableCell className="py-3 sm:p-2">
                  <div className="line-clamp-2">{achievement.title}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell sm:p-2">
                  {achievement.eventStart
                    ? new Date(achievement.eventStart).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell className="sm:p-2">
                  {achievement.project?.name
                    ? ` ${achievement.project.name}`
                    : ''}
                  {achievement.company?.name
                    ? `(${achievement.company.name})`
                    : ''}
                </TableCell>
                <TableCell className="sm:p-2">
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

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(page - 1)}
                  className={
                    page <= 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>

              {(() => {
                const visiblePages: (number | 'ellipsis')[] = [];
                const addPage = (p: number) => {
                  if (!visiblePages.includes(p)) {
                    visiblePages.push(p);
                  }
                };
                const addEllipsis = () => {
                  if (visiblePages[visiblePages.length - 1] !== 'ellipsis') {
                    visiblePages.push('ellipsis');
                  }
                };

                // Always show first page
                addPage(1);

                // Show two pages before and after current page
                const delta = 2;
                const leftBound = Math.max(2, page - delta);
                const rightBound = Math.min(
                  pagination.totalPages - 1,
                  page + delta,
                );

                // Add ellipsis if there's a gap after 1
                if (leftBound > 2) {
                  addEllipsis();
                }

                // Add pages around current page
                for (let i = leftBound; i <= rightBound; i++) {
                  addPage(i);
                }

                // Add ellipsis if there's a gap before last page
                if (rightBound < pagination.totalPages - 1) {
                  addEllipsis();
                }

                // Always show last page
                if (pagination.totalPages > 1) {
                  addPage(pagination.totalPages);
                }

                return visiblePages.map((p, i) => (
                  <PaginationItem key={`${p}-${i}`}>
                    {p === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange(p)}
                        isActive={p === page}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ));
              })()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(page + 1)}
                  className={
                    page >= pagination.totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AchievementDialog
        mode={dialog.mode}
        achievement={dialog.achievement}
        open={dialog.isOpen}
        onOpenChange={(open) =>
          setDialog((prev) => ({ ...prev, isOpen: open }))
        }
        onSubmit={dialog.mode === 'create' ? handleCreate : handleUpdate}
      />
    </div>
  );
}
