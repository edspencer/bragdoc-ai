import { IconTrendingUp, IconTarget, IconCalendar } from '@tabler/icons-react';
import Link from 'next/link';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';

import { getAchievementStats, getActiveProjectsCount } from '@bragdoc/database';
import { Stat } from '@/components/shared/stat';

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
    <div className="grid grid-cols-2 gap-2 lg:gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Link href="/achievements">
        <Stat
          label="Total Achievements"
          value={displayStats.totalAchievements}
          badge={{
            icon: <IconTarget className="size-3" />,
            label: 'All Time',
          }}
          footerHeading={{
            text: 'Your career highlights',
            icon: <IconTarget className="size-4" />,
          }}
          footerDescription="Click to view all achievements"
          clickable
        />
      </Link>

      <Stat
        label="Total Impact Points"
        value={displayStats.totalImpactPoints}
        badge={{
          icon: <IconTrendingUp className="size-3" />,
          label: `${displayStats.monthlyGrowth > 0 ? '+' : ''}${displayStats.monthlyGrowth}%`,
        }}
        footerHeading={{
          text: 'Growing impact this month',
          icon: <IconTrendingUp className="size-4" />,
        }}
        footerDescription={`Average ${displayStats.avgImpactPerAchievement} points per achievement`}
      />

      <Stat
        label="This Week's Impact"
        value={displayStats.thisWeekImpact}
        badge={{
          icon: <IconTrendingUp className="size-3" />,
          label: `${displayStats.weeklyGrowth > 0 ? '+' : ''}${displayStats.weeklyGrowth}%`,
        }}
        footerHeading={{
          text: 'Strong weekly performance',
          icon: <IconTrendingUp className="size-4" />,
        }}
        footerDescription="Keep up the momentum!"
      />

      <Link href="/projects">
        <Stat
          label="Active Projects"
          value={displayStats.activeProjectsCount}
          badge={{
            icon: <IconCalendar className="size-3" />,
            label: 'Current',
          }}
          footerHeading={{
            text:
              displayStats.activeProjectsCount > 0
                ? 'Currently active'
                : 'No active projects',
            icon: <IconCalendar className="size-4" />,
          }}
          footerDescription="Click to manage projects"
          clickable
        />
      </Link>
    </div>
  );
}
