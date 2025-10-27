import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Email from 'next-auth/providers/email';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

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
  user as userTable,
  verificationToken,
  type UserPreferences,
  type UserLevel,
  type RenewalPeriod,
} from '@/database/schema';
import { sendWelcomeEmail, sendMagicLinkEmail } from '@/lib/email/client';
import { cleanupDemoAccountData } from '@/lib/demo-data-cleanup';
import {
  captureServerEvent,
  identifyUser,
  aliasUser,
} from '@/lib/posthog-server';

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
    usersTable: userTable,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  session: {
    strategy: 'jwt',
  },
  ...authConfig,
  providers: [
    // Demo-only credentials provider (no password required)
    {
      id: 'demo',
      name: 'Demo',
      type: 'credentials' as const,
      credentials: {
        email: { label: 'Email', type: 'text' },
        isDemo: { label: 'Is Demo', type: 'text' },
      },
      async authorize(credentials) {
        // Only allow if this is explicitly a demo request
        if (credentials?.isDemo !== 'true') {
          return null;
        }

        // Look up the demo user by email
        const [demoUser] = await db
          .select()
          .from(userTable)
          .where(eq(userTable.email, credentials.email as string))
          .limit(1);

        if (!demoUser || demoUser.level !== 'demo') {
          return null;
        }

        return {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          image: demoUser.image,
          provider: demoUser.provider,
          providerId: demoUser.providerId ?? undefined,
          preferences: demoUser.preferences,
          level: demoUser.level,
          renewalPeriod: demoUser.renewalPeriod,
        };
      },
    },
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: 'google',
          providerId: profile.sub,
          preferences: {
            language: profile.locale || 'en',
          },
        };
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          provider: 'github',
          providerId: profile.id.toString(),
          preferences: {
            language: 'en', // GitHub API doesn't provide language preference
          },
        };
      },
    }),
    Email({
      server: {
        host: process.env.MAILGUN_SMTP_SERVER || 'smtp.mailgun.org',
        port: 587,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN!,
          pass: process.env.MAILGUN_SMTP_PASSWORD!,
        },
      },
      from: 'hello@bragdoc.ai',
      // Custom email sending function
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // Check if this is a new user or existing user
        const existingUser = await db
          .select()
          .from(userTable)
          .where(eq(userTable.email, identifier))
          .limit(1);

        const isNewUser = existingUser.length === 0;

        // Log magic link in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('\n🔗 Magic Link for', identifier);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(url);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }

        try {
          await sendMagicLinkEmail({
            to: identifier,
            magicLink: url,
            isNewUser,
          });
        } catch (error) {
          console.error('Failed to send magic link email:', error);
          throw new Error('Failed to send verification email');
        }
      },
      // Token expiry: 24 hours (default)
      maxAge: 24 * 60 * 60,
    }),
  ],
  callbacks: {
    async signIn({ user: authUser, account }) {
      // Track login event
      try {
        if (authUser.id && account) {
          await captureServerEvent(authUser.id, 'user_logged_in', {
            method: account.provider,
            email: authUser.email,
            user_id: authUser.id,
          });
        }
      } catch (error) {
        console.error('Failed to track login event:', error);
        // Don't fail login if tracking fails
      }

      if (account?.provider === 'github' && account.access_token) {
        await db
          .update(userTable)
          .set({
            githubAccessToken: account.access_token,
            preferences: authUser.preferences || {
              language: 'en',
            },
          })
          .where(eq(userTable.id, authUser.id as string));
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
    async createUser({ user }) {
      const { email } = user;

      if (email && user.id) {
        console.log(`New user created: ${email}`);

        // Track user registration
        try {
          await captureServerEvent(user.id, 'user_registered', {
            method: user.provider || 'email',
            email: email,
            user_id: user.id,
          });

          // Identify user in PostHog
          await identifyUser(user.id, {
            email: email,
            name: user.name || email.split('@')[0],
          });

          // Alias anonymous ID (unified for all providers)
          const cookieStore = await cookies();
          const anonymousId = cookieStore.get('ph_anonymous_id')?.value;
          if (anonymousId && anonymousId !== user.id) {
            await aliasUser(user.id, anonymousId);
            cookieStore.delete('ph_anonymous_id');
          }

          // Set tosAcceptedAt for all new signups
          await db
            .update(userTable)
            .set({ tosAcceptedAt: new Date() })
            .where(eq(userTable.id, user.id));

          // Track ToS acceptance event
          await captureServerEvent(user.id, 'tos_accepted', {
            method: user.provider || 'email',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to track registration:', error);
          // Don't fail registration if tracking fails
        }

        // Send welcome email
        try {
          await sendWelcomeEmail({
            to: email,
            userId: user.id,
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
      // Track logout event
      const token = 'token' in params ? params.token : null;

      if (token?.id) {
        try {
          await captureServerEvent(token.id as string, 'user_logged_out', {
            user_id: token.id,
          });
        } catch (error) {
          console.error('Failed to track logout event:', error);
          // Don't fail logout if tracking fails
        }
      }

      // Check if this is a demo account
      // NextAuth can pass either token (for JWT strategy) or session
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
