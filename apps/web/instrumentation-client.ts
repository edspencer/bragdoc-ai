// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production and preview (not local development)
// NEXT_PUBLIC_VERCEL_ENV is available on the client and set to 'production', 'preview', or 'development'
const shouldInitializeSentry =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
  (process.env.NODE_ENV === 'production' &&
    !process.env.NEXT_PUBLIC_VERCEL_ENV);

if (shouldInitializeSentry) {
  Sentry.init({
    dsn: 'https://0337f9c49b2d9d00f3308e137d2bd3e3@o4510341241110528.ingest.us.sentry.io/4510341243404288',

    // Session Replay integration - captures video-like recordings of errors
    integrations: [
      Sentry.replayIntegration({
        // Mask all text and input content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Sample rate for performance monitoring
    tracesSampleRate: 0.1,

    // Environment tag for filtering issues
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'production',

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Session Replay sampling rates
    // Record 10% of normal sessions
    replaysSessionSampleRate: 0.1,

    // Always record sessions with errors
    replaysOnErrorSampleRate: 1.0,

    // Enable sending user info (email, ID) with errors for better debugging
    sendDefaultPii: true,

    // Ignore common/expected errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // Cloudflare issues
      'The operation was aborted',
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
