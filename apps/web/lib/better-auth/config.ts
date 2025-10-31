/**
 * Better Auth Configuration
 *
 * Central configuration for Better Auth authentication library.
 * This file defines:
 * - Database connection and adapter
 * - Session management strategy
 * - Custom user fields (level, preferences, etc.)
 * - Field mappings for database schema
 */

import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  db,
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
} from '@bragdoc/database';

import type { BetterAuthOptions } from 'better-auth';

/**
 * Better Auth Configuration
 *
 * Critical Configuration Notes:
 * 1. Database adapter uses existing Drizzle instance from @bragdoc/database
 * 2. generateId: false - Preserves UUID generation by database (PostHog continuity requirement)
 * 3. Session strategy: Database-backed with 5-minute cookie caching for performance
 * 4. Session expiration: 30 days for CLI compatibility
 */
export const betterAuthConfig: Partial<BetterAuthOptions> = {
  // Base URL for authentication endpoints
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Secret for signing cookies and tokens
  secret: process.env.BETTER_AUTH_SECRET!,

  // Trusted origins for CORS (allows Vercel preview deployments)
  trustedOrigins: [
    'http://localhost:3000',
    'https://bragdoc.ai',
    'https://*.vercel.app', // Allow all Vercel preview deployments
  ],

  // Enable email and password authentication
  // Required for programmatic sign-in (e.g., demo mode)
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Allow sign-in without email verification
  },

  // Database configuration with Drizzle adapter
  database: drizzleAdapter(db, {
    provider: 'pg', // PostgreSQL
    schema: {
      user: userTable,
      session: sessionTable,
      account: accountTable,
      verification: verificationTable,
    },
  }),

  // Advanced database options
  advanced: {
    database: {
      // Let database handle ID generation (preserves defaultRandom() UUID pattern)
      generateId: false,
    },
    // Cookie configuration: Don't use secure cookies in development (localhost HTTP)
    // This prevents the __Secure- prefix which requires HTTPS
    useSecureCookies:
      process.env.NODE_ENV === 'production' &&
      !process.env.BETTER_AUTH_URL?.includes('localhost'),
  },

  // User model configuration
  user: {
    // Custom fields for BragDoc-specific user properties
    additionalFields: {
      // User provider (email, google, github, credentials)
      provider: {
        type: 'string',
        required: false,
        defaultValue: 'credentials',
      },

      // Provider-specific user ID
      providerId: {
        type: 'string',
        required: false,
      },

      // User preferences (language, theme, etc.)
      preferences: {
        type: 'json',
        required: false,
      },

      // GitHub access token (for GitHub integration)
      githubAccessToken: {
        type: 'string',
        required: false,
      },

      // Subscription level
      level: {
        type: 'string',
        required: true,
        defaultValue: 'free',
      },

      // Billing renewal period
      renewalPeriod: {
        type: 'string',
        required: false,
      },

      // Last payment timestamp
      lastPayment: {
        type: 'date',
        required: false,
      },

      // Account status
      status: {
        type: 'string',
        required: true,
        defaultValue: 'active',
      },

      // Stripe customer ID
      stripeCustomerId: {
        type: 'string',
        required: false,
      },

      // Terms of Service acceptance timestamp
      tosAcceptedAt: {
        type: 'date',
        required: false,
      },

      // Unused password field (kept for schema compatibility)
      password: {
        type: 'string',
        required: false,
      },
    },

    // Field name mappings (database uses snake_case)
    fields: {
      // Note: emailVerified and updatedAt not mapped
      // This prevents Better Auth from trying to auto-update them after OAuth login
      // which causes empty UPDATE queries with the Drizzle adapter (known bug)
      createdAt: 'created_at',
    },
  },

  // Account model configuration
  account: {
    // Field name mappings for database schema
    fields: {
      accountId: 'accountId',
      providerId: 'providerId',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
      idToken: 'idToken',
      accessTokenExpiresAt: 'accessTokenExpiresAt',
      refreshTokenExpiresAt: 'refreshTokenExpiresAt',
    },
  },

  // Session model configuration and management
  session: {
    // Session expiry: 30 days for CLI compatibility
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds

    // Update session expiry after 1 day of activity (sliding window)
    updateAge: 60 * 60 * 24, // 1 day in seconds

    // Fresh age for sensitive operations (password changes, etc.)
    freshAge: 60 * 60 * 24, // 1 day in seconds

    // Cookie caching for performance (reduces database queries)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes before database refresh
    },

    // Field mappings for database schema
    fields: {
      token: 'token',
      expiresAt: 'expiresAt',
    },

    // Note: Cookie configuration (httpOnly, secure, sameSite) is handled
    // automatically by Better Auth with secure defaults. In production:
    // - httpOnly: true (prevents XSS attacks)
    // - secure: true (HTTPS only)
    // - sameSite: 'lax' (CSRF protection)
  },

  // Verification token configuration
  // Note: Field mappings removed - Better Auth with magic-link plugin
  // handles verification schema automatically

  // Account linking configuration
  // Better Auth automatically links accounts with the same email address
  // No additional configuration needed - this is the default behavior

  // Social providers configuration
  socialProviders: {
    // Google OAuth
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      // Get refresh token for offline access
      accessType: 'offline' as const,
      prompt: 'select_account consent' as const,

      // Map Google profile to user fields
      mapProfileToUser: (profile: {
        sub: string;
        name: string;
        email: string;
        picture: string;
        locale?: string;
      }) => ({
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
        provider: 'google',
        providerId: profile.sub,
        preferences: {
          language: profile.locale || 'en',
        },
      }),
    },

    // GitHub OAuth
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,

      // Request user email access
      scope: ['user:email'],

      // Map GitHub profile to user fields
      mapProfileToUser: (profile: {
        id: string;
        login: string;
        name: string | null;
        email: string;
        avatar_url: string;
      }) => ({
        id: profile.id,
        name: profile.name || profile.login,
        email: profile.email,
        image: profile.avatar_url,
        provider: 'github',
        providerId: profile.id,
        preferences: {
          language: 'en', // GitHub doesn't provide language preference
        },
      }),
    },
  },
};

/**
 * Environment variable validation
 *
 * Ensures required environment variables are present.
 * Throws clear errors during build if missing.
 */
if (!betterAuthConfig.secret) {
  throw new Error('Missing required environment variable: BETTER_AUTH_SECRET');
}

if (!betterAuthConfig.baseURL) {
  throw new Error('Missing required environment variable: BETTER_AUTH_URL');
}
