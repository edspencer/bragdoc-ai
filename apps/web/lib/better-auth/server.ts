/**
 * Better Auth Server Instance
 *
 * Central server-side authentication instance for Better Auth.
 * This instance is used for:
 * - API route handlers
 * - Server-side session validation
 * - Authentication hooks and lifecycle events
 *
 * Note: This instance is NOT yet active - Auth.js is still handling
 * authentication during Phase 3. This will be activated in Phase 5+.
 */

import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';

import { betterAuthConfig } from './config';
import { sendMagicLinkEmail } from '@/lib/email/client';
import { db } from '@bragdoc/database';
import { user as userTable } from '@bragdoc/database/schema';
import { eq } from 'drizzle-orm';

/**
 * Better Auth Server Instance
 *
 * Initialized with:
 * - Core configuration from config.ts
 * - Magic link plugin for email authentication
 * - Social providers (Google, GitHub)
 * - Lifecycle hooks (will be added in Phase 6)
 */
export const auth = betterAuth({
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

      // Token expiry: 24 hours (matches Auth.js behavior)
      expiresIn: 24 * 60 * 60, // 24 hours in seconds

      // Allow new user registration via magic links
      disableSignUp: false,
    }),
  ],
} as any); // Temporary type assertion for hooks - Better Auth types may not fully support hooks yet

/**
 * Phase 6: PostHog Integration Hooks (READY - to be activated in Phase 7)
 *
 * These hooks replicate the Auth.js events system for tracking user
 * registration, login, and logout events in PostHog.
 *
 * Implementation Status:
 * - ✅ User registration tracking (email, Google, GitHub)
 * - ✅ User login tracking (email, OAuth)
 * - ✅ User logout tracking with demo cleanup
 * - ✅ PostHog identity aliasing (via X-Anonymous-Id header)
 * - ✅ ToS acceptance tracking
 * - ✅ Welcome email integration
 *
 * Note: Hooks are commented out due to TypeScript type incompatibility in Better Auth 1.3.33.
 * The implementation is complete and will be activated in Phase 7 when Better Auth routing is set up.
 *
 * TypeScript Issue: Better Auth hooks type doesn't match the documented structure.
 * Workaround: Will be added via custom middleware or plugin in Phase 7.
 *
 * Hooks Code (ready to activate):
 *
 * hooks: {
 *   after: [
 *       // User Registration Hook (Email Magic Links)
 *       {
 *         matcher: '/api/auth/sign-up/email',
 *         async handler(ctx) {
 *           try {
 *             const user = ctx.session?.user;
 *             if (!user?.id || !user?.email) {
 *               console.warn('PostHog: Missing user data in sign-up hook');
 *               return;
 *             }
 * 
 *             // Track user registration event
 *             await captureServerEvent(user.id, 'user_registered', {
 *               method: 'email',
 *               email: user.email,
 *               user_id: user.id,
 *             });
 * 
 *             // Identify user in PostHog (sets person properties)
 *             await identifyUser(user.id, {
 *               email: user.email,
 *               name: user.name || user.email.split('@')[0],
 *             });
 * 
 *             // Alias anonymous ID to merge pre-signup events
 *             // Note: Anonymous ID passed via X-Anonymous-Id header from client
 *             const anonymousId = ctx.headers.get('x-anonymous-id');
 *             if (anonymousId && anonymousId !== user.id) {
 *               await aliasUser(user.id, anonymousId);
 *             }
 * 
 *             // Set ToS acceptance timestamp
 *             await db
 *               .update(userTable)
 *               .set({ tosAcceptedAt: new Date() })
 *               .where(eq(userTable.id, user.id));
 * 
 *             // Track ToS acceptance event
 *             await captureServerEvent(user.id, 'tos_accepted', {
 *               method: 'email',
 *               timestamp: new Date().toISOString(),
 *             });
 * 
 *             // Send welcome email
 *             await sendWelcomeEmail({
 *               to: user.email,
 *               userId: user.id,
 *               username: user.email.split('@')[0]!,
 *               loginUrl: `${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL}/login`,
 *             });
 *           } catch (error) {
 *             console.error('Failed to track email registration:', error);
 *             // Don't fail registration if tracking fails
 *           }
 *         },
 *       },
 * 
 *       // User Registration Hook (Google OAuth)
 *       {
 *         matcher: '/api/auth/callback/google',
 *         async handler(ctx) {
 *           try {
 *             const user = ctx.session?.user;
 *             if (!user?.id || !user?.email) {
 *               return; // Not a sign-up, just a sign-in
 *             }
 * 
 *             // Check if this is a new user by looking for createdAt timestamp
 *             // If user was just created, createdAt will be very recent
 *             const [existingUser] = await db
 *               .select()
 *               .from(userTable)
 *               .where(eq(userTable.id, user.id))
 *               .limit(1);
 * 
 *             const isNewUser =
 *               existingUser &&
 *               existingUser.createdAt &&
 *               Date.now() - existingUser.createdAt.getTime() < 5000; // Within 5 seconds
 * 
 *             if (!isNewUser) {
 *               return; // Just a login, not a registration
 *             }
 * 
 *             // Track user registration event
 *             await captureServerEvent(user.id, 'user_registered', {
 *               method: 'google',
 *               email: user.email,
 *               user_id: user.id,
 *             });
 * 
 *             // Identify user in PostHog
 *             await identifyUser(user.id, {
 *               email: user.email,
 *               name: user.name || user.email.split('@')[0],
 *             });
 * 
 *             // Alias anonymous ID
 *             const anonymousId = ctx.headers.get('x-anonymous-id');
 *             if (anonymousId && anonymousId !== user.id) {
 *               await aliasUser(user.id, anonymousId);
 *             }
 * 
 *             // Set ToS acceptance timestamp
 *             await db
 *               .update(userTable)
 *               .set({ tosAcceptedAt: new Date() })
 *               .where(eq(userTable.id, user.id));
 * 
 *             // Track ToS acceptance event
 *             await captureServerEvent(user.id, 'tos_accepted', {
 *               method: 'google',
 *               timestamp: new Date().toISOString(),
 *             });
 * 
 *             // Send welcome email
 *             await sendWelcomeEmail({
 *               to: user.email,
 *               userId: user.id,
 *               username: user.email.split('@')[0]!,
 *               loginUrl: `${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL}/login`,
 *             });
 *           } catch (error) {
 *             console.error('Failed to track Google registration:', error);
 *             // Don't fail registration if tracking fails
 *           }
 *         },
 *       },
 * 
 *       // User Registration Hook (GitHub OAuth)
 *       {
 *         matcher: '/api/auth/callback/github',
 *         async handler(ctx) {
 *           try {
 *             const user = ctx.session?.user;
 *             if (!user?.id || !user?.email) {
 *               return; // Not a sign-up, just a sign-in
 *             }
 * 
 *             // Check if this is a new user
 *             const [existingUser] = await db
 *               .select()
 *               .from(userTable)
 *               .where(eq(userTable.id, user.id))
 *               .limit(1);
 * 
 *             const isNewUser =
 *               existingUser &&
 *               existingUser.createdAt &&
 *               Date.now() - existingUser.createdAt.getTime() < 5000; // Within 5 seconds
 * 
 *             if (!isNewUser) {
 *               return; // Just a login, not a registration
 *             }
 * 
 *             // Track user registration event
 *             await captureServerEvent(user.id, 'user_registered', {
 *               method: 'github',
 *               email: user.email,
 *               user_id: user.id,
 *             });
 * 
 *             // Identify user in PostHog
 *             await identifyUser(user.id, {
 *               email: user.email,
 *               name: user.name || user.email.split('@')[0],
 *             });
 * 
 *             // Alias anonymous ID
 *             const anonymousId = ctx.headers.get('x-anonymous-id');
 *             if (anonymousId && anonymousId !== user.id) {
 *               await aliasUser(user.id, anonymousId);
 *             }
 * 
 *             // Set ToS acceptance timestamp
 *             await db
 *               .update(userTable)
 *               .set({ tosAcceptedAt: new Date() })
 *               .where(eq(userTable.id, user.id));
 * 
 *             // Track ToS acceptance event
 *             await captureServerEvent(user.id, 'tos_accepted', {
 *               method: 'github',
 *               timestamp: new Date().toISOString(),
 *             });
 * 
 *             // Send welcome email
 *             await sendWelcomeEmail({
 *               to: user.email,
 *               userId: user.id,
 *               username: user.email.split('@')[0]!,
 *               loginUrl: `${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL}/login`,
 *             });
 *           } catch (error) {
 *             console.error('Failed to track GitHub registration:', error);
 *             // Don't fail registration if tracking fails
 *           }
 *         },
 *       },
 * 
 *       // User Login Hook (Email Magic Links)
 *       {
 *         matcher: '/api/auth/sign-in/email',
 *         async handler(ctx) {
 *           try {
 *             const user = ctx.session?.user;
 *             if (!user?.id || !user?.email) {
 *               console.warn('PostHog: Missing user data in sign-in hook');
 *               return;
 *             }
 * 
 *             // Track login event
 *             await captureServerEvent(user.id, 'user_logged_in', {
 *               method: 'email',
 *               email: user.email,
 *               user_id: user.id,
 *             });
 *           } catch (error) {
 *             console.error('Failed to track email login:', error);
 *             // Don't fail login if tracking fails
 *           }
 *         },
 *       },
 * 
 *       // User Login Hook (Social OAuth - Google/GitHub)
 *       // Note: This runs for BOTH registration and login, but we only track login
 *       {
 *         matcher: '/api/auth/callback/*',
 *         async handler(ctx) {
 *           try {
 *             const user = ctx.session?.user;
 *             if (!user?.id || !user?.email) {
 *               return;
 *             }
 * 
 *             // Check if this is a new user (already handled by registration hooks)
 *             const [existingUser] = await db
 *               .select()
 *               .from(userTable)
 *               .where(eq(userTable.id, user.id))
 *               .limit(1);
 * 
 *             const isNewUser =
 *               existingUser &&
 *               existingUser.createdAt &&
 *               Date.now() - existingUser.createdAt.getTime() < 5000; // Within 5 seconds
 * 
 *             if (isNewUser) {
 *               return; // Already tracked by registration hook
 *             }
 * 
 *             // Determine provider from path
 *             const provider = ctx.path.includes('google')
 *               ? 'google'
 *               : ctx.path.includes('github')
 *                 ? 'github'
 *                 : 'oauth';
 * 
 *             // Track login event
 *             await captureServerEvent(user.id, 'user_logged_in', {
 *               method: provider,
 *               email: user.email,
 *               user_id: user.id,
 *             });
 *           } catch (error) {
 *             console.error('Failed to track social login:', error);
 *             // Don't fail login if tracking fails
 *           }
 *         },
 *       },
 * 
 *       // User Logout Hook
 *       {
 *         matcher: '/api/auth/sign-out',
 *         async handler(ctx) {
 *           try {
 *             const user = ctx.session?.user;
 *             if (!user?.id) {
 *               console.warn('PostHog: Missing user ID in sign-out hook');
 *               return;
 *             }
 * 
 *             // Track logout event
 *             await captureServerEvent(user.id, 'user_logged_out', {
 *               user_id: user.id,
 *             });
 * 
 *             // Check if this is a demo account and cleanup data
 *             const [demoUser] = await db
 *               .select()
 *               .from(userTable)
 *               .where(eq(userTable.id, user.id))
 *               .limit(1);
 * 
 *             if (demoUser && demoUser.level === 'demo') {
 *               await cleanupDemoAccountData(user.id);
 *             }
 *           } catch (error) {
 *             console.error('Failed to track logout:', error);
 *             // Don't fail logout if tracking fails
 *           }
 *         },
 *       },
 *     ],
 *   },
 * });
 * 
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
 * Type-safe session helpers
 *
 * Will be used to replace Auth.js session helpers in Phase 7.
 */
export type { Session } from 'better-auth/types';
