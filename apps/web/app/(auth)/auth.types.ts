/**
 * Type definitions for NextAuth functions
 */
import type { NextRequest } from 'next/server';

/**
 * Type for the NextAuth handlers
 */
export type AuthHandler = (request: NextRequest) => Promise<Response>;

/**
 * Type for the signIn function
 */
export type SignInFunction = (
  provider: string,
  options?: {
    redirect?: boolean;
    email?: string;
    password?: string;
    callbackUrl?: string;
    [key: string]: any;
  },
) => Promise<void>;

/**
 * Type for the signOut function
 */
export type SignOutFunction = (options?: {
  redirect?: boolean;
  callbackUrl?: string;
}) => Promise<void>;

/**
 * Type for the auth function
 */
export type AuthFunction = (options?: { auth?: any }) => Promise<any>;

/**
 * Type for the NextAuth return object
 */
export type NextAuthResult = {
  handlers: { GET: AuthHandler; POST: AuthHandler };
  auth: AuthFunction;
  signIn: SignInFunction;
  signOut: SignOutFunction;
};
