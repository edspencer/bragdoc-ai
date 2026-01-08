'use client';

import { IconClipboardCheck, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface PerformanceReviewsZeroStateProps {
  onCreateClick: () => void;
}

export function PerformanceReviewsZeroState({
  onCreateClick,
}: PerformanceReviewsZeroStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <IconClipboardCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">No Performance Reviews Yet</h1>
          <p className="text-muted-foreground">
            Performance reviews help you compile your achievements into
            comprehensive documents for review periods. Define a date range and
            let AI help you highlight your impact and growth.
          </p>
        </div>
        <Button onClick={onCreateClick} size="lg">
          <IconPlus className="size-4 mr-2" />
          Create Your First Review
        </Button>
      </div>
    </div>
  );
}
