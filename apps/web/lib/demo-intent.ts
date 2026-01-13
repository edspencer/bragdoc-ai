/**
 * Demo Intent Cookie Utilities
 *
 * Manages a demo intent cookie that survives OAuth redirects and magic link flows.
 * When a user clicks "Try Demo" on the marketing site, they're redirected to
 * /register?demo=true, which sets this cookie. After authentication completes,
 * the DemoIntentHandler component checks for this cookie and automatically
 * enters the user into per-user demo mode.
 *
 * Cookie Configuration:
 * - HttpOnly: false (needs client-side access for handler)
 * - SameSite: Lax (allows cookie on OAuth redirects)
 * - Secure: true in production only
 * - Max-Age: 3600 (1 hour expiry)
 */

export const DEMO_INTENT_COOKIE_NAME = 'bragdoc_demo_intent';

/**
 * Sets the demo intent cookie (server-side)
 * Returns Set-Cookie header string for use in response
 */
export function setDemoIntentCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${DEMO_INTENT_COOKIE_NAME}=true; Path=/; SameSite=Lax${secure}; Max-Age=3600`;
}

/**
 * Gets demo intent from request cookies
 * @param request - The incoming HTTP request
 * @returns true if demo intent cookie is present with value 'true'
 */
export function getDemoIntent(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const cookies = parseCookies(cookieHeader);
  return cookies[DEMO_INTENT_COOKIE_NAME] === 'true';
}

/**
 * Clears the demo intent cookie (server-side)
 * Returns Set-Cookie header string to clear the cookie
 */
export function clearDemoIntentCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${DEMO_INTENT_COOKIE_NAME}=; Path=/; SameSite=Lax${secure}; Max-Age=0`;
}

/**
 * Checks for demo intent cookie in document.cookie (client-side)
 * @returns true if demo intent cookie is present
 */
export function hasDemoIntentCookie(): boolean {
  if (typeof document === 'undefined') return false;

  const cookies = parseCookies(document.cookie);
  return cookies[DEMO_INTENT_COOKIE_NAME] === 'true';
}

/**
 * Clears demo intent cookie from client-side
 */
export function clearDemoIntentClientSide(): void {
  if (typeof document === 'undefined') return;

  // Set cookie with expired date to delete it
  document.cookie = `${DEMO_INTENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

/**
 * Parses a cookie header string into key-value pairs
 *
 * @param cookieHeader - The Cookie header string
 * @returns Object with cookie names as keys and values
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });

  return cookies;
}
