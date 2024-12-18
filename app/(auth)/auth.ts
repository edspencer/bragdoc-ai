import { compare } from 'bcrypt-ts';
import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db';

import { authConfig } from './auth.config';

import { account, session, user, verificationToken } from "@/lib/db/schema"

interface CustomUser extends User {
  provider?: string;
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
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user: authUser, account }) {
      if (account?.provider === 'github' && account.access_token) {
        // Update the user record with the GitHub access token
        await db
          .update(user)
          .set({ githubAccessToken: account.access_token })
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
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      session.user.provider = token.provider;
      session.user.providerId = token.providerId;
      session.user.id = token.id;
      session.user.githubAccessToken = token.githubAccessToken;
      return session;
    },
  },
});
