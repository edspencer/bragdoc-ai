'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Workstream } from '@bragdoc/database';
import { useMemo, useState } from 'react';

interface WorkstreamsTimelineChartProps {
  workstreams: Workstream[];
  achievements: Array<{
    id: string;
    workstreamId: string | null;
    eventStart: Date | null;
    impact: number | null;
  }>;
}

type MetricType = 'count' | 'impact';

interface MonthData {
  month: string;
  workstreams: Record<string, number>;
  uncategorized: number;
}

export function WorkstreamsTimelineChart({
  workstreams,
  achievements,
}: WorkstreamsTimelineChartProps) {
  const [metric, setMetric] = useState<MetricType>('impact');
  const [showUncategorized, setShowUncategorized] = useState(false);

  // Process achievements by month (last 12 complete calendar months)
  const timelineData = useMemo(() => {
    // Calculate 12-month window using month boundaries
    const now = new Date();

    // Start at the 1st of the month, 12 months ago
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    // End at the last day of the current month
    const endOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );

    // Group achievements by month
    const monthMap = new Map<string, MonthData>();

    achievements.forEach((ach) => {
      if (!ach.eventStart) return;

      const date = new Date(ach.eventStart);

      // Filter to only include achievements within the 12-month window
      if (date < twelveMonthsAgo || date > endOfCurrentMonth) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          workstreams: {},
          uncategorized: 0,
        });
      }

      const monthData = monthMap.get(monthKey)!;
      const value = metric === 'count' ? 1 : ach.impact || 0;

      if (ach.workstreamId) {
        monthData.workstreams[ach.workstreamId] =
          (monthData.workstreams[ach.workstreamId] || 0) + value;
      } else {
        monthData.uncategorized += value;
      }
    });

    // Generate all months in the 12-month window (even if empty)
    const allMonths: MonthData[] = [];
    const current = new Date(twelveMonthsAgo);

    while (current <= endOfCurrentMonth) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

      if (monthMap.has(monthKey)) {
        allMonths.push(monthMap.get(monthKey)!);
      } else {
        // Add empty month
        allMonths.push({
          month: monthKey,
          workstreams: {},
          uncategorized: 0,
        });
      }

      current.setMonth(current.getMonth() + 1);
    }

    return allMonths;
  }, [achievements, metric]);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(
      ...timelineData.map((month) => {
        const workstreamTotal = Object.values(month.workstreams).reduce(
          (sum, val) => sum + val,
          0,
        );
        return showUncategorized
          ? workstreamTotal + month.uncategorized
          : workstreamTotal;
      }),
      1,
    );
  }, [timelineData, showUncategorized]);

  // Sort workstreams by total value (for consistent color ordering)
  const sortedWorkstreams = useMemo(() => {
    return [...workstreams].sort((a, b) => {
      const aTotal = timelineData.reduce(
        (sum, month) => sum + (month.workstreams[a.id] || 0),
        0,
      );
      const bTotal = timelineData.reduce(
        (sum, month) => sum + (month.workstreams[b.id] || 0),
        0,
      );
      return bTotal - aTotal;
    });
  }, [workstreams, timelineData]);

  // Format month for display
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(
      Number.parseInt(year || '0'),
      Number.parseInt(month || '1') - 1,
    );
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (timelineData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Achievement Timeline</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={metric === 'count' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMetric('count')}
          >
            Count
          </Button>
          <Button
            variant={metric === 'impact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMetric('impact')}
          >
            Impact
          </Button>
          <Button
            variant={showUncategorized ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowUncategorized(!showUncategorized)}
          >
            Uncategorized
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stacked bar chart */}
          <div className="space-y-2">
            <div className="flex items-end gap-1 h-64">
              {timelineData.map((monthData) => {
                const total =
                  Object.values(monthData.workstreams).reduce(
                    (sum, val) => sum + val,
                    0,
                  ) + monthData.uncategorized;

                return (
                  <div
                    key={monthData.month}
                    className="flex-1 flex flex-col-reverse gap-px h-full"
                  >
                    {/* Stacked segments */}
                    {sortedWorkstreams.map((ws) => {
                      const value = monthData.workstreams[ws.id] || 0;
                      if (value === 0) return null;

                      const heightPercent = (value / maxValue) * 100;
                      const showLabel = heightPercent > 8; // Show label if segment is > 8% of chart height

                      return (
                        <div
                          key={ws.id}
                          className="transition-all hover:opacity-80 flex items-center justify-center relative"
                          style={{
                            height: `${heightPercent}%`,
                            minHeight: heightPercent > 0 ? '2px' : '0',
                            backgroundColor: ws.color || '#3B82F6',
                          }}
                          title={`${ws.name}: ${value} ${metric === 'count' ? 'achievement' + (value === 1 ? '' : 's') : 'impact points'}`}
                        >
                          {showLabel && (
                            <span className="text-xs font-medium text-white px-1 truncate max-w-full">
                              {ws.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showUncategorized && monthData.uncategorized > 0 && (
                      <div
                        className="bg-gray-200 dark:bg-gray-700 transition-all hover:opacity-80 flex items-center justify-center"
                        style={{
                          height: `${(monthData.uncategorized / maxValue) * 100}%`,
                          minHeight: '2px',
                        }}
                        title={`Uncategorized: ${monthData.uncategorized} ${metric === 'count' ? `achievement${monthData.uncategorized === 1 ? '' : 's'}` : 'impact points'}`}
                      >
                        {(monthData.uncategorized / maxValue) * 100 > 8 && (
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-1">
                            {monthData.uncategorized}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Month labels below chart */}
            <div className="flex gap-1">
              {timelineData.map((monthData) => (
                <div
                  key={monthData.month}
                  className="flex-1 text-[10px] text-center text-muted-foreground"
                  title={formatMonth(monthData.month)}
                >
                  {formatMonth(monthData.month).split(' ')[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-sm pt-4 border-t">
            {sortedWorkstreams.slice(0, 8).map((ws) => (
              <div key={ws.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ws.color || '#3B82F6' }}
                />
                <span className="text-muted-foreground truncate max-w-[120px]">
                  {ws.name}
                </span>
              </div>
            ))}
            {sortedWorkstreams.length > 8 && (
              <span className="text-muted-foreground">
                +{sortedWorkstreams.length - 8} more
              </span>
            )}
            {showUncategorized && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
                <span className="text-muted-foreground">Uncategorized</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
