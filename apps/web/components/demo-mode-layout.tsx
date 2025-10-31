'use client';

import { useSession } from '@/lib/better-auth/client';
import { useEffect } from 'react';

/**
 * Demo Mode Layout Component
 *
 * Sets CSS custom properties based on demo mode status to adjust
 * fixed positioning of sidebar and content.
 */
export function DemoModeLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Type cast to access custom Better Auth field (level is an additionalField in config)
  const isDemoUser = (session?.user as { level?: string })?.level === 'demo';

  // Check if banner is suppressed (for screenshots, etc.)
  const isSuppressed = process.env.NEXT_PUBLIC_SUPRESSED_DEMO_BANNER === 'true';

  // The demo banner height - only set height if demo user AND not suppressed
  const bannerHeight = isDemoUser && !isSuppressed ? '40px' : '0px';

  useEffect(() => {
    // Set CSS custom property on document root
    document.documentElement.style.setProperty(
      '--demo-banner-height',
      bannerHeight,
    );
  }, [bannerHeight]);

  return <>{children}</>;
}
