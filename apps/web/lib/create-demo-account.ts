/**
 * Create Demo Account
 *
 * Centralized logic for creating demo accounts with pre-populated data.
 * Can be called from both API routes and server actions.
 */

import crypto from 'node:crypto';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { generateDemoEmail } from './demo-mode-utils';
import { importDemoData } from './demo-data-import';
import { db } from '@/database/index';
import { user } from '@/database/schema';
import type { ImportStats } from './import-user-data';

export interface CreateDemoAccountResult {
  success: boolean;
  userId?: string;
  email?: string;
  temporaryPassword?: string;
  stats?: ImportStats;
  error?: string;
}

/**
 * Creates a demo account with optional pre-populated sample data
 *
 * Steps:
 * 1. Generates unique demo email address
 * 2. Creates random temporary password for one-time auto-login
 * 3. Creates demo user with level='demo'
 * 4. Optionally imports demo data (companies, projects, achievements, documents)
 *
 * @param options.skipData - If true, skips importing demo data (for testing zero states)
 * @returns Result object with userId, email, temporary password, and import stats
 */
export async function createDemoAccount(options?: {
  skipData?: boolean;
}): Promise<CreateDemoAccountResult> {
  try {
    // Generate demo email
    const email = generateDemoEmail();

    // Generate temporary password for auto-login
    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(temporaryPassword, salt);

    // Create demo user
    const [demoUser] = await db
      .insert(user)
      .values({
        email,
        password: hashedPassword,
        name: 'Demo User',
        level: 'demo',
        emailVerified: new Date(),
        provider: 'demo',
        preferences: {
          language: 'en',
        },
      })
      .returning();

    if (!demoUser) {
      throw new Error('Failed to create demo user');
    }

    // Import demo data (unless skipData is true)
    let stats: ImportStats | undefined;
    if (!options?.skipData) {
      stats = await importDemoData(demoUser.id);
    }

    return {
      success: true,
      userId: demoUser.id,
      email,
      temporaryPassword, // Return plaintext password for immediate login
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
