import { NextResponse } from 'next/server';
import { createDemoAccount } from '@/lib/create-demo-account';
import { captureServerEvent } from '@/lib/posthog-server';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';
import { signIn } from '@/app/(auth)/auth';

/**
 * API Route: Start Demo Mode
 *
 * Creates a demo account and sets session cookie via response headers.
 * Uses API route instead of server action to ensure cookie is set before redirect.
 */
export async function POST(request: Request) {
  try {
    // Check if demo mode enabled
    if (!isDemoModeEnabled()) {
      return NextResponse.json(
        { error: 'Demo mode not available' },
        { status: 403 },
      );
    }

    // Parse request body (could be JSON or form data)
    const contentType = request.headers.get('content-type');
    let empty = false;

    if (contentType?.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      empty = body.empty === true;
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      empty = formData.get('empty') === 'true';
    }

    // Create demo account with optional data
    const result = await createDemoAccount({ skipData: empty });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Failed to create demo account' },
        { status: 500 },
      );
    }

    const demoUser = result.user;

    console.log('[API Demo] Demo user created:', demoUser.id);

    // Track demo start
    await captureServerEvent(demoUser.id, 'demo_started', {
      source: 'demo_page',
      has_data: !empty,
      companies_count: result.stats?.companies.created ?? 0,
      projects_count: result.stats?.projects.created ?? 0,
      achievements_count: result.stats?.achievements.created ?? 0,
    });

    // Use NextAuth's signIn to properly set session cookie
    console.log('[API Demo] Calling signIn with demo provider');
    await signIn('demo', {
      email: demoUser.email,
      isDemo: 'true',
      redirect: false, // Don't redirect yet, we'll do it manually
    });

    console.log('[API Demo] signIn completed, redirecting to dashboard');

    // Now redirect
    return NextResponse.redirect(
      new URL(
        '/dashboard',
        process.env.NEXTAUTH_URL || 'http://localhost:3000',
      ),
      { status: 302 },
    );
  } catch (error) {
    console.error('Error starting demo:', error);
    return NextResponse.json(
      { error: 'Failed to start demo mode' },
      { status: 500 },
    );
  }
}
