// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://0337f9c49b2d9d00f3308e137d2bd3e3@o4510341241110528.ingest.us.sentry.io/4510341243404288',

  // Sample rate for performance monitoring
  // 100% in dev, 10% in production to manage quota
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment tag for filtering issues
  environment: process.env.NODE_ENV || 'development',

  // Enable logs to be sent to Sentry (console.log, console.error, etc)
  enableLogs: true,

  // Enable sending user info (email, ID) with errors for better debugging
  // We want this to identify which users are affected
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
