'use client';

import * as React from 'react';
import {
  IconStar,
  IconStarFilled,
  IconBuilding,
  IconFolder,
  IconCalendar,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
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

interface RecentAchievementsTableProps {
  achievements: AchievementWithRelations[];
}

export function RecentAchievementsTable({
  achievements,
}: RecentAchievementsTableProps) {
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
