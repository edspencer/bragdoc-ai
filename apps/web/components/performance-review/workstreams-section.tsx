'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { FakeWorkstream } from '@/lib/performance-review-fake-data';

interface WorkstreamsSectionProps {
  workstreams: FakeWorkstream[];
  startDate: Date;
  endDate: Date;
}

export function WorkstreamsSection({
  workstreams,
  startDate: _startDate,
  endDate: _endDate,
}: WorkstreamsSectionProps) {
  // Note: startDate and endDate are available for future filtering when connected to real data
  // Find max achievement count for relative progress bar sizing
  const maxAchievementCount = Math.max(
    ...workstreams.map((w) => w.achievementCount),
    1,
  );

  return (
    <div className="space-y-3">
      {workstreams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No workstreams found for this review period.
        </p>
      ) : (
        <div className="grid gap-3">
          {workstreams.map((workstream) => (
            <WorkstreamRow
              key={workstream.id}
              workstream={workstream}
              maxAchievementCount={maxAchievementCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkstreamRowProps {
  workstream: FakeWorkstream;
  maxAchievementCount: number;
}

function WorkstreamRow({
  workstream,
  maxAchievementCount,
}: WorkstreamRowProps) {
  const progressPercent =
    (workstream.achievementCount / maxAchievementCount) * 100;

  // Format date range
  const formatDateRange = () => {
    const startYear = workstream.startDate.getFullYear();
    const endYear = workstream.endDate.getFullYear();

    if (startYear === endYear) {
      return `${format(workstream.startDate, 'MMM d')} - ${format(workstream.endDate, 'MMM d, yyyy')}`;
    }
    return `${format(workstream.startDate, 'MMM d, yyyy')} - ${format(workstream.endDate, 'MMM d, yyyy')}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      {/* Color indicator */}
      <div
        className="size-3 shrink-0 rounded"
        style={{ backgroundColor: workstream.color }}
        aria-hidden="true"
      />

      {/* Name and date range */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="truncate font-medium">{workstream.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDateRange()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: workstream.color,
            }}
          />
        </div>
      </div>

      {/* Achievement count badge */}
      <Badge variant="secondary" className="shrink-0">
        {workstream.achievementCount}{' '}
        {workstream.achievementCount === 1 ? 'achievement' : 'achievements'}
      </Badge>
    </div>
  );
}
