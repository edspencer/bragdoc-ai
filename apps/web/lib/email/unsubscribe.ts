import { db } from '@bragdoc/database';
import { emailPreferences } from '@bragdoc/database/schema';
import { eq } from 'drizzle-orm';
import type { EmailType, UnsubscribeData } from './types';
import { encode, decode } from 'next-auth/jwt';
import { randomBytes } from 'node:crypto';

const SECRET = process.env.AUTH_SECRET!;

export async function generateUnsubscribeUrl(
  userId: string,
  emailType?: EmailType,
): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const token = await encode({
    token: { userId, emailType },
    secret: SECRET,
    salt,
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });

  const baseUrl = process.env.NEXTAUTH_URL;
  const params = new URLSearchParams({ token, salt });
  if (emailType) params.append('type', emailType);

  return `${baseUrl}api/email/unsubscribe?${params.toString()}`;
}

export async function verifyUnsubscribeToken(
  token: string,
  salt: string,
): Promise<UnsubscribeData> {
  try {
    const decoded = await decode({
      token,
      secret: SECRET,
      salt,
    });

    if (!decoded?.userId) {
      throw new Error('Invalid token payload');
    }

    return decoded as unknown as UnsubscribeData;
  } catch (error) {
    throw new Error('Invalid or expired unsubscribe token');
  }
}

export async function isUnsubscribed(
  userId: string,
  emailType?: EmailType,
): Promise<boolean> {
  const [prefs] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId));

  if (!prefs || !prefs.unsubscribedAt) return false;

  // If they've unsubscribed from all emails
  if (!prefs.emailTypes || prefs.emailTypes.length === 0) return true;

  // If checking for a specific email type
  return emailType ? prefs.emailTypes.includes(emailType) : false;
}

export async function unsubscribeUser(userId: string, emailType?: EmailType) {
  const [existing] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId));

  if (existing) {
    // Update existing preferences
    return db
      .update(emailPreferences)
      .set({
        unsubscribedAt: new Date(),
        emailTypes: emailType
          ? [...(existing.emailTypes || []), emailType]
          : [],
        updatedAt: new Date(),
      })
      .where(eq(emailPreferences.userId, userId));
  }

  // Create new preferences
  return db.insert(emailPreferences).values({
    userId,
    unsubscribedAt: new Date(),
    emailTypes: emailType ? [emailType] : [],
  });
}
