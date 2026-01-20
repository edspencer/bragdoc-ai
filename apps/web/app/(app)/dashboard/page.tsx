import type React from 'react';
import { AchievementStats } from '@/components/achievement-stats';
import { ClientDashboardContent } from '@/components/client-dashboard-content';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import {
  getAchievementStats,
  getCompaniesCount,
  getProjectsCount,
} from '@bragdoc/database';
import { GettingStartedBanner } from '@/components/dashboard/getting-started-banner';
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

  // Fetch all counts in parallel
  const [achievementStats, companiesCount, projectsCount] = await Promise.all([
    getAchievementStats({ userId: session.user.id }),
    getCompaniesCount({ userId: session.user.id }),
    getProjectsCount({ userId: session.user.id }),
  ]);

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader>
          {achievementStats.totalAchievements > 0 && <RestartTourButton />}
        </SiteHeader>
        {/* Banner handles its own visibility via localStorage */}
        <GettingStartedBanner
          companiesCount={companiesCount}
          projectsCount={projectsCount}
          achievementsCount={achievementStats.totalAchievements}
        />
        <AppContent>
          <AchievementStats />
          <ClientDashboardContent />
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
