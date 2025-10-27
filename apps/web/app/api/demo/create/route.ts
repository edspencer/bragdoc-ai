import { NextResponse } from 'next/server';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';
import { createDemoAccount } from '@/lib/create-demo-account';

/**
 * POST /api/demo/create
 *
 * Creates a demo account with pre-populated sample data.
 * Returns temporary password for immediate auto-login.
 *
 * Returns 404 if DEMO_MODE_ENABLED is not set to 'true'.
 */
export async function POST() {
  const startTime = performance.now();

  // Check if demo mode is enabled
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  console.log('[Demo API] Starting demo account creation...');

  const result = await createDemoAccount();

  const duration = performance.now() - startTime;

  if (result.success) {
    console.log(
      `[Demo API] Successfully created demo account in ${duration.toFixed(0)}ms (imported ${
        result.stats?.companies.created || 0
      } companies, ${result.stats?.projects.created || 0} projects, ${
        result.stats?.achievements.created || 0
      } achievements, ${result.stats?.documents.created || 0} documents)`,
    );

    return NextResponse.json({
      success: true,
      userId: result.user?.id,
      email: result.user?.email,
      stats: result.stats,
    });
  } else {
    console.error(
      `[Demo API] Failed to create demo account after ${duration.toFixed(0)}ms:`,
      result.error,
    );
    return NextResponse.json(
      { error: result.error || 'Failed to create demo account' },
      { status: 500 },
    );
  }
}
