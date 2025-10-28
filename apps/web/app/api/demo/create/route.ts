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
  // Check if demo mode is enabled
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const result = await createDemoAccount();

  if (result.success) {
    return NextResponse.json({
      success: true,
      userId: result.user?.id,
      email: result.user?.email,
      stats: result.stats,
    });
  } else {
    console.error('[Demo API] Failed to create demo account:', result.error);
    return NextResponse.json(
      { error: result.error || 'Failed to create demo account' },
      { status: 500 },
    );
  }
}
