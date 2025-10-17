'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * Demo Mode Layout Component
 *
 * Sets CSS custom properties based on demo mode status to adjust
 * fixed positioning of sidebar and content.
 */
export function DemoModeLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isDemoUser = session?.user?.level === 'demo';

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
