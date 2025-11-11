'use client';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkstreamsZeroState } from '@/components/workstreams/workstreams-zero-state';
import { WorkstreamStats } from '@/components/workstreams/workstream-stats';
import { WorkstreamsGanttChart } from '@/components/workstreams/workstreams-gantt-chart';
import { WorkstreamAchievementsTable } from '@/components/workstreams/workstream-achievements-table';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useSWR from 'swr';
import { useState } from 'react';
import { subMonths, startOfDay, endOfDay } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Convert preset string to absolute dates
 * @param preset - Preset string ('3m', '6m', '12m', '24m', or 'all')
 * @returns Object with startDate and endDate (undefined for 'all')
 */
function calculateDateRange(preset: string): {
  startDate: Date | undefined;
  endDate: Date | undefined;
} {
  const today = new Date();

  switch (preset) {
    case '3m': {
      const start = startOfDay(subMonths(today, 3));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '6m': {
      const start = startOfDay(subMonths(today, 6));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '12m': {
      const start = startOfDay(subMonths(today, 12));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '24m': {
      const start = startOfDay(subMonths(today, 24));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

export default function WorkstreamsPage() {
  // State for date preset selection (default: '6m' for Last 6 months)
  const [datePreset, setDatePreset] = useState('6m');

  // Calculate absolute dates from preset
  const { startDate, endDate } = calculateDateRange(datePreset);

  const {
    workstreams,
    isLoading,
    achievementCount,
    unassignedCount,
    generateWorkstreams,
    isGenerating,
  } = useWorkstreams(startDate, endDate);

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

  const presets = [
    { value: '3m', label: 'Last 3 months' },
    { value: '6m', label: 'Last 6 months' },
    { value: '12m', label: 'Last 12 months' },
    { value: '24m', label: 'Last 24 months' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Workstreams">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {presets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SiteHeader>
        <AppContent>
          {showZeroState ? (
            <WorkstreamsZeroState
              achievementCount={achievementCount}
              onGenerate={generateWorkstreams}
            />
          ) : (
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold">Workstreams</h1>
                <p className="text-muted-foreground">
                  Discover thematic patterns in your achievements
                </p>
              </div>

              <WorkstreamStats
                workstreamCount={workstreams.length}
                unassignedCount={unassignedCount}
                isLoading={isLoading}
              />

              <WorkstreamsGanttChart
                workstreams={workstreams}
                achievements={achievements}
                selectedWorkstreamId={selectedWorkstreamId}
                onSelectWorkstream={setSelectedWorkstreamId}
                startDate={startDate}
                endDate={endDate}
              />

              <WorkstreamAchievementsTable
                achievements={achievements}
                workstreams={workstreams}
                selectedWorkstreamId={selectedWorkstreamId}
                onGenerateWorkstreams={generateWorkstreams}
                isGenerating={isGenerating}
              />
            </div>
          )}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
