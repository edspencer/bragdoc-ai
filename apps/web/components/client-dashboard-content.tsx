'use client';

import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { TopProjects } from '@/components/dashboard/top-projects';
import { ActivityStream } from '@/components/dashboard/activity-stream';
import { WorkstreamStatus } from '@/components/workstreams/workstream-status';
import { useAchievements } from '@/hooks/use-achievements';

export function ClientDashboardContent() {
  const { achievements, isLoading } = useAchievements({ limit: 1000 });

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {!isLoading && <WeeklyImpactChart achievements={achievements} />}

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
        <TopProjects />
        <ActivityStream achievements={achievements} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
        <WorkstreamStatus />
      </div>
    </div>
  );
}
