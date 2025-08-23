import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
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
      const isOnChat = nextUrl.pathname.startsWith('/chat');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnWelcome = nextUrl.pathname.startsWith('/welcome');
      const isOnMarketing = nextUrl.pathname === '/';
      const isOnCliAuth = nextUrl.pathname.startsWith('/cli-auth');
      
      // Store CLI auth parameters if present
      if ((isOnLogin || isOnRegister) && nextUrl.searchParams.has('state') && nextUrl.searchParams.has('port')) {
        const returnTo = new URL('/cli-auth', nextUrl);
        returnTo.searchParams.set('state', nextUrl.searchParams.get('state')!);
        returnTo.searchParams.set('port', nextUrl.searchParams.get('port')!);
        return Response.redirect(returnTo);
      }

      if (!isLoggedIn && (isOnChat || isOnWelcome)) {
        return false;
      }

      if (isLoggedIn && (isOnLogin || isOnRegister) && !nextUrl.searchParams.has('state')) {
        return Response.redirect(new URL('/chat', nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
