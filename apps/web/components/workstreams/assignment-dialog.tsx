'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkstreamBadge } from './workstream-badge';
import type { Workstream } from '@bragdoc/database';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementId: string;
  currentWorkstreamId?: string | null;
  workstreams: Workstream[];
  onAssign: (
    achievementId: string,
    workstreamId: string | null,
  ) => Promise<void>;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  achievementId,
  currentWorkstreamId,
  workstreams,
  onAssign,
}: AssignmentDialogProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async (workstreamId: string | null) => {
    setIsAssigning(true);
    try {
      await onAssign(achievementId, workstreamId);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign workstream:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Workstream</DialogTitle>
          <DialogDescription>
            Choose a workstream for this achievement, or select "None" to remove
            assignment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button
            variant={currentWorkstreamId === null ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => handleAssign(null)}
            disabled={isAssigning}
          >
            None (Unassigned)
          </Button>
          {workstreams.map((ws) => (
            <Button
              key={ws.id}
              variant={currentWorkstreamId === ws.id ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => handleAssign(ws.id)}
              disabled={isAssigning}
            >
              <WorkstreamBadge workstream={ws} />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
