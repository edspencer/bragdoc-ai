'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workstream } from '@bragdoc/database';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface WorkstreamsGanttChartProps {
  workstreams: Workstream[];
  achievements: Array<{
    id: string;
    workstreamId: string | null;
    eventStart: Date | null;
    impact: number | null;
  }>;
  selectedWorkstreamId?: string | null;
  onSelectWorkstream?: (workstreamId: string | null) => void;
  startDate?: Date;
  endDate?: Date;
  isLoading?: boolean;
}

interface TimeSegment {
  startDate: Date;
  endDate: Date;
  achievementCount: number;
  totalImpact: number;
  impactDensity: number; // Impact per day
}

interface WorkstreamWithSegments {
  workstream: Workstream;
  segments: TimeSegment[];
}

export function WorkstreamsGanttChart({
  workstreams,
  achievements,
  selectedWorkstreamId,
  onSelectWorkstream,
  startDate,
  endDate,
  isLoading,
}: WorkstreamsGanttChartProps) {
  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skeleton for 8 workstream rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 flex-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Calculate time ranges for each workstream (split into segments if gap > 1 month)
  const workstreamData = useMemo(() => {
    const data: WorkstreamWithSegments[] = [];

    workstreams.forEach((ws) => {
      // Filter achievements for this workstream and within date range
      const wsAchievements = achievements.filter((ach) => {
        if (
          !ach.workstreamId ||
          ach.workstreamId !== ws.id ||
          !ach.eventStart
        ) {
          return false;
        }

        // If date range is specified, filter by it
        if (startDate && endDate) {
          const achDate = new Date(ach.eventStart);
          return achDate >= startDate && achDate <= endDate;
        }

        return true;
      });

      if (wsAchievements.length === 0) return;

      // Sort achievements by date
      const sortedAchievements = wsAchievements
        .map((ach) => ({
          ...ach,
          date: new Date(ach.eventStart!),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      // This should never happen due to the length check above, but TypeScript needs it
      if (sortedAchievements.length === 0) return;

      // Group into segments (split when gap > 1 month)
      const segments: TimeSegment[] = [];
      const firstAchievement = sortedAchievements[0]!; // Safe due to check above
      let currentSegmentStart = firstAchievement.date;
      let currentSegmentEnd = firstAchievement.date;
      let currentSegmentCount = 1;
      let currentSegmentImpact = firstAchievement.impact || 0;

      for (let i = 1; i < sortedAchievements.length; i++) {
        // Safe array access within loop bounds
        const prevAchievement = sortedAchievements[i - 1]!;
        const currAchievement = sortedAchievements[i]!;
        const prevDate = prevAchievement.date;
        const currDate = currAchievement.date;

        // Calculate month difference
        const monthsDiff =
          (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
          currDate.getMonth() -
          prevDate.getMonth();

        if (monthsDiff > 1) {
          // Gap detected - save current segment and start new one
          // Calculate days in segment (add 1 to include both start and end dates)
          const daysInSegment = Math.max(
            1,
            (currentSegmentEnd.getTime() - currentSegmentStart.getTime()) /
              (1000 * 60 * 60 * 24) +
              1,
          );
          const impactDensity = currentSegmentImpact / daysInSegment;

          segments.push({
            startDate: currentSegmentStart,
            endDate: currentSegmentEnd,
            achievementCount: currentSegmentCount,
            totalImpact: currentSegmentImpact,
            impactDensity,
          });

          currentSegmentStart = currDate;
          currentSegmentEnd = currDate;
          currentSegmentCount = 1;
          currentSegmentImpact = currAchievement.impact || 0;
        } else {
          // Continue current segment
          currentSegmentEnd = currDate;
          currentSegmentCount++;
          currentSegmentImpact += currAchievement.impact || 0;
        }
      }

      // Add final segment
      // Calculate days in segment (add 1 to include both start and end dates)
      const daysInSegment = Math.max(
        1,
        (currentSegmentEnd.getTime() - currentSegmentStart.getTime()) /
          (1000 * 60 * 60 * 24) +
          1,
      );
      const impactDensity = currentSegmentImpact / daysInSegment;

      segments.push({
        startDate: currentSegmentStart,
        endDate: currentSegmentEnd,
        achievementCount: currentSegmentCount,
        totalImpact: currentSegmentImpact,
        impactDensity,
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
  }, [workstreams, achievements, startDate, endDate]);

  // Calculate overall time range based on date props or default to 12 months
  const timeRange = useMemo(() => {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (startDate && endDate) {
      // Use provided date range, rounded to complete months
      rangeStart = startOfMonth(startDate);
      rangeEnd = endOfMonth(endDate);
    } else {
      // Default to 12 months from today
      const now = new Date();
      rangeStart = startOfMonth(subMonths(now, 12));
      rangeEnd = endOfMonth(now);
    }

    return {
      start: rangeStart,
      end: rangeEnd,
      totalDays:
        (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    };
  }, [startDate, endDate]);

  // Calculate reference impact density using 90th percentile to handle outliers
  // This prevents a single high-density segment from washing out all others
  const referenceImpactDensity = useMemo(() => {
    // Collect all densities
    const allDensities: number[] = [];
    workstreamData.forEach((wsData) => {
      wsData.segments.forEach((segment) => {
        allDensities.push(segment.impactDensity);
      });
    });

    if (allDensities.length === 0) return 1;

    // Sort densities
    allDensities.sort((a, b) => a - b);

    // Use 90th percentile as reference (or max if fewer than 10 segments)
    const p90Index = Math.floor(allDensities.length * 0.9);
    return allDensities[p90Index] || allDensities[allDensities.length - 1] || 1;
  }, [workstreamData]);

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

    // Round to 2 decimal places to avoid hydration mismatch between server and client
    const leftPercent =
      Math.round((startOffset / timeRange.totalDays) * 100 * 100) / 100;

    // Calculate width based on duration, but ensure minimum visibility
    // If duration is very short (< 7 days), use a minimum percentage based on the time range
    const minWidthDays = 7; // Show at least a week's worth of width
    const effectiveDuration = Math.max(duration, minWidthDays);
    const widthPercent =
      Math.round(
        Math.max(
          (effectiveDuration / timeRange.totalDays) * 100,
          1.0, // Minimum 1% width for visibility
        ) * 100,
      ) / 100;

    // Calculate opacity based on relative impact density (impact per day)
    // Use 90th percentile as reference to handle outliers
    // Clamp density to reference value (outliers get max opacity)
    // Use logarithmic scale for better distribution
    // Map to 0.0-0.4 range, then add 0.6 base opacity (final range: 0.6-1.0)
    const clampedDensity = Math.min(
      segment.impactDensity,
      referenceImpactDensity,
    );
    const densityRatio =
      Math.log(clampedDensity + 1) / Math.log(referenceImpactDensity + 1);
    // Round opacity to 2 decimal places to avoid hydration mismatch
    const opacity = Math.round((0.6 + densityRatio * 0.4) * 100) / 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: color || '#3B82F6',
      opacity: opacity,
      // Store calculated opacity for tooltip display
      _calculatedOpacity: opacity,
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
        <TooltipProvider delayDuration={100}>
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
              {workstreamData.map((wsData) => {
                const isSelected =
                  selectedWorkstreamId === wsData.workstream.id;
                const color = wsData.workstream.color || '#3B82F6';
                return (
                  <div
                    key={wsData.workstream.id}
                    className="flex items-center gap-4"
                  >
                    {/* Workstream name */}
                    <div className="w-64 flex-shrink-0">
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() =>
                          onSelectWorkstream?.(
                            isSelected ? null : wsData.workstream.id,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectWorkstream?.(
                              isSelected ? null : wsData.workstream.id,
                            );
                          }
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0 transition-all"
                          style={{
                            backgroundColor: color,
                            boxShadow: isSelected
                              ? `0 0 0 2px ${color}40, 0 0 8px 2px ${color}60`
                              : undefined,
                          }}
                        />
                        <span
                          className={`text-sm truncate transition-all ${
                            isSelected ? 'font-bold' : 'font-medium'
                          }`}
                        >
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
                      {wsData.segments.map((segment, segIdx) => {
                        const barStyle = getBarStyle(
                          segment,
                          wsData.workstream.color || '#3B82F6',
                        );
                        const isSelected =
                          selectedWorkstreamId === wsData.workstream.id;
                        return (
                          <Tooltip key={segIdx}>
                            <TooltipTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                className="absolute top-1 h-6 rounded transition-all hover:opacity-100 cursor-pointer"
                                style={{
                                  ...barStyle,
                                  boxShadow: isSelected
                                    ? `0 0 0 1px white, 0 0 0 3px ${color}, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
                                    : undefined,
                                }}
                                onClick={() =>
                                  onSelectWorkstream?.(
                                    isSelected ? null : wsData.workstream.id,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectWorkstream?.(
                                      isSelected ? null : wsData.workstream.id,
                                    );
                                  }
                                }}
                              >
                                <div className="h-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-white px-2 truncate">
                                    {segment.achievementCount}
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <div className="font-semibold">
                                  {wsData.workstream.name}
                                </div>
                                <div className="text-xs opacity-90">
                                  {formatDateRange(segment)}
                                </div>
                                <div className="text-xs space-y-0.5 pt-1">
                                  <div>
                                    {segment.achievementCount} achievement
                                    {segment.achievementCount === 1 ? '' : 's'}
                                  </div>
                                  <div>Total impact: {segment.totalImpact}</div>
                                  <div>
                                    Impact density:{' '}
                                    {segment.impactDensity.toFixed(2)} per day
                                  </div>
                                  <div className="opacity-70 pt-0.5 border-t border-white/20 mt-1">
                                    Opacity:{' '}
                                    {(
                                      (barStyle._calculatedOpacity || 1) * 100
                                    ).toFixed(0)}
                                    %
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
