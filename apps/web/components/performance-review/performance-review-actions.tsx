'use client';

import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { CreatePerformanceReviewDialog } from './create-performance-review-dialog';

export function PerformanceReviewActions() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        <IconPlus className="size-4" />
        New Review
      </Button>
      <CreatePerformanceReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
