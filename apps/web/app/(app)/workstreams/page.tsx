'use client';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkstreamStatus } from '@/components/workstreams/workstream-status';
import { WorkstreamList } from '@/components/workstreams/workstream-list';
import { WorkstreamsZeroState } from '@/components/workstreams/workstreams-zero-state';
import { WorkstreamsChart } from '@/components/workstreams/workstreams-chart';
import { WorkstreamsTimelineChart } from '@/components/workstreams/workstreams-timeline-chart';
import { WorkstreamsGanttChart } from '@/components/workstreams/workstreams-gantt-chart';
import { WorkstreamAchievementsTable } from '@/components/workstreams/workstream-achievements-table';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WorkstreamsPage() {
  const {
    workstreams,
    isLoading,
    achievementCount,
    unassignedCount,
    generateWorkstreams,
  } = useWorkstreams();

  // Fetch all achievements for timeline (fetch large limit to get all)
  const { data: achievementsData } = useSWR(
    '/api/achievements?limit=1000',
    fetcher,
  );
  const achievements = achievementsData?.achievements || [];

  // State for tracking selected workstream in Gantt chart
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<
    string | null
  >(null);

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

              <WorkstreamsGanttChart
                workstreams={workstreams}
                achievements={achievements}
                selectedWorkstreamId={selectedWorkstreamId}
                onSelectWorkstream={setSelectedWorkstreamId}
              />

              <WorkstreamAchievementsTable
                achievements={achievements}
                workstreams={workstreams}
                selectedWorkstreamId={selectedWorkstreamId}
              />

              <WorkstreamsChart
                workstreams={workstreams}
                unassignedCount={unassignedCount}
                totalCount={achievementCount}
              />

              <WorkstreamsTimelineChart
                workstreams={workstreams}
                achievements={achievements}
              />

              <WorkstreamStatus />

              <WorkstreamList />
            </div>
          )}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
