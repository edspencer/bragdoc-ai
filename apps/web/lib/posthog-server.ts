/**
 * Server-side PostHog client for Cloudflare Workers environment
 *
 * IMPORTANT: This uses the HTTP API approach instead of posthog-node
 * because we're deployed on Cloudflare Workers (stateless environment).
 *
 * The HTTP API ensures events are sent immediately without needing
 * process lifecycle management or persistent connections.
 */

export async function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>,
  userIp?: string,
) {
  // Skip if PostHog is not enabled (opt-in for open source)
  if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== 'true') {
    return;
  }

  try {
    const eventProperties: Record<string, any> = {
      ...properties,
      distinct_id: userId,
    };

    // Include user's IP address for GeoIP lookup if provided
    if (userIp) {
      eventProperties.$ip = userIp;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event,
          properties: eventProperties,
          timestamp: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      console.error('PostHog capture failed:', await response.text());
    }
  } catch (error) {
    // Don't throw - analytics failures shouldn't break the app
    console.error('PostHog server event failed:', error);
  }
}

/**
 * Identify a user with PostHog server-side
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, any>,
  userIp?: string,
) {
  // Skip if PostHog is not enabled (opt-in for open source)
  if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== 'true') {
    return;
  }

  try {
    const eventProperties: Record<string, any> = {
      distinct_id: userId,
      $set: properties,
    };

    // Include user's IP address for GeoIP lookup if provided
    if (userIp) {
      eventProperties.$ip = userIp;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event: '$identify',
          properties: eventProperties,
          timestamp: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      console.error('PostHog identify failed:', await response.text());
    }
  } catch (error) {
    console.error('PostHog identify failed:', error);
  }
}

/**
 * Alias an anonymous user ID to a known user ID
 * This merges all events from the anonymous session with the authenticated user
 */
export async function aliasUser(userId: string, anonymousId: string) {
  // Skip if PostHog is not enabled (opt-in for open source)
  if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== 'true') {
    return;
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event: '$create_alias',
          properties: {
            distinct_id: userId,
            alias: anonymousId,
          },
          timestamp: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      console.error('PostHog alias failed:', await response.text());
    }
  } catch (error) {
    console.error('PostHog alias failed:', error);
  }
}
