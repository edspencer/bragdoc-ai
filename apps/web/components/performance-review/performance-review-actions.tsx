'use client';

import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PerformanceReviewActions() {
  return (
    <Button asChild>
      <Link href="/performance/new">
        <IconPlus className="size-4" />
        New Review
      </Link>
    </Button>
  );
}
