'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        persistence: 'memory', // Cookieless mode
        disable_persistence: true, // No cookies or localStorage
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false, // Disable automatic event capture
        disable_session_recording: true, // We're not using session recording
        advanced_disable_flags: true, // Disable feature flags and experiments
        disabled: process.env.NODE_ENV === 'development', // Disable in development
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
      });
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
