import { IconTrendingUp, IconTarget, IconCalendar } from '@tabler/icons-react';
import Link from 'next/link';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAchievementStats, getActiveProjectsCount } from '@bragdoc/database';

export async function AchievementStats() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return <div>Please log in to view stats</div>;
  }

  const userId = session.user.id;

  // Fetch achievement stats and active projects count
  const [achievementStats, activeProjectsCount] = await Promise.all([
    getAchievementStats({ userId }),
    getActiveProjectsCount({ userId }),
  ]);

  const displayStats = {
    ...achievementStats,
    activeProjectsCount,
  };
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Link href="/achievements">
        <Card className="@container/card cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardDescription>Total Achievements</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {displayStats.totalAchievements}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconTarget className="size-3" />
                All Time
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Your career highlights <IconTarget className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Click to view all achievements
            </div>
          </CardFooter>
        </Card>
      </Link>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Impact Points</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.totalImpactPoints}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-3" />
              {displayStats.monthlyGrowth > 0 ? '+' : ''}
              {displayStats.monthlyGrowth}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Growing impact this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Average {displayStats.avgImpactPerAchievement} points per
            achievement
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>This Week&apos;s Impact</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.thisWeekImpact}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-3" />
              {displayStats.weeklyGrowth > 0 ? '+' : ''}
              {displayStats.weeklyGrowth}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong weekly performance <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Keep up the momentum!</div>
        </CardFooter>
      </Card>

      <Link href="/projects">
        <Card className="@container/card cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {displayStats.activeProjectsCount}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconCalendar className="size-3" />
                Current
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {displayStats.activeProjectsCount > 0
                ? 'Currently active'
                : 'No active projects'}{' '}
              <IconCalendar className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Click to manage projects
            </div>
          </CardFooter>
        </Card>
      </Link>
    </div>
  );
}
