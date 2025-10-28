/**
 * Better Auth Middleware
 *
 * Route protection middleware using Better Auth for session validation.
 * This replaces the Auth.js middleware with Better Auth.
 *
 * Protected routes:
 * - All routes except auth pages (/login, /register, /api/auth/*)
 * - Requires Better Auth session cookie to be present and valid
 * - Redirects unauthenticated users to /login
 *
 * CLI Authentication:
 * - /cli-auth route is public (handles CLI auth flow)
 * - CLI API requests use Authorization header (handled by getAuthUser helper)
 *
 * MIGRATION NOTE: This file now uses Better Auth instead of Auth.js.
 */

import { auth } from '@/lib/better-auth/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Better Auth Middleware Handler
 *
 * Checks for Better Auth session and enforces route protection.
 */
export default async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Allow auth-related pages and API routes
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/demo') ||
    pathname.startsWith('/cli-auth') ||
    pathname.startsWith('/unsubscribed') ||
    pathname.startsWith('/shared/');

  // Check for Better Auth session
  let isLoggedIn = false;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    isLoggedIn = !!session?.user;
  } catch (error) {
    console.error('Error checking Better Auth session in middleware:', error);
  }

  // Store CLI auth parameters if present (redirect to cli-auth page)
  if (
    (pathname.startsWith('/login') || pathname.startsWith('/register')) &&
    searchParams.has('state') &&
    searchParams.has('port')
  ) {
    const returnTo = new URL('/cli-auth', request.url);
    returnTo.searchParams.set('state', searchParams.get('state')!);
    returnTo.searchParams.set('port', searchParams.get('port')!);
    return NextResponse.redirect(returnTo);
  }

  // If user is logged in and trying to access login/register, redirect to dashboard
  if (
    isLoggedIn &&
    (pathname.startsWith('/login') || pathname.startsWith('/register')) &&
    !searchParams.has('state')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow access to auth pages without login
  if (isAuthPage) {
    return NextResponse.next();
  }

  // For all other pages, require authentication
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
