'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Workstream } from '@bragdoc/database';

interface WorkstreamsChartProps {
  workstreams: Workstream[];
  unassignedCount: number;
  totalCount: number;
}

export function WorkstreamsChart({
  workstreams,
  unassignedCount,
  totalCount,
}: WorkstreamsChartProps) {
  // Sort workstreams by achievement count (descending)
  const sortedWorkstreams = [...workstreams].sort(
    (a, b) => (b.achievementCount || 0) - (a.achievementCount || 0),
  );

  // Calculate total assigned
  const totalAssigned = sortedWorkstreams.reduce(
    (sum, ws) => sum + (ws.achievementCount || 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievement Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalAssigned}</div>
              <div className="text-sm text-muted-foreground">Categorized</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{unassignedCount}</div>
              <div className="text-sm text-muted-foreground">Uncategorized</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{workstreams.length}</div>
              <div className="text-sm text-muted-foreground">Workstreams</div>
            </div>
          </div>

          {/* Stacked bar chart */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 h-12 w-full rounded-md overflow-hidden border">
              {sortedWorkstreams.map((ws) => {
                const percentage =
                  ((ws.achievementCount || 0) / totalCount) * 100;
                return (
                  <div
                    key={ws.id}
                    className="h-full flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-80"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: ws.color || '#3B82F6',
                      minWidth: percentage > 0 ? '2%' : '0',
                    }}
                    title={`${ws.name}: ${ws.achievementCount} achievement${ws.achievementCount === 1 ? '' : 's'}`}
                  >
                    {percentage > 5 && (
                      <span className="truncate px-1">
                        {ws.achievementCount}
                      </span>
                    )}
                  </div>
                );
              })}
              {unassignedCount > 0 && (
                <div
                  className="h-full flex items-center justify-center text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  style={{
                    width: `${(unassignedCount / totalCount) * 100}%`,
                  }}
                  title={`Uncategorized: ${unassignedCount} achievement${unassignedCount === 1 ? '' : 's'}`}
                >
                  {(unassignedCount / totalCount) * 100 > 5 && (
                    <span className="truncate px-1">{unassignedCount}</span>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-sm">
              {sortedWorkstreams.slice(0, 5).map((ws) => (
                <div key={ws.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: ws.color || '#3B82F6' }}
                  />
                  <span className="text-muted-foreground truncate max-w-[150px]">
                    {ws.name} ({ws.achievementCount})
                  </span>
                </div>
              ))}
              {sortedWorkstreams.length > 5 && (
                <span className="text-muted-foreground">
                  +{sortedWorkstreams.length - 5} more
                </span>
              )}
              {unassignedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
                  <span className="text-muted-foreground">
                    Uncategorized ({unassignedCount})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
