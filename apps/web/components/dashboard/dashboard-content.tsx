'use client';

import { User } from 'next-auth';
import { StatsGrid } from './stats-grid';
import { WeeklyImpactChart } from './weekly-impact-chart';
import { ActivityStream } from './activity-stream';
import { PageHeader } from 'components/shared/page-header';

interface DashboardContentProps {
  user: User;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const userName = user.name?.split(' ')[0] || 'there';
  const userId = user.id || '';

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={`Welcome back, ${userName}!`}
        description="Here's an overview of your achievements and impact"
      />

      <StatsGrid userId={userId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklyImpactChart userId={userId} />
        </div>
        <div className="lg:col-span-1">
          <ActivityStream userId={userId} />
        </div>
      </div>
    </div>
  );
}
