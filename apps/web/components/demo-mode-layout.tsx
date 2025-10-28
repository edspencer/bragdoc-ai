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

  // The demo banner height
  const bannerHeight = isDemoUser ? '40px' : '0px';

  useEffect(() => {
    // Set CSS custom property on document root
    document.documentElement.style.setProperty(
      '--demo-banner-height',
      bannerHeight,
    );
  }, [bannerHeight]);

  return <>{children}</>;
}
