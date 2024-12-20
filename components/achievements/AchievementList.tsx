import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { AchievementDialog } from './AchievementDialog';
import { AchievementActions } from './achievement-actions';
import { AchievementFilters } from './achievement-filters';
import { AchievementListSkeleton } from './achievement-list-skeleton';
import type { AchievementWithRelations as Achievement, AchievementFilters as AchievementFiltersType } from '@/lib/types/achievement';
import { useAchievements } from '@/hooks/use-achievements';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AchievementListProps {
  page: number;
  onPageChange: (page: number) => void;
  filters?: Partial<AchievementFiltersType>;
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
}: AchievementListProps) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    mode: 'create',
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyId, setCompanyId] = useState('all');
  const [projectId, setProjectId] = useState('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { companies } = useCompanies();
  const { projects } = useProjects();
  
  const { achievements, pagination, isLoading, mutate } = useAchievements({
    page,
    filters: {
      ...filters,
      searchQuery,
      companyId: companyId === 'all' ? undefined : companyId,
      projectId: projectId === 'all' ? undefined : projectId,
      startDate,
      endDate,
    },
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
      if (confirm('Are you sure you want to delete this achievement?')) {
        await deleteAchievement(id);
        mutate();
      }
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

  const handleReset = () => {
    setSearchQuery('');
    setCompanyId('all');
    setProjectId('all');
    setStartDate(undefined);
    setEndDate(undefined);
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
          <Button onClick={() => setDialog({ isOpen: true, mode: 'create' })}>
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
      <div className="flex justify-between items-center">
        <AchievementFilters
          companyId={companyId}
          onCompanyChange={setCompanyId}
          projectId={projectId}
          onProjectChange={setProjectId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          companies={companies || []}
          projects={projects || []}
          onReset={handleReset}
          loading={{
            company: isLoading,
            project: isLoading,
            search: isLoading,
          }}
        />

        <Button
          onClick={() => setDialog({ isOpen: true, mode: 'create' })}
          size="sm"
        >
          <PlusIcon className="mr-2 size-4" />
          New Achievement
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Achievement</TableHead>
              <TableHead className="min-w-[120px]">Company</TableHead>
              <TableHead className="min-w-[120px]">Project</TableHead>
              <TableHead className="min-w-[100px]">Duration</TableHead>
              <TableHead className="min-w-[120px]">Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {achievements.map((achievement, index) => (
              <motion.tr
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <TableCell>
                  <div>
                    <div className="font-medium transition-colors group-hover:text-primary">
                      {achievement.title}
                    </div>
                    {achievement.summary && (
                      <div className="text-sm text-muted-foreground">
                        {achievement.summary}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {achievement.company?.name || '-'}
                </TableCell>
                <TableCell>
                  {achievement.project?.name || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {achievement.eventDuration}
                  </Badge>
                </TableCell>
                <TableCell>
                  {achievement.eventStart
                    ? format(new Date(achievement.eventStart), 'MMM yyyy')
                    : '-'}
                </TableCell>
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
                    onArchive={() => handleArchive(achievement.id, achievement.isArchived || false)}
                    isArchived={achievement.isArchived || false}
                    isLoading={
                      actionLoading === `delete-${achievement.id}` ||
                      actionLoading === `archive-${achievement.id}`
                    }
                  />
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <AchievementDialog
        mode={dialog.mode}
        open={dialog.isOpen}
        onOpenChange={(open) =>
          setDialog((prev) => ({
            ...prev,
            isOpen: open,
          }))
        }
        achievement={dialog.achievement}
        onSubmit={dialog.mode === 'create' ? handleCreate : handleUpdate}
      />
    </div>
  );
}
