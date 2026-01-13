'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDemoMode } from '@/components/demo-mode-provider';
import { FlaskConical, Loader2 } from 'lucide-react';

/**
 * Demo Toggle Button Component
 *
 * A button that allows users to toggle per-user demo mode on/off.
 * When clicked:
 * - If in normal mode: Creates a shadow demo user (if needed) and switches session to demo mode
 * - If in demo mode: Switches session back to the real user
 *
 * Visual states:
 * - Normal mode: Default ghost button with flask icon
 * - Demo mode: Amber-colored flask icon
 * - Loading: Spinning loader icon
 *
 * @example
 * ```tsx
 * <SiteHeader title="Dashboard">
 *   <DemoToggleButton />
 * </SiteHeader>
 * ```
 */
export function DemoToggleButton() {
  const { isDemoMode, isLoading, toggleDemoMode } = useDemoMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDemoMode}
          disabled={isLoading}
          className={isDemoMode ? 'text-amber-500' : ''}
          aria-label={isDemoMode ? 'Exit Demo Mode' : 'Try Demo Mode'}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isDemoMode ? 'Exit Demo Mode' : 'Try Demo Mode'}
      </TooltipContent>
    </Tooltip>
  );
}
