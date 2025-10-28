/**
 * Better Auth API Route Handler
 *
 * This route handles all Better Auth authentication endpoints:
 * - /api/auth/sign-in/email - Email magic link login
 * - /api/auth/sign-up/email - Email magic link registration
 * - /api/auth/callback/google - Google OAuth callback
 * - /api/auth/callback/github - GitHub OAuth callback
 * - /api/auth/sign-out - User logout
 * - /api/auth/session - Get current session
 * - And all other Better Auth endpoints
 *
 * The [...all] catch-all route delegates all requests to Better Auth's handler.
 */

import { auth } from '@/lib/better-auth/server';
import type { NextRequest } from 'next/server';

/**
 * Better Auth handler for GET and POST requests
 *
 * Better Auth will automatically handle all authentication-related requests
 * routed to /api/auth/* endpoints.
 */
export async function GET(request: NextRequest) {
  return auth.handler(request);
}

export async function POST(request: NextRequest) {
  return auth.handler(request);
}
