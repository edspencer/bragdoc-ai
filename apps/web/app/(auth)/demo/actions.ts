'use server';

import { redirect } from 'next/navigation';
import {
  createDemoAccount,
  createDemoSessionToken,
  setDemoSessionCookie,
} from '@/lib/create-demo-account';
import { captureServerEvent } from '@/lib/posthog-server';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';

/**
 * Create demo account and authenticate via session token
 *
 * @param empty - If true, creates account without pre-populated data (for testing zero states)
 */
export async function startDemo(empty = false): Promise<never> {
  // Check if demo mode enabled
  if (!isDemoModeEnabled()) {
    throw new Error('Demo mode not available');
  }

  // Create demo account with optional data
  const result = await createDemoAccount({ skipData: empty });

  if (!result.success || !result.user) {
    throw new Error(result.error || 'Failed to create demo account');
  }

  const demoUser = result.user;

  try {
    // Generate and set session token
    const token = await createDemoSessionToken(demoUser);
    await setDemoSessionCookie(token);

    // Track demo start
    await captureServerEvent(demoUser.id, 'demo_started', {
      source: 'demo_page',
      has_data: !empty,
      companies_count: result.stats?.companies.created ?? 0,
      projects_count: result.stats?.projects.created ?? 0,
      achievements_count: result.stats?.achievements.created ?? 0,
    });
  } catch (error) {
    console.error('Error setting demo session:', error);
    throw new Error('Failed to authenticate demo account');
  }

  // Redirect to dashboard (user is now authenticated)
  redirect('/dashboard');
}
