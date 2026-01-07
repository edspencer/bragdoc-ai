'use client';

import { Badge } from '@/components/ui/badge';
import type { Workstream } from '@bragdoc/database';

interface WorkstreamsSectionProps {
  workstreams: Workstream[];
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
    ...workstreams.map((w) => w.achievementCount ?? 0),
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
  workstream: Workstream;
  maxAchievementCount: number;
}

function WorkstreamRow({
  workstream,
  maxAchievementCount,
}: WorkstreamRowProps) {
  const achievementCount = workstream.achievementCount ?? 0;
  const color = workstream.color ?? '#3B82F6';
  const progressPercent = (achievementCount / maxAchievementCount) * 100;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      {/* Color indicator */}
      <div
        className="size-3 shrink-0 rounded"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      {/* Name and progress bar */}
      <div className="min-w-0 flex-1">
        <span className="truncate font-medium">{workstream.name}</span>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* Achievement count badge */}
      <Badge variant="secondary" className="shrink-0">
        {achievementCount}{' '}
        {achievementCount === 1 ? 'achievement' : 'achievements'}
      </Badge>
    </div>
  );
}
