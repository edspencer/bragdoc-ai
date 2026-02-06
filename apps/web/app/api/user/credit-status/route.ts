import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getUserById } from '@bragdoc/database';
import { getSubscriptionStatus } from '@/lib/stripe/subscription';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch fresh user data from database
  const user = await getUserById(auth.user.id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const subscriptionStatus = getSubscriptionStatus(user);

  return NextResponse.json({
    freeCredits: user.freeCredits ?? 10,
    freeChatMessages: user.freeChatMessages ?? 20,
    isUnlimited: subscriptionStatus.isActive,
    subscriptionType: subscriptionStatus.type,
    daysRemaining: subscriptionStatus.daysRemaining,
  });
}
