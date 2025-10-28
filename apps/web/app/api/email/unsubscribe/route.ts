import type { NextRequest } from 'next/server';
import {
  verifyUnsubscribeToken,
  unsubscribeUser,
} from '@/lib/email/unsubscribe';
import type { EmailType } from '@/lib/email/types';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const emailType = req.nextUrl.searchParams.get('type') as
      | EmailType
      | undefined;

    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    const data = await verifyUnsubscribeToken(token);
    await unsubscribeUser(data.userId, emailType);

    // Redirect to a confirmation page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/unsubscribed?type=${emailType || 'all'}`,
      },
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response('Invalid unsubscribe link', { status: 400 });
  }
}
