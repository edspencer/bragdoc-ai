import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';

import { getUser } from '@/database/queries';
import { db } from '@/database/index';

import { authConfig } from './auth.config';
import type {
  SignInFunction,
  SignOutFunction,
  AuthFunction,
} from './auth.types';

import {
  account,
  session,
  user,
  verificationToken,
  type UserPreferences,
  type UserLevel,
  type RenewalPeriod,
} from '@/database/schema';
import { sendWelcomeEmail } from '@/lib/email/sendWelcomeEmail';
import { cleanupDemoAccountData } from '@/lib/demo-data-cleanup';

declare module 'next-auth' {
  interface User {
    provider?: string;
    providerId?: string;
    preferences?: UserPreferences;
    githubAccessToken?: string;
    level?: UserLevel;
    renewalPeriod?: RenewalPeriod;
  }

  interface Session {
    user: User & {
      provider?: string;
      providerId?: string;
      preferences?: UserPreferences;
      githubAccessToken?: string;
      level?: UserLevel;
      renewalPeriod?: RenewalPeriod;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    provider?: string;
    providerId?: string;
    preferences?: UserPreferences;
    githubAccessToken?: string;
    level?: UserLevel;
    renewalPeriod?: RenewalPeriod;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
}: {
  handlers: { GET: any; POST: any };
  auth: AuthFunction;
  signIn: SignInFunction;
  signOut: SignOutFunction;
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  session: {
    strategy: 'jwt',
  },
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: 'google',
          providerId: profile.sub,
          preferences: {
            hasSeenWelcome: false,
            language: profile.locale || 'en',
          },
        };
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          provider: 'github',
          providerId: profile.id.toString(),
          preferences: {
            hasSeenWelcome: false,
            language: 'en', // GitHub API doesn't provide language preference
          },
        };
      },
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        const passwordsMatch = await compare(password, users[0]!.password!);
        if (!passwordsMatch) return null;
        return {
          ...users[0],
          provider: 'credentials',
          preferences: {
            hasSeenWelcome: false,
            language: 'en',
          },
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user: authUser, account }) {
      if (account?.provider === 'github' && account.access_token) {
        await db
          .update(user)
          .set({
            githubAccessToken: account.access_token,
            preferences: authUser.preferences || {
              hasSeenWelcome: false,
              language: 'en',
            },
          })
          .where(eq(user.id, authUser.id as string));
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'github') {
        token.githubAccessToken = account.access_token;
      }
      if (user) {
        token.provider = user.provider;
        token.providerId = user.providerId;
        token.id = user.id;
        token.preferences = user.preferences;
        token.level = user.level;
        token.renewalPeriod = user.renewalPeriod;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.provider = token.provider as string;
      session.user.providerId = token.providerId as string;
      session.user.id = token.id as string;
      session.user.githubAccessToken = token.githubAccessToken as string;
      session.user.preferences = token.preferences as UserPreferences;
      session.user.level = token.level as UserLevel;
      session.user.renewalPeriod = token.renewalPeriod as RenewalPeriod;
      return session;
    },
  },
  events: {
    createUser({ user }) {
      const { email } = user;

      if (email) {
        console.log(`Sending welcome email to ${email}`);

        try {
          //this is an async call, but we don't want to block on it
          sendWelcomeEmail({
            to: email,
            userId: user.id!,
            username: email.split('@')[0]!,
            loginUrl: `${process.env.NEXTAUTH_URL}/login`,
          });
        } catch (error) {
          console.error('Failed to send welcome email:', error);
          // Don't fail registration if email fails
        }
      }
    },
    async signOut(params) {
      // Check if this is a demo account
      // NextAuth can pass either token (for JWT strategy) or session
      const token = 'token' in params ? params.token : null;

      if (token?.id && token?.level === 'demo') {
        try {
          await cleanupDemoAccountData(token.id as string);
        } catch (error) {
          console.error('Failed to cleanup demo account data:', error);
          // Don't fail the logout if cleanup fails
        }
      }
    },
  },
});
