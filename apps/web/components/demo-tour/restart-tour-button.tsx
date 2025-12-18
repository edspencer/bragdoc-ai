'use client';

import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTourContext } from './demo-tour-provider';

export function RestartTourButton() {
  const { startTour } = useTourContext();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={startTour}
            className="h-8 w-8 p-0"
            aria-label="Restart guided tour"
          >
            <Compass className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Restart guided tour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
