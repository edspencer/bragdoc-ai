'use client';

import { IconSparkles } from '@tabler/icons-react';

interface PerformanceReviewSummaryProps {
  achievementCount: number;
  workstreamCount: number;
  totalImpact: number;
  onTabChange: (tab: string) => void;
}

export function PerformanceReviewSummary({
  achievementCount,
  workstreamCount,
  totalImpact,
  onTabChange,
}: PerformanceReviewSummaryProps) {
  return (
    <div className="space-y-4 flex flex-col items-center justify-center">
      {/* Welcome Message */}
      <div className="text-start space-y-3 w-full max-w-2xl">
        <h2 className="text-xl font-semibold">Ready to Write Your Review</h2>
        <p className="text-muted-foreground">
          You recorded{' '}
          <button
            type="button"
            onClick={() => onTabChange('achievements')}
            className="font-semibold text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 hover:underline"
          >
            {achievementCount}{' '}
            {achievementCount === 1 ? 'achievement' : 'achievements'}
          </button>{' '}
          in this period across{' '}
          <button
            type="button"
            onClick={() => onTabChange('workstreams')}
            className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline"
          >
            {workstreamCount}{' '}
            {workstreamCount === 1 ? 'workstream' : 'workstreams'}
          </button>{' '}
          for a total of{' '}
          <button
            type="button"
            onClick={() => onTabChange('achievements')}
            className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            {totalImpact} impact points
          </button>
          . It's a good idea to review your achievements and workstreams for
          accuracy.
        </p>
        <p className="text-muted-foreground">
          Our AI can get you started with a performance review document built
          around your achievements and workstreams this review period. You can
          guide it in any way you like in the input below.
        </p>
      </div>
    </div>
  );
}
