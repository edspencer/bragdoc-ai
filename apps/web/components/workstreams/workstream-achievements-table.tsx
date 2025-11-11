'use client';

import * as React from 'react';
import { IconFolder, IconBuilding, IconCalendar } from '@tabler/icons-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

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
import type { Workstream } from '@bragdoc/database';

interface WorkstreamAchievementsTableProps {
  achievements: AchievementWithRelations[];
  workstreams: Workstream[];
  selectedWorkstreamId: string | null;
  onGenerateWorkstreams?: () => void;
  isGenerating?: boolean;
}

export function WorkstreamAchievementsTable({
  achievements,
  workstreams,
  selectedWorkstreamId,
  onGenerateWorkstreams,
  isGenerating,
}: WorkstreamAchievementsTableProps) {
  // Filter achievements based on selection
  const filteredAchievements = React.useMemo(() => {
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
    return filtered.sort((a, b) => {
      const aDate = a.eventStart
        ? new Date(a.eventStart).getTime()
        : new Date(a.createdAt).getTime();
      const bDate = b.eventStart
        ? new Date(b.eventStart).getTime()
        : new Date(b.createdAt).getTime();
      return bDate - aDate;
    });
  }, [achievements, selectedWorkstreamId]);

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
    if (selectedWorkstreamId) {
      return `Showing ${filteredAchievements.length} achievement${filteredAchievements.length === 1 ? '' : 's'} in this workstream`;
    }
    return `Showing ${filteredAchievements.length} unassigned achievement${filteredAchievements.length === 1 ? '' : 's'}`;
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

  return (
    <Card style={cardStyle} className={selectedWorkstream ? 'border-2' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              {selectedWorkstream && selectedWorkstream.color && (
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
          {!selectedWorkstreamId &&
            filteredAchievements.length > 0 &&
            onGenerateWorkstreams && (
              <Button
                size="sm"
                onClick={onGenerateWorkstreams}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign to Workstreams'
                )}
              </Button>
            )}
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
          <div className="hidden md:block overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Achievement</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAchievements.map((achievement) => (
                  <TableRow key={achievement.id}>
                    <TableCell className="max-w-sm">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium line-clamp-2">
                          {achievement.title}
                        </div>
                        {achievement.summary && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {achievement.summary}
                          </div>
                        )}
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
                      <div className="flex items-center gap-2">
                        <IconCalendar className="size-4 text-muted-foreground" />
                        <span className="text-sm">
                          {achievement.eventStart
                            ? format(achievement.eventStart, 'MMM d, yyyy')
                            : format(achievement.createdAt, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium">
                        {achievement.impact || 0}/10
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mobile List View */}
        {filteredAchievements.length > 0 && (
          <div className="md:hidden space-y-4">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="border-b border-border pb-4 last:border-b-0"
              >
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">{achievement.title}</div>
                    {achievement.summary && (
                      <div className="text-sm text-muted-foreground">
                        {achievement.summary}
                      </div>
                    )}
                    <Badge variant="secondary" className="w-fit text-xs">
                      {achievement.source}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {achievement.project && (
                      <div className="flex items-center gap-2">
                        <IconFolder className="size-4" />
                        <span>{achievement.project.name}</span>
                      </div>
                    )}
                    {achievement.company && (
                      <div className="flex items-center gap-2">
                        <IconBuilding className="size-4" />
                        <span>{achievement.company.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <IconCalendar className="size-4" />
                      <span>
                        {achievement.eventStart
                          ? format(achievement.eventStart, 'MMM d, yyyy')
                          : format(achievement.createdAt, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-medium pt-1">
                    Impact: {achievement.impact || 0}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
