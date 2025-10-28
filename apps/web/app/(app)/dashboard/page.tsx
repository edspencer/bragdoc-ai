import type React from 'react';
import { AchievementStats } from '@/components/achievement-stats';
import { ClientDashboardContent } from '@/components/client-dashboard-content';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from '@/components/shared/app-page';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { getAchievementStats } from '@bragdoc/database';
import { DashboardZeroState } from '@/components/dashboard/dashboard-zero-state';

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    // DO NOT use redirect() in Server Components - it breaks the build
    // Instead, return a fallback UI element
    return <div className="p-4">Please log in to view your dashboard.</div>;
  }

  const achievementStats = await getAchievementStats({
    userId: session.user.id,
  });
  const hasNoAchievements = achievementStats.totalAchievements === 0;

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {hasNoAchievements ? (
              <DashboardZeroState />
            ) : (
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <AchievementStats />
                <ClientDashboardContent />
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
