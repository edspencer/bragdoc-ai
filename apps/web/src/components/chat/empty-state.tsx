'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { ActionButtons } from './action-buttons';
import { MessageSquareIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  onCompanyCreate?: (name: string) => void;
  onProjectCreate?: (name: string) => void;
}

export function EmptyState({
  className,
  onCompanyCreate,
  onProjectCreate,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6',
        className,
      )}
    >
      <Card className="flex aspect-square w-full max-w-[200px] items-center justify-center bg-muted">
        <MessageSquareIcon className="size-12 text-muted-foreground" />
      </Card>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h3 className="text-lg font-semibold">No messages yet</h3>
        <p className="text-sm text-muted-foreground">
          Start by telling me about your achievements, or organize your work
          first.
        </p>
      </div>
      <ActionButtons
        className="w-full max-w-sm"
        onCompanyCreate={onCompanyCreate}
        onProjectCreate={onProjectCreate}
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Not sure where to start? Try these example prompts:
        </p>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm italic text-muted-foreground">
            &quot;I fixed a critical bug in our payment system today&quot;
          </p>
          <p className="text-sm italic text-muted-foreground">
            &quot;Just finished the new onboarding flow redesign&quot;
          </p>
          <p className="text-sm italic text-muted-foreground">
            &quot;Led a successful team retrospective this sprint&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
