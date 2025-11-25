'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { WorkstreamConfigDialog } from './workstream-config-dialog';

interface WorkstreamsHeaderProps {
  showFilters: boolean;
  storedProjectIds?: string[];
  storedTimeRange?: { startDate: string; endDate: string };
  filterDisplay?: React.ReactNode;
}

export function WorkstreamsHeader({
  showFilters,
  storedProjectIds,
  storedTimeRange,
  filterDisplay,
}: WorkstreamsHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!showFilters) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-4">
        {filterDisplay}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          title="Configure workstream generation filters"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <WorkstreamConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentFilters={
          storedProjectIds || storedTimeRange
            ? {
                projectIds: storedProjectIds,
                timeRange: storedTimeRange,
              }
            : undefined
        }
      />
    </>
  );
}
