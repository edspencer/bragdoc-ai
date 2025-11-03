'use client';

import { usePathname } from 'next/navigation';
import { DemoModeBanner } from '@/components/demo-mode-banner';

/**
 * Props for DemoModeBannerWrapper component
 */
interface DemoModeBannerWrapperProps {
  /**
   * Whether the user is in demo mode (from session.user.level === 'demo')
   */
  isDemoMode: boolean;
}

/**
 * DemoModeBannerWrapper Component
 *
 * Client Component wrapper for DemoModeBanner.
 * This is needed because DemoModeBanner is a Client Component
 * but needs to receive isDemoMode from a Server Component parent.
 *
 * The banner now includes the help dialog, so it works on all pages.
 * Auto-opens the dialog on first visit to the dashboard page only.
 *
 * @example
 * ```tsx
 * <DemoModeBannerWrapper isDemoMode={isDemoMode} />
 * ```
 */
export function DemoModeBannerWrapper({
  isDemoMode,
}: DemoModeBannerWrapperProps) {
  const pathname = usePathname();

  // Auto-open dialog only on dashboard page
  const autoOpenDialog = pathname === '/dashboard';

  return (
    <DemoModeBanner isDemoMode={isDemoMode} autoOpenDialog={autoOpenDialog} />
  );
}
