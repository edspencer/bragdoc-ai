/**
 * Demo Mode Status API Endpoint
 *
 * GET /api/demo-mode/status
 *
 * Returns the current demo mode status for the authenticated user.
 * Used by the frontend to determine if the user is in demo mode.
 */

import { getAuthUser } from '@/lib/getAuthUser';
import { getFullSession } from '@/lib/demo-mode';

export async function GET(request: Request) {
  try {
    // 1. Get authenticated user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      // Not authenticated - return not in demo mode
      return Response.json({ isDemoMode: false });
    }

    // 2. Get full session to check impersonatedBy
    const fullSession = await getFullSession(request);
    if (!fullSession) {
      // No session found - return not in demo mode
      return Response.json({ isDemoMode: false });
    }

    // 3. Determine demo mode status
    const isDemoMode = fullSession.impersonatedBy !== null;

    return Response.json({
      isDemoMode,
      ...(isDemoMode && { realUserId: fullSession.impersonatedBy }),
    });
  } catch (error) {
    console.error('Error getting demo mode status:', error);
    // Return false on error to fail safely
    return Response.json({ isDemoMode: false });
  }
}
