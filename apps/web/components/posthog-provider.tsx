'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Initialize PostHog once
  useEffect(() => {
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        persistence: session ? 'localStorage+cookie' : 'memory',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false, // Disable automatic event capture
        disable_session_recording: true, // We're not using session recording
        advanced_disable_flags: true, // Disable feature flags and experiments
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
      });
    }
  }, []);

  // Handle user identification separately
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      if (session?.user?.id) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.name,
        });
      }
    }
  }, [session]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
