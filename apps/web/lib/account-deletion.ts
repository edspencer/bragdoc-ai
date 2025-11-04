/**
 * Account Deletion and Data Cleanup
 *
 * Handles deletion of all data associated with a user account on account deletion.
 * Preserves the user record for analytics tracking while anonymizing PII.
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
} from '@/database/schema';
import { eq } from 'drizzle-orm';

/**
 * Deletes all data associated with a user account while preserving the user record
 *
 * This function:
 * 1. Verifies the user exists
 * 2. Deletes all related data in proper order to respect foreign key constraints
 * 3. Anonymizes PII fields (email, name, password, OAuth tokens)
 * 4. Preserves the user record for analytics (userId, createdAt, level, stripeCustomerId)
 * 5. Sets user status to 'deleted'
 *
 * Tables deleted:
 * - emailPreferences
 * - standupDocument (depends on standup)
 * - standup
 * - document
 * - achievement
 * - project
 * - company
 * - userMessage
 * - chat
 * - session (Better Auth sessions)
 *
 * User record is preserved with anonymized PII:
 * - email: 'deleted-{userId}@deleted.local'
 * - name: 'Deleted User'
 * - password: null
 * - image: null
 * - emailVerified: false
 * - providerId: null
 * - status: 'deleted'
 *
 * @param userId - The UUID of the user account to delete
 * @throws Does not throw - logs warnings for errors
 */
export async function deleteAccountData(userId: string): Promise<void> {
  try {
    // Verify user exists
    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userData) {
      console.warn(`User ${userId} not found for deletion`);
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

    // Achievements
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
    await db.delete(session).where(eq(session.userId, userId));

    // Anonymize and update user record
    // Keep: createdAt, level (subscriptionLevel), stripeCustomerId
    // Anonymize: email, name, password, image, emailVerified, providerId
    // Set: status = 'deleted'
    await db
      .update(user)
      .set({
        email: `deleted-${userId}@deleted.local`,
        name: 'Deleted User',
        password: null,
        image: null,
        emailVerified: false,
        providerId: null,
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    console.log(`Successfully deleted account data for user ${userId}`);
  } catch (error) {
    console.error(`Failed to delete account data for user ${userId}:`, error);
    // Don't throw - we don't want to prevent the API request if deletion fails
    // The frontend should handle this appropriately
  }
}
