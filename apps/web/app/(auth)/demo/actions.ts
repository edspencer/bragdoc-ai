'use server';

import { signIn } from '../auth';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';
import { createDemoAccount } from '@/lib/create-demo-account';

export interface CreateDemoActionState {
  status: 'success' | 'failed' | 'unavailable';
  error?: string;
}

/**
 * Server action to create a demo account and automatically sign in
 *
 * Steps:
 * 1. Check if demo mode is enabled
 * 2. Create demo account with optional pre-populated data
 * 3. Sign in with temporary password using NextAuth credentials provider
 *
 * @param empty - If true, creates account without pre-populated data (for testing zero states)
 * @returns Status object with success/failure state
 */
export async function createDemoAccountAction(
  empty = false,
): Promise<CreateDemoActionState> {
  const startTime = performance.now();

  try {
    // Check if demo mode is enabled
    if (!isDemoModeEnabled()) {
      return { status: 'unavailable', error: 'Demo mode not available' };
    }

    console.log(
      `[Demo] Starting demo account creation (empty: ${empty ? 'yes' : 'no'})...`,
    );
    const accountStartTime = performance.now();

    // Create demo account using shared function
    const result = await createDemoAccount({ skipData: empty });

    const accountDuration = performance.now() - accountStartTime;
    console.log(
      `[Demo] Account creation took ${accountDuration.toFixed(0)}ms (imported ${
        result.stats?.companies.created || 0
      } companies, ${result.stats?.projects.created || 0} projects, ${
        result.stats?.achievements.created || 0
      } achievements, ${result.stats?.documents.created || 0} documents)`,
    );

    if (!result.success) {
      return {
        status: 'failed',
        error: result.error || 'Failed to create demo account',
      };
    }

    // Sign in with the demo account using temporary password
    const signInStartTime = performance.now();
    await signIn('credentials', {
      email: result.email!,
      password: result.temporaryPassword!,
      redirect: false,
    });

    const signInDuration = performance.now() - signInStartTime;
    console.log(`[Demo] Sign in took ${signInDuration.toFixed(0)}ms`);

    const totalDuration = performance.now() - startTime;
    console.log(`[Demo] Total duration: ${totalDuration.toFixed(0)}ms`);

    return { status: 'success' };
  } catch (error) {
    const errorDuration = performance.now() - startTime;
    console.error(`[Demo] Error after ${errorDuration.toFixed(0)}ms:`, error);
    return { status: 'failed', error: 'An error occurred' };
  }
}
