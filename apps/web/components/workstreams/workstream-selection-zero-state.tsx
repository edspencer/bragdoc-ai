'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WorkstreamSelectionZeroStateProps {
  unassignedCount: number;
  onShowUnassigned: () => void;
}

export function WorkstreamSelectionZeroState({
  unassignedCount,
  onShowUnassigned,
}: WorkstreamSelectionZeroStateProps) {
  return (
    <Card id="tour-unassigned-workstreams">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">
            Click a Workstream above to see its Achievements
          </p>
          {unassignedCount > 0 && (
            <>
              <div className="w-full max-w-xs mx-auto border-t border-border" />
              <Button variant="link" onClick={onShowUnassigned}>
                See {unassignedCount} Unassigned Achievement
                {unassignedCount === 1 ? '' : 's'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
