import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db';

import { authConfig } from './auth.config';

import { account, session, user, verificationToken, type UserPreferences } from "@/lib/db/schema"

declare module 'next-auth' {
  interface User {
    provider?: string;
    providerId?: string;
    preferences?: UserPreferences;
    githubAccessToken?: string;
  }

  interface Session {
    user: User & {
      provider?: string;
      providerId?: string;
      preferences?: UserPreferences;
      githubAccessToken?: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    provider?: string;
    providerId?: string;
    preferences?: UserPreferences;
    githubAccessToken?: string;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken
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
            language: profile.locale || 'en'
          }
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
            language: 'en' // GitHub API doesn't provide language preference
          }
        };
      },
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return {
          ...users[0],
          provider: 'credentials',
          preferences: {
            hasSeenWelcome: false,
            language: 'en'
          }
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
              language: 'en'
            }
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = token.provider as string;
        session.user.providerId = token.providerId as string;
        session.user.id = token.id as string;
        session.user.githubAccessToken = token.githubAccessToken as string;
        session.user.preferences = token.preferences as UserPreferences;
      }
      return session;
    },
  },
});
