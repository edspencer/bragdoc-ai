/**
 * Unified Authentication Helper
 *
 * This helper checks both Better Auth sessions (browser cookies) and JWT tokens
 * (CLI Authorization headers), providing a unified interface for authentication.
 *
 * Usage in API routes:
 * ```typescript
 * import { getAuthUser } from '@/lib/getAuthUser';
 *
 * export async function GET(request: Request) {
 *   const auth = await getAuthUser(request);
 *   if (!auth) return new Response('Unauthorized', { status: 401 });
 *
 *   const { user, source } = auth;
 *   // ... use user data
 * }
 * ```
 */

import { auth } from '@/lib/better-auth/server';
import { jwtVerify } from 'jose';
import type { User } from '@/database/schema';

/**
 * Unified authentication helper
 *
 * Checks both Better Auth sessions (browser) and JWT tokens (CLI).
 * Returns user data and source of authentication.
 *
 * @param request - The incoming HTTP request
 * @returns User data with authentication source, or null if not authenticated
 */
export async function getAuthUser(
  request: Request,
): Promise<{ user: User; source: 'session' | 'jwt' } | null> {
  // First, try to get user from Better Auth session (cookie-based, for browser)
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (session?.user?.id) {
      // Better Auth session user has core fields plus custom additionalFields
      // Cast to User type which includes all custom fields
      return {
        user: session.user as unknown as User,
        source: 'session',
      };
    }
  } catch (error) {
    // Session check failed, continue to JWT check
    console.error('Error checking Better Auth session:', error);
  }

  // If no session, check Authorization header (for CLI)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    // Verify the JWT using Better Auth secret
    const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (!payload?.id) {
      return null;
    }

    // Return user data from JWT
    return {
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        image: payload.picture as string,
        provider: payload.provider as string,
        providerId: payload.providerId as string,
        preferences: payload.preferences as any,
        githubAccessToken: payload.githubAccessToken as string,
        level: payload.level as any,
        renewalPeriod: payload.renewalPeriod as any,
      } as User,
      source: 'jwt',
    };
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return null;
  }
}
