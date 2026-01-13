/**
 * Demo Account Data Cleanup
 *
 * Handles deletion of all data associated with a demo account on logout.
 * Preserves the user record for analytics tracking.
 */

import { db } from '@/database/index';
import {
  user,
  document,
  achievement,
  project,
  company,
  userMessage,
  chat,
  standup,
  standupDocument,
  emailPreferences,
  session,
  performanceReview,
  workstream,
  workstreamMetadata,
} from '@/database/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * Options for cleaning up demo account data
 */
interface CleanupOptions {
  /**
   * If provided, this session token will be preserved (not deleted).
   * Use this when resetting demo data to keep the user logged in.
   */
  preserveSessionToken?: string;
}

/**
 * Cleans up all data associated with a demo account while preserving the user record
 *
 * This function:
 * 1. Verifies the user is a demo account (level === 'demo' or isDemo === true)
 * 2. Deletes all related data in proper order to respect foreign key constraints
 * 3. Preserves the user record for analytics (email, createdAt, level)
 *
 * Tables cleaned up:
 * - emailPreferences
 * - standupDocument (depends on standup)
 * - standup
 * - document
 * - performanceReview
 * - workstreamMetadata
 * - workstream
 * - achievement
 * - project
 * - company
 * - userMessage
 * - chat
 * - session (Better Auth sessions) - optionally preserves current session
 *
 * @param userId - The UUID of the user account to clean up
 * @param options - Optional settings for cleanup behavior
 * @throws Does not throw - logs warnings for errors
 */
export async function cleanupDemoAccountData(
  userId: string,
  options: CleanupOptions = {},
): Promise<void> {
  try {
    // Verify user is a demo account
    const [demoUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!demoUser) {
      console.warn(`User ${userId} not found for cleanup`);
      return;
    }

    // Check if user is a demo account (either by level or isDemo flag)
    if (demoUser.level !== 'demo' && !demoUser.isDemo) {
      console.warn(`User ${userId} is not a demo account, skipping cleanup`);
      return;
    }

    // Delete related data in order that respects foreign key constraints
    // Start with tables that depend on other user tables, then work backwards

    // Email preferences (independent)
    await db
      .delete(emailPreferences)
      .where(eq(emailPreferences.userId, userId));

    // Standup documents (depend on standups)
    await db.delete(standupDocument).where(eq(standupDocument.userId, userId));

    // Standups
    await db.delete(standup).where(eq(standup.userId, userId));

    // Documents
    await db.delete(document).where(eq(document.userId, userId));

    // Performance Reviews
    await db
      .delete(performanceReview)
      .where(eq(performanceReview.userId, userId));

    // Workstream Metadata (depends on workstreams, but also independent user reference)
    await db
      .delete(workstreamMetadata)
      .where(eq(workstreamMetadata.userId, userId));

    // Workstreams
    await db.delete(workstream).where(eq(workstream.userId, userId));

    // Achievements (must be after workstreams since achievements reference workstreams)
    await db.delete(achievement).where(eq(achievement.userId, userId));

    // Projects
    await db.delete(project).where(eq(project.userId, userId));

    // Companies
    await db.delete(company).where(eq(company.userId, userId));

    // User messages
    await db.delete(userMessage).where(eq(userMessage.userId, userId));

    // Chats (and their messages will be cascade deleted if foreign keys are set up)
    await db.delete(chat).where(eq(chat.userId, userId));

    // Sessions (Better Auth sessions)
    // If preserveSessionToken is provided, keep the current session so user stays logged in
    if (options.preserveSessionToken) {
      await db
        .delete(session)
        .where(
          and(
            eq(session.userId, userId),
            ne(session.token, options.preserveSessionToken),
          ),
        );
    } else {
      await db.delete(session).where(eq(session.userId, userId));
    }

    // User record is preserved for analytics (email, createdAt, level='demo')
    console.log(`Successfully cleaned up demo account data for user ${userId}`);
  } catch (error) {
    console.error(
      `Failed to cleanup demo account data for user ${userId}:`,
      error,
    );
    // Don't throw - we don't want to prevent logout if cleanup fails
  }
}
