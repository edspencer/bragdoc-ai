'use client';

import * as React from 'react';
import { IconFolder, IconCalendar, IconPencil } from '@tabler/icons-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ImpactRating } from '@/components/ui/impact-rating';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
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
import type { Workstream } from '@bragdoc/database';

interface WorkstreamAchievementsTableProps {
  achievements: AchievementWithRelations[];
  workstreams: Workstream[];
  selectedWorkstreamId: string | null;
  onGenerateWorkstreams?: () => void;
  onClose?: () => void;
  isGenerating?: boolean;
  generationStatus?: string;
  startDate?: Date;
  endDate?: Date;
  onEditWorkstream?: (workstream: Workstream) => void;
}

export function WorkstreamAchievementsTable({
  achievements,
  workstreams,
  selectedWorkstreamId,
  onGenerateWorkstreams,
  onClose,
  isGenerating,
  generationStatus,
  startDate,
  endDate,
  onEditWorkstream,
}: WorkstreamAchievementsTableProps) {
  const [showOlderAchievements, setShowOlderAchievements] =
    React.useState(false);

  // Track optimistic impact updates locally
  const [impactOverrides, setImpactOverrides] = React.useState<
    Record<string, number>
  >({});

  const { updateAchievement } = useAchievementMutations();

  const handleImpactChange = async (id: string, newImpact: number) => {
    // Optimistically update local state immediately
    setImpactOverrides((prev) => ({ ...prev, [id]: newImpact }));

    try {
      await updateAchievement(id, {
        impact: newImpact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });
    } catch (error) {
      // Revert on error
      setImpactOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      console.error('Failed to update impact:', error);
    }
  };

  // Helper to get the current impact value (local override or original)
  const getImpact = (achievement: AchievementWithRelations) => {
    return impactOverrides[achievement.id] ?? achievement.impact ?? 2;
  };

  // Filter achievements based on selection and date range
  const { inRangeAchievements, olderAchievements } = React.useMemo(() => {
    let filtered = achievements;

    if (selectedWorkstreamId) {
      // Show achievements for selected workstream
      filtered = filtered.filter(
        (achievement) => achievement.workstreamId === selectedWorkstreamId,
      );
    } else {
      // Default: show unassigned achievements
      filtered = filtered.filter((achievement) => !achievement.workstreamId);
    }

    // Sort by date (most recent first)
    const sorted = filtered.sort((a, b) => {
      const aDate = a.eventStart
        ? new Date(a.eventStart).getTime()
        : new Date(a.createdAt).getTime();
      const bDate = b.eventStart
        ? new Date(b.eventStart).getTime()
        : new Date(b.createdAt).getTime();
      return bDate - aDate;
    });

    // Split into in-range and older achievements if date range is specified
    if (startDate) {
      const startTime = startDate.getTime();
      const inRange: AchievementWithRelations[] = [];
      const older: AchievementWithRelations[] = [];

      for (const achievement of sorted) {
        const achievementDate = achievement.eventStart
          ? new Date(achievement.eventStart).getTime()
          : new Date(achievement.createdAt).getTime();

        if (achievementDate >= startTime) {
          inRange.push(achievement);
        } else {
          older.push(achievement);
        }
      }

      return { inRangeAchievements: inRange, olderAchievements: older };
    }

    // No date filtering - all achievements are in range
    return { inRangeAchievements: sorted, olderAchievements: [] };
  }, [achievements, selectedWorkstreamId, startDate]);

  const filteredAchievements = inRangeAchievements;

  // Get title based on selection
  const getTitle = () => {
    if (selectedWorkstreamId) {
      const workstream = workstreams.find(
        (ws) => ws.id === selectedWorkstreamId,
      );
      return workstream ? `${workstream.name} Achievements` : 'Achievements';
    }
    return 'Unassigned Achievements';
  };

  const getDescription = () => {
    const totalCount = filteredAchievements.length + olderAchievements.length;
    const hasOlder = olderAchievements.length > 0;

    if (selectedWorkstreamId) {
      return hasOlder
        ? `Showing ${filteredAchievements.length} of ${totalCount} achievement${totalCount === 1 ? '' : 's'} in this workstream`
        : `Showing ${filteredAchievements.length} achievement${filteredAchievements.length === 1 ? '' : 's'} in this workstream`;
    }
    return hasOlder
      ? `Showing ${filteredAchievements.length} of ${totalCount} unassigned achievement${totalCount === 1 ? '' : 's'}`
      : `Showing ${filteredAchievements.length} unassigned achievement${filteredAchievements.length === 1 ? '' : 's'}`;
  };

  // Get workstream color for styling
  const selectedWorkstream = selectedWorkstreamId
    ? workstreams.find((ws) => ws.id === selectedWorkstreamId)
    : null;

  // Build dynamic styles for the card
  const cardStyle: React.CSSProperties = selectedWorkstream
    ? {
        borderColor: selectedWorkstream.color || undefined,
        backgroundColor: `${selectedWorkstream.color}08`, // 3% opacity (08 in hex)
      }
    : {};

  // Helper to render achievement row (desktop)
  const renderAchievementRow = (
    achievement: AchievementWithRelations,
    isOlder = false,
  ) => (
    <TableRow key={achievement.id} className={isOlder ? 'opacity-50' : ''}>
      <TableCell className="max-w-sm">
        <div className="flex flex-col gap-1">
          <div
            className={`font-medium line-clamp-2 ${isOlder ? 'italic' : ''}`}
          >
            {achievement.title}
          </div>
          {achievement.summary && (
            <div
              className={`text-sm text-muted-foreground line-clamp-1 ${isOlder ? 'italic' : ''}`}
            >
              {achievement.summary}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {achievement.project ? (
          <div className="flex items-center gap-2">
            <IconFolder
              className="size-4"
              style={{ color: achievement.project.color }}
            />
            <span
              className={`text-sm font-medium ${isOlder ? 'italic' : ''}`}
              style={{ color: achievement.project.color }}
            >
              {achievement.project.name}
            </span>
          </div>
        ) : (
          <span
            className={`text-sm text-muted-foreground ${isOlder ? 'italic' : ''}`}
          >
            No project
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <IconCalendar className="size-4 text-muted-foreground" />
          <span className={`text-sm ${isOlder ? 'italic' : ''}`}>
            {achievement.eventStart
              ? format(achievement.eventStart, 'MMM d')
              : format(achievement.createdAt, 'MMM d')}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <ImpactRating
          value={getImpact(achievement)}
          source={achievement.impactSource}
          onChange={(value) => handleImpactChange(achievement.id, value)}
          tooltipDelayDuration={500}
        />
      </TableCell>
    </TableRow>
  );

  // Helper to render achievement card (mobile)
  const renderAchievementCard = (
    achievement: AchievementWithRelations,
    isOlder = false,
  ) => (
    <div
      key={achievement.id}
      className={`border-b border-border pb-4 last:border-b-0 ${isOlder ? 'opacity-50' : ''}`}
    >
      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <div className={`font-medium ${isOlder ? 'italic' : ''}`}>
            {achievement.title}
          </div>
          {achievement.summary && (
            <div
              className={`text-sm text-muted-foreground ${isOlder ? 'italic' : ''}`}
            >
              {achievement.summary}
            </div>
          )}
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          {achievement.project && (
            <div className="flex items-center gap-2">
              <IconFolder
                className="size-4"
                style={{ color: achievement.project.color }}
              />
              <span
                className={`font-medium ${isOlder ? 'italic' : ''}`}
                style={{ color: achievement.project.color }}
              >
                {achievement.project.name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IconCalendar className="size-4" />
            <span className={isOlder ? 'italic' : ''}>
              {achievement.eventStart
                ? format(achievement.eventStart, 'MMM d')
                : format(achievement.createdAt, 'MMM d')}
            </span>
          </div>
        </div>
        <div className="pt-1">
          <ImpactRating
            value={getImpact(achievement)}
            source={achievement.impactSource}
            onChange={(value) => handleImpactChange(achievement.id, value)}
            tooltipDelayDuration={500}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Card style={cardStyle} className={selectedWorkstream ? 'border-2' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              {selectedWorkstream?.color && (
                <div
                  className="size-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedWorkstream.color }}
                />
              )}
              {getTitle()}
            </CardTitle>
            {selectedWorkstream?.description && (
              <div className="text-sm text-muted-foreground">
                {selectedWorkstream.description}
              </div>
            )}
            <CardDescription>{getDescription()}</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Edit button - only show when workstream selected */}
            {selectedWorkstreamId && onEditWorkstream && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const workstream = workstreams.find(
                    (w) => w.id === selectedWorkstreamId,
                  );
                  if (workstream) {
                    onEditWorkstream(workstream);
                  }
                }}
                title="Edit workstream"
              >
                <IconPencil className="size-4" />
                <span className="hidden sm:inline ml-2">Edit</span>
              </Button>
            )}
            {/* Auto-assign and Close buttons - only show when viewing unassigned */}
            {!selectedWorkstreamId &&
              filteredAchievements.length > 0 &&
              (onGenerateWorkstreams || onClose) && (
                <>
                  {onGenerateWorkstreams && (
                    <Button
                      size="sm"
                      onClick={onGenerateWorkstreams}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {generationStatus || 'Auto-assigning...'}
                        </>
                      ) : (
                        'Auto-assign to Workstreams'
                      )}
                    </Button>
                  )}
                  {onClose && (
                    <Button size="sm" variant="outline" onClick={onClose}>
                      Close
                    </Button>
                  )}
                </>
              )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAchievements.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>
              {selectedWorkstreamId
                ? 'No achievements in this workstream'
                : 'No unassigned achievements'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Achievement</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAchievements.map((achievement) =>
                      renderAchievementRow(achievement),
                    )}
                    {showOlderAchievements &&
                      olderAchievements.map((achievement) =>
                        renderAchievementRow(achievement, true),
                      )}
                  </TableBody>
                </Table>
              </div>

              {/* Toggle Button for Older Achievements (Desktop) */}
              {olderAchievements.length > 0 && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowOlderAchievements(!showOlderAchievements)
                    }
                  >
                    {showOlderAchievements
                      ? 'Hide older achievements'
                      : `${olderAchievements.length} older achievement${olderAchievements.length === 1 ? '' : 's'} hidden`}
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile List View */}
            <div className="md:hidden space-y-4">
              <div className="space-y-4">
                {filteredAchievements.map((achievement) =>
                  renderAchievementCard(achievement),
                )}
                {showOlderAchievements &&
                  olderAchievements.map((achievement) =>
                    renderAchievementCard(achievement, true),
                  )}
              </div>

              {/* Toggle Button for Older Achievements (Mobile) */}
              {olderAchievements.length > 0 && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowOlderAchievements(!showOlderAchievements)
                    }
                  >
                    {showOlderAchievements
                      ? 'Hide older achievements'
                      : `${olderAchievements.length} older achievement${olderAchievements.length === 1 ? '' : 's'} hidden`}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
