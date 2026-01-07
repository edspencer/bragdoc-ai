'use client';

import { IconClipboardCheck, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PerformanceReviewsZeroState() {
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
        <Button asChild size="lg">
          <Link href="/performance/new">
            <IconPlus className="size-4 mr-2" />
            Create Your First Review
          </Link>
        </Button>
      </div>
    </div>
  );
}
