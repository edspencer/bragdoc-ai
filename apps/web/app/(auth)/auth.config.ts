import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    newUser: '/welcome',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Allow auth-related pages and API routes
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/demo') ||
        nextUrl.pathname.startsWith('/api/auth') ||
        nextUrl.pathname.startsWith('/api/demo') ||
        nextUrl.pathname.startsWith('/cli-auth') ||
        nextUrl.pathname.startsWith('/unsubscribed') ||
        nextUrl.pathname.startsWith('/shared/');

      // Store CLI auth parameters if present
      if (
        (nextUrl.pathname.startsWith('/login') ||
          nextUrl.pathname.startsWith('/register')) &&
        nextUrl.searchParams.has('state') &&
        nextUrl.searchParams.has('port')
      ) {
        const returnTo = new URL('/cli-auth', nextUrl);
        returnTo.searchParams.set('state', nextUrl.searchParams.get('state')!);
        returnTo.searchParams.set('port', nextUrl.searchParams.get('port')!);
        return Response.redirect(returnTo);
      }

      // If user is logged in and trying to access login/register, redirect to dashboard
      if (
        isLoggedIn &&
        (nextUrl.pathname.startsWith('/login') ||
          nextUrl.pathname.startsWith('/register')) &&
        !nextUrl.searchParams.has('state')
      ) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      // Allow access to auth pages without login
      if (isAuthPage) {
        return true;
      }

      // For all other pages, require authentication
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
