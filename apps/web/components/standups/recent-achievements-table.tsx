'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import type { Standup, StandupDocument, Achievement } from '@bragdoc/database';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { AchievementItem } from '@/components/achievements/achievement-item';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from '@/components/achievements/delete-achievement-dialog';
import { calculateStandupOccurrences } from '@/lib/standups/calculate-standup-occurrences';
import { getStandupAchievementDateRange } from '@/lib/scheduling/nextRun';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'components/ui/alert-dialog';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecentAchievementsTableProps {
  standupId: string;
  standup: Standup;
  onImpactChange: (achievementId: string, impact: number) => void;
  onRefresh?: () => void;
}

/**
 * Calculate date range for a given week offset
 * @param weekOffset 0 = current week, -1 = previous week, etc.
 */
function getWeekDateRange(weekOffset: number): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const startDate = addDays(now, weekOffset * 7 - 7);
  const endDate = addDays(now, weekOffset * 7);

  return {
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
  };
}

/**
 * Format meeting time from HH:mm to human-readable format
 */
function formatMeetingTime(meetingTime: string): string {
  const timeParts = meetingTime.split(':').map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const timeStr =
    minutes > 0
      ? `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`
      : `${displayHours}${period}`;
  return timeStr;
}

export function RecentAchievementsTable({
  standupId,
  standup,
  onImpactChange,
  onRefresh,
}: RecentAchievementsTableProps) {
  const router = useRouter();

  // State
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = prev week
  const [documents, setDocuments] = useState<StandupDocument[]>([]);
  const [achievementsByDocument, setAchievementsByDocument] = useState<
    Map<string, Achievement[]>
  >(new Map());
  const [orphanedAchievements, setOrphanedAchievements] = useState<
    Achievement[]
  >([]);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(
    new Set(),
  );
  const [expandedWips, setExpandedWips] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasRecentAchievements, setHasRecentAchievements] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hoveredDocumentId, setHoveredDocumentId] = useState<string | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] =
    useState<StandupDocument | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [achievementToDelete, setAchievementToDelete] =
    useState<Achievement | null>(null);
  const [showAchievementDeleteDialog, setShowAchievementDeleteDialog] =
    useState(false);
  const [isDeletingAchievement, setIsDeletingAchievement] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [achievementToEdit, setAchievementToEdit] =
    useState<Achievement | null>(null);
  const [isEditingAchievement, setIsEditingAchievement] = useState(false);

  // Navigation handlers
  const handlePrevWeek = () => {
    setWeekOffset((offset) => offset - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset((offset) => offset + 1);
  };

  // Disable "Next" if weekOffset === 0 (can't go into future)
  const canGoNext = weekOffset < 0;

  // Calculate expected standup occurrences for current date range
  const expectedOccurrences = useMemo(() => {
    const { startDate, endDate } = getWeekDateRange(weekOffset);
    const allOccurrences = calculateStandupOccurrences(
      startDate,
      endDate,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );
    // Only count past occurrences
    const now = new Date();
    return allOccurrences.filter((date) => date <= now);
  }, [weekOffset, standup.timezone, standup.meetingTime, standup.daysMask]);

  // Calculate current standup's start date to filter out achievements that belong to it
  const currentStandupStartDate = useMemo(() => {
    const now = new Date();
    const currentStandupRange = getStandupAchievementDateRange(
      now,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );
    return currentStandupRange.startDate;
  }, [standup.timezone, standup.meetingTime, standup.daysMask]);

  // Filter orphaned achievements to exclude those that belong to current standup
  const filteredOrphanedAchievements = useMemo(() => {
    return orphanedAchievements.filter((achievement) => {
      const achievementDate = new Date(
        achievement.eventStart || achievement.createdAt,
      );
      return achievementDate < currentStandupStartDate;
    });
  }, [orphanedAchievements, currentStandupStartDate]);

  // Determine if we should show the "Generate Missing Standup Documents" button
  const shouldShowGenerateButton =
    documents.length < expectedOccurrences.length &&
    filteredOrphanedAchievements.length > 0;

  // Calculate title based on week offset
  const title = useMemo(() => {
    if (weekOffset === 0) {
      return 'Past 7 days';
    }
    const { startDate, endDate } = getWeekDateRange(weekOffset);
    const startFormatted = format(startDate, 'EEE, MMM d');
    const endFormatted = format(endDate, 'EEE, MMM d');
    return `${startFormatted} - ${endFormatted}`;
  }, [weekOffset]);

  // Impact change handler with optimistic updates
  const handleImpactChange = async (achievementId: string, impact: number) => {
    // Call parent handler
    await onImpactChange(achievementId, impact);

    // Optimistically update local state
    // Update in achievementsByDocument
    const updatedByDocument = new Map(achievementsByDocument);
    for (const [docId, achievements] of updatedByDocument.entries()) {
      const updatedAchievements = achievements.map((a) =>
        a.id === achievementId ? { ...a, impact } : a,
      );
      updatedByDocument.set(docId, updatedAchievements);
    }
    setAchievementsByDocument(updatedByDocument);

    // Update in orphanedAchievements
    setOrphanedAchievements((prev) =>
      prev.map((a) => (a.id === achievementId ? { ...a, impact } : a)),
    );
  };

  // Edit handler for achievements
  const handleEditAchievement = (achievement: Achievement) => {
    setAchievementToEdit(achievement);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: any) => {
    if (!achievementToEdit) return;

    setIsEditingAchievement(true);
    try {
      const response = await fetch(
        `/api/achievements/${achievementToEdit.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update achievement');
      }

      // Refetch data to update UI
      const { startDate, endDate } = getWeekDateRange(weekOffset);
      const achievementsRes = await fetch(
        `/api/standups/${standupId}/achievements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      );

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();

        // Regroup achievements
        const byDocument = new Map<string, Achievement[]>();
        const orphaned: Achievement[] = [];
        for (const achievement of achievementsData) {
          if (achievement.standupDocumentId) {
            const existing =
              byDocument.get(achievement.standupDocumentId) || [];
            existing.push(achievement);
            byDocument.set(achievement.standupDocumentId, existing);
          } else {
            orphaned.push(achievement);
          }
        }
        setAchievementsByDocument(byDocument);
        setOrphanedAchievements(orphaned);
      }

      // Close dialog and reset state
      setEditDialogOpen(false);
      setAchievementToEdit(null);
      toast.success('Achievement updated successfully');
      // Notify parent to refresh the other column as well
      onRefresh?.();
    } catch (error) {
      console.error('Error updating achievement:', error);
      toast.error('Failed to update achievement');
    } finally {
      setIsEditingAchievement(false);
    }
  };

  // Delete handler for documents
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/standups/${standupId}/documents/${documentToDelete.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete standup document');
      }

      toast.success('Standup document deleted');

      // Refetch data
      const { startDate, endDate } = getWeekDateRange(weekOffset);
      const [documentsRes, achievementsRes] = await Promise.all([
        fetch(
          `/api/standups/${standupId}/documents?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        ),
        fetch(
          `/api/standups/${standupId}/achievements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        ),
      ]);

      if (documentsRes.ok && achievementsRes.ok) {
        const documentsData = await documentsRes.json();
        const achievementsData = await achievementsRes.json();
        setDocuments(documentsData);

        // Regroup achievements
        const byDocument = new Map<string, Achievement[]>();
        const orphaned: Achievement[] = [];
        for (const achievement of achievementsData) {
          if (achievement.standupDocumentId) {
            const existing =
              byDocument.get(achievement.standupDocumentId) || [];
            existing.push(achievement);
            byDocument.set(achievement.standupDocumentId, existing);
          } else {
            orphaned.push(achievement);
          }
        }
        setAchievementsByDocument(byDocument);
        setOrphanedAchievements(orphaned);
        setExpandedDocuments(
          new Set(documentsData.map((doc: StandupDocument) => doc.id)),
        );
      }

      // Refresh the page to ensure all data is up to date
      router.refresh();

      // Close dialog and reset state only on success
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Error deleting standup document:', error);
      toast.error('Failed to delete standup document');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete handler for achievements
  const handleDeleteAchievement = async () => {
    if (!achievementToDelete) return;

    setIsDeletingAchievement(true);
    try {
      const response = await fetch(
        `/api/achievements/${achievementToDelete.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete achievement');
      }

      // Refetch data to update UI
      const { startDate, endDate } = getWeekDateRange(weekOffset);
      const achievementsRes = await fetch(
        `/api/standups/${standupId}/achievements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      );

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();

        // Regroup achievements
        const byDocument = new Map<string, Achievement[]>();
        const orphaned: Achievement[] = [];
        for (const achievement of achievementsData) {
          if (achievement.standupDocumentId) {
            const existing =
              byDocument.get(achievement.standupDocumentId) || [];
            existing.push(achievement);
            byDocument.set(achievement.standupDocumentId, existing);
          } else {
            orphaned.push(achievement);
          }
        }
        setAchievementsByDocument(byDocument);
        setOrphanedAchievements(orphaned);
      }

      // Refresh the page to ensure all data is up to date
      router.refresh();

      // Close dialog and reset state
      setShowAchievementDeleteDialog(false);
      setAchievementToDelete(null);
      // Notify parent to refresh the other column as well
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error; // Re-throw for DeleteAchievementDialog to handle
    } finally {
      setIsDeletingAchievement(false);
    }
  };

  // Fetch data when weekOffset changes
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { startDate, endDate } = getWeekDateRange(weekOffset);

        const [documentsRes, achievementsRes] = await Promise.all([
          fetch(
            `/api/standups/${standupId}/documents?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          ),
          fetch(
            `/api/standups/${standupId}/achievements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          ),
        ]);

        if (!documentsRes.ok || !achievementsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const documentsData = await documentsRes.json();
        const achievementsData = await achievementsRes.json();

        setDocuments(documentsData);

        // Group achievements by standupDocumentId
        const byDocument = new Map<string, Achievement[]>();
        const orphaned: Achievement[] = [];

        for (const achievement of achievementsData) {
          if (achievement.standupDocumentId) {
            const existing =
              byDocument.get(achievement.standupDocumentId) || [];
            existing.push(achievement);
            byDocument.set(achievement.standupDocumentId, existing);
          } else {
            orphaned.push(achievement);
          }
        }

        setAchievementsByDocument(byDocument);
        setOrphanedAchievements(orphaned);

        // Initialize all documents as expanded
        setExpandedDocuments(
          new Set(documentsData.map((doc: StandupDocument) => doc.id)),
        );

        // Check if we have achievements for the generate button
        setHasRecentAchievements(achievementsData.length > 0);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [standupId, weekOffset]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevWeek}
              className="gap-1"
            >
              <IconChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              disabled={!canGoNext}
              className="gap-1"
            >
              Next
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading achievements...
          </div>
        ) : documents.length === 0 &&
          filteredOrphanedAchievements.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No achievements recorded for this week
          </div>
        ) : (
          <div className="space-y-6">
            {/* Standup Document Sections */}
            {documents.map((doc) => {
              const isExpanded = expandedDocuments.has(doc.id);
              const achievements = achievementsByDocument.get(doc.id) || [];
              const isSummaryExpanded = expandedSummaries.has(doc.id);
              const isWipExpanded = expandedWips.has(doc.id);

              return (
                <Collapsible
                  key={doc.id}
                  open={isExpanded}
                  onOpenChange={(open) => {
                    const newSet = new Set(expandedDocuments);
                    if (open) {
                      newSet.add(doc.id);
                    } else {
                      newSet.delete(doc.id);
                    }
                    setExpandedDocuments(newSet);
                  }}
                  className="relative"
                  onMouseEnter={() => setHoveredDocumentId(doc.id)}
                  onMouseLeave={() => setHoveredDocumentId(null)}
                >
                  {/* Delete button positioned absolutely */}
                  {hoveredDocumentId === doc.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocumentToDelete(doc);
                        setShowDeleteDialog(true);
                      }}
                      className="absolute top-0 right-0 z-10 p-1 hover:bg-destructive/10 rounded-md transition-colors text-muted-foreground hover:text-destructive"
                      aria-label="Delete standup document"
                    >
                      <IconTrash className="size-4" />
                    </button>
                  )}

                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start gap-3 hover:bg-muted/50 transition-colors">
                      <IconChevronDown
                        className={cn(
                          'size-5 mt-0.5 transition-transform duration-200 flex-shrink-0',
                          isExpanded ? 'rotate-0' : '-rotate-90',
                        )}
                      />
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 font-semibold">
                          <span>
                            {format(new Date(doc.date), 'EEE, MMM d')} at{' '}
                            {formatMeetingTime(standup.meetingTime)}
                          </span>
                          {achievements.length > 0 && (
                            <span className="text-xs text-muted-foreground font-normal">
                              ({achievements.length} achievement
                              {achievements.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pb-4">
                    <div className="space-y-4">
                      {/* Nested: Achievements Summary */}
                      {doc.summary && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {doc.summary}
                        </p>
                      )}
                      {doc.achievementsSummary && (
                        <Collapsible
                          open={isSummaryExpanded}
                          onOpenChange={(open) => {
                            const newSet = new Set(expandedSummaries);
                            if (open) {
                              newSet.add(doc.id);
                            } else {
                              newSet.delete(doc.id);
                            }
                            setExpandedSummaries(newSet);
                          }}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                            <IconChevronDown
                              className={cn(
                                'size-4 transition-transform duration-200',
                                isSummaryExpanded ? 'rotate-0' : '-rotate-90',
                              )}
                            />
                            Achievements Summary
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 text-sm whitespace-pre-wrap">
                            {doc.achievementsSummary}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Achievement List */}
                      {achievements.length > 0 ? (
                        <div className="space-y-0">
                          {achievements.map((achievement) => (
                            <div
                              key={achievement.id}
                              className="border-b border-border pb-4 last:border-b-0"
                            >
                              <AchievementItem
                                achievement={achievement as any}
                                onImpactChange={handleImpactChange}
                                onEdit={handleEditAchievement}
                                onDelete={(ach) => {
                                  setAchievementToDelete(ach as Achievement);
                                  setShowAchievementDeleteDialog(true);
                                }}
                                readOnly={false}
                                showSourceBadge={true}
                                linkToAchievements={false}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No achievements recorded
                        </p>
                      )}

                      {/* Nested: Work in Progress */}
                      {doc.wip && (
                        <Collapsible
                          open={isWipExpanded}
                          onOpenChange={(open) => {
                            const newSet = new Set(expandedWips);
                            if (open) {
                              newSet.add(doc.id);
                            } else {
                              newSet.delete(doc.id);
                            }
                            setExpandedWips(newSet);
                          }}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                            <IconChevronDown
                              className={cn(
                                'size-4 transition-transform duration-200',
                                isWipExpanded ? 'rotate-0' : '-rotate-90',
                              )}
                            />
                            Work in Progress
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 text-sm whitespace-pre-wrap">
                            {doc.wip}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {/* Show generate button if missing documents */}
            {shouldShowGenerateButton && (
              <div className="flex items-center justify-center py-8">
                <Button
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      // Get the current week's date range
                      const { startDate, endDate } =
                        getWeekDateRange(weekOffset);

                      // Generate standup documents for the current week range
                      const response = await fetch(
                        `/api/standups/${standupId}/regenerate-standup-documents?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                        },
                      );
                      if (!response.ok) {
                        throw new Error('Failed to generate standup documents');
                      }
                      // Refetch data
                      const [documentsRes, achievementsRes] = await Promise.all(
                        [
                          fetch(
                            `/api/standups/${standupId}/documents?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                          ),
                          fetch(
                            `/api/standups/${standupId}/achievements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                          ),
                        ],
                      );
                      if (documentsRes.ok && achievementsRes.ok) {
                        const documentsData = await documentsRes.json();
                        const achievementsData = await achievementsRes.json();
                        setDocuments(documentsData);
                        // Regroup achievements
                        const byDocument = new Map<string, Achievement[]>();
                        const orphaned: Achievement[] = [];
                        for (const achievement of achievementsData) {
                          if (achievement.standupDocumentId) {
                            const existing =
                              byDocument.get(achievement.standupDocumentId) ||
                              [];
                            existing.push(achievement);
                            byDocument.set(
                              achievement.standupDocumentId,
                              existing,
                            );
                          } else {
                            orphaned.push(achievement);
                          }
                        }
                        setAchievementsByDocument(byDocument);
                        setOrphanedAchievements(orphaned);
                        setExpandedDocuments(
                          new Set(
                            documentsData.map((doc: StandupDocument) => doc.id),
                          ),
                        );
                      }
                    } catch (error) {
                      console.error('Error generating standups:', error);
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  disabled={isGenerating}
                  size="lg"
                  className="gap-2"
                >
                  <IconSparkles className="size-5" />
                  {isGenerating
                    ? 'Generating Standups...'
                    : 'Generate Missing Standup Documents'}
                </Button>
              </div>
            )}

            {/* Orphaned Achievements Section */}
            {filteredOrphanedAchievements.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Other Achievements (not assigned to standup)
                </h3>
                <div className="space-y-0">
                  {filteredOrphanedAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="border-b border-border pb-4 last:border-b-0"
                    >
                      <AchievementItem
                        achievement={achievement as any}
                        onImpactChange={handleImpactChange}
                        onEdit={handleEditAchievement}
                        onDelete={(ach) => {
                          setAchievementToDelete(ach as Achievement);
                          setShowAchievementDeleteDialog(true);
                        }}
                        readOnly={false}
                        showSourceBadge={true}
                        linkToAchievements={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog for Standup Documents */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Standup Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this standup document from{' '}
              {documentToDelete &&
                format(new Date(documentToDelete.date), 'EEE, MMM d')}
              ? This action cannot be undone. Achievements will not be deleted,
              but they will be unassigned from this standup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog for Achievements */}
      <DeleteAchievementDialog
        open={showAchievementDeleteDialog}
        onOpenChange={setShowAchievementDeleteDialog}
        achievement={achievementToDelete as any}
        onConfirm={handleDeleteAchievement}
        isDeleting={isDeletingAchievement}
      />

      {/* Edit Achievement Dialog */}
      <AchievementDialog
        mode="edit"
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setAchievementToEdit(null);
          }
        }}
        achievement={achievementToEdit as any}
        onSubmit={handleEditSubmit}
      />
    </Card>
  );
}
