import { getAuthUser } from '@/lib/getAuthUser';
import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { SignJWT } from 'jose';
import { captureServerEvent } from '@/lib/posthog-server';

const requestSchema = z.object({
  state: z.string(),
  deviceName: z.string(),
});

export async function POST(request: Request) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const { user } = authResult;

    const body = await request.json();
    const { state, deviceName } = requestSchema.parse(body);

    // 30 days from now
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 30 * 24 * 60 * 60;

    // Generate a JWT token using jose
    const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET!);
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      provider: user.provider,
      providerId: user.providerId,
      preferences: user.preferences,
      level: user.level,
      renewalPeriod: user.renewalPeriod,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(secret);

    // Track CLI connection
    try {
      await captureServerEvent(user.id, 'cli_connected', {
        user_id: user.id,
        device_name: deviceName,
      });
    } catch (error) {
      console.error('Failed to track CLI connection:', error);
      // Don't fail the request if tracking fails
    }

    return NextResponse.json({
      token,
      expiresAt: expiresAt * 1000, // Convert back to milliseconds for consistency
    });
  } catch (error) {
    console.error('Error generating CLI token:', error);
    return new NextResponse(
      error instanceof z.ZodError
        ? 'Invalid request body'
        : 'Internal server error',
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

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
