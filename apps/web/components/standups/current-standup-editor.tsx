'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'components/ui/button';
import { Checkbox } from 'components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { Separator } from 'components/ui/separator';
import { IconSparkles, IconCheck, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import type { Standup, StandupDocument } from '@bragdoc/database';
import { AchievementItem } from '@/components/achievements/achievement-item';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from '@/components/achievements/delete-achievement-dialog';
import { useAchievementActions } from '@/hooks/use-achievement-actions';

interface Achievement {
  id: string;
  title: string;
  summary: string | null;
  impact: number;
  projectName: string | null;
  companyName: string | null;
  createdAt: Date;
  source: string;
  eventStart: Date | null;
}

interface CurrentStandupEditorProps {
  standupId: string;
  standup: Standup;
  onAchievementImpactChange: (achievementId: string, impact: number) => void;
  onRefresh?: () => void;
}

export function CurrentStandupEditor({
  standupId,
  standup,
  onAchievementImpactChange,
  onRefresh,
}: CurrentStandupEditorProps) {
  const router = useRouter();

  // Document state
  const [currentStandupDocument, setCurrentStandupDocument] =
    useState<StandupDocument | null>(null);
  const [nextStandupDate, setNextStandupDate] = useState<Date | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);

  // Achievements state
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<
    Set<string>
  >(new Set());
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  // Achievement edit/delete actions hook with custom onRefresh for this component
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
  } = useAchievementActions({
    onRefresh: async () => {
      const achievementsRes = await fetch(
        `/api/standups/${standupId}/achievements/unassigned`,
      );
      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        const loadedAchievements = achievementsData.achievements || [];
        setAchievements(loadedAchievements);
        // Select all achievements by default after refresh
        setSelectedAchievementIds(
          new Set(loadedAchievements.map((a: Achievement) => a.id)),
        );
      }
      // Notify parent to refresh the other column as well
      onRefresh?.();
    },
  });

  // Achievements Summary state
  const [achievementsSummaryDraft, setAchievementsSummaryDraft] = useState('');
  const [achievementsSummaryOriginal, setAchievementsSummaryOriginal] =
    useState('');
  const [isAchievementsSummaryFocused, setIsAchievementsSummaryFocused] =
    useState(false);
  const [isSavingAchievementsSummary, setIsSavingAchievementsSummary] =
    useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const achievementsSummaryRef = useRef<HTMLTextAreaElement>(null);

  // WIP state
  const [wipDraft, setWipDraft] = useState('');
  const [wipOriginal, setWipOriginal] = useState('');
  const [isWipFocused, setIsWipFocused] = useState(false);
  const [isSavingWip, setIsSavingWip] = useState(false);
  const wipRef = useRef<HTMLTextAreaElement>(null);

  // Check if content has been edited
  const isAchievementsSummaryDirty =
    achievementsSummaryDraft !== achievementsSummaryOriginal;
  const isWipDirty = wipDraft !== wipOriginal;

  // Fetch current document and achievements on mount
  useEffect(() => {
    async function fetchData() {
      setIsLoadingDocument(true);
      setIsLoadingAchievements(true);

      try {
        // Fetch current document and achievements in parallel
        const [docRes, achievementsRes] = await Promise.all([
          fetch(`/api/standups/${standupId}/documents/current`),
          fetch(`/api/standups/${standupId}/achievements/unassigned`),
        ]);

        if (!docRes.ok || !achievementsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const docData = await docRes.json();
        const achievementsData = await achievementsRes.json();

        // Handle null document gracefully
        setCurrentStandupDocument(docData.document);
        setNextStandupDate(new Date(docData.nextStandupDate));
        const loadedAchievements = achievementsData.achievements || [];
        setAchievements(loadedAchievements);

        // Select all achievements by default
        setSelectedAchievementIds(
          new Set(loadedAchievements.map((a: Achievement) => a.id)),
        );

        // Initialize drafts and originals from document (or empty if document is null)
        const initialAchievementsSummary =
          docData.document?.achievementsSummary || '';
        const initialWip = docData.document?.wip || '';

        setAchievementsSummaryDraft(initialAchievementsSummary);
        setAchievementsSummaryOriginal(initialAchievementsSummary);
        setWipDraft(initialWip);
        setWipOriginal(initialWip);
      } catch (error) {
        console.error('Error fetching standup data:', error);
        toast.error('Failed to load standup data');
      } finally {
        setIsLoadingDocument(false);
        setIsLoadingAchievements(false);
      }
    }

    fetchData();
  }, [standupId]);

  // Toggle achievement selection
  const toggleAchievementSelection = (achievementId: string) => {
    setSelectedAchievementIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(achievementId)) {
        newSet.delete(achievementId);
      } else {
        newSet.add(achievementId);
      }
      return newSet;
    });
  };

  // Handle impact change with optimistic updates
  const handleImpactChange = async (achievementId: string, impact: number) => {
    // Optimistically update local state immediately
    setAchievements((prev) =>
      prev.map((a) => (a.id === achievementId ? { ...a, impact } : a)),
    );

    // Call parent handler (which handles the API call)
    await onAchievementImpactChange(achievementId, impact);
  };

  // Save achievements summary
  const handleSaveAchievementsSummary = async () => {
    setIsSavingAchievementsSummary(true);
    try {
      const response = await fetch(
        `/api/standups/${standupId}/achievements-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            achievementsSummary: achievementsSummaryDraft,
            source: 'manual',
            documentId: currentStandupDocument?.id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to save achievements summary');
      }

      const { document } = await response.json();
      setCurrentStandupDocument(document);
      setAchievementsSummaryOriginal(achievementsSummaryDraft);
      setIsAchievementsSummaryFocused(false);
      achievementsSummaryRef.current?.blur();
      toast.success('Achievements summary saved');
    } catch (error) {
      console.error('Error saving achievements summary:', error);
      toast.error('Failed to save achievements summary');
    } finally {
      setIsSavingAchievementsSummary(false);
    }
  };

  // Cancel achievements summary edits
  const handleCancelAchievementsSummary = () => {
    setAchievementsSummaryDraft(achievementsSummaryOriginal);
    setIsAchievementsSummaryFocused(false);
    achievementsSummaryRef.current?.blur();
  };

  // Regenerate achievements summary from selected achievements
  const handleRegenerateAchievementsSummary = async () => {
    if (selectedAchievementIds.size === 0) {
      toast.error('Please select at least one achievement to regenerate');
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await fetch(
        `/api/standups/${standupId}/achievements-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regenerate: true,
            achievementIds: Array.from(selectedAchievementIds),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate achievements summary');
      }

      const { document } = await response.json();
      setCurrentStandupDocument(document);
      const newSummary = document.achievementsSummary || '';
      setAchievementsSummaryDraft(newSummary);
      setAchievementsSummaryOriginal(newSummary);
      setIsAchievementsSummaryFocused(false);
      toast.success('Achievements summary regenerated');
    } catch (error) {
      console.error('Error regenerating achievements summary:', error);
      toast.error('Failed to regenerate achievements summary');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Save WIP
  const handleSaveWip = async () => {
    setIsSavingWip(true);
    try {
      const response = await fetch(`/api/standups/${standupId}/wip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wip: wipDraft,
          source: 'manual',
          documentId: currentStandupDocument?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save WIP');
      }

      const { document } = await response.json();
      setCurrentStandupDocument(document);
      setWipOriginal(wipDraft);
      setIsWipFocused(false);
      wipRef.current?.blur();
      toast.success('WIP saved');
    } catch (error) {
      console.error('Error saving WIP:', error);
      toast.error('Failed to save WIP');
    } finally {
      setIsSavingWip(false);
    }
  };

  // Cancel WIP edits
  const handleCancelWip = () => {
    setWipDraft(wipOriginal);
    setIsWipFocused(false);
    wipRef.current?.blur();
  };

  // Render source indicator
  const renderSourceIndicator = (
    source: 'manual' | 'llm' | null | undefined,
    hasContent: boolean,
  ) => {
    if (!hasContent) {
      return (
        <Badge variant="outline" className="text-xs">
          Not generated yet
        </Badge>
      );
    }

    if (source === 'llm') {
      return (
        <Badge variant="secondary" className="text-xs">
          <IconSparkles className="size-3 mr-1" />
          Auto-generated
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="text-xs">
        Edited by you
      </Badge>
    );
  };

  if (isLoadingDocument || isLoadingAchievements) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Current Standup</span>
          {nextStandupDate && (
            <span className="text-sm font-normal text-muted-foreground">
              {format(nextStandupDate, "EEE, MMM d 'at' h:mm a")}
              {' · '}
              {formatDistanceToNow(nextStandupDate, { addSuffix: true })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Achievements for Current Period */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Achievements</h3>
            <div className="flex items-center gap-2">
              {selectedAchievementIds.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedAchievementIds.size} selected
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateAchievementsSummary}
                disabled={isRegenerating || selectedAchievementIds.size === 0}
              >
                <IconSparkles className="size-4 mr-2" />
                {isRegenerating ? 'Generating...' : 'Regenerate Summary'}
              </Button>
            </div>
          </div>

          {achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unassigned achievements for this period
            </p>
          ) : (
            <div className="space-y-0">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="border-b border-border pb-4 last:border-b-0 flex items-start gap-3 mb-4"
                >
                  <Checkbox
                    checked={selectedAchievementIds.has(achievement.id)}
                    onCheckedChange={() =>
                      toggleAchievementSelection(achievement.id)
                    }
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <AchievementItem
                      achievement={achievement as any}
                      onImpactChange={handleImpactChange}
                      onEdit={(ach) => handleEditClick(ach as any)}
                      onDelete={(ach) => handleDeleteClick(ach as any)}
                      readOnly={false}
                      showSourceBadge={true}
                      linkToAchievements={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Achievements Summary - Inline Editable */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Achievements Summary</h3>
            {renderSourceIndicator(
              currentStandupDocument?.achievementsSummarySource,
              !!achievementsSummaryOriginal,
            )}
          </div>
          <textarea
            ref={achievementsSummaryRef}
            value={achievementsSummaryDraft}
            onChange={(e) => setAchievementsSummaryDraft(e.target.value)}
            onFocus={() => setIsAchievementsSummaryFocused(true)}
            placeholder="Click to add what you accomplished this period"
            rows={7}
            className={`w-full resize-none rounded-md px-3 py-2 text-sm transition-all
              ${
                isAchievementsSummaryFocused || achievementsSummaryDraft
                  ? 'border border-input bg-background'
                  : 'border-0 bg-transparent hover:bg-muted/50 cursor-text'
              }
              ${
                !achievementsSummaryDraft && !isAchievementsSummaryFocused
                  ? 'text-muted-foreground italic'
                  : 'text-foreground'
              }
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            `}
          />
          {isAchievementsSummaryDirty && isAchievementsSummaryFocused && (
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAchievementsSummary}
                disabled={isSavingAchievementsSummary}
                className="text-destructive hover:text-destructive"
              >
                <IconX className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveAchievementsSummary}
                disabled={isSavingAchievementsSummary}
                className="text-green-600 hover:text-green-600"
              >
                <IconCheck className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* WIP - Inline Editable */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Work In Progress</h3>
            {renderSourceIndicator(
              currentStandupDocument?.wipSource,
              !!wipOriginal,
            )}
          </div>
          <textarea
            ref={wipRef}
            value={wipDraft}
            onChange={(e) => setWipDraft(e.target.value)}
            onFocus={() => setIsWipFocused(true)}
            placeholder="Click to add what you're working on"
            rows={6}
            className={`w-full resize-none rounded-md px-3 py-2 text-sm transition-all
              ${
                isWipFocused || wipDraft
                  ? 'border border-input bg-background'
                  : 'border-0 bg-transparent hover:bg-muted/50 cursor-text'
              }
              ${
                !wipDraft && !isWipFocused
                  ? 'text-muted-foreground italic'
                  : 'text-foreground'
              }
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            `}
          />
          {isWipDirty && isWipFocused && (
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelWip}
                disabled={isSavingWip}
                className="text-destructive hover:text-destructive"
              >
                <IconX className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveWip}
                disabled={isSavingWip}
                className="text-green-600 hover:text-green-600"
              >
                <IconCheck className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Achievement Edit Dialog */}
      <AchievementDialog
        mode="edit"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        achievement={achievementToEdit as any}
        onSubmit={handleEditSubmit}
      />

      {/* Achievement Delete Dialog */}
      <DeleteAchievementDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        achievement={achievementToDelete as any}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeletingAchievement}
      />
    </Card>
  );
}
