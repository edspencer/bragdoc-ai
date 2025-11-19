'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

interface PHProviderProps {
  children: React.ReactNode;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
}

export function PHProvider({ children, user }: PHProviderProps) {
  // Initialize PostHog once
  useEffect(() => {
    // Only initialize if explicitly enabled (opt-in for open source)
    if (
      typeof window !== 'undefined' &&
      !posthog.__loaded &&
      process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true'
    ) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        persistence: user ? 'localStorage+cookie' : 'memory',
        capture_pageview: 'history_change', // Capture SPA navigation via History API
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
      if (user?.id) {
        posthog.identify(user.id, {
          email: user.email || undefined,
          name: user.name || undefined,
        });
      }
    }
  }, [user]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
