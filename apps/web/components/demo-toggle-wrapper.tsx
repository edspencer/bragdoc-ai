'use client';

import { DemoToggleButton } from '@/components/demo-toggle-button';
import { useDemoMode } from '@/components/demo-mode-provider';

/**
 * Wrapper component that conditionally renders the DemoToggleButton
 *
 * This wrapper handles the conditional rendering logic for the demo toggle button:
 * - Only renders when demo mode is enabled via environment variable
 * - Hides the button for standalone demo accounts (they're already in demo mode)
 *
 * Uses the DemoModeContext to check if the user is a standalone demo account.
 */
export function DemoToggleWrapper() {
  const { isStandaloneDemoUser } = useDemoMode();

  // Don't show for standalone demo accounts - they're already in demo mode
  // and can't toggle to their "real" account
  if (isStandaloneDemoUser) {
    return null;
  }

  // Only show when demo mode feature is enabled
  if (process.env.NEXT_PUBLIC_DEMO_MODE_ENABLED !== 'true') {
    return null;
  }

  return <DemoToggleButton />;
}
