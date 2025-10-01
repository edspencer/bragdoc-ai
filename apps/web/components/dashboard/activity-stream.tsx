'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Building2, FolderKanban, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { ImpactRating } from 'components/ui/impact-rating';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievements } from '@/hooks/use-achievements';
import type { AchievementWithRelations } from 'lib/types/achievement';

interface ActivityStreamProps {
  achievements: AchievementWithRelations[];
}

export function ActivityStream({ achievements }: ActivityStreamProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { updateAchievement } = useAchievementMutations();
  const { mutate } = useAchievements();

  // Get the 5 most recent achievements for the activity stream
  const recentAchievements = React.useMemo(() => {
    return [...achievements]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [achievements]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentAchievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent achievements to show.
          </p>
        ) : (
          <div className="space-y-4">
            {recentAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="space-y-2 border-b border-border pb-4 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Link
                      href="/achievements"
                      className="text-sm font-medium hover:underline"
                    >
                      {achievement.title}
                    </Link>
                    {achievement.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {achievement.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {achievement.eventStart && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(
                            new Date(achievement.eventStart),
                            {
                              addSuffix: true,
                            }
                          )}
                        </div>
                      )}
                      {achievement.project && (
                        <div
                          className="flex items-center gap-1"
                          style={{ color: achievement.project.color }}
                        >
                          <FolderKanban className="h-3 w-3" />
                          <Link
                            href={`/projects/${achievement.project.id}`}
                            className="font-medium hover:underline"
                          >
                            {achievement.project.name}
                          </Link>
                        </div>
                      )}
                      {achievement.company && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {achievement.company.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <ImpactRating
                      value={achievement.impact || 0}
                      source={achievement.impactSource || 'llm'}
                      updatedAt={achievement.impactUpdatedAt}
                      onChange={(value) =>
                        handleImpactChange(achievement.id, value)
                      }
                      readOnly={!!actionLoading}
                    />
                    <Badge variant="outline" className="text-xs">
                      {achievement.source}
                    </Badge>
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
