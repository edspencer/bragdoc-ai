import { auth } from 'app/(auth)/auth';
import { decode } from 'next-auth/jwt';
import type { User } from '@/database/schema';

/**
 * Unified authentication helper that checks both cookies (browser) and Authorization headers (CLI).
 * Use this in API routes to support both browser sessions and CLI JWT tokens.
 */
export async function getAuthUser(
  request: Request,
): Promise<{ user: User; source: 'session' | 'jwt' } | null> {
  // First, try to get user from session (cookie-based, for browser)
  const session = await auth();
  if (session?.user?.id) {
    return { user: session.user as User, source: 'session' };
  }

  // If no session, check Authorization header (for CLI)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    // Decode and verify the JWT
    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET!,
      salt: '',
    });

    if (!decoded?.id) {
      return null;
    }

    // Return user data from JWT
    return {
      user: {
        id: decoded.id as string,
        email: decoded.email as string,
        name: decoded.name as string,
        image: decoded.picture as string,
        provider: decoded.provider as string,
        providerId: decoded.providerId as string,
        preferences: decoded.preferences as any,
        githubAccessToken: decoded.githubAccessToken as string,
        level: decoded.level as any,
        renewalPeriod: decoded.renewalPeriod as any,
      } as User,
      source: 'jwt',
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}
