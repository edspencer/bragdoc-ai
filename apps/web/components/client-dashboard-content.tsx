'use client';

import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { TopProjects } from '@/components/dashboard/top-projects';
import { ActivityStream } from '@/components/dashboard/activity-stream';
import { useAchievements } from '@/hooks/use-achievements';

export function ClientDashboardContent() {
  const { achievements } = useAchievements();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <WeeklyImpactChart achievements={achievements} />
      </div>
      <div className="grid grid-cols-1 gap-6 px-4 lg:grid-cols-2 lg:px-6">
        <TopProjects />
        <ActivityStream achievements={achievements} />
      </div>
    </div>
  );
}
