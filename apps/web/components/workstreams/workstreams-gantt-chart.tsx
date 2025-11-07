'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Workstream } from '@bragdoc/database';
import { useMemo } from 'react';

interface WorkstreamsGanttChartProps {
  workstreams: Workstream[];
  achievements: Array<{
    id: string;
    workstreamId: string | null;
    eventStart: Date | null;
  }>;
}

interface TimeSegment {
  startDate: Date;
  endDate: Date;
  achievementCount: number;
}

interface WorkstreamWithSegments {
  workstream: Workstream;
  segments: TimeSegment[];
}

export function WorkstreamsGanttChart({
  workstreams,
  achievements,
}: WorkstreamsGanttChartProps) {
  // Calculate time ranges for each workstream (split into segments if gap > 1 month)
  const workstreamData = useMemo(() => {
    const data: WorkstreamWithSegments[] = [];

    workstreams.forEach((ws) => {
      const wsAchievements = achievements.filter(
        (ach) => ach.workstreamId === ws.id && ach.eventStart,
      );

      if (wsAchievements.length === 0) return;

      // Sort achievements by date
      const sortedAchievements = wsAchievements
        .map((ach) => ({
          ...ach,
          date: new Date(ach.eventStart!),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      // Group into segments (split when gap > 1 month)
      const segments: TimeSegment[] = [];
      let currentSegmentStart = sortedAchievements[0].date;
      let currentSegmentEnd = sortedAchievements[0].date;
      let currentSegmentCount = 1;

      for (let i = 1; i < sortedAchievements.length; i++) {
        const prevDate = sortedAchievements[i - 1].date;
        const currDate = sortedAchievements[i].date;

        // Calculate month difference
        const monthsDiff =
          (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
          currDate.getMonth() -
          prevDate.getMonth();

        if (monthsDiff > 1) {
          // Gap detected - save current segment and start new one
          segments.push({
            startDate: currentSegmentStart,
            endDate: currentSegmentEnd,
            achievementCount: currentSegmentCount,
          });

          currentSegmentStart = currDate;
          currentSegmentEnd = currDate;
          currentSegmentCount = 1;
        } else {
          // Continue current segment
          currentSegmentEnd = currDate;
          currentSegmentCount++;
        }
      }

      // Add final segment
      segments.push({
        startDate: currentSegmentStart,
        endDate: currentSegmentEnd,
        achievementCount: currentSegmentCount,
      });

      data.push({
        workstream: ws,
        segments,
      });
    });

    // Sort by workstream name
    return data.sort((a, b) =>
      a.workstream.name.localeCompare(b.workstream.name),
    );
  }, [workstreams, achievements]);

  // Calculate overall time range (last 12 complete calendar months)
  const timeRange = useMemo(() => {
    const now = new Date();

    // Start at the 1st of the month, 12 months ago
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    // End at the last day of the current month
    const endOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );

    return {
      start: twelveMonthsAgo,
      end: endOfCurrentMonth,
      totalDays:
        (endOfCurrentMonth.getTime() - twelveMonthsAgo.getTime()) /
        (1000 * 60 * 60 * 24),
    };
  }, []);

  // Generate month markers for the timeline
  const months = useMemo(() => {
    const monthList: { label: string; date: Date }[] = [];
    const current = new Date(timeRange.start);

    while (current <= timeRange.end) {
      monthList.push({
        label: current.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        date: new Date(current),
      });
      current.setMonth(current.getMonth() + 1);
    }

    return monthList;
  }, [timeRange]);

  // Calculate position and width for a segment bar
  const getBarStyle = (segment: TimeSegment, color: string) => {
    const startOffset =
      (segment.startDate.getTime() - timeRange.start.getTime()) /
      (1000 * 60 * 60 * 24);
    const duration =
      (segment.endDate.getTime() - segment.startDate.getTime()) /
      (1000 * 60 * 60 * 24);

    const leftPercent = (startOffset / timeRange.totalDays) * 100;

    // Calculate width based on duration, but ensure minimum visibility
    // If duration is very short (< 7 days), use a minimum percentage based on the time range
    const minWidthDays = 7; // Show at least a week's worth of width
    const effectiveDuration = Math.max(duration, minWidthDays);
    const widthPercent = Math.max(
      (effectiveDuration / timeRange.totalDays) * 100,
      1.0, // Minimum 1% width for visibility
    );

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: color || '#3B82F6',
    };
  };

  const formatDateRange = (segment: TimeSegment) => {
    const start = segment.startDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    const end = segment.endDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    return start === end ? start : `${start} - ${end}`;
  };

  if (workstreamData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workstream Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month headers */}
          <div className="flex items-center gap-4">
            <div className="w-64 flex-shrink-0" />{' '}
            {/* Spacer for workstream names */}
            <div className="flex-1 relative h-8 border-b">
              <div className="absolute inset-0 flex">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 text-xs text-center text-muted-foreground border-l first:border-l-0"
                  >
                    {month.label.split(' ')[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gantt rows */}
          <div className="space-y-2">
            {workstreamData.map((wsData) => (
              <div
                key={wsData.workstream.id}
                className="flex items-center gap-4"
              >
                {/* Workstream name */}
                <div className="w-64 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: wsData.workstream.color || '#3B82F6',
                      }}
                    />
                    <span className="text-sm font-medium truncate">
                      {wsData.workstream.name}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 relative h-8">
                  {/* Month grid lines */}
                  <div className="absolute inset-0 flex">
                    {months.map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-1 border-l first:border-l-0 border-gray-200 dark:border-gray-700"
                      />
                    ))}
                  </div>

                  {/* Workstream bars (one per segment) */}
                  {wsData.segments.map((segment, segIdx) => (
                    <div
                      key={segIdx}
                      className="absolute top-1 h-6 rounded transition-all hover:opacity-80 cursor-pointer"
                      style={getBarStyle(
                        segment,
                        wsData.workstream.color || '#3B82F6',
                      )}
                      title={`${wsData.workstream.name}: ${formatDateRange(segment)} (${segment.achievementCount} achievements)`}
                    >
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white px-2 truncate">
                          {segment.achievementCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
