import {
  IconTrendingUp,
  IconTrendingDown,
  IconTarget,
  IconCalendar,
} from '@tabler/icons-react';
import Link from 'next/link';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';

import { getAchievementStats, getActiveProjectsCount } from '@bragdoc/database';
import { Stat } from '@/components/shared/stat';

function getGrowthIcon(growth: number, size: 'small' | 'large' = 'small') {
  const className = size === 'small' ? 'size-3' : 'size-4';
  return growth >= 0 ? (
    <IconTrendingUp className={className} />
  ) : (
    <IconTrendingDown className={className} />
  );
}

function getMonthlyGrowthText(monthlyGrowth: number): string {
  if (monthlyGrowth > 10) return 'Strong growth this month';
  if (monthlyGrowth > 0) return 'Growing impact this month';
  if (monthlyGrowth === 0) return 'Steady impact this month';
  if (monthlyGrowth > -10) return 'Slight dip this month';
  return 'Impact declining this month';
}

function getWeeklyGrowthText(weeklyGrowth: number): string {
  if (weeklyGrowth > 10) return 'Excellent weekly performance';
  if (weeklyGrowth > 0) return 'Strong weekly performance';
  if (weeklyGrowth === 0) return 'Consistent weekly output';
  if (weeklyGrowth > -10) return 'Slower week than usual';
  return 'Quiet week';
}

function getWeeklyFooterDescription(weeklyGrowth: number): string {
  return weeklyGrowth >= 0
    ? 'Keep up the momentum!'
    : 'Every week is a fresh start';
}

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
      <Link href="/achievements" id="tour-achievements-stat">
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
          icon: getGrowthIcon(displayStats.monthlyGrowth, 'small'),
          label: `${displayStats.monthlyGrowth > 0 ? '+' : ''}${displayStats.monthlyGrowth}%`,
        }}
        footerHeading={{
          text: getMonthlyGrowthText(displayStats.monthlyGrowth),
          icon: getGrowthIcon(displayStats.monthlyGrowth, 'large'),
        }}
        footerDescription={`Average ${displayStats.avgImpactPerAchievement} points per achievement`}
      />

      <Stat
        label="This Week's Impact"
        value={displayStats.thisWeekImpact}
        badge={{
          icon: getGrowthIcon(displayStats.weeklyGrowth, 'small'),
          label: `${displayStats.weeklyGrowth > 0 ? '+' : ''}${displayStats.weeklyGrowth}%`,
        }}
        footerHeading={{
          text: getWeeklyGrowthText(displayStats.weeklyGrowth),
          icon: getGrowthIcon(displayStats.weeklyGrowth, 'large'),
        }}
        footerDescription={getWeeklyFooterDescription(
          displayStats.weeklyGrowth,
        )}
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
