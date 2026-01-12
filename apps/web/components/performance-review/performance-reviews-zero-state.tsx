'use client';

import { IconClipboardCheck, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { PageZeroState } from '@/components/shared/page-zero-state';

interface PerformanceReviewsZeroStateProps {
  onCreateClick: () => void;
}

export function PerformanceReviewsZeroState({
  onCreateClick,
}: PerformanceReviewsZeroStateProps) {
  return (
    <PageZeroState
      icon={<IconClipboardCheck className="h-6 w-6 text-primary" />}
      title="No Performance Reviews Yet"
    >
      <p className="text-muted-foreground text-center">
        Performance reviews help you compile your achievements into
        comprehensive documents for review periods. Define a date range and let
        AI help you highlight your impact and growth.
      </p>
      <div className="text-center">
        <Button onClick={onCreateClick} size="lg">
          <IconPlus className="size-4 mr-2" />
          Create Your First Review
        </Button>
      </div>
    </PageZeroState>
  );
}
