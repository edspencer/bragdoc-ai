# Authentication

## Overview

BragDoc uses NextAuth.js v5 (beta) with a JWT strategy to support dual authentication: browser sessions for the web app and JWT tokens for the CLI tool.

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
│     Next Auth.js Middleware        │
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
         └───────────────┘
```

## NextAuth Configuration

### File: `apps/web/app/(auth)/auth.ts`

```typescript
export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  session: {
    strategy: 'jwt',  // Stateless JWT strategy
  },
  providers: [
    Google({ /* OAuth config */ }),
    GitHub({ /* OAuth config */ }),
    Email({ /* Magic link email */ }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Populate JWT with user data
    },
    async session({ session, token }) {
      // Populate session from JWT
    },
  },
});
```

## Authentication Providers

### 1. Magic Links (Email Provider)

BragDoc uses passwordless magic link authentication as the primary email-based authentication method.

**Flow:**
1. User enters email address
2. NextAuth generates unique token (24-hour expiry)
3. Custom email sent via Mailgun with magic link
4. User clicks link
5. NextAuth validates token
6. If valid:
   - New user: Creates account, sends welcome email
   - Existing user: Logs in to existing account
7. Session created via JWT

**Token Management:**
- Tokens stored in `VerificationToken` table (via Drizzle adapter)
- Single-use tokens (deleted after use)
- 24-hour expiration
- Email as identifier (can send new token to same email)

**Email Customization:**
- Template: `apps/web/emails/magic-link.tsx`
- Personalized for new vs. existing users
- Sent via Mailgun SMTP
- Mobile-responsive React Email template

**Implementation:**
```typescript
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
  sendVerificationRequest: async ({ identifier, url, provider }) => {
    // Check if this is a new user or existing user
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, identifier))
      .limit(1);

    const isNewUser = existingUser.length === 0;

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
  maxAge: 24 * 60 * 60, // 24 hours
})
```

**Environment Variables:**
- `MAILGUN_SMTP_SERVER` - SMTP server (smtp.mailgun.org)
- `MAILGUN_SMTP_LOGIN` - SMTP username
- `MAILGUN_SMTP_PASSWORD` - SMTP password

### 2. Google OAuth
```typescript
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
})
```

**Environment Variables:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 2. GitHub OAuth
```typescript
GitHub({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorization: {
    params: { scope: 'read:user user:email' },
  },
  profile(profile) {
    return {
      id: profile.id.toString(),
      name: profile.name,
      email: profile.email,
      image: profile.avatar_url,
      provider: 'github',
      providerId: profile.id.toString(),
      githubAccessToken: undefined, // Set in JWT callback
    };
  },
})
```

**Environment Variables:**
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### 3. ~~Credentials Provider~~ (Removed)

Previously, BragDoc supported email/password authentication. This was removed in favor of passwordless magic links to:
- Improve security (no passwords to leak)
- Simplify architecture (unified auth flow)
- Better user experience (no forgotten passwords)
- Reduce code complexity

**Migration Date:** 2025-10-26
**Replaced By:** Magic Links (Email provider)

## JWT Strategy

### JWT Callback
Runs when JWT is created or updated:

```typescript
async jwt({ token, user, account }) {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name;
    token.picture = user.image;
    token.provider = user.provider;
    token.providerId = user.providerId;
    token.preferences = user.preferences;
    token.githubAccessToken = user.githubAccessToken;
    token.level = user.level;
    token.renewalPeriod = user.renewalPeriod;
  }

  // Store GitHub access token from OAuth
  if (account?.provider === 'github' && account.access_token) {
    token.githubAccessToken = account.access_token;
  }

  return token;
}
```

### Session Callback
Runs when session is accessed:

```typescript
async session({ session, token }) {
  if (token) {
    session.user.id = token.id as string;
    session.user.email = token.email as string;
    session.user.name = token.name as string;
    session.user.image = token.picture as string;
    session.user.provider = token.provider as string;
    session.user.providerId = token.providerId as string;
    session.user.preferences = token.preferences as UserPreferences;
    session.user.githubAccessToken = token.githubAccessToken as string;
    session.user.level = token.level as UserLevel;
    session.user.renewalPeriod = token.renewalPeriod as RenewalPeriod;
  }
  return session;
}
```

## Unified Auth Helper

### File: `apps/web/lib/getAuthUser.ts`

Supports both browser sessions and CLI JWT tokens:

```typescript
export async function getAuthUser(
  request: Request,
): Promise<{ user: User; source: 'session' | 'jwt' } | null> {
  // 1. Try session (browser)
  const session = await auth();
  if (session?.user?.id) {
    return { user: session.user as User, source: 'session' };
  }

  // 2. Try JWT from Authorization header (CLI)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const decoded = await decode({
    token,
    secret: process.env.AUTH_SECRET!,
    salt: '',
  });

  if (!decoded?.id) return null;

  return { user: decoded as User, source: 'jwt' };
}
```

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
   - User logs in via Google, GitHub, or email/password
   - NextAuth session created

6. **Web app generates JWT token**
   ```typescript
   // apps/web/app/cli-auth/page.tsx
   const token = await encode({
     token: {
       id: session.user.id,
       email: session.user.email,
       // ... all user fields
     },
     secret: process.env.AUTH_SECRET!,
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

## Protected Routes

### Middleware Protection
**File:** `apps/web/middleware.ts`

```typescript
export { auth as middleware } from '@/app/(auth)/auth';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|cli-auth|share).*)'],
};
```

**Excludes:**
- `/api/*` - API routes handle auth independently
- `/cli-auth` - CLI authentication page (public)
- `/share/*` - Publicly shared documents
- Static assets

### API Route Protection
```typescript
import { getAuthUser } from 'lib/getAuthUser';

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
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  // ... render page
}
```

## Security Features

### CSRF Protection
- State parameter in CLI auth flow (random 64-char hex)
- SameSite cookie attribute for web sessions

### Password Security
- bcrypt hashing with 10 salt rounds
- Passwords never logged or exposed

### Token Security
- JWT signed with AUTH_SECRET
- 30-day expiration
- Stored in user-only readable file (~/.bragdoc/config.yml with 0600 permissions)

### Session Security
- HTTPOnly cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=Lax (CSRF protection)

## Environment Variables

```env
# Required
AUTH_SECRET=<generate-with-openssl-rand-hex-32>
NEXTAUTH_URL=http://localhost:3000

# OAuth (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

**Generate AUTH_SECRET:**
```bash
openssl rand -hex 32
```

## Type Definitions

### Extended User Type
```typescript
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
```

### JWT Type
```typescript
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
```

## Common Patterns

### Check Auth in Server Component
```typescript
const session = await auth();
if (!session?.user?.id) {
  redirect('/login');
}
```

### Check Auth in API Route
```typescript
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
const session = await auth();
const userId = session?.user?.id;
const userLevel = session?.user?.level;
```

## PostHog Identity Aliasing

### Overview

BragDoc uses a unified cookie-based PostHog identity aliasing approach for all authentication providers (magic links, Google OAuth, GitHub OAuth). This ensures that anonymous browsing events are merged with the authenticated user's identity.

### Implementation

**Flow:**
1. Anonymous user browses site → PostHog sets `ph_anonymous_id` cookie
2. User signs up via ANY provider (magic link, Google, GitHub)
3. NextAuth `createUser` event fires
4. Server reads `ph_anonymous_id` cookie
5. Server calls `aliasUser(userId, anonymousId)`
6. PostHog merges anonymous events with user identity
7. Server deletes `ph_anonymous_id` cookie

**Location:** `apps/web/app/(auth)/auth.ts` - `events.createUser`

**Code:**
```typescript
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
    } catch (error) {
      console.error('Failed to track registration:', error);
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
    }
  }
}
```

**Key Features:**
- Single code path for all providers (no provider-specific logic)
- Cookie-based approach works universally
- Anonymous ID only aliased if it exists and differs from user ID
- Cookie cleanup prevents duplicate aliasing
- Error handling ensures registration never fails due to tracking issues

**PostHog Functions:** `apps/web/lib/posthog-server.ts`

```typescript
export async function aliasUser(userId: string, anonymousId: string) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST}/capture/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event: '$create_alias',
          properties: {
            distinct_id: userId,
            alias: anonymousId,
          },
          timestamp: new Date().toISOString(),
        }),
      }
    );
  } catch (error) {
    console.error('PostHog alias failed:', error);
  }
}
```

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

#### createUser Event Handler

All new user signups (magic link, OAuth) automatically have their `tosAcceptedAt` timestamp set in the `createUser` event handler.

**File:** `apps/web/app/(auth)/auth.ts`

```typescript
events: {
  async createUser({ user }) {
    const { email } = user;

    if (email && user.id) {
      console.log(`Sending welcome email to ${email}`);

      // Track user registration (OAuth providers)
      try {
        captureServerEvent(user.id, 'user_registered', {
          method: user.provider || 'unknown',
          email: email,
          user_id: user.id,
        });

        // Identify user in PostHog
        identifyUser(user.id, {
          email: email,
          name: user.name || email.split('@')[0],
        });

        // Set tosAcceptedAt for all new signups
        await db
          .update(userTable)
          .set({ tosAcceptedAt: new Date() })
          .where(eq(userTable.id, user.id));

        // Track ToS acceptance event
        await captureServerEvent(user.id, 'tos_accepted', {
          method: user.provider || 'credentials',
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Failed to track registration event:', error);
        // Don't fail registration if tracking fails
      }

      // Send welcome email
      await sendWelcomeEmail({ to: email });
    }
  },
}
```

**Key Points:**
- The `createUser` event fires **only for new users**, regardless of signup method (OAuth or email/password)
- This eliminates the need to check if a user is new or existing
- Setting `tosAcceptedAt` happens after PostHog tracking/identification
- Setting `tosAcceptedAt` happens before sending the welcome email
- ToS acceptance is tracked in PostHog with `tos_accepted` event
- Error handling ensures registration never fails due to ToS tracking issues

### Database Field

**Field:** `tosAcceptedAt` on `User` table
- Type: `timestamp('tos_accepted_at')`
- Nullable: Yes (NULL for users who signed up before this feature)
- Set automatically for all new signups (OAuth and email/password)
- Set manually via checkbox acceptance for email/password signups (backup mechanism)

### ToS Text Component

**File:** `apps/web/components/social-auth-buttons.tsx`

```tsx
export function SocialAuthButtons() {
  const marketingSiteHost = process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Divider */}

      {/* ToS acceptance text */}
      <p className="text-sm text-center text-gray-600 dark:text-zinc-400 px-2">
        By continuing with Google or GitHub, you agree to our{' '}
        <Link
          href={`${marketingSiteHost}/terms`}
          className="text-gray-800 dark:text-zinc-200 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href={`${marketingSiteHost}/privacy-policy`}
          className="text-gray-800 dark:text-zinc-200 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </Link>
      </p>

      {/* OAuth buttons */}
    </div>
  );
}
```

### Analytics Tracking

**Event:** `tos_accepted`

**Properties:**
- `method` - OAuth provider (`'google'`, `'github'`) or `'credentials'` for email/password
- `timestamp` - ISO timestamp of acceptance

**Usage:**
```typescript
await captureServerEvent(user.id, 'tos_accepted', {
  method: user.provider || 'credentials',
  timestamp: new Date().toISOString(),
});
```

This event is tracked server-side in the `createUser` event handler, ensuring accurate capture of ToS acceptance.

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

**Future Options:**
If more explicit consent is needed in the future:
- Post-OAuth acceptance page (redirect to ToS page after OAuth callback)
- Modal on first login for existing users
- Email campaign for retroactive acceptance
- ToS version tracking for compliance auditing

### Environment Variables

```env
NEXT_PUBLIC_MARKETING_SITE_HOST=https://www.bragdoc.ai
```

Used for linking to Terms of Service and Privacy Policy on the marketing site.

---

**Last Updated:** 2025-10-24 (OAuth ToS compliance implementation)
**NextAuth Version:** 5.0.0-beta.25
**JWT Expiration:** 30 days (CLI tokens)
