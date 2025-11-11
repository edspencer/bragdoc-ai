/**
 * Better Auth Server Instance
 *
 * Central server-side authentication instance for Better Auth.
 * This instance is used for:
 * - API route handlers
 * - Server-side session validation
 * - Authentication hooks and lifecycle events
 *
 * Active Features:
 * - Magic link authentication
 * - OAuth providers (Google, GitHub)
 * - PostHog analytics integration
 * - Welcome email automation
 * - Demo account cleanup
 */

import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { magicLink } from 'better-auth/plugins/magic-link';

import { betterAuthConfig } from './config';
import { sendMagicLinkEmail, sendWelcomeEmail } from '@/lib/email/client';
import { db } from '@bragdoc/database';
import { user as userTable } from '@bragdoc/database/schema';
import { eq } from 'drizzle-orm';
import {
  captureServerEvent,
  identifyUser,
  aliasUser,
} from '@/lib/posthog-server';
import { cleanupDemoAccountData } from '@/lib/demo-data-cleanup';

/**
 * Better Auth Server Instance
 *
 * Initialized with:
 * - Core configuration from config.ts
 * - Magic link plugin for email authentication
 * - Social providers (Google, GitHub)
 * - Lifecycle hooks for PostHog analytics and welcome emails
 */
export const auth: ReturnType<typeof betterAuth> = betterAuth({
  ...betterAuthConfig,

  plugins: [
    // Magic link authentication plugin
    magicLink({
      // Custom email sending function (uses Mailgun)
      sendMagicLink: async ({ email, url, token }) => {
        // Check if this is a new user or existing user
        const existingUser = await db
          .select()
          .from(userTable)
          .where(eq(userTable.email, email))
          .limit(1);

        const isNewUser = existingUser.length === 0;

        // Log magic link in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('\n🔗 Magic Link for', email);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(url);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }

        try {
          await sendMagicLinkEmail({
            to: email,
            magicLink: url,
            isNewUser,
          });
        } catch (error) {
          console.error('Failed to send magic link email:', error);
          throw new Error('Failed to send verification email');
        }
      },

      // Token expiry: 24 hours
      expiresIn: 24 * 60 * 60, // 24 hours in seconds

      // Allow new user registration via magic links
      disableSignUp: false,
    }),
  ],

  hooks: {
    // Before hook - runs before endpoint execution
    // Used for sign-out to access session before it's destroyed
    before: createAuthMiddleware(async (ctx) => {
      try {
        // Extract user's real IP address for PostHog GeoIP
        const userIp =
          ctx.headers?.get('cf-connecting-ip') || // Cloudflare
          ctx.headers?.get('x-forwarded-for')?.split(',')[0] || // Proxy
          ctx.headers?.get('x-real-ip') || // Nginx
          undefined;

        // Handle logout events - MUST be in before hook to access session
        if (ctx.path === '/sign-out' && ctx.headers) {
          // In before hook, we need to manually get the session from the request
          // ctx.context.session is not available yet
          const session = await auth.api.getSession({
            headers: ctx.headers,
          });

          if (!session?.user?.id) {
            console.warn('PostHog: Missing user ID in sign-out hook');
            return;
          }

          // Track logout event
          await captureServerEvent(
            session.user.id,
            'user_logged_out',
            {
              user_id: session.user.id,
            },
            userIp,
          );

          // Check if this is a demo account and cleanup data
          const [demoUser] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, session.user.id))
            .limit(1);

          if (demoUser && demoUser.level === 'demo') {
            await cleanupDemoAccountData(session.user.id);
          }
        }
      } catch (error) {
        console.error('PostHog before hook error:', error);
        // Don't fail authentication if tracking fails
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      try {
        // Extract user's real IP address for PostHog GeoIP
        const userIp =
          ctx.headers?.get('cf-connecting-ip') || // Cloudflare
          ctx.headers?.get('x-forwarded-for')?.split(',')[0] || // Proxy
          ctx.headers?.get('x-real-ip') || // Nginx
          undefined;
        // Handle registration events
        if (ctx.path === '/sign-up/email') {
          const user = ctx.context.newSession?.user;
          if (!user?.id || !user?.email) {
            console.warn('PostHog: Missing user data in sign-up hook');
            return;
          }

          // Track user registration event
          await captureServerEvent(
            user.id,
            'user_registered',
            {
              method: 'email',
              email: user.email,
              user_id: user.id,
            },
            userIp,
          );

          // Identify user in PostHog (sets person properties)
          await identifyUser(
            user.id,
            {
              email: user.email,
              name: user.name || user.email.split('@')[0],
            },
            userIp,
          );

          // Alias anonymous ID to merge pre-signup events
          const anonymousId = ctx.headers?.get('x-anonymous-id');
          if (anonymousId && anonymousId !== user.id) {
            await aliasUser(user.id, anonymousId);
          }

          // Set ToS acceptance timestamp
          await db
            .update(userTable)
            .set({ tosAcceptedAt: new Date() })
            .where(eq(userTable.id, user.id));

          // Track ToS acceptance event
          await captureServerEvent(
            user.id,
            'tos_accepted',
            {
              method: 'email',
              timestamp: new Date().toISOString(),
            },
            userIp,
          );

          // Send welcome email
          await sendWelcomeEmail({
            to: user.email,
            userId: user.id,
            username: user.email.split('@')[0]!,
            loginUrl: `${process.env.BETTER_AUTH_URL}/login`,
          });
        }

        // Handle OAuth registration events
        if (ctx.path.startsWith('/callback/')) {
          const user = ctx.context.newSession?.user;
          if (!user?.id || !user?.email) {
            return;
          }

          // Check if this is a new user
          const [existingUser] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, user.id))
            .limit(1);

          const isNewUser =
            existingUser?.createdAt &&
            Date.now() - existingUser.createdAt.getTime() < 5000;

          const provider = ctx.path.includes('google')
            ? 'google'
            : ctx.path.includes('github')
              ? 'github'
              : 'oauth';

          if (isNewUser) {
            // Track user registration event
            await captureServerEvent(
              user.id,
              'user_registered',
              {
                method: provider,
                email: user.email,
                user_id: user.id,
              },
              userIp,
            );

            // Identify user in PostHog
            await identifyUser(
              user.id,
              {
                email: user.email,
                name: user.name || user.email.split('@')[0],
              },
              userIp,
            );

            // Alias anonymous ID
            const anonymousId = ctx.headers?.get('x-anonymous-id');
            if (anonymousId && anonymousId !== user.id) {
              await aliasUser(user.id, anonymousId);
            }

            // Set ToS acceptance timestamp
            await db
              .update(userTable)
              .set({ tosAcceptedAt: new Date() })
              .where(eq(userTable.id, user.id));

            // Track ToS acceptance event
            await captureServerEvent(
              user.id,
              'tos_accepted',
              {
                method: provider,
                timestamp: new Date().toISOString(),
              },
              userIp,
            );

            // Send welcome email
            await sendWelcomeEmail({
              to: user.email,
              userId: user.id,
              username: user.email.split('@')[0]!,
              loginUrl: `${process.env.BETTER_AUTH_URL}/login`,
            });
          } else {
            // Existing user - track login
            await identifyUser(
              user.id,
              {
                email: user.email,
                name: user.name || user.email.split('@')[0],
              },
              userIp,
            );

            await captureServerEvent(
              user.id,
              'user_logged_in',
              {
                method: provider,
                email: user.email,
                user_id: user.id,
              },
              userIp,
            );
          }
        }

        // Handle sign-in events (magic link login)
        // Note: /magic-link/verify is when user clicks the link and creates session
        // /sign-in/email would be for password-based login (not used with magic links)
        if (
          ctx.path === '/magic-link/verify' ||
          ctx.path === '/sign-in/email'
        ) {
          const user = ctx.context.newSession?.user;
          if (!user?.id || !user?.email) {
            console.warn(
              'PostHog: Missing user data in sign-in hook',
              ctx.path,
            );
            return;
          }

          // Track login event
          await identifyUser(
            user.id,
            {
              email: user.email,
              name: user.name || user.email.split('@')[0],
            },
            userIp,
          );

          await captureServerEvent(
            user.id,
            'user_logged_in',
            {
              method: 'email',
              email: user.email,
              user_id: user.id,
            },
            userIp,
          );
        }
      } catch (error) {
        console.error('PostHog after hook error:', error);
        // Don't fail authentication if tracking fails
      }
    }),
  },
});

/**
 * Export auth API for use in route handlers
 *
 * Usage in API routes:
 * ```typescript
 * import { auth } from '@/lib/better-auth/server';
 *
 * export const { GET, POST } = auth.handler();
 * ```
 */
export const { handler } = auth;

/**
 * Type-safe session types
 */
export type { Session } from 'better-auth/types';
