/**
 * Create Demo Account
 *
 * Centralized logic for creating demo accounts with pre-populated data.
 * Can be called from both API routes and server actions.
 */

import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { generateDemoEmail } from './demo-mode-utils';
import { importDemoData } from './demo-data-import';
import { db } from '@/database/index';
import { user, type User } from '@/database/schema';
import type { ImportStats } from './import-user-data';

export interface CreateDemoAccountResult {
  success: boolean;
  user?: User;
  stats?: ImportStats;
  error?: string;
}

/**
 * Generate JWT session token for demo user
 */
async function createDemoSessionToken(user: User): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 4 * 60 * 60; // 4 hours from now

  // In NextAuth v5, the salt must be the cookie name for proper encryption/decryption
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXTAUTH_URL?.startsWith('https://');
  const cookieName = isSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  return await encode({
    token: {
      // Standard JWT claims
      sub: user.id,
      iat: now,
      exp: expiresAt,

      // NextAuth session claims
      email: user.email,
      name: user.name,
      picture: user.image,

      // BragDoc-specific fields (from auth.ts JWT callback pattern)
      id: user.id,
      provider: user.provider,
      providerId: user.providerId,
      preferences: user.preferences,
      githubAccessToken: user.githubAccessToken,
      level: user.level,
      renewalPeriod: user.renewalPeriod,

      // Demo metadata
      isDemo: true,
      demoCreatedAt: Date.now(),
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName, // Must match the cookie name in NextAuth v5!
    maxAge: 4 * 60 * 60, // 4 hours
  });
}

/**
 * Set NextAuth session cookie
 */
async function setDemoSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  // NextAuth cookie name differs by environment
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 4 * 60 * 60,
  });
}

// Export for use in server actions
export { createDemoSessionToken, setDemoSessionCookie };

/**
 * Creates a demo account with optional pre-populated sample data
 *
 * Steps:
 * 1. Generates unique demo email address
 * 2. Creates demo user with level='demo' and null password
 * 3. Optionally imports demo data (companies, projects, achievements, documents)
 *
 * Authentication is handled separately via createDemoSessionToken/setDemoSessionCookie
 *
 * @param options.skipData - If true, skips importing demo data (for testing zero states)
 * @returns Result object with user, and import stats
 */
export async function createDemoAccount(options?: {
  skipData?: boolean;
}): Promise<CreateDemoAccountResult> {
  try {
    // Generate demo email
    const email = generateDemoEmail();

    // Create demo user
    const [demoUser] = await db
      .insert(user)
      .values({
        email,
        password: null,
        name: 'Demo User',
        level: 'demo',
        emailVerified: new Date(),
        provider: 'email',
        preferences: {
          language: 'en',
        },
      })
      .returning();

    if (!demoUser) {
      throw new Error('Failed to create demo user');
    }

    // Import demo data (unless skipData is true)
    let stats: ImportStats | undefined;
    if (!options?.skipData) {
      stats = await importDemoData(demoUser.id);
    }

    return {
      success: true,
      user: demoUser,
      stats,
    };
  } catch (error) {
    console.error('Error creating demo account:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create demo account',
    };
  }
}
