import type React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AchievementStats } from '@/components/achievement-stats';
import { ClientDashboardContent } from '@/components/client-dashboard-content';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function Page() {

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
              <ClientDashboardContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
