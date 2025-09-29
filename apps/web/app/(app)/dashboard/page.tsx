import type React from 'react';
import { AchievementStats } from '@/components/achievement-stats';
import { ClientDashboardContent } from '@/components/client-dashboard-content';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from '@/components/shared/app-page';

export default async function Page() {
  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <AchievementStats />
              <ClientDashboardContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
