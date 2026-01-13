import { DemoToggleButton } from '@/components/demo-toggle-button';

/**
 * Wrapper component that conditionally renders the DemoToggleButton
 *
 * This wrapper handles the conditional rendering logic for the demo toggle button:
 * - Only renders when demo mode is enabled via environment variable
 */
export function DemoToggleWrapper() {
  // Only show when demo mode feature is enabled
  if (process.env.NEXT_PUBLIC_DEMO_MODE_ENABLED !== 'true') {
    return null;
  }

  return <DemoToggleButton />;
}
