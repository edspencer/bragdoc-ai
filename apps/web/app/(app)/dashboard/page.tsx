'use client';

import type React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AchievementStats } from '@/components/achievement-stats';
import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { RecentAchievementsTable } from '@/components/recent-achievements-table';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAchievements } from '@/hooks/use-achievements';

export default function Page() {
  const { achievements } = useAchievements();

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <AchievementStats />
              <div className="px-4 lg:px-6">
                <WeeklyImpactChart achievements={achievements} />
              </div>
              <div className="px-4 lg:px-6">
                <RecentAchievementsTable />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
