import { auth } from 'app/(auth)/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { encode } from 'next-auth/jwt';

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

    // 30 days from now
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    // Generate a NextAuth JWT token
    const token = await encode({
      token: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.image,
        provider: session.user.provider,
        providerId: session.user.providerId,
        preferences: session.user.preferences,
        githubAccessToken: session.user.githubAccessToken,
        level: session.user.level,
        renewalPeriod: session.user.renewalPeriod,
        sub: session.user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: expiresAt,
      },
      secret: process.env.AUTH_SECRET!,
      salt: '',
    });

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
