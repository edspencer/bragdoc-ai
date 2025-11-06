'use client';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkstreamStatus } from '@/components/workstreams/workstream-status';
import { WorkstreamList } from '@/components/workstreams/workstream-list';
import { WorkstreamsZeroState } from '@/components/workstreams/workstreams-zero-state';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';

export default function WorkstreamsPage() {
  const { workstreams, isLoading, achievementCount, generateWorkstreams } =
    useWorkstreams();

  // Only show zero state if we have loaded the data and have no workstreams
  const showZeroState = !isLoading && workstreams.length === 0;

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Workstreams" />
        <AppContent>
          {showZeroState ? (
            <WorkstreamsZeroState
              achievementCount={achievementCount}
              onGenerate={generateWorkstreams}
            />
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold">Workstreams</h1>
                <p className="text-muted-foreground mt-2">
                  Discover thematic patterns in your achievements
                </p>
              </div>

              <WorkstreamStatus />

              <WorkstreamList />
            </div>
          )}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
