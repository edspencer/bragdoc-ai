'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Building2, FolderKanban, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { Skeleton } from 'components/ui/skeleton';
import { ImpactRating } from 'components/ui/impact-rating';

interface ActivityStreamProps {
  userId: string;
}

interface RecentAchievement {
  id: string;
  title: string;
  summary?: string;
  impact: number;
  impactSource?: 'user' | 'llm';
  impactUpdatedAt?: Date;
  createdAt: Date;
  eventStart?: Date;
  project?: {
    id: string;
    name: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

async function getRecentAchievements(userId: string): Promise<RecentAchievement[]> {
  const response = await fetch(`/api/dashboard/recent-achievements?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recent achievements');
  }
  return response.json();
}

async function updateAchievementImpact(achievementId: string, impact: number): Promise<void> {
  const response = await fetch(`/api/achievements/${achievementId}/impact`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ impact }),
  });

  if (!response.ok) {
    throw new Error('Failed to update impact rating');
  }
}

export function ActivityStream({ userId }: ActivityStreamProps) {
  const [achievements, setAchievements] = useState<RecentAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecentAchievements(userId)
      .then((data) => {
        setAchievements(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  const handleImpactChange = async (achievementId: string, newImpact: number) => {
    try {
      await updateAchievementImpact(achievementId, newImpact);

      // Optimistically update the local state
      setAchievements(prevAchievements =>
        prevAchievements.map(achievement =>
          achievement.id === achievementId
            ? {
                ...achievement,
                impact: newImpact,
                impactSource: 'user' as const,
                impactUpdatedAt: new Date()
              }
            : achievement
        )
      );
    } catch (error) {
      console.error('Failed to update impact:', error);
      // You might want to show a toast notification here
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>Unable to load recent activity: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground text-center">
            <div className="space-y-2">
              <Trophy className="h-8 w-8 mx-auto opacity-50" />
              <p>No achievements yet</p>
              <p className="text-xs">Start tracking your accomplishments!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your latest achievements and their impact
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="border-b border-border last:border-0 pb-4 last:pb-0"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight">
                      {achievement.title}
                    </h4>
                    {achievement.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {achievement.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {achievement.project && (
                      <Badge variant="secondary" className="text-xs">
                        <FolderKanban className="h-3 w-3 mr-1" />
                        {achievement.project.name}
                      </Badge>
                    )}
                    {achievement.company && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        {achievement.company.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <ImpactRating
                    value={achievement.impact}
                    onChange={(newImpact) => handleImpactChange(achievement.id, newImpact)}
                    source={achievement.impactSource}
                    updatedAt={achievement.impactUpdatedAt}
                  />

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(achievement.createdAt), {
                      addSuffix: true
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Link
              href="/achievements"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all achievements →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}