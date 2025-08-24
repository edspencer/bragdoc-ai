import { auth } from 'app/(auth)/auth';
import { db } from 'lib/db';
import { user, type UserPreferences } from 'lib/db/schema';
import { getUserById } from 'lib/db/queries';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const json = await req.json();
    const { preferences } = json;

    // Get current user to merge preferences
    const currentUser = await getUserById(session.user.id);

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Merge new preferences with existing ones
    const updatedPreferences: UserPreferences = {
      ...currentUser.preferences,
      ...preferences,
    };

    // Update user preferences
    const result = await db
      .update(user)
      .set({
        preferences: updatedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[USER_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentUser = await getUserById(session.user.id);

    if (!currentUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json(currentUser);
  } catch (error) {
    console.error('[USER_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
