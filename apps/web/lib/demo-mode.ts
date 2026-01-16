/**
 * Demo Mode Utilities
 *
 * Provides session-swap architecture for per-user demo mode.
 * When a user toggles demo mode, we create a shadow user and swap their session
 * to point to that shadow user. This approach requires no changes to existing
 * API routes - getAuthUser() returns the demo user automatically.
 *
 * Key concepts:
 * - Shadow User: A demo user linked to a real user via demoUserId
 * - Session Swap: Creating a new session that points to the shadow user
 * - impersonatedBy: Session field tracking the real user behind demo mode
 * - Cookie Signing: Session cookies must be signed with HMAC-SHA256 to match
 *   Better Auth's format of "token.signature"
 */

import crypto from 'node:crypto';
import { webcrypto } from 'node:crypto';
import { db } from '@/database/index';
import { user, session } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { importDemoData } from './demo-data-import';

/**
 * Gets or creates a shadow user for demo mode
 *
 * The shadow user is a separate user account that holds demo data.
 * It's linked to the real user via the demoUserId field.
 *
 * @param realUserId - The UUID of the real user entering demo mode
 * @returns The UUID of the shadow (demo) user
 */
export async function getOrCreateShadowUser(
  realUserId: string,
): Promise<string> {
  // 1. Check if user already has a demoUserId linked
  const realUser = await db
    .select()
    .from(user)
    .where(eq(user.id, realUserId))
    .limit(1);

  if (!realUser[0]) {
    throw new Error(`Real user ${realUserId} not found`);
  }

  if (realUser[0].demoUserId) {
    // Verify the shadow user still exists
    const shadowExists = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, realUser[0].demoUserId))
      .limit(1);

    if (shadowExists.length > 0) {
      return realUser[0].demoUserId;
    }
    // Shadow user was deleted, continue to create a new one
  }

  // 2. Create a new shadow user
  const shadowUserId = crypto.randomUUID();
  const shadowEmail = `shadow-${realUserId}@demo.bragdoc.ai`;

  await db.insert(user).values({
    id: shadowUserId,
    email: shadowEmail,
    name: 'Demo User',
    isDemo: true,
    level: 'demo',
    provider: 'credentials', // Shadow users don't use real auth
    emailVerified: false,
  });

  // 3. Link the shadow user to the real user
  await db
    .update(user)
    .set({ demoUserId: shadowUserId })
    .where(eq(user.id, realUserId));

  // 4. Seed demo data for the shadow user
  await importDemoData(shadowUserId);

  return shadowUserId;
}

/**
 * Creates a demo session for a user entering demo mode
 *
 * The session points to the shadow/demo user but tracks the real user
 * in impersonatedBy. This allows API routes to serve demo data while
 * we can still identify the real user.
 *
 * @param realUserId - The UUID of the real user (stored in impersonatedBy)
 * @param demoUserId - The UUID of the shadow user (becomes the session's userId)
 * @returns Session token and expiration date
 */
export async function createDemoSession(
  realUserId: string,
  demoUserId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

  await db.insert(session).values({
    userId: demoUserId,
    token: token,
    expiresAt: expiresAt,
    impersonatedBy: realUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { token, expiresAt };
}

/**
 * Creates a normal session for a user (exiting demo mode or regular login)
 *
 * This creates a standard session without impersonation.
 *
 * @param userId - The UUID of the user
 * @returns Session token and expiration date
 */
export async function createNormalSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(session).values({
    userId: userId,
    token: token,
    expiresAt: expiresAt,
    impersonatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { token, expiresAt };
}

/**
 * Signs a value using HMAC-SHA256
 *
 * This replicates Better Auth's cookie signing mechanism from better-call.
 * The signature is created using HMAC-SHA256 with the BETTER_AUTH_SECRET.
 *
 * @param value - The value to sign
 * @param secret - The secret key for signing
 * @returns Base64-encoded signature
 */
async function signValue(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const algorithm = { name: 'HMAC', hash: 'SHA-256' };

  // Import the secret as a CryptoKey
  const key = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    algorithm,
    false,
    ['sign'],
  );

  // Sign the value
  const signature = await webcrypto.subtle.sign(
    algorithm,
    key,
    encoder.encode(value),
  );

  // Convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Formats session cookies with proper signing
 *
 * Creates properly formatted Set-Cookie header values for Better Auth's
 * session cookies. Returns multiple cookies:
 * 1. better-auth.session_token - The signed session token
 * 2. better-auth.session_data - Cleared to force fresh database lookup
 *
 * Better Auth uses signed cookies in format "token.signature" where the
 * signature is HMAC-SHA256 of the token using BETTER_AUTH_SECRET.
 *
 * @param token - The session token
 * @param expiresAt - When the session expires
 * @returns Array of formatted cookie strings for Set-Cookie headers
 */
export async function formatSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<string[]> {
  const secret = process.env.BETTER_AUTH_SECRET!;

  // Sign the token like Better Auth does
  const signature = await signValue(token, secret);

  // Format: value.signature, then URL encode
  const signedValue = encodeURIComponent(`${token}.${signature}`);

  // Better Auth uses __Secure- prefix in production when useSecureCookies is true
  const isProduction =
    process.env.NODE_ENV === 'production' &&
    !process.env.BETTER_AUTH_URL?.includes('localhost');
  const secure = isProduction ? '; Secure' : '';
  const cookiePrefix = isProduction ? '__Secure-' : '';

  // Main session token cookie
  const sessionTokenCookie = `${cookiePrefix}better-auth.session_token=${signedValue}; HttpOnly; Path=/; SameSite=Lax${secure}; Expires=${expiresAt.toUTCString()}`;

  // Clear the session_data cache cookie to force a fresh database lookup
  // This is important because it may contain the old user's cached data
  const sessionDataClearCookie = `${cookiePrefix}better-auth.session_data=; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=0`;

  return [sessionTokenCookie, sessionDataClearCookie];
}

/**
 * Gets the full session including impersonatedBy field
 *
 * Better Auth's getSession() doesn't expose custom fields like impersonatedBy,
 * so we need to query the session table directly to check demo mode status.
 *
 * Note: Better Auth stores cookies in signed format "token.signature" but only
 * stores the raw "token" in the database. We extract just the token part.
 *
 * @param request - The incoming HTTP request
 * @returns The full session including impersonatedBy, or null if not found
 */
export async function getFullSession(request: Request): Promise<{
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  impersonatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  // Extract session token from cookies
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  // Parse cookies to find the session token
  // Better Auth uses __Secure- prefix in production when useSecureCookies is true
  const cookies = parseCookies(cookieHeader);
  const rawSessionToken =
    cookies['__Secure-better-auth.session_token'] ||
    cookies['better-auth.session_token'];

  if (!rawSessionToken) return null;

  // URL decode the token first (cookies may be URL encoded)
  const decodedToken = decodeURIComponent(rawSessionToken);

  // Better Auth uses signed cookies in format "token.signature"
  // The database only stores the raw "token" without the signature
  // Extract just the token part before the first dot
  const tokenParts = decodedToken.split('.');
  const sessionToken = tokenParts[0];

  if (!sessionToken) return null;

  // Query session table directly to get the full session including impersonatedBy
  const sessions = await db
    .select()
    .from(session)
    .where(eq(session.token, sessionToken))
    .limit(1);

  const sess = sessions[0];
  if (!sess) return null;

  // Check if session is expired
  if (new Date() > sess.expiresAt) {
    return null;
  }

  return sess;
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

/**
 * Deletes a session by token
 *
 * Used when switching between demo and normal mode to clean up old sessions.
 *
 * @param token - The session token to delete
 */
export async function deleteSessionByToken(token: string): Promise<void> {
  await db.delete(session).where(eq(session.token, token));
}

/**
 * Gets the full session by session ID
 *
 * Used in server components to check the impersonatedBy field
 * to determine if the user is in demo mode.
 *
 * @param sessionId - The UUID of the session
 * @returns The full session including impersonatedBy, or null if not found
 */
export async function getFullSessionById(sessionId: string): Promise<{
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  impersonatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const sessions = await db
    .select()
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1);

  const sess = sessions[0];
  if (!sess) return null;

  // Check if session is expired
  if (new Date() > sess.expiresAt) {
    return null;
  }

  return sess;
}
