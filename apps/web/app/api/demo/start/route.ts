import { NextResponse } from 'next/server';
import {
  createDemoAccount,
  DEMO_ACCOUNT_PASSWORD,
} from '@/lib/create-demo-account';
import { captureServerEvent } from '@/lib/posthog-server';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';
import { auth } from '@/lib/better-auth/server';

/**
 * API Route: Start Demo Mode
 *
 * Creates a demo account and establishes a Better Auth session.
 * Uses Better Auth's signInEmail API to properly authenticate and create a session.
 * This ensures the session cookie is created using Better Auth's standard flow.
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

    // Track demo start
    await captureServerEvent(demoUser.id, 'demo_started', {
      source: 'demo_page',
      has_data: !empty,
      companies_count: result.stats?.companies.created ?? 0,
      projects_count: result.stats?.projects.created ?? 0,
      achievements_count: result.stats?.achievements.created ?? 0,
    });

    // Sign in the demo user using Better Auth's API
    // This creates a proper session and sets the session cookie
    const signInResult = await auth.api.signInEmail({
      body: {
        email: demoUser.email,
        password: DEMO_ACCOUNT_PASSWORD,
      },
      asResponse: true,
    });

    // Check if sign-in was successful
    if (!signInResult.ok) {
      return NextResponse.json(
        { error: 'Failed to create demo session' },
        { status: 500 },
      );
    }

    // Get the session cookie from the sign-in response
    const sessionCookie = signInResult.headers.get('set-cookie');
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Failed to create demo session' },
        { status: 500 },
      );
    }

    // Create response with redirect and session cookie
    const response = NextResponse.json(
      { success: true, redirectTo: '/dashboard' },
      { status: 200 },
    );

    // Copy the session cookie from the sign-in response to our response
    response.headers.set('set-cookie', sessionCookie);

    return response;
  } catch (error) {
    console.error('Error starting demo:', error);
    return NextResponse.json(
      { error: 'Failed to start demo mode' },
      { status: 500 },
    );
  }
}
