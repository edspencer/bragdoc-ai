/**
 * Demo Mode Toggle API Endpoint
 *
 * POST /api/demo-mode/toggle
 *
 * Toggles demo mode for the authenticated user. When entering demo mode,
 * creates a shadow user (if not exists) and swaps the session to point to it.
 * When exiting demo mode, restores the session to the real user.
 */

import { getAuthUser } from '@/lib/getAuthUser';
import {
  getFullSession,
  getOrCreateShadowUser,
  createDemoSession,
  createNormalSession,
  deleteSessionByToken,
  formatSessionCookie,
} from '@/lib/demo-mode';

/**
 * Enters demo mode for a user
 *
 * 1. Gets or creates shadow user for demo data
 * 2. Deletes the current session
 * 3. Creates a new demo session pointing to shadow user
 * 4. Returns response with Set-Cookie header
 */
async function enterDemoMode(
  realUserId: string,
  currentSessionToken: string,
): Promise<Response> {
  try {
    // Get or create shadow user (seeds demo data on first creation)
    const shadowUserId = await getOrCreateShadowUser(realUserId);

    // Delete the current session
    await deleteSessionByToken(currentSessionToken);

    // Create demo session pointing to shadow user
    const { token, expiresAt } = await createDemoSession(
      realUserId,
      shadowUserId,
    );

    // Return success with new session cookies
    const cookies = await formatSessionCookie(token, expiresAt);
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    for (const cookie of cookies) {
      headers.append('Set-Cookie', cookie);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'demo',
        message: 'Entered demo mode successfully',
      }),
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error('Error entering demo mode:', error);
    return Response.json(
      { error: 'Failed to enter demo mode' },
      { status: 500 },
    );
  }
}

/**
 * Exits demo mode for a user
 *
 * 1. Gets the real user ID from impersonatedBy
 * 2. Deletes the current demo session
 * 3. Creates a new normal session for the real user
 * 4. Returns response with Set-Cookie header
 */
async function exitDemoMode(
  session: { token: string; impersonatedBy: string | null },
  realUserId: string,
): Promise<Response> {
  try {
    // Delete the current demo session
    await deleteSessionByToken(session.token);

    // Create normal session for real user
    const { token, expiresAt } = await createNormalSession(realUserId);

    // Return success with new session cookies
    const cookies = await formatSessionCookie(token, expiresAt);
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    for (const cookie of cookies) {
      headers.append('Set-Cookie', cookie);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'normal',
        message: 'Exited demo mode successfully',
      }),
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error('Error exiting demo mode:', error);
    return Response.json(
      { error: 'Failed to exit demo mode' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Get authenticated user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      console.log('[demo-mode/toggle] No auth user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[demo-mode/toggle] Auth user:', auth.user.id);

    // 2. Get full session to check impersonatedBy
    const cookieHeader = request.headers.get('cookie');
    console.log('[demo-mode/toggle] Cookie header present:', !!cookieHeader);
    if (cookieHeader) {
      console.log('[demo-mode/toggle] Full cookie header:', cookieHeader);
    }
    const fullSession = await getFullSession(request);
    console.log('[demo-mode/toggle] Full session:', !!fullSession);
    if (!fullSession) {
      console.log('[demo-mode/toggle] Returning 401 - session not found');
      return Response.json({ error: 'Session not found' }, { status: 401 });
    }

    // 3. Toggle based on current state
    if (fullSession.impersonatedBy) {
      // Currently in demo mode - exit to normal mode
      // The real user ID is stored in impersonatedBy
      return exitDemoMode(fullSession, fullSession.impersonatedBy);
    } else {
      // Currently in normal mode - enter demo mode
      // auth.user.id is the real user ID
      return enterDemoMode(auth.user.id, fullSession.token);
    }
  } catch (error) {
    console.error('Error toggling demo mode:', error);
    return Response.json(
      { error: 'Failed to toggle demo mode' },
      { status: 500 },
    );
  }
}
