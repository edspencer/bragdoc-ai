# Authentication

## Overview

BragDoc uses Better Auth v1.3.33 with a database-backed session strategy to support dual authentication: browser sessions for the web app and JWT tokens for the CLI tool.

Better Auth is a modern, TypeScript-first authentication library that provides a flexible and secure authentication solution with native TypeScript support, extensive plugin ecosystem, and database-first architecture.

## Migration Status

**Migration Date:** 2025-10-28
**Previous:** NextAuth.js v5 (beta) with JWT strategy
**Current:** Better Auth v1.3.33 with database-backed sessions + cookie caching

The migration to Better Auth was completed to:
- Gain better TypeScript support and type safety
- Use database-backed sessions for improved security and flexibility
- Leverage modern authentication patterns with plugin architecture
- Maintain backward compatibility with existing Auth.js JWT tokens for CLI

## Architecture

```
┌─────────────┐           ┌──────────────┐
│ Web Browser │           │   CLI Tool   │
└──────┬──────┘           └──────┬───────┘
       │                         │
       │ Session Cookie          │ JWT Token (Authorization: Bearer)
       │                         │
       ▼                         ▼
┌────────────────────────────────────┐
│     Better Auth Middleware         │
│  ┌──────────────────────────────┐  │
│  │   getAuthUser() Helper       │  │
│  │  1. Check session (cookie)   │  │
│  │  2. Check JWT (header)       │  │
│  └──────────────────────────────┘  │
└────────────────┬───────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │   Database    │
         │  - User       │
         │  - Session    │
         │  - Account    │
         │  - Verification│
         └───────────────┘
```

## Better Auth Configuration

### File: `apps/web/lib/better-auth/config.ts`

Core configuration for Better Auth with custom field mappings and session management:

```typescript
export const betterAuthConfig: Partial<BetterAuthOptions> = {
  // Base URL for authentication endpoints
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Secret for signing cookies and tokens
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,

  // Enable email and password authentication (for demo mode)
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Database configuration with Drizzle adapter
  database: drizzleAdapter(db, {
    provider: 'pg',
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
      generateId: false, // Let database handle UUID generation
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Session management
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    freshAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Custom user fields
  user: {
    additionalFields: {
      provider: { type: 'string', required: false, defaultValue: 'credentials' },
      providerId: { type: 'string', required: false },
      preferences: { type: 'json', required: false },
      level: { type: 'string', required: true, defaultValue: 'free' },
      renewalPeriod: { type: 'string', required: false },
      lastPayment: { type: 'date', required: false },
      status: { type: 'string', required: true, defaultValue: 'active' },
      stripeCustomerId: { type: 'string', required: false },
      tosAcceptedAt: { type: 'date', required: false },
    },
    fields: {
      createdAt: 'created_at',
    },
  },

  // Social providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: 'offline',
      prompt: 'select_account consent',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['user:email'],
    },
  },
};
```

**Key Configuration Points:**
1. **generateId: false** - Preserves UUID generation by database (PostHog continuity requirement)
2. **Session strategy** - Database-backed with 5-minute cookie caching for performance
3. **JWT expiration** - 30 days (matches Auth.js JWT strategy for CLI compatibility)
4. **Cookie security** - httpOnly, secure in production, sameSite: 'lax'
5. **Field mappings** - Compatible with existing database schema

### File: `apps/web/lib/better-auth/server.ts`

Server-side Better Auth instance with magic link plugin:

```typescript
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';

export const auth = betterAuth({
  ...betterAuthConfig,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        // Check if new or existing user
        const existingUser = await db
          .select()
          .from(userTable)
          .where(eq(userTable.email, email))
          .limit(1);

        const isNewUser = existingUser.length === 0;

        // Send personalized email
        await sendMagicLinkEmail({
          to: email,
          magicLink: url,
          isNewUser,
        });
      },
      expiresIn: 24 * 60 * 60, // 24 hours
      disableSignUp: false,
    }),
  ],
});

export const { handler } = auth;
```

**Magic Link Plugin Features:**
- Custom email sending via Mailgun
- Personalized templates for new vs. existing users
- 24-hour token expiration
- Development mode console logging
- Auto-registration for new users

### File: `apps/web/lib/better-auth/client.ts`

Client-side React hooks for authentication:

```typescript
import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

export const { useSession, signIn, signOut, signUp, $Infer } = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
  plugins: [magicLinkClient()],
});
```

**Client Hooks:**
- `useSession()` - Get current session state
- `signIn.social({ provider: 'google' })` - Social OAuth
- `signIn.magicLink({ email })` - Magic link authentication
- `signOut()` - End session

## Authentication Providers

### 1. Magic Links (Email Provider)

BragDoc uses passwordless magic link authentication as the primary email-based authentication method.

**Flow:**
1. User enters email address
2. Better Auth generates unique token (24-hour expiry)
3. Custom email sent via Mailgun with magic link
4. User clicks link → redirected to `/api/auth/magic-link/verify`
5. Better Auth validates token
6. If valid:
   - New user: Creates account, sends welcome email
   - Existing user: Logs in to existing account
7. Database session created with 30-day expiry

**Token Management:**
- Tokens stored in `verification` table via magic-link plugin
- Single-use tokens (deleted after use)
- 24-hour expiration
- Email as identifier (can send new token to same email)

**Email Customization:**
- Template: `apps/web/emails/magic-link.tsx`
- Personalized for new vs. existing users
- Sent via Mailgun (`apps/web/lib/email/client.ts`)
- Mobile-responsive React Email template

**Implementation:**
```typescript
magicLink({
  sendMagicLink: async ({ email, url, token }) => {
    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    const isNewUser = existingUser.length === 0;

    await sendMagicLinkEmail({
      to: email,
      magicLink: url,
      isNewUser,
    });
  },
  expiresIn: 24 * 60 * 60, // 24 hours
  disableSignUp: false,
})
```

**Environment Variables:**
- `MAILGUN_API_KEY` - Mailgun API key for email sending

### 2. Google OAuth

```typescript
google: {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  accessType: 'offline',
  prompt: 'select_account consent',
  mapProfileToUser: (profile) => ({
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
}
```

**Environment Variables:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Features:**
- Offline access (refresh tokens)
- Account selection prompt
- Locale preference mapping

### 3. GitHub OAuth

GitHub OAuth is provided for **user authentication and sign-in only**. OAuth tokens are automatically stored by Better Auth in the `account` table for potential future use, but are not used for any API integration features.

```typescript
github: {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  scope: ['user:email'],
  mapProfileToUser: (profile) => ({
    id: profile.id,
    name: profile.name || profile.login,
    email: profile.email,
    image: profile.avatar_url,
    provider: 'github',
    providerId: profile.id,
    preferences: {
      language: 'en',
    },
  }),
}
```

**Environment Variables:**
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

**Features:**
- User email access scope for sign-in
- OAuth tokens stored by Better Auth in the `account` table
- Fallback to login if name not provided
- No API integration features (GitHub API integration feature was removed)

### 4. Demo Intent Flow (Auto-Enter Demo Mode)

BragDoc provides a streamlined demo experience where users can sign up and automatically enter demo mode with sample data.

**Purpose:** Allow users to explore BragDoc with sample data immediately after registration, combining signup with demo mode entry for a frictionless experience.

**Flow:**
1. User clicks "Try Demo" CTA on marketing site or `/register?demo=true` link
2. Server component detects `?demo=true` query parameter
3. Server sets `bragdoc_demo_intent` cookie (1-hour expiry, non-httpOnly for client access)
4. User completes registration (magic link, Google, or GitHub OAuth)
5. After successful authentication, `DemoIntentHandler` component detects cookie
6. Component calls `/api/demo-mode/toggle` to enter per-user demo mode
7. Cookie is cleared and page reloads with demo data

**Demo Intent Cookie Configuration:**
- Name: `bragdoc_demo_intent`
- Value: `'true'`
- HttpOnly: `false` (needs client-side access for handler)
- SameSite: `Lax` (allows cookie on OAuth redirects)
- Secure: `true` in production
- Path: `/`
- Max-Age: `3600` (1 hour)

**Implementation Files:**
- `apps/web/lib/demo-intent.ts` - Cookie management utilities
- `apps/web/components/demo-intent-handler.tsx` - Auto-enter demo mode on mount
- `apps/web/app/(auth)/register/page.tsx` - Server component sets cookie
- `apps/web/app/(auth)/login/page.tsx` - Server component sets cookie

**UI Indicators:**
- Demo intent banner on login/register pages: "After signing up, you'll enter demo mode with sample data to explore"
- Login page "Sign up" link preserves `?demo=true` parameter

**Key Characteristics:**
- Cookie survives OAuth redirects (SameSite: Lax)
- Works with all auth methods (magic link, Google, GitHub)
- Single entry point via per-user demo mode
- No standalone demo accounts created
- User gets real account with demo data overlay

## Database Schema

Better Auth uses four main tables for authentication:

### User Table
```typescript
export const user = pgTable('User', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 255 }), // Increased for bcrypt hashes
  name: varchar('name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  emailVerified: boolean('email_verified').notNull().default(false), // Boolean for Better Auth

  // BragDoc-specific fields
  provider: varchar('provider', { length: 32 }).notNull().default('credentials'),
  providerId: varchar('provider_id', { length: 256 }),
  preferences: jsonb('preferences').$type<UserPreferences>(),
  level: userLevelEnum('level').notNull().default('free'),
  renewalPeriod: renewalPeriodEnum('renewal_period').default('monthly'),
  lastPayment: timestamp('last_payment'),
  status: userStatusEnum('status').notNull().default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 256 }),
  tosAcceptedAt: timestamp('tos_accepted_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Key Changes from Auth.js:**
- `emailVerified` changed from `timestamp` to `boolean`
- `password` field length increased to 255 for bcrypt hashes
- Custom fields maintained for BragDoc-specific data

### Session Table
```typescript
export const session = pgTable('Session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: varchar('ipAddress', { length: 45 }),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
```

**Session Strategy:**
- Database-backed sessions for security
- Cookie caching (5 minutes) for performance
- 30-day session expiration
- Sliding window: session refreshed after 1 day of activity
- IP address and user agent tracking

### Account Table
```typescript
export const account = pgTable('Account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: varchar('accountId', { length: 255 }).notNull(),
  providerId: varchar('providerId', { length: 255 }).notNull(),
  refreshToken: text('refreshToken'),
  accessToken: text('accessToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: varchar('scope', { length: 255 }),
  idToken: text('idToken'),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
```

**Account Linking:**
- Better Auth automatically links accounts with the same email
- OAuth tokens (access, refresh, ID) stored per provider
- Password stored for credential provider (email/password)

### Verification Table
```typescript
export const verification = pgTable('verification', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});
```

**Verification Tokens:**
- Used by magic-link plugin for email verification
- Single-use tokens (deleted after verification)
- 24-hour expiration
- UUID identifier

## Session Management

### Database-Backed Sessions

Better Auth uses database-backed sessions with cookie caching for optimal security and performance.

**Session Flow:**
1. User authenticates → session created in database
2. Session token stored in httpOnly cookie
3. Cookie cached for 5 minutes (reduces database queries)
4. After 5 minutes → database queried to validate session
5. After 1 day of activity → session expiry updated (sliding window)
6. After 30 days of inactivity → session expires

**Session Configuration:**
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 30,    // 30 days
  updateAge: 60 * 60 * 24,         // Refresh after 1 day
  freshAge: 60 * 60 * 24,          // Fresh for 1 day
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5,                // 5-minute cache
  },
}
```

**Cookie Configuration:**
- **httpOnly: true** - Prevents XSS attacks (cookie not accessible via JavaScript)
- **secure: true** (production) - HTTPS only
- **sameSite: 'lax'** - CSRF protection
- **path: '/'** - Application-wide
- **maxAge: 30 days** - Cookie expiration

### Cookie Naming
- Development (HTTP): `next-auth.session-token`
- Production (HTTPS): `__Secure-next-auth.session-token`

## Unified Auth Helper

### File: `apps/web/lib/getAuthUser.ts`

Supports both Better Auth sessions (browser) and JWT tokens (CLI):

```typescript
export async function getAuthUser(
  request: Request,
): Promise<{ user: User; source: 'session' | 'jwt' } | null> {
  // 1. Try Better Auth session (browser)
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (session?.user?.id) {
      return {
        user: session.user as unknown as User,
        source: 'session',
      };
    }
  } catch (error) {
    console.error('Error checking Better Auth session:', error);
  }

  // 2. Try JWT from Authorization header (CLI)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    // Decode JWT using Better Auth secret (with Auth.js fallback)
    const decoded = await decode({
      token,
      secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET!,
      salt: '',
    });

    if (!decoded?.id) return null;

    return {
      user: {
        id: decoded.id as string,
        email: decoded.email as string,
        name: decoded.name as string,
        image: decoded.picture as string,
        provider: decoded.provider as string,
        providerId: decoded.providerId as string,
        preferences: decoded.preferences as any,
        level: decoded.level as any,
        renewalPeriod: decoded.renewalPeriod as any,
      } as User,
      source: 'jwt',
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}
```

**Key Features:**
1. **Dual authentication** - Supports both session cookies and JWT tokens
2. **Backward compatibility** - CLI tokens signed with AUTH_SECRET still work
3. **Type safety** - Returns typed User object
4. **Source tracking** - Identifies authentication source (session vs JWT)
5. **Error handling** - Graceful fallback on authentication failures

**Usage in API Routes:**
```typescript
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await db
    .select()
    .from(table)
    .where(eq(table.userId, auth.user.id));

  return NextResponse.json(data);
}
```

## CLI Authentication Flow

### Step-by-Step Process

1. **User runs `bragdoc login`**
   ```bash
   bragdoc login
   ```

2. **CLI starts local callback server**
   ```typescript
   // packages/cli/src/commands/auth.ts
   const server = http.createServer(handleCallback);
   server.listen(5556);
   ```

3. **CLI generates random state** (CSRF protection)
   ```typescript
   const state = crypto.randomBytes(32).toString('hex');
   ```

4. **Opens browser to auth URL**
   ```
   https://www.bragdoc.ai/cli-auth?state={state}&port=5556
   ```

5. **User authenticates in browser**
   - User logs in via Google, GitHub, or magic link
   - Better Auth session created

6. **Web app generates JWT token**
   ```typescript
   // apps/web/app/cli-auth/page.tsx
   const token = await encode({
     token: {
       id: session.user.id,
       email: session.user.email,
       // ... all user fields
     },
     secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET!,
     maxAge: 30 * 24 * 60 * 60, // 30 days
     salt: '',
   });
   ```

7. **Sends token back to CLI**
   ```typescript
   await fetch(`http://localhost:${port}/callback`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ state, token }),
   });
   ```

8. **CLI validates state and saves token**
   ```typescript
   // Verify state matches
   if (data.state !== expectedState) {
     throw new Error('Invalid state');
   }

   // Save to config
   await updateConfig({
     auth: {
       token: data.token,
       expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
     },
   });
   ```

9. **CLI shuts down callback server**
   ```typescript
   server.close();
   console.log('✓ Successfully authenticated!');
   ```

### Token Storage
**Location:** `~/.bragdoc/config.yml`

```yaml
auth:
  token: "eyJhbGciOiJIUzI1NiJ9..."
  expiresAt: 1735689600000
```

**File Permissions:** 0600 (read/write for owner only)

### Token Usage
```typescript
// packages/cli/src/api/client.ts
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${config.auth.token}`,
    'Content-Type': 'application/json',
  },
});
```

### JWT Token Format

CLI JWT tokens contain:
- `id` - User ID
- `email` - User email
- `name` - User name
- `picture` - User avatar URL
- `provider` - Auth provider (google, github, email)
- `providerId` - Provider-specific user ID
- `preferences` - User preferences (language, document instructions)
- `level` - Subscription level (free, basic, pro, demo)
- `renewalPeriod` - Billing cycle (monthly, yearly)
- `exp` - Expiration timestamp (30 days)

## Protected Routes

### Middleware Protection
**File:** `apps/web/proxy.ts`

Better Auth middleware is applied to protect authenticated routes:

```typescript
import { auth } from '@/lib/better-auth/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Allow auth-related pages and API routes
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/demo-mode') ||
    pathname.startsWith('/cli-auth') ||
    pathname.startsWith('/unsubscribed') ||
    pathname.startsWith('/shared/');

  // Check for Better Auth session
  let isLoggedIn = false;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    isLoggedIn = !!session?.user;
  } catch (error) {
    console.error('Error checking Better Auth session in middleware:', error);
  }

  // Handle CLI auth redirect
  if (
    (pathname.startsWith('/login') || pathname.startsWith('/register')) &&
    searchParams.has('state') &&
    searchParams.has('port')
  ) {
    const returnTo = new URL('/cli-auth', request.url);
    returnTo.searchParams.set('state', searchParams.get('state')!);
    returnTo.searchParams.set('port', searchParams.get('port')!);
    return NextResponse.redirect(returnTo);
  }

  // Redirect logged-in users away from auth pages
  if (
    isLoggedIn &&
    (pathname.startsWith('/login') || pathname.startsWith('/register')) &&
    !searchParams.has('state')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow access to auth pages
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

**Protected Routes:**
- All routes except auth pages require authentication
- Unauthenticated users redirected to `/login` with `?from=` parameter

**Public Routes (excluded from middleware protection):**
- `/login` - Login page
- `/register` - Registration page
- `/cli-auth` - CLI authentication page
- `/shared/*` - Publicly shared documents
- `/unsubscribed` - Email unsubscribe page
- `/api/auth/*` - Better Auth API endpoints
- `/api/demo-mode/*` - Per-user demo mode API endpoints
- Static assets (`_next/static`, `_next/image`, `favicon.ico`, `/api`)

### API Route Protection
```typescript
import { getAuthUser } from '@/lib/getAuthUser';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... protected logic
}
```

### Server Component Protection
```typescript
import { auth } from '@/lib/better-auth/server';

export default async function ProtectedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return <div>Please log in to access this page.</div>;
  }

  // ... render page
}
```

**Important:** Never use `redirect()` in Server Components - it breaks Cloudflare Worker builds. Use fallback UI instead.

## Security Features

### CSRF Protection
- State parameter in CLI auth flow (random 64-char hex)
- SameSite cookie attribute for web sessions
- Better Auth built-in CSRF token validation

### Password Security
- bcrypt hashing with Better Auth's `hashPassword()` function
- Passwords never logged or exposed in API responses
- Demo account passwords fixed and internal-only

### Token Security
- JWT signed with BETTER_AUTH_SECRET (or AUTH_SECRET for backward compatibility)
- 30-day expiration for CLI tokens
- Stored in user-only readable file (`~/.bragdoc/config.yml` with 0600 permissions)
- Session tokens stored in database with expiry tracking

### Session Security
- HTTPOnly cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=Lax (CSRF protection)
- Database-backed sessions (can be revoked instantly)
- Cookie caching reduces attack surface

### Rate Limiting
Better Auth provides built-in rate limiting for authentication endpoints to prevent brute force attacks.

## Environment Variables

```env
# Required
BETTER_AUTH_SECRET=<generate-with-openssl-rand-hex-32>
BETTER_AUTH_URL=http://localhost:3000

# Backward compatibility (will be deprecated)
AUTH_SECRET=<same-as-better-auth-secret>
NEXTAUTH_URL=<same-as-better-auth-url>

# OAuth (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Email (Required for magic links)
MAILGUN_API_KEY=...

# Public URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -hex 32
```

**Environment Variable Priority:**
- Better Auth checks `BETTER_AUTH_SECRET` first, falls back to `AUTH_SECRET`
- Better Auth checks `BETTER_AUTH_URL` first, falls back to `NEXTAUTH_URL`
- This ensures backward compatibility during migration

## PostHog Identity Aliasing

### Overview

BragDoc uses a unified cookie-based PostHog identity aliasing approach for all authentication providers (magic links, Google OAuth, GitHub OAuth). This ensures that anonymous browsing events are merged with the authenticated user's identity.

**Note:** PostHog integration hooks are prepared but not yet active in Better Auth server instance. Will be activated in future phase when Better Auth hooks TypeScript types are stabilized.

### Planned Implementation

**Flow:**
1. Anonymous user browses site → PostHog sets `ph_anonymous_id` cookie
2. User signs up via ANY provider (magic link, Google, GitHub)
3. Better Auth lifecycle hook fires
4. Server reads `ph_anonymous_id` cookie (or X-Anonymous-Id header)
5. Server calls `aliasUser(userId, anonymousId)`
6. PostHog merges anonymous events with user identity
7. Server deletes `ph_anonymous_id` cookie

**Prepared Hooks (commented in server.ts):**
- User registration tracking (email, Google, GitHub)
- User login tracking (email, OAuth)
- User logout tracking with demo cleanup
- PostHog identity aliasing via X-Anonymous-Id header
- ToS acceptance tracking
- Welcome email integration

**Location:** `apps/web/lib/better-auth/server.ts` (commented hooks section)

## OAuth Terms of Service Compliance

### Overview

BragDoc implements Terms of Service compliance for OAuth-based signups using the **implicit acceptance pattern**, which is the industry standard approach used by major OAuth implementations (Google, Microsoft, Slack, Notion, Linear).

### Implementation Approach

**Implicit Acceptance Text:**
- Users are presented with ToS acceptance text above OAuth buttons
- By clicking the OAuth button, users take affirmative action after being informed of the terms
- No extra pages or modals that disrupt the OAuth flow
- Legal sufficiency: Users have been presented with terms and taken affirmative action

**Text Display:**
```
By continuing with Google or GitHub, you agree to our Terms of Service and Privacy Policy
```

- Displayed prominently above OAuth buttons on both `/login` and `/register` pages
- Links to Terms of Service and Privacy Policy open in new tabs
- Visually distinct styling for easy readability
- Supports both light and dark modes

### Automatic ToS Acceptance

ToS acceptance will be automatically tracked via Better Auth lifecycle hooks when activated:

```typescript
// Set ToS acceptance timestamp
await db
  .update(userTable)
  .set({ tosAcceptedAt: new Date() })
  .where(eq(userTable.id, user.id));

// Track ToS acceptance event
await captureServerEvent(user.id, 'tos_accepted', {
  method: user.provider || 'email',
  timestamp: new Date().toISOString(),
});
```

### Database Field

**Field:** `tosAcceptedAt` on `User` table
- Type: `timestamp('tos_accepted_at')`
- Nullable: Yes (NULL for users who signed up before this feature)
- Set automatically for all new signups (OAuth and magic links)

### ToS Text Component

**File:** `apps/web/components/social-auth-buttons.tsx`

```tsx
<p className="text-sm text-center text-gray-600 dark:text-zinc-400 px-2">
  By continuing with Google or GitHub, you agree to our{' '}
  <Link href={`${marketingSiteHost}/terms`} target="_blank" rel="noopener noreferrer">
    Terms of Service
  </Link>
  {' '}and{' '}
  <Link href={`${marketingSiteHost}/privacy-policy`} target="_blank" rel="noopener noreferrer">
    Privacy Policy
  </Link>
</p>
```

### Analytics Tracking

**Event:** `tos_accepted`

**Properties:**
- `method` - Auth provider (`'google'`, `'github'`, `'email'`)
- `timestamp` - ISO timestamp of acceptance

**Usage:**
```typescript
await captureServerEvent(user.id, 'tos_accepted', {
  method: user.provider || 'email',
  timestamp: new Date().toISOString(),
});
```

This event will be tracked server-side via Better Auth lifecycle hooks when activated.

### Legal Compliance

**Why This Approach is Legally Sufficient:**
1. **Informed Consent**: Users see the ToS acceptance text before clicking OAuth button
2. **Affirmative Action**: Clicking the OAuth button is an affirmative action
3. **Industry Standard**: Pattern used by major companies (Google, Microsoft, Slack, Linear)
4. **Timestamped**: `tosAcceptedAt` field provides audit trail
5. **Link Access**: Users can review full terms before proceeding

**Existing Users:**
- Users who signed up before this feature have `tosAcceptedAt = NULL`
- This is acceptable - they signed up under previous terms
- Only new signups (after feature deployment) have `tosAcceptedAt` populated

### Environment Variables

```env
NEXT_PUBLIC_MARKETING_SITE_HOST=https://www.bragdoc.ai
```

Used for linking to Terms of Service and Privacy Policy on the marketing site.

## Common Patterns

### Check Auth in Server Component
```typescript
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';

const session = await auth.api.getSession({
  headers: await headers(),
});

if (!session?.user?.id) {
  return <div>Please log in</div>;
}
```

### Check Auth in API Route
```typescript
import { getAuthUser } from '@/lib/getAuthUser';

const auth = await getAuthUser(request);
if (!auth?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Check Auth Source
```typescript
const auth = await getAuthUser(request);
if (auth?.source === 'jwt') {
  // Request from CLI
} else {
  // Request from browser
}
```

### Get Current User
```typescript
const session = await auth.api.getSession({ headers: await headers() });
const userId = session?.user?.id;
const userLevel = session?.user?.level;
```

### Sign In with Social OAuth
```typescript
import { signIn } from '@/lib/better-auth/client';

<button onClick={() => signIn.social({ provider: 'google' })}>
  Sign in with Google
</button>
```

### Sign In with Magic Link
```typescript
import { signIn } from '@/lib/better-auth/client';

const handleMagicLink = async (email: string) => {
  await signIn.magicLink({ email });
  // Magic link email sent
};
```

### Sign Out
```typescript
import { signOut } from '@/lib/better-auth/client';

<button onClick={() => signOut()}>
  Sign Out
</button>
```

## Migration Notes

### Breaking Changes from Auth.js

1. **emailVerified field**: Changed from `timestamp` to `boolean`
2. **Session strategy**: Changed from JWT-only to database-backed with cookie caching
3. **API structure**: Better Auth uses `auth.api.*` methods instead of NextAuth's `auth()` function
4. **Type definitions**: Better Auth has native TypeScript support, no need for module augmentation

### Backward Compatibility

1. **CLI JWT tokens**: Still use NextAuth's `encode()`/`decode()` functions for backward compatibility
2. **Environment variables**: Falls back to `AUTH_SECRET` and `NEXTAUTH_URL` if Better Auth vars not set
3. **Cookie naming**: Maintains NextAuth cookie names for seamless migration
4. **Unified auth helper**: `getAuthUser()` supports both Better Auth sessions and legacy JWT tokens

### Future Deprecations

These will be removed in future releases:
- `AUTH_SECRET` environment variable (use `BETTER_AUTH_SECRET`)
- `NEXTAUTH_URL` environment variable (use `BETTER_AUTH_URL`)
- NextAuth JWT encode/decode for demo mode (migrate to Better Auth programmatic sign-in)

---

## Per-User Demo Mode (Session-Swap Architecture)

### Overview

BragDoc's demo mode allows authenticated users to toggle into a sandbox environment with sample data without affecting their real data. This feature uses a **session-swap architecture** where toggling demo mode creates a new session pointing to a shadow user.

**Note:** This is the only demo mode implementation. Standalone demo mode (temporary `level='demo'` accounts) has been removed.

### Key Architecture Decision

Instead of adding demo mode checks to every API route (42+ routes), the session-swap approach centralizes complexity in a single toggle endpoint. When `getAuthUser()` is called, it returns the demo user automatically if in demo mode, making the feature transparent to all existing API routes.

### Shadow Users

Shadow users are special accounts created to hold demo data for authenticated users:

**Characteristics:**
- Email pattern: `shadow-{realUserId}@demo.bragdoc.ai`
- `isDemo: true` flag set on User table
- Linked to real user via `User.demoUserId` field
- Created lazily on first demo mode toggle

**Creation Flow:**
1. User toggles demo mode for the first time
2. System checks if user already has a linked shadow user (`User.demoUserId`)
3. If not, creates new shadow user with demo email pattern
4. Links shadow user to real user via `demoUserId` update
5. Seeds demo data using `importDemoData()` function

### Session Swapping

The `impersonatedBy` field on the Session table enables demo mode without modifying API routes:

**Schema:**
```typescript
export const session = pgTable('Session', {
  // ... standard fields ...
  impersonatedBy: uuid('impersonated_by').references(() => user.id, {
    onDelete: 'cascade',
  }),
});
```

**Session States:**
| State | userId | impersonatedBy | Description |
|-------|--------|----------------|-------------|
| Normal | realUser | null | Standard authenticated session |
| Demo Mode | shadowUser | realUser | Session points to shadow user, tracks real user |

**Toggle Flow (Enter Demo Mode):**
1. User calls `POST /api/demo-mode/toggle`
2. System gets or creates shadow user for real user
3. Current session is deleted
4. New session created: `userId=shadowUser, impersonatedBy=realUser`
5. Session cookie set in response
6. Page reloads to pick up new session

**Toggle Flow (Exit Demo Mode):**
1. User calls `POST /api/demo-mode/toggle`
2. System reads `impersonatedBy` to identify real user
3. Demo session is deleted
4. New session created: `userId=realUser, impersonatedBy=null`
5. Session cookie set in response
6. Page reloads to return to real data

### API Endpoints

**POST /api/demo-mode/toggle**
Toggles between demo mode and normal mode. Creates session cookie in response.

```typescript
// Response when entering demo mode
{ "success": true, "mode": "demo", "message": "Demo mode enabled" }

// Response when exiting demo mode
{ "success": true, "mode": "normal", "message": "Demo mode disabled" }
```

**POST /api/demo-mode/reset**
Resets demo data (only works when in demo mode).

```typescript
// Request: No body required

// Response
{ "success": true, "message": "Demo data reset successfully", "stats": {...} }

// Error (not in demo mode)
{ "error": "Not in demo mode" } // 400 status
```

**GET /api/demo-mode/status**
Returns current demo mode status.

```typescript
// In demo mode
{ "isDemoMode": true, "realUserId": "uuid-of-real-user" }

// Not in demo mode
{ "isDemoMode": false }
```

### Security Measures

**Shadow User Login Prevention:**
Shadow users cannot authenticate directly. Better Auth hooks block:
1. Email/password login for users with `isDemo: true`
2. Any email matching pattern `shadow-*@demo.bragdoc.ai`
3. OAuth attempts for shadow user emails

```typescript
// In Better Auth config (hooks.before)
if (existingUser[0]?.isDemo) {
  throw new APIError('FORBIDDEN', {
    message: 'Demo accounts cannot log in directly',
  });
}
```

**Session Isolation:**
- Demo sessions have `impersonatedBy` set, normal sessions have it null
- Session expiration: 4 hours for demo, 30 days for normal
- Deleting real user cascades to shadow user (via `demoUserId` FK)

### Client-Side Integration

**DemoModeProvider Context:**
```typescript
interface DemoModeContextType {
  isDemoMode: boolean;        // Is per-user demo mode active
  isLoading: boolean;         // Async operation in progress
  toggleDemoMode(): Promise<void>;
  resetDemoData(): Promise<void>;
}
```

**Components:**
- `DemoToggleButton` - Header button to toggle demo mode
- `PerUserDemoBanner` - Fixed banner showing "You're viewing demo data"
- `DemoToggleWrapper` - Conditional wrapper (hidden when demo mode disabled)
- `DemoIntentHandler` - Auto-enters demo mode when intent cookie present

**Detection:**
```typescript
// Server-side (in layout.tsx)
const fullSession = await getFullSessionById(session.session.id);
const isPerUserDemoMode = fullSession?.impersonatedBy != null;

// Client-side (via context)
const { isDemoMode } = useDemoMode();
```

### Demo Mode Entry Points

Users can enter demo mode in two ways:

| Entry Point | Description | Implementation |
|-------------|-------------|----------------|
| Header toggle | Authenticated users click toggle button | `DemoToggleButton` component |
| Registration with intent | New users via `/register?demo=true` | `DemoIntentHandler` auto-enter |

### Environment Variables

```env
# Show demo toggle button in sidebar (per-user demo mode)
NEXT_PUBLIC_DEMO_MODE_ENABLED=true

# Enable demo help dialogs
NEXT_PUBLIC_DEMO_HELP_ENABLED=true
```

Set `NEXT_PUBLIC_DEMO_MODE_ENABLED=true` for the demo toggle button to appear in the sidebar.

---

**Last Updated:** 2026-01-13 (Per-user demo mode)
**Better Auth Version:** 1.3.33
**Session Strategy:** Database-backed with cookie caching
**JWT Expiration:** 30 days (CLI tokens)
**Session Expiration:** 30 days (web sessions), 4 hours (demo sessions)
