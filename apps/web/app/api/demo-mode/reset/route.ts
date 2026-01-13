/**
 * Demo Mode Reset API Endpoint
 *
 * POST /api/demo-mode/reset
 *
 * Resets demo data by cleaning up all existing data for the demo user
 * and re-seeding with fresh demo data. Only works when in demo mode.
 */

import { getAuthUser } from '@/lib/getAuthUser';
import { getFullSession } from '@/lib/demo-mode';
import { cleanupDemoAccountData } from '@/lib/demo-data-cleanup';
import { importDemoData } from '@/lib/demo-data-import';

export async function POST(request: Request) {
  try {
    // 1. Get authenticated user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get full session to check if in demo mode
    const fullSession = await getFullSession(request);
    if (!fullSession) {
      return Response.json({ error: 'Session not found' }, { status: 401 });
    }

    // 3. Verify user is in demo mode
    if (!fullSession.impersonatedBy) {
      return Response.json(
        { error: 'Not in demo mode. Reset is only available in demo mode.' },
        { status: 400 },
      );
    }

    // 4. Clean up demo user data (auth.user.id is the demo user in this context)
    // Preserve the current session so user stays logged in after reset
    await cleanupDemoAccountData(auth.user.id, {
      preserveSessionToken: fullSession.token,
    });

    // 5. Re-seed demo data
    const stats = await importDemoData(auth.user.id);

    // 6. Return success with import statistics
    return Response.json({
      success: true,
      message: 'Demo data reset successfully',
      stats,
    });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    return Response.json(
      { error: 'Failed to reset demo data' },
      { status: 500 },
    );
  }
}
