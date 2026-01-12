'use client';

import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTourContext } from './demo-tour-provider';

interface GuidedTourButtonProps {
  tourId: string;
  disabled?: boolean;
}

export function GuidedTourButton({
  tourId,
  disabled = false,
}: GuidedTourButtonProps) {
  const { startTour } = useTourContext();

  if (disabled) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTour(tourId)}
            className="hidden h-8 w-8 p-0 md:flex"
            aria-label="Start guided tour"
          >
            <HelpCircle className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Start guided tour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
