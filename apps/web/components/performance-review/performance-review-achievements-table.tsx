'use client';

import * as React from 'react';
import {
  IconStar,
  IconStarFilled,
  IconBuilding,
  IconFolder,
  IconCalendar,
  IconSearch,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { Trophy } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AchievementItem } from '@/components/achievements/achievement-item';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from '@/components/achievements/delete-achievement-dialog';
import { WorkstreamBadge } from '@/components/workstreams/workstream-badge';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievements } from '@/hooks/use-achievements';
import type { AchievementWithRelations } from '@/lib/types/achievement';
import type { Workstream } from '@bragdoc/database';

interface PerformanceReviewAchievementsTableProps {
  achievements: AchievementWithRelations[];
  workstreams?: Workstream[];
}

function StarRating({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="icon"
          className="size-4 p-0 hover:bg-transparent cursor-pointer"
          onClick={() => onRatingChange(star)}
        >
          {star <= rating ? (
            <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
          ) : (
            <IconStar className="size-3 text-muted-foreground hover:text-yellow-400" />
          )}
        </Button>
      ))}
    </div>
  );
}

/**
 * PerformanceReviewAchievementsTable - Displays achievements in a table format
 * for the performance review context.
 *
 * This is adapted from the main AchievementsTable component with:
 * - No "Generate Document" button
 * - No project/company/time period filter dropdowns
 * - Optional workstream filter (if workstreams exist)
 * - Search filter and Load More retained
 * - Edit and delete functionality
 */
export function PerformanceReviewAchievementsTable({
  achievements: initialAchievements,
  workstreams = [],
}: PerformanceReviewAchievementsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedWorkstream, setSelectedWorkstream] =
    React.useState<string>('all');
  const [displayCount, setDisplayCount] = React.useState(20);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [editingAchievement, setEditingAchievement] =
    React.useState<AchievementWithRelations | null>(null);
  const [deletingAchievement, setDeletingAchievement] =
    React.useState<AchievementWithRelations | null>(null);

  const { updateAchievement, deleteAchievement } = useAchievementMutations();
  const { mutate } = useAchievements();

  // Create a map of workstreams by ID for quick lookup
  const workstreamMap = React.useMemo(() => {
    const map = new Map<string, Workstream>();
    workstreams.forEach((ws) => map.set(ws.id, ws));
    return map;
  }, [workstreams]);

  // Filter achievements based on search and workstream filter
  const filteredAchievements = React.useMemo(() => {
    let filtered = initialAchievements;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (achievement) =>
          achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          achievement.summary
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          achievement.details?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Workstream filter
    if (selectedWorkstream !== 'all') {
      if (selectedWorkstream === 'unassigned') {
        filtered = filtered.filter((achievement) => !achievement.workstreamId);
      } else {
        filtered = filtered.filter(
          (achievement) => achievement.workstreamId === selectedWorkstream,
        );
      }
    }

    return filtered.sort((a, b) => {
      // Sort by eventStart (when achievement occurred), with createdAt as tiebreaker
      const aDate = a.eventStart?.getTime() ?? a.createdAt.getTime();
      const bDate = b.eventStart?.getTime() ?? b.createdAt.getTime();
      if (aDate !== bDate) {
        return bDate - aDate; // Sort by eventStart (most recent first)
      }
      return b.createdAt.getTime() - a.createdAt.getTime(); // Tiebreaker by createdAt
    });
  }, [initialAchievements, searchTerm, selectedWorkstream]);

  const displayedAchievements = filteredAchievements.slice(0, displayCount);
  const hasMore = filteredAchievements.length > displayCount;

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

  const handleEdit = (achievement: AchievementWithRelations) => {
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

  const handleDelete = (achievement: AchievementWithRelations) => {
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

  if (initialAchievements.length === 0) {
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5" />
                Achievements
              </CardTitle>
              <CardDescription>
                {filteredAchievements.length} achievement
                {filteredAchievements.length !== 1 ? 's' : ''} during this
                review period
              </CardDescription>
            </div>
          </div>

          {/* Filters - only search and workstream */}
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search achievements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {workstreams.length > 0 && (
              <Select
                value={selectedWorkstream}
                onValueChange={setSelectedWorkstream}
              >
                <SelectTrigger className="sm:w-[180px]">
                  <SelectValue placeholder="All Workstreams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workstreams</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {workstreams.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Achievement</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Impact Rating</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedAchievements.map((achievement) => {
                  const workstream = achievement.workstreamId
                    ? workstreamMap.get(achievement.workstreamId)
                    : null;
                  return (
                    <TableRow key={achievement.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium line-clamp-2">
                            {achievement.title}
                          </div>
                          {achievement.summary && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {achievement.summary}
                            </div>
                          )}
                          {workstream && (
                            <div className="mt-1">
                              <WorkstreamBadge workstream={workstream} />
                            </div>
                          )}
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
                        <div className="flex items-center gap-2">
                          <StarRating
                            rating={achievement.impact || 0}
                            onRatingChange={(rating) =>
                              handleImpactChange(achievement.id, rating)
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {achievement.impact}/10
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconCalendar className="size-4 text-muted-foreground" />
                          <span className="text-sm">
                            {achievement.eventStart
                              ? format(achievement.eventStart, 'MMM d, yyyy')
                              : format(achievement.createdAt, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(achievement)}
                            aria-label="Edit achievement"
                            className="h-8 w-8 p-0"
                          >
                            <IconEdit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(achievement)}
                            aria-label="Delete achievement"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <IconTrash className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-4">
            {displayedAchievements.map((achievement) => {
              const workstream = achievement.workstreamId
                ? workstreamMap.get(achievement.workstreamId)
                : null;
              return (
                <div
                  key={achievement.id}
                  className="border-b border-border pb-4 last:border-b-0"
                >
                  <AchievementItem
                    achievement={achievement}
                    onImpactChange={handleImpactChange}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    readOnly={!!actionLoading}
                    showSourceBadge={false}
                    linkToAchievements={false}
                    workstream={workstream ?? null}
                  />
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayCount((prev) => prev + 20)}
              >
                Load More ({filteredAchievements.length - displayCount}{' '}
                remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
