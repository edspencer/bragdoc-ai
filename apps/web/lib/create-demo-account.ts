/**
 * Create Demo Account
 *
 * Centralized logic for creating demo accounts with pre-populated data.
 * Used by the API route to create demo users with Better Auth authentication.
 */

import { hashPassword } from 'better-auth/crypto';
import { generateDemoEmail } from './demo-mode-utils';
import { importDemoData } from './demo-data-import';
import { db } from '@/database/index';
import { user, account, type User } from '@/database/schema';
import type { ImportStats } from './import-user-data';

/**
 * Fixed password for demo accounts
 * Used internally by Better Auth for programmatic sign-in
 * Users never see or use this password
 */
export const DEMO_ACCOUNT_PASSWORD = 'demo-password-12345';

export interface CreateDemoAccountResult {
  success: boolean;
  user?: User;
  stats?: ImportStats;
  error?: string;
}

/**
 * Creates a demo account with optional pre-populated sample data
 *
 * Steps:
 * 1. Generates unique demo email address
 * 2. Creates demo user with level='demo' and null password
 * 3. Optionally imports demo data (companies, projects, achievements, documents)
 *
 * Authentication is handled separately via createDemoSessionToken/setDemoSessionCookie
 *
 * @param options.skipData - If true, skips importing demo data (for testing zero states)
 * @returns Result object with user, and import stats
 */
export async function createDemoAccount(options?: {
  skipData?: boolean;
}): Promise<CreateDemoAccountResult> {
  try {
    // Generate demo email
    const email = generateDemoEmail();

    // Hash the demo password
    const hashedPassword = await hashPassword(DEMO_ACCOUNT_PASSWORD);

    // Create demo user
    const [demoUser] = await db
      .insert(user)
      .values({
        email,
        name: 'Demo User',
        level: 'demo',
        emailVerified: true, // Boolean, not Date (changed for Better Auth)
        provider: 'credential', // Better Auth uses 'credential' for email/password
        preferences: {
          language: 'en',
        },
      })
      .returning();

    if (!demoUser) {
      throw new Error('Failed to create demo user');
    }

    // Create credential account for Better Auth email/password authentication
    // Better Auth requires an Account record with provider='credential'
    await db.insert(account).values({
      userId: demoUser.id,
      accountId: demoUser.email, // Use email as accountId for credential provider
      providerId: 'credential', // Provider is 'credential' for email/password
      password: hashedPassword,
    });

    // Import demo data (unless skipData is true)
    let stats: ImportStats | undefined;
    if (!options?.skipData) {
      stats = await importDemoData(demoUser.id);
    }

    return {
      success: true,
      user: demoUser,
      stats,
    };
  } catch (error) {
    console.error('Error creating demo account:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create demo account',
    };
  }
}
