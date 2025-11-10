// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

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
  // 100% in dev, 10% in production to manage quota
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment tag for filtering issues
  environment: process.env.NODE_ENV || 'development',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Session Replay sampling rates
  // Record 10% of normal sessions
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
