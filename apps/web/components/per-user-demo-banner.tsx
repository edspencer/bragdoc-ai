'use client';

import { Button } from '@/components/ui/button';
import { useDemoMode } from '@/components/demo-mode-provider';
import { Info, Loader2 } from 'lucide-react';

/**
 * Per-User Demo Mode Banner Component
 *
 * Displays a banner when the user is viewing their shadow demo user's data
 * (per-user demo mode via session swap).
 *
 * This is different from the standalone demo mode banner:
 * - Standalone: User is a demo account (user.level === 'demo')
 * - Per-user: User has toggled demo mode to view sample data
 *
 * The banner provides:
 * - Visual indication that demo data is being viewed
 * - Reset button to restore demo data to initial state
 * - Exit button to return to the user's real data
 *
 * @example
 * ```tsx
 * <PerUserDemoBanner />
 * ```
 */
export function PerUserDemoBanner() {
  const { isDemoMode, isLoading, toggleDemoMode, resetDemoData } =
    useDemoMode();

  // Only show for per-user demo mode (handled by context)
  if (!isDemoMode) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 h-[40px] bg-amber-50 border-b border-amber-200 dark:bg-amber-950 dark:border-amber-800">
      {/* Center: Info message (absolutely positioned for true center) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Info className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            You&apos;re viewing demo data
          </span>
        </div>
      </div>

      {/* Right: Action buttons (positioned at right edge) */}
      <div className="absolute right-4 top-0 h-full flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={resetDemoData}
          disabled={isLoading}
          className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Reset Demo
        </Button>
        <Button
          size="sm"
          onClick={toggleDemoMode}
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Exit Demo Mode
        </Button>
      </div>
    </div>
  );
}
