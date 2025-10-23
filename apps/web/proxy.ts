import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import type { NextMiddleware } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth as NextMiddleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
