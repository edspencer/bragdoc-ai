import { db } from '@bragdoc/database';
import { emailPreferences } from '@bragdoc/database/schema';
import { eq } from 'drizzle-orm';
import type { EmailType, UnsubscribeData } from './types';
import { SignJWT, jwtVerify } from 'jose';

// Use BETTER_AUTH_SECRET with AUTH_SECRET fallback for backward compatibility
const SECRET = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET!;

export async function generateUnsubscribeUrl(
  userId: string,
  emailType?: EmailType,
): Promise<string> {
  const secret = new TextEncoder().encode(SECRET);
  const token = await new SignJWT({ userId, emailType })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1y') // 1 year
    .sign(secret);

  const baseUrl = process.env.NEXTAUTH_URL;
  const params = new URLSearchParams({ token });
  if (emailType) params.append('type', emailType);

  return `${baseUrl}api/email/unsubscribe?${params.toString()}`;
}

export async function verifyUnsubscribeToken(
  token: string,
): Promise<UnsubscribeData> {
  try {
    const secret = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload?.userId) {
      throw new Error('Invalid token payload');
    }

    return payload as unknown as UnsubscribeData;
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
