import type React from 'react';
import { AchievementStats } from '@/components/achievement-stats';
import { ClientDashboardContent } from '@/components/client-dashboard-content';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { getAchievementStats } from '@bragdoc/database';
import { DashboardZeroState } from '@/components/dashboard/dashboard-zero-state';
import { RestartTourButton } from '@/components/demo-tour';

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
        <SiteHeader>{!hasNoAchievements && <RestartTourButton />}</SiteHeader>
        {hasNoAchievements ? (
          <DashboardZeroState />
        ) : (
          <AppContent>
            <AchievementStats />
            <ClientDashboardContent />
          </AppContent>
        )}
      </SidebarInset>
    </AppPage>
  );
}
