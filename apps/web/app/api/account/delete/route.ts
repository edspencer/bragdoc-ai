import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { deleteAccountData } from '@/lib/account-deletion';
import { captureServerEvent } from '@/lib/posthog-server';
import { db } from '@/database/index';
import {
  user as userTable,
  company,
  project,
  achievement,
  document,
} from '@/database/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/account/delete
 *
 * Securely deletes a user account and all associated data.
 *
 * Authentication:
 * - Requires authenticated user (session or JWT token)
 * - Returns 401 if not authenticated
 *
 * Authorization:
 * - Returns 403 if user is demo account (cannot delete demo accounts)
 * - Returns 400 if account is already deleted
 *
 * Behavior:
 * 1. Verifies user is authenticated
 * 2. Checks user is not demo account
 * 3. Checks user account is not already deleted
 * 4. Captures analytics event with account metadata
 * 5. Calls deleteAccountData() to remove all user data
 * 6. Invalidates all user sessions
 * 7. Returns 200 success response
 *
 * Error Handling:
 * - Try-catch wraps all operations
 * - Returns appropriate HTTP status codes
 * - Logs errors for debugging
 * - Returns JSON responses with error field
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user using unified auth helper
    const auth_result = await getAuthUser(request);

    if (!auth_result?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth_result.user.id;
    const userIp: string | undefined =
      request.headers.get('cf-connecting-ip') || // Cloudflare
      request.headers.get('x-forwarded-for')?.split(',')[0] || // Proxy
      request.headers.get('x-real-ip') || // Nginx
      undefined;

    // 2. Fetch user to check status and level
    const [userData] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Check if user is demo account (cannot delete demo accounts)
    if (userData.level === 'demo') {
      return NextResponse.json(
        { error: 'Cannot delete demo accounts' },
        { status: 403 },
      );
    }

    // 4. Check if user is already deleted
    if (userData.status === 'deleted') {
      return NextResponse.json(
        { error: 'Account is already deleted' },
        { status: 400 },
      );
    }

    // 5. Capture analytics before deletion
    // Calculate account age in days
    const accountAgeMs = Date.now() - userData.createdAt.getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // Get data counts for analytics
    const [achievementCount, projectCount, companyCount, documentCount] =
      await Promise.all([
        db.select().from(achievement).where(eq(achievement.userId, userId)),
        db.select().from(project).where(eq(project.userId, userId)),
        db.select().from(company).where(eq(company.userId, userId)),
        db.select().from(document).where(eq(document.userId, userId)),
      ]);

    // Capture analytics event
    await captureServerEvent(
      userId,
      'account_deleted',
      {
        userId,
        accountAge: accountAgeDays,
        subscriptionLevel: userData.level,
        achievementCount: achievementCount.length,
        projectCount: projectCount.length,
        companyCount: companyCount.length,
        documentCount: documentCount.length,
      },
      userIp,
    );

    // 6. Delete all user data
    // This also deletes all sessions associated with the user
    await deleteAccountData(userId);

    // 7. Return success response
    // Sessions are automatically cleared on the client side since the session
    // record no longer exists in the database
    return NextResponse.json(
      {
        success: true,
        message: 'Account successfully deleted',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    );
  }
}
