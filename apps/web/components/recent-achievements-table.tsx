'use client';

import * as React from 'react';
import {
  IconStar,
  IconStarFilled,
  IconBuilding,
  IconFolder,
  IconCalendar,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AchievementWithRelations } from '@/lib/types/achievement';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from '@/components/achievements/delete-achievement-dialog';
import { useAchievementActions } from '@/hooks/use-achievement-actions';

interface RecentAchievementsTableProps {
  achievements: AchievementWithRelations[];
  onRefresh?: () => Promise<void>;
}

export function RecentAchievementsTable({
  achievements,
  onRefresh,
}: RecentAchievementsTableProps) {
  const {
    editDialogOpen,
    setEditDialogOpen,
    achievementToEdit,
    handleEditClick,
    handleEditSubmit,
    deleteDialogOpen,
    setDeleteDialogOpen,
    achievementToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    isDeletingAchievement,
  } = useAchievementActions({ onRefresh });

  // Get the 10 most recent achievements
  const recentAchievements = React.useMemo(() => {
    return [...achievements]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10);
  }, [achievements]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Achievements</CardTitle>
        <CardDescription>
          Your latest accomplishments with impact ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Achievement</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Impact Rating</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAchievements.map((achievement) => (
                <TableRow key={achievement.id}>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium line-clamp-2">
                        {achievement.title}
                      </div>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {achievement.source}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {achievement.project ? (
                      <div className="flex items-center gap-2">
                        <IconFolder className="size-4 text-muted-foreground" />
                        <span className="text-sm">
                          {achievement.project.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No project
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {achievement.company ? (
                      <div className="flex items-center gap-2">
                        <IconBuilding className="size-4 text-muted-foreground" />
                        <span className="text-sm">
                          {achievement.company.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No company
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="size-3">
                          {i < (achievement.impact || 0) ? (
                            <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <IconStar className="size-3 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">
                        {achievement.impact || 0}/10
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="size-4 text-muted-foreground" />
                      <span className="text-sm">
                        {achievement.eventStart
                          ? format(
                              new Date(achievement.eventStart),
                              'MMM d, yyyy',
                            )
                          : 'No date'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(achievement)}
                        aria-label="Edit achievement"
                        className="h-8 w-8 p-0"
                      >
                        <IconEdit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(achievement)}
                        aria-label="Delete achievement"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Achievement Edit Dialog */}
      <AchievementDialog
        mode="edit"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        achievement={achievementToEdit || undefined}
        onSubmit={handleEditSubmit}
      />

      {/* Achievement Delete Dialog */}
      <DeleteAchievementDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        achievement={achievementToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeletingAchievement}
      />
    </Card>
  );
}
