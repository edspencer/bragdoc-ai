import { auth } from 'app/(auth)/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/database/index';
import { cliToken } from '@/database/schema';
import { randomBytes } from 'node:crypto';

const requestSchema = z.object({
  state: z.string(),
  deviceName: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { state, deviceName } = requestSchema.parse(body);

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');

    // 30 days from now
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Save token to database
    await db.insert(cliToken).values({
      userId: session.user.id,
      token,
      deviceName,
      expiresAt: new Date(expiresAt),
      lastUsedAt: new Date(),
    });

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    console.error('Error generating CLI token:', error);
    return new NextResponse(
      error instanceof z.ZodError
        ? 'Invalid request body'
        : 'Internal server error',
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}

// Add OPTIONS method handler
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
