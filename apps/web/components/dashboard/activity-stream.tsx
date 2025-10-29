'use client';

import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { AchievementItem } from 'components/achievements/achievement-item';
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
  const recentAchievements = useMemo(() => {
    return [...achievements]
      .sort((a, b) => {
        const aDate = a.eventStart ? new Date(a.eventStart).getTime() : 0;
        const bDate = b.eventStart ? new Date(b.eventStart).getTime() : 0;
        return bDate - aDate;
      })
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
          <Trophy className="size-5" />
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
                className="border-b border-border pb-4 last:border-b-0"
              >
                <AchievementItem
                  achievement={achievement}
                  onImpactChange={handleImpactChange}
                  readOnly={!!actionLoading}
                  showSourceBadge={true}
                  linkToAchievements={true}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
