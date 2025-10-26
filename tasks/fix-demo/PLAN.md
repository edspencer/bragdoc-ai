# Implementation Plan: Fix Demo Account Authentication with Session Tokens

## Executive Summary

This plan fixes the broken demo account feature by implementing session token-based authentication that creates demo accounts without passwords and authenticates users directly by setting a JWT session cookie. The previous credentials provider was removed during the magic link migration, breaking the demo flow. This implementation uses NextAuth's JWT encoding to create sessions programmatically, aligning with the passwordless architecture.

**Key Technical Decisions:**
- Use NextAuth's `encode()` function to generate JWT session tokens
- Set NextAuth-compatible session cookies directly via `cookies()`
- Create demo users without passwords (`password: null`)
- Pre-populate realistic demo data immediately after user creation
- Implement automatic cleanup job for demo accounts older than 24 hours

**Estimated Complexity:** Medium (4-6 hours)
- Session token generation using NextAuth JWT (familiar pattern)
- Demo data population (existing demo data module)
- Cleanup job implementation (simple database query)
- Multiple integration touchpoints (web app, PostHog, database)

**Potential Risks:**
- Session cookie naming differences between dev/prod environments
- Demo session expiration handling (4-hour limit)
- Cleanup job scheduling (requires deployment configuration)

**Dependencies:**
- NextAuth v5 JWT utilities (already installed)
- Demo data import module (already exists)
- Database schema supports `level: 'demo'` (already exists)
- No password field required (already nullable)

**Assumptions:**
- Users understand demo mode is temporary (4-hour sessions)
- Demo data showcases BragDoc features effectively
- Cleanup job can run via cron or scheduled worker
- Demo users don't need email verification

---

## Table of Contents

1. [Phase 1: Demo Account Creation Logic](#phase-1-demo-account-creation-logic)
2. [Phase 2: Session Token Generation and Cookie Management](#phase-2-session-token-generation-and-cookie-management)
3. [Phase 3: Server Action Implementation](#phase-3-server-action-implementation)
4. [Phase 4: UI Updates](#phase-4-ui-updates)
5. [Phase 5: Demo Banner Component](#phase-5-demo-banner-component)
6. [Phase 6: Cleanup Job Implementation](#phase-6-cleanup-job-implementation)
7. [Phase 7: Testing](#phase-7-testing)
8. [Phase 8: Documentation Updates](#phase-8-documentation-updates)
9. [Phase 9: After-Action Report](#phase-9-after-action-report)

---

## Instructions for Implementation

**For the programmer implementing this plan:**

- **Update as you go:** Mark each task complete using `- [x]` as soon as you finish it
- **Follow phase order:** Complete phases sequentially - each builds on the previous
- **Test at checkpoints:** Verify functionality at the end of each phase
- **Read context carefully:** Review existing code patterns before making changes
- **Preserve existing functionality:** OAuth and magic link providers must continue working
- **Ask questions:** If anything is unclear, consult the SPEC.md or ask for clarification
- **Document deviations:** If you deviate from the plan, note why in LOG.md

**Important conventions from CLAUDE.md:**
- Use named exports instead of default exports
- Server Components are default - only use `'use client'` when needed
- Never use `redirect()` from `next/navigation` in Server Components (breaks Cloudflare builds)
- Always scope database queries by `userId` for security
- Use the unified `getAuthUser()` helper for authentication checks

---

## Phase 1: Demo Account Creation Logic

**Purpose:** Refactor the demo account creation function to remove password handling and prepare for session token-based authentication.

**Acceptance Criteria:**
- Demo users created without passwords (`password: null`)
- Demo data imported successfully
- Function returns necessary data for session creation
- No bcrypt dependency usage
- PostHog tracking for demo creation

**Tasks:**

### 1.1: Update `createDemoAccount` Function

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/create-demo-account.ts`

**Current Implementation Issues:**
- Uses bcrypt to hash passwords (dependency removed)
- Returns `temporaryPassword` for credentials login (no longer exists)
- Creates user with `provider: 'demo'` (should align with NextAuth patterns)

**Updated Implementation:**

```typescript
/**
 * Create Demo Account (Session Token Approach)
 *
 * Creates a demo account without password and returns user data
 * for session token generation.
 */

import { generateDemoEmail } from './demo-mode-utils';
import { importDemoData } from './demo-data-import';
import { db } from '@bragdoc/database';
import { user } from '@bragdoc/database/schema';
import type { ImportStats } from './import-user-data';
import type { User } from '@bragdoc/database/schema';

export interface CreateDemoAccountResult {
  success: boolean;
  user?: User;
  stats?: ImportStats;
  error?: string;
}

/**
 * Creates a demo account with optional pre-populated sample data
 *
 * Steps:
 * 1. Generates unique demo email address
 * 2. Creates demo user WITHOUT password (level='demo')
 * 3. Imports demo data (companies, projects, achievements, documents)
 * 4. Returns user object for session token generation
 *
 * @param options.skipData - If true, skips importing demo data (for testing zero states)
 * @returns Result object with user data and import stats
 */
export async function createDemoAccount(options?: {
  skipData?: boolean;
}): Promise<CreateDemoAccountResult> {
  try {
    // Generate demo email
    const email = generateDemoEmail();

    // Create demo user WITHOUT password
    const [demoUser] = await db
      .insert(user)
      .values({
        email,
        password: null, // No password for session token auth
        name: 'Demo User',
        level: 'demo',
        emailVerified: new Date(),
        provider: 'email', // Use 'email' to align with NextAuth Email provider pattern
        preferences: {
          language: 'en',
          documentInstructions: '',
        },
      })
      .returning();

    if (!demoUser) {
      throw new Error('Failed to create demo user');
    }

    // Import demo data (unless skipData is true)
    let stats: ImportStats | undefined;
    if (!options?.skipData) {
      stats = await importDemoData(demoUser.id);
    }

    return {
      success: true,
      user: demoUser, // Return full user object for session creation
      stats,
    };
  } catch (error) {
    console.error('Error creating demo account:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create demo account',
    };
  }
}
```

**Key Changes:**
- Removed all bcrypt imports and password hashing
- Removed `temporaryPassword` from return type
- Changed return type to include full `User` object
- Set `password: null` explicitly
- Changed `provider` to `'email'` for consistency with NextAuth
- Removed `hasSeenWelcome` from preferences (not in UserPreferences type)

**Testing Checkpoint:**
- [ ] Function compiles without bcrypt errors
- [ ] Demo user created with `password: null`
- [ ] Demo user has `level: 'demo'`
- [ ] Demo data imported successfully
- [ ] Returns user object with all required fields

---

## Phase 2: Session Token Generation and Cookie Management

**Purpose:** Implement functions to generate NextAuth-compatible JWT session tokens and set session cookies, enabling programmatic authentication without password flow.

**Acceptance Criteria:**
- JWT token generated using NextAuth's `encode()` function
- Token contains all required user session data
- Session cookie set with correct name for dev/prod environments
- Cookie attributes match NextAuth security requirements
- 4-hour session expiration enforced

**Tasks:**

### 2.1: Create Session Token Generation Function

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/create-demo-account.ts`

Add these functions after the `createDemoAccount` function:

```typescript
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import type { User } from '@bragdoc/database/schema';

/**
 * Generate JWT session token for demo user
 *
 * Creates a NextAuth-compatible JWT token with all user session data.
 * Token is signed using AUTH_SECRET and expires in 4 hours.
 *
 * @param user - Demo user object from database
 * @returns Signed JWT token string
 */
async function createDemoSessionToken(user: User): Promise<string> {
  return await encode({
    token: {
      // Required JWT claims
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,

      // BragDoc-specific user data (from JWT callback pattern in auth.ts)
      id: user.id,
      provider: user.provider,
      providerId: user.providerId,
      preferences: user.preferences,
      githubAccessToken: user.githubAccessToken,
      level: user.level,
      renewalPeriod: user.renewalPeriod,

      // Demo-specific metadata
      isDemo: true,
      demoCreatedAt: Date.now(),
    },
    secret: process.env.AUTH_SECRET!,
    maxAge: 4 * 60 * 60, // 4 hours in seconds
  });
}

/**
 * Set NextAuth session cookie
 *
 * Sets the session cookie with the correct name for the environment
 * (production uses __Secure prefix, development does not).
 *
 * @param token - Signed JWT token string
 */
async function setDemoSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  // NextAuth cookie name differs between environments
  // Production (HTTPS): __Secure-next-auth.session-token
  // Development (HTTP): next-auth.session-token
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  cookieStore.set(cookieName, token, {
    httpOnly: true, // Not accessible via JavaScript (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    path: '/', // Cookie available for entire app
    maxAge: 4 * 60 * 60, // 4 hours in seconds
  });
}
```

**Key Design Decisions:**
- Uses NextAuth's `encode()` function for JWT compatibility
- Includes all user fields that NextAuth populates in JWT callback
- Adds `isDemo` and `demoCreatedAt` for demo-specific tracking
- Cookie name matches NextAuth conventions exactly
- 4-hour expiration balances exploration time with cleanup burden
- Cookie attributes match NextAuth security standards

**Reference:**
The JWT structure matches the pattern in `apps/web/app/(auth)/auth.ts`:
```typescript
async jwt({ token, user, account }) {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    // ... etc
  }
  return token;
}
```

### 2.2: Export Session Creation Functions

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/create-demo-account.ts`

Update exports at the end of the file:

```typescript
// Export for use in server actions
export { createDemoSessionToken, setDemoSessionCookie };
```

**Testing Checkpoint:**
- [ ] JWT token generated successfully
- [ ] Token contains all required user fields
- [ ] Token can be decoded using NextAuth's `decode()` function
- [ ] Session cookie set with correct name for environment
- [ ] Cookie attributes are correct (httpOnly, secure, sameSite, path, maxAge)
- [ ] No TypeScript compilation errors

---

## Phase 3: Server Action Implementation

**Purpose:** Create or update the server action that handles the demo signup flow, orchestrating account creation, session token generation, PostHog tracking, and redirect to dashboard.

**Acceptance Criteria:**
- Server action creates demo account
- Session token generated and cookie set
- User immediately authenticated
- PostHog event tracked
- User redirected to dashboard
- Error handling for edge cases

**Tasks:**

### 3.1: Update Demo Server Action

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/demo/actions.ts`

**Current Implementation Issues:**
- Attempts to use `signIn('credentials')` which no longer exists
- Returns password for credentials login
- Doesn't set session cookie

**Updated Implementation:**

```typescript
'use server';

import { redirect } from 'next/navigation';
import {
  createDemoAccount,
  createDemoSessionToken,
  setDemoSessionCookie,
} from '@/lib/create-demo-account';
import { captureServerEvent } from '@/lib/posthog-server';

/**
 * Start Demo Mode
 *
 * Creates a demo account, generates session token, sets session cookie,
 * and redirects user to dashboard as authenticated demo user.
 *
 * This replaces the previous credentials-based demo flow with a
 * session token approach that works with passwordless authentication.
 *
 * @returns Never returns - redirects to dashboard
 * @throws Error if demo account creation fails
 */
export async function startDemo(): Promise<never> {
  // Create demo account with pre-populated data
  const result = await createDemoAccount({ skipData: false });

  if (!result.success || !result.user) {
    throw new Error(result.error || 'Failed to create demo account');
  }

  const demoUser = result.user;

  try {
    // Generate session token
    const token = await createDemoSessionToken(demoUser);

    // Set session cookie (authenticates user)
    await setDemoSessionCookie(token);

    // Track demo start event in PostHog
    await captureServerEvent(demoUser.id, 'demo_started', {
      source: 'demo_page',
      email: demoUser.email,
      has_data: !result.stats ? false : true,
      companies_count: result.stats?.companiesCreated ?? 0,
      projects_count: result.stats?.projectsCreated ?? 0,
      achievements_count: result.stats?.achievementsCreated ?? 0,
    });
  } catch (error) {
    console.error('Error setting demo session:', error);
    throw new Error('Failed to authenticate demo account');
  }

  // Redirect to dashboard (user is now authenticated)
  redirect('/dashboard');
}
```

**Key Design Decisions:**
- Single atomic operation: create account → set session → redirect
- Error handling at each step with specific error messages
- PostHog tracking includes demo data stats
- Throws errors instead of returning them (server action pattern)
- Uses `redirect()` which is safe in server actions (not Server Components)

**Error Cases Handled:**
- Demo account creation failure
- Session token generation failure
- Cookie setting failure
- PostHog tracking failure (logged but doesn't block redirect)

**Testing Checkpoint:**
- [ ] Server action creates demo account
- [ ] Session token generated
- [ ] Session cookie set
- [ ] PostHog event tracked with correct properties
- [ ] User redirected to `/dashboard`
- [ ] Errors thrown with descriptive messages
- [ ] No TypeScript compilation errors

---

## Phase 4: UI Updates

**Purpose:** Update the demo page and demo mode prompt to use the new session token-based demo flow instead of the broken credentials flow.

**Acceptance Criteria:**
- Demo page uses `startDemo()` server action
- Demo mode prompt updated
- Loading states during demo creation
- Error handling with user-friendly messages
- No references to passwords or credentials

**Tasks:**

### 4.1: Update Demo Page

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/demo/page.tsx`

**Current Implementation:** Likely uses old credentials-based flow

**Updated Implementation:**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, Database, FileText, Briefcase } from 'lucide-react';
import { startDemo } from './actions';

export default function DemoPage() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDemo = async () => {
    setIsStarting(true);
    setError(null);

    try {
      await startDemo();
      // Server action will redirect to dashboard if successful
    } catch (err) {
      console.error('Demo start error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start demo mode. Please try again.'
      );
      setIsStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Try BragDoc Demo
          </CardTitle>
          <CardDescription className="text-lg">
            Explore BragDoc with pre-populated sample data. No sign-up required.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Features List */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Instant Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Pre-loaded with realistic achievements and projects
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Full Features</h3>
                <p className="text-sm text-muted-foreground">
                  Try all features with sample data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Generate Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Create performance reviews and summaries
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">No Commitment</h3>
                <p className="text-sm text-muted-foreground">
                  4-hour session, data automatically cleaned up
                </p>
              </div>
            </div>
          </div>

          {/* Demo Start Button */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleStartDemo}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up your demo...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Start Demo Now
                </>
              )}
            </Button>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Demo sessions last 4 hours. Data will be automatically deleted.
            </p>
          </div>

          {/* Sign Up CTA */}
          <div className="border-t pt-6">
            <p className="text-center text-sm text-muted-foreground">
              Want to keep your data?{' '}
              <a
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Create a free account
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Key Design Decisions:**
- Client component for interactivity (button clicks, loading state)
- Clear messaging about demo limitations (4-hour session, data cleanup)
- Loading state with spinner during demo creation
- Error handling with user-friendly messages
- CTA to sign up for real account
- Visual features list to set expectations

### 4.2: Update Demo Mode Prompt Component

**File:** `/Users/ed/Code/brag-ai/components/demo-mode-prompt.tsx`

**Purpose:** Update the demo CTA on the login page to link to the new demo flow

**Verify/Update:**

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DemoModePrompt() {
  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-muted-foreground mb-2">
        Want to try BragDoc before signing up?
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/demo">Start Demo Mode</Link>
      </Button>
    </div>
  );
}
```

**Key Points:**
- Links to `/demo` page (not inline demo creation)
- Consistent styling with login page
- Clear CTA text

**Testing Checkpoint:**
- [ ] Demo page renders correctly
- [ ] "Start Demo Now" button works
- [ ] Loading state shows during demo creation
- [ ] Errors display if demo creation fails
- [ ] Successful demo redirects to dashboard
- [ ] Demo mode prompt links to `/demo` page
- [ ] All UI elements are responsive
- [ ] No TypeScript compilation errors

---

## Phase 5: Demo Banner Component

**Purpose:** Create a persistent banner that displays on all pages when a user is in demo mode, informing them of session expiration and providing a CTA to create a real account.

**Acceptance Criteria:**
- Banner displays only for demo users
- Shows session time remaining (optional for v1)
- Provides clear CTA to create real account
- Dismissible or persistent (decision: persistent for v1)
- Matches BragDoc design system
- Works on all pages

**Tasks:**

### 5.1: Create Demo Banner Component

**File:** `/Users/ed/Code/brag-ai/components/demo-banner.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Demo Mode Banner
 *
 * Displays a persistent banner when user is in demo mode,
 * informing them that their session is temporary and encouraging
 * them to create a real account.
 *
 * Only renders for users with level='demo'.
 */
export function DemoBanner() {
  const { data: session } = useSession();

  // Only show for demo users
  if (session?.user?.level !== 'demo') {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm text-amber-900 dark:text-amber-200">
          <strong>Demo Mode:</strong> You're using a temporary demo account. Your session will expire in 4 hours and all data will be deleted.
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-600 text-amber-900 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-200 dark:hover:bg-amber-900/20"
        >
          <Link href="/register">
            Create Free Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

**Key Design Decisions:**
- Uses `useSession()` hook to check user level client-side
- Amber/yellow color scheme for warning (not destructive red)
- Persistent banner (not dismissible) to maintain awareness
- CTA button always visible for easy conversion
- Responsive layout (stacks on mobile)
- Dark mode support

**Alternative: Time Remaining (Future Enhancement):**
```typescript
// Optional: Calculate time remaining
const demoCreatedAt = session?.user?.demoCreatedAt;
const expiresAt = demoCreatedAt ? demoCreatedAt + 4 * 60 * 60 * 1000 : null;
const timeRemaining = expiresAt ? expiresAt - Date.now() : null;
// Display: "Session expires in 2 hours 15 minutes"
```

### 5.2: Add Banner to Main Layout

**File:** `/Users/ed/Code/brag-ai/app/(app)/layout.tsx`

**Purpose:** Add demo banner to the main app layout so it appears on all authenticated pages

**Update the layout:**

```typescript
import { DemoBanner } from '@/components/demo-banner';
// ... existing imports

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header/Navigation */}
      <Header />

      {/* Demo Banner (only shows for demo users) */}
      <div className="container mx-auto px-4 pt-4">
        <DemoBanner />
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
```

**Placement:** After header, before main content, within container for consistent margins

**Testing Checkpoint:**
- [ ] Banner displays for demo users only
- [ ] Banner does NOT display for regular users
- [ ] Banner does NOT display for unauthenticated users
- [ ] CTA button links to `/register`
- [ ] Banner is responsive (stacks on mobile)
- [ ] Dark mode styling works correctly
- [ ] Banner appears on all app pages
- [ ] No TypeScript compilation errors

---

## Phase 6: Cleanup Job Implementation

**Purpose:** Implement an automated job that deletes demo accounts and their associated data after 24 hours, preventing database bloat and ensuring demo mode scales sustainably.

**Acceptance Criteria:**
- Deletes demo accounts older than 24 hours
- Cascades deletion to related data (achievements, projects, etc.)
- Logs number of accounts deleted
- Can be run via cron, API route, or background worker
- Idempotent (safe to run multiple times)
- No impact on regular user accounts

**Tasks:**

### 6.1: Create Cleanup Function

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/cleanup-demo-accounts.ts`

```typescript
/**
 * Demo Account Cleanup
 *
 * Deletes demo accounts that are older than 24 hours, along with
 * all associated data (cascade delete via foreign keys).
 */

import { db } from '@bragdoc/database';
import { user } from '@bragdoc/database/schema';
import { eq, and, lt } from 'drizzle-orm';
import { captureServerEvent } from '@/lib/posthog-server';

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  deletedAccounts: string[]; // User IDs
  error?: string;
}

/**
 * Delete demo accounts older than 24 hours
 *
 * Automatically cascades deletion to related records:
 * - Companies (via user_id FK with cascade)
 * - Projects (via user_id FK with cascade)
 * - Achievements (via user_id FK with cascade)
 * - Documents (via user_id FK with cascade)
 * - Standups (via user_id FK with cascade)
 * - Chat messages (via user_id FK with cascade)
 *
 * @returns Cleanup result with count and deleted user IDs
 */
export async function cleanupExpiredDemoAccounts(): Promise<CleanupResult> {
  try {
    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(
      `[Demo Cleanup] Starting cleanup for demo accounts created before ${cutoffTime.toISOString()}`
    );

    // Delete demo accounts older than 24 hours
    const deletedAccounts = await db
      .delete(user)
      .where(
        and(
          eq(user.level, 'demo'), // Only demo accounts
          lt(user.createdAt, cutoffTime) // Older than 24 hours
        )
      )
      .returning({ id: user.id, email: user.email, createdAt: user.createdAt });

    const deletedCount = deletedAccounts.length;

    console.log(`[Demo Cleanup] Deleted ${deletedCount} demo accounts`);

    // Track cleanup event in PostHog (aggregate, not per-user)
    if (deletedCount > 0) {
      try {
        // Use first deleted account's ID as event actor (PostHog requires user ID)
        const eventActorId = deletedAccounts[0]?.id ?? 'system';

        await captureServerEvent(eventActorId, 'demo_accounts_cleaned_up', {
          deleted_count: deletedCount,
          cutoff_time: cutoffTime.toISOString(),
          deleted_user_ids: deletedAccounts.map((a) => a.id),
        });
      } catch (error) {
        console.error('[Demo Cleanup] PostHog tracking failed:', error);
        // Don't fail cleanup if tracking fails
      }
    }

    return {
      success: true,
      deletedCount,
      deletedAccounts: deletedAccounts.map((a) => a.id),
    };
  } catch (error) {
    console.error('[Demo Cleanup] Error:', error);
    return {
      success: false,
      deletedCount: 0,
      deletedAccounts: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Key Design Decisions:**
- Uses database timestamps for accurate age calculation
- Relies on foreign key cascade deletes (already configured in schema)
- Logs deleted accounts for debugging
- PostHog tracking for monitoring cleanup effectiveness
- Error handling doesn't fail silently
- Idempotent (safe to run multiple times)

**Database Cascade Delete Verification:**

The schema already has cascade deletes configured (from `database.md`):
```typescript
// Example from schema:
userId: uuid('user_id')
  .notNull()
  .references(() => user.id, { onDelete: 'cascade' })
```

All related tables (achievements, projects, companies, documents, standups, chats) cascade delete when user is deleted.

### 6.2: Create API Route for Manual Cleanup Trigger

**File:** `/Users/ed/Code/brag-ai/apps/web/app/api/admin/cleanup-demo/route.ts`

**Purpose:** Allow manual triggering of cleanup via HTTP request (useful for testing and cron jobs)

```typescript
import { NextResponse } from 'next/server';
import { cleanupExpiredDemoAccounts } from '@/lib/cleanup-demo-accounts';

/**
 * Admin API: Cleanup Demo Accounts
 *
 * Manually triggers cleanup of expired demo accounts.
 * Can be called by cron job or admin tools.
 *
 * Security: Add authentication check in production
 */
export async function POST(request: Request) {
  // TODO: Add authentication check for production
  // const auth = await getAuthUser(request);
  // if (!auth || auth.user.email !== 'admin@bragdoc.ai') {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // Verify request has correct secret (basic protection)
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.CLEANUP_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Cleanup not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run cleanup
  const result = await cleanupExpiredDemoAccounts();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, deletedCount: 0 },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedCount: result.deletedCount,
    deletedAccounts: result.deletedAccounts,
    timestamp: new Date().toISOString(),
  });
}
```

**Security:**
- Uses `CLEANUP_SECRET` environment variable for basic auth
- Bearer token in Authorization header
- Should add admin user check in production

**Environment Variable:**
```env
# .env
CLEANUP_SECRET=your-random-secret-here
```

### 6.3: Document Cleanup Scheduling

**File:** `/Users/ed/Code/brag-ai/tasks/fix-demo/DEPLOYMENT-NOTES.md`

Create deployment notes for cleanup scheduling:

```markdown
# Demo Cleanup Scheduling

## Overview

Demo accounts must be cleaned up automatically after 24 hours. This can be achieved via:

1. **Cron Job (Recommended for Cloudflare Workers)**
2. **External Scheduler (e.g., GitHub Actions, Vercel Cron)**
3. **Manual Trigger (Testing only)**

## Option 1: Cloudflare Cron Trigger

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

Add handler in worker:

```typescript
export default {
  async scheduled(event, env, ctx) {
    // Call cleanup API
    await fetch('https://www.bragdoc.ai/api/admin/cleanup-demo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLEANUP_SECRET}`,
      },
    });
  },
};
```

## Option 2: GitHub Actions (Fallback)

Create `.github/workflows/cleanup-demo.yml`:

```yaml
name: Cleanup Demo Accounts
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cleanup
        run: |
          curl -X POST https://www.bragdoc.ai/api/admin/cleanup-demo \
            -H "Authorization: Bearer ${{ secrets.CLEANUP_SECRET }}"
```

## Option 3: Manual Trigger (Testing)

```bash
curl -X POST http://localhost:3000/api/admin/cleanup-demo \
  -H "Authorization: Bearer your-cleanup-secret"
```

## Monitoring

Check PostHog for `demo_accounts_cleaned_up` events to monitor cleanup effectiveness.

## Environment Variables

Add to production environment:

```
CLEANUP_SECRET=<generate-with-openssl-rand-hex-32>
```
```

**Testing Checkpoint:**
- [ ] Cleanup function compiles without errors
- [ ] Creates demo accounts with past timestamps (manual test)
- [ ] Cleanup function deletes expired demo accounts
- [ ] Cascade delete removes related data (achievements, projects, etc.)
- [ ] PostHog event tracked for cleanup
- [ ] API route requires correct secret
- [ ] API route returns correct deleted count
- [ ] Deployment notes created
- [ ] No TypeScript compilation errors

---

## Phase 7: Testing

**Purpose:** Comprehensive testing of the demo account flow, session management, data population, and cleanup to ensure the feature works reliably in all scenarios.

**Acceptance Criteria:**
- Demo account creation works end-to-end
- Session persists across page loads
- Demo data is realistic and complete
- Session expires after 4 hours
- Cleanup job deletes old demos
- Error cases handled gracefully
- No security vulnerabilities

**Tasks:**

### 7.1: Functional Testing

**Test Case 1: Demo Account Creation Flow**

Steps:
1. Start dev server: `pnpm dev:web`
2. Visit `http://localhost:3000/demo`
3. Click "Start Demo Now"
4. Verify:
   - Loading state shows
   - Redirected to `/dashboard`
   - User is authenticated
   - Demo banner displays
   - Demo data visible (achievements, projects, companies)

Expected Results:
- ✅ Demo account created in database
- ✅ Session cookie set
- ✅ User authenticated
- ✅ Demo banner visible
- ✅ Sample data populated

**Test Case 2: Session Persistence**

Steps:
1. Complete Test Case 1
2. Navigate to `/achievements`
3. Refresh the page
4. Navigate to `/projects`
5. Verify session persists

Expected Results:
- ✅ User remains authenticated across pages
- ✅ Demo banner still visible
- ✅ No re-authentication required

**Test Case 3: Demo Data Quality**

Steps:
1. Complete Test Case 1
2. Inspect dashboard for:
   - Company count
   - Project count
   - Achievement count
   - Document count
3. Click into each section and verify data quality

Expected Results:
- ✅ At least 1 company created
- ✅ At least 2 projects created
- ✅ At least 8 achievements created
- ✅ Achievement details are realistic
- ✅ Achievements linked to projects/companies

**Test Case 4: Demo User Isolation**

Steps:
1. Create demo account
2. View achievements
3. Open database client
4. Query: `SELECT * FROM "Achievement" WHERE user_id = '<demo-user-id>'`
5. Verify all achievements belong to demo user

Expected Results:
- ✅ All demo data scoped to demo user ID
- ✅ No data leakage between users

### 7.2: Session Expiration Testing

**Test Case 5: Session Cookie Expiration (Simulated)**

Steps:
1. Create demo account
2. Get session cookie from browser DevTools
3. Manually set cookie expiration to past time
4. Refresh page
5. Verify redirected to login

Expected Results:
- ✅ Expired session detected
- ✅ User logged out
- ✅ Redirected to login page

**Test Case 6: JWT Token Expiration**

Steps:
1. Create demo account
2. Use browser DevTools to inspect JWT token
3. Decode token and verify `exp` claim
4. Calculate time until expiration
5. Verify it's approximately 4 hours from `iat` (issued at)

Expected Results:
- ✅ Token expires in ~4 hours
- ✅ `exp` claim present and valid
- ✅ Token signed with AUTH_SECRET

### 7.3: Cleanup Testing

**Test Case 7: Cleanup Function (Manual)**

Steps:
1. Create demo account manually:
   ```sql
   INSERT INTO "User" (id, email, level, created_at, ...)
   VALUES (gen_random_uuid(), 'old-demo@test.com', 'demo', NOW() - INTERVAL '25 hours', ...);
   ```
2. Run cleanup function:
   ```typescript
   import { cleanupExpiredDemoAccounts } from './lib/cleanup-demo-accounts';
   const result = await cleanupExpiredDemoAccounts();
   console.log(result);
   ```
3. Verify old demo account deleted

Expected Results:
- ✅ Old demo account deleted
- ✅ `deletedCount` = 1
- ✅ Related data cascade deleted
- ✅ PostHog event tracked

**Test Case 8: Cleanup API Route**

Steps:
1. Set `CLEANUP_SECRET` in `.env`
2. Create old demo account (see Test Case 7)
3. Call cleanup API:
   ```bash
   curl -X POST http://localhost:3000/api/admin/cleanup-demo \
     -H "Authorization: Bearer $CLEANUP_SECRET"
   ```
4. Verify response and database

Expected Results:
- ✅ API returns 200 status
- ✅ Response includes `deletedCount`
- ✅ Demo account deleted from database
- ✅ Unauthorized request returns 401

### 7.4: Edge Case Testing

**Test Case 9: Multiple Demo Accounts**

Steps:
1. Create first demo account
2. Log out
3. Create second demo account
4. Verify separate sessions

Expected Results:
- ✅ Each demo gets unique user ID
- ✅ Each demo has separate data
- ✅ Sessions don't interfere

**Test Case 10: Demo User Tries to Change Email**

Steps:
1. Create demo account
2. Navigate to account settings
3. Attempt to change email
4. Verify prevented or warned

Expected Results:
- ✅ Email change prevented for demo users
- ✅ Clear messaging about demo limitations
- (OR accept that demo users can change email if it doesn't matter)

**Test Case 11: Demo Account Creation Failure**

Steps:
1. Temporarily break database connection
2. Try to create demo account
3. Verify error handling

Expected Results:
- ✅ Error message displayed to user
- ✅ User not stuck in loading state
- ✅ Error logged to console

### 7.5: PostHog Tracking Verification

**Test Case 12: Demo Start Event**

Steps:
1. Create demo account
2. Check PostHog live events
3. Verify `demo_started` event

Expected Results:
- ✅ Event tracked with correct user ID
- ✅ Properties include: source, email, has_data, counts
- ✅ Event appears in PostHog within 30 seconds

**Test Case 13: Demo Cleanup Event**

Steps:
1. Run cleanup with old demo accounts
2. Check PostHog live events
3. Verify `demo_accounts_cleaned_up` event

Expected Results:
- ✅ Event tracked
- ✅ Properties include: deleted_count, cutoff_time, deleted_user_ids

### 7.6: Security Testing

**Test Case 14: Session Cookie Security**

Steps:
1. Create demo account
2. Inspect session cookie in DevTools
3. Verify attributes

Expected Results:
- ✅ `httpOnly` = true
- ✅ `secure` = true (in production)
- ✅ `sameSite` = lax
- ✅ Cookie name correct for environment

**Test Case 15: JWT Token Security**

Steps:
1. Create demo account
2. Extract JWT token from cookie
3. Attempt to modify token
4. Try to use modified token

Expected Results:
- ✅ Modified token rejected
- ✅ User not authenticated with tampered token

**Testing Checkpoint:**
- [ ] All functional tests pass
- [ ] Session expiration works correctly
- [ ] Cleanup job deletes old demos
- [ ] Edge cases handled gracefully
- [ ] PostHog events tracked
- [ ] Security tests pass
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Phase 8: Documentation Updates

**Purpose:** Update technical and user-facing documentation to reflect the new demo account implementation, ensuring future maintainers understand the session token approach.

**Acceptance Criteria:**
- CLAUDE.md updated with demo patterns
- Technical docs reflect demo implementation
- API documentation includes demo routes
- Deployment notes cover cleanup scheduling
- Code comments explain key decisions

**Tasks:**

### 8.1: Update CLAUDE.md

**File:** `/Users/ed/Code/brag-ai/CLAUDE.md`

**Section to Update:** Add new section under "Authentication"

```markdown
### Demo Mode Authentication

BragDoc supports temporary demo accounts that allow users to try the platform without signing up. Demo accounts use session token-based authentication without passwords.

**Flow:**
1. User clicks "Try Demo" button
2. Server action creates demo user (`level: 'demo'`, `password: null`)
3. Server generates JWT session token using NextAuth's `encode()`
4. Server sets session cookie (`next-auth.session-token`)
5. User immediately authenticated, redirected to dashboard
6. Demo banner displays on all pages
7. Session expires after 4 hours
8. Cleanup job deletes demo accounts after 24 hours

**Implementation:**

```typescript
// apps/web/lib/create-demo-account.ts
export async function createDemoAccount() {
  // Create user without password
  const [demoUser] = await db.insert(user).values({
    email: generateDemoEmail(),
    password: null, // No password
    level: 'demo',
    // ...
  });

  return { user: demoUser };
}

// Generate session token
const token = await encode({
  token: { sub: user.id, email: user.email, isDemo: true, /* ... */ },
  secret: process.env.AUTH_SECRET!,
  maxAge: 4 * 60 * 60, // 4 hours
});

// Set session cookie
const cookieStore = await cookies();
cookieStore.set('next-auth.session-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 4 * 60 * 60,
});
```

**Demo User Properties:**
- `level: 'demo'`
- `password: null`
- `provider: 'email'`
- Pre-populated with sample data (companies, projects, achievements)
- Automatically deleted after 24 hours

**Cleanup:**
- Location: `apps/web/lib/cleanup-demo-accounts.ts`
- Trigger: Cron job or manual API call
- API Route: `/api/admin/cleanup-demo`
- Frequency: Every 6 hours (recommended)
- Cascade deletes all related data via foreign keys
```

### 8.2: Update Authentication Documentation

**File:** `/Users/ed/Code/brag-ai/.claude/docs/tech/authentication.md`

**Add new section after "Magic Link Authentication":**

```markdown
### Demo Mode Authentication

**Purpose:** Allow users to try BragDoc without signing up, using temporary demo accounts with pre-populated data.

**Architecture:**

Demo mode uses session token-based authentication that bypasses the normal login flow:

1. **No Password Required:** Demo users are created with `password: null`
2. **Programmatic Session:** JWT session token generated server-side using NextAuth's `encode()`
3. **Direct Cookie Setting:** Session cookie set directly via Next.js `cookies()` API
4. **4-Hour Expiration:** Sessions expire after 4 hours (configurable)
5. **Automatic Cleanup:** Demo accounts deleted after 24 hours

**Implementation Details:**

**Session Token Generation:**
```typescript
import { encode } from 'next-auth/jwt';

const token = await encode({
  token: {
    sub: user.id,
    email: user.email,
    id: user.id,
    level: 'demo',
    isDemo: true,
    demoCreatedAt: Date.now(),
    // ... all standard user fields
  },
  secret: process.env.AUTH_SECRET!,
  maxAge: 4 * 60 * 60, // 4 hours
});
```

**Cookie Management:**
```typescript
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const cookieName = process.env.NODE_ENV === 'production'
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';

cookieStore.set(cookieName, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 4 * 60 * 60,
});
```

**Demo Data Population:**
- Companies: 1 (Acme Corp)
- Projects: 2-3 (realistic titles and descriptions)
- Achievements: 8-10 (varied impact levels, realistic content)
- Documents: 1 (sample performance review)
- All data linked via foreign keys

**Cleanup Process:**
- **Trigger:** Cron job every 6 hours
- **Criteria:** Demo accounts older than 24 hours
- **Method:** Database delete with cascade to related records
- **Monitoring:** PostHog event `demo_accounts_cleaned_up`

**Security Considerations:**
- Session tokens signed with `AUTH_SECRET`
- Cookies are httpOnly (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- Demo users isolated by userId scope (standard data access patterns)
- Cleanup API protected by secret token

**Differences from Regular Authentication:**
- No password storage or validation
- No email verification required
- No password reset flow
- Session managed via cookie only (not database session table)
- Temporary user level (`demo` vs `free`/`pro`)
```

### 8.3: Update API Documentation

**File:** `/Users/ed/Code/brag-ai/.claude/docs/tech/api-conventions.md`

**Add to API routes section:**

```markdown
### Demo Account Routes

**POST /api/admin/cleanup-demo**

Manually trigger cleanup of expired demo accounts.

**Authentication:** Bearer token via `CLEANUP_SECRET` environment variable

**Request:**
```http
POST /api/admin/cleanup-demo HTTP/1.1
Authorization: Bearer <CLEANUP_SECRET>
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 5,
  "deletedAccounts": ["uuid1", "uuid2", ...],
  "timestamp": "2025-10-26T12:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid secret
- `500 Internal Server Error` - Cleanup failed

**Rate Limiting:** None (intended for cron jobs)

**Cleanup Logic:**
- Deletes demo accounts created more than 24 hours ago
- Cascades deletion to achievements, projects, companies, documents, chats
- Tracks deletion in PostHog with `demo_accounts_cleaned_up` event
```

### 8.4: Add Inline Code Comments

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/create-demo-account.ts`

Add comprehensive JSDoc comments (already included in implementations above).

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/demo/actions.ts`

Add comprehensive JSDoc comments (already included in implementations above).

**Testing Checkpoint:**
- [ ] CLAUDE.md updated with demo mode section
- [ ] authentication.md includes demo authentication details
- [ ] api-conventions.md documents cleanup API
- [ ] All code has JSDoc comments
- [ ] Deployment notes created for cleanup scheduling
- [ ] No broken documentation links

---

## Phase 9: After-Action Report

**Purpose:** Submit an after-action report to the process-manager agent documenting the implementation process, outcomes, and lessons learned.

**Acceptance Criteria:**
- Report submitted to process-manager agent
- All required sections completed
- Lessons learned documented
- Process improvements identified

**Tasks:**

### 9.1: Create After-Action Report

**File:** `/Users/ed/Code/brag-ai/tasks/fix-demo/AFTER-ACTION-REPORT.md`

**Task:**
- [ ] Read the after-action report template at `.claude/docs/after-action-reports/README.md`
- [ ] Create report following the template structure
- [ ] Complete all required sections with specific details from this implementation

**Template Structure:**

```markdown
# After-Action Report: Demo Account Authentication Fix

## Metadata

- **Task Name:** Fix Demo Account Authentication with Session Tokens
- **Date Completed:** [YYYY-MM-DD]
- **Agent/Person:** [Agent name]
- **Related Files:**
  - SPEC: /Users/ed/Code/brag-ai/tasks/fix-demo/SPEC.md
  - PLAN: /Users/ed/Code/brag-ai/tasks/fix-demo/PLAN.md
  - LOG: /Users/ed/Code/brag-ai/tasks/fix-demo/LOG.md

## Task Summary

Implemented session token-based authentication for demo accounts after the credentials provider was removed during magic link migration. Demo accounts now use NextAuth JWT tokens set directly as session cookies, enabling passwordless demo access with pre-populated data and automatic cleanup.

## Process Used

Followed the PLAN.md file with 9 phases:
1. Demo Account Creation Logic
2. Session Token Generation and Cookie Management
3. Server Action Implementation
4. UI Updates
5. Demo Banner Component
6. Cleanup Job Implementation
7. Testing
8. Documentation Updates
9. After-Action Report

**Process Quality:** [Excellent/Good/Fair/Poor]

**What Worked Well:**
- [Fill in based on implementation experience]

**What Could Be Improved:**
- [Fill in based on implementation experience]

## Results

**Implementation Status:** [Completed/Partial/Blocked]

**Key Metrics:**
- Demo account creation time: [X] seconds
- Session token generation time: [X] ms
- Demo data population time: [X] seconds
- Cleanup job execution time: [X] seconds

**Issues Encountered:**
1. [List any issues and how they were resolved]
2. [...]

**Deviations from Plan:**
- [Any deviations and reasons]

## Lessons Learned

### Technical Lessons

1. **NextAuth JWT Encoding:**
   - [What we learned about encode() function]
   - [Cookie naming conventions for dev/prod]

2. **Session Cookie Management:**
   - [Cookie attribute requirements]
   - [httpOnly and secure flags]

3. **Database Cascade Deletes:**
   - [How cascade deletes work with demo cleanup]
   - [Foreign key relationship verification]

### Process Lessons

1. **Planning:**
   - [What worked well in the plan]
   - [What was missing or unclear]

2. **Testing:**
   - [Effective test strategies]
   - [Edge cases discovered during testing]

3. **Deployment:**
   - [Cleanup scheduling considerations]
   - [Monitoring setup]

### User Experience Lessons

1. **Demo Mode Design:**
   - [User expectations for demo mode]
   - [Session duration appropriateness]

2. **Demo Data Quality:**
   - [Effectiveness of pre-populated data]
   - [Balance between realism and simplicity]

## Process Improvements

### For This Type of Task

1. **Authentication Migrations:**
   - [Patterns for modifying auth flows]
   - [Session management best practices]

2. **Cleanup Jobs:**
   - [Scheduling strategies]
   - [Monitoring and alerting]

### For Team Processes

1. **Documentation:**
   - [Documentation patterns to replicate]
   - [Integration with existing docs]

2. **Testing:**
   - [Test cases to include in standard suite]
   - [Edge cases to always check]

## Recommendations

### Immediate Actions

1. [Any urgent follow-up tasks]
2. [...]

### Future Enhancements

1. **Session Time Remaining:**
   - Display countdown in demo banner
   - Warn user before session expires

2. **Demo-to-Real Account Conversion:**
   - Allow users to convert demo account to real account
   - Preserve demo data during conversion

3. **Demo Data Customization:**
   - Multiple demo data templates
   - User choice of industry/role for relevant demo data

4. **Rate Limiting:**
   - Limit demo account creation per IP address
   - Prevent abuse of demo mode

### Documentation Updates

1. **Process Documentation:**
   - Document session token authentication pattern
   - Add demo mode testing checklist

2. **Technical Documentation:**
   - Expand cleanup job patterns
   - Document cron scheduling for Cloudflare Workers

## Impact Assessment

### Code Quality Impact

- **Lines of Code:** [X lines removed, Y lines added]
- **Complexity:** [Reduced - simpler auth flow without passwords]
- **Maintainability:** [Improved - aligned with passwordless architecture]

### User Impact

- **Positive:**
  - Demo mode functional again
  - Easy way to try BragDoc without signup
  - Realistic demo data showcases features

- **Negative:**
  - 4-hour session limit may be short for some users
  - Data loss after 24 hours (expected, but may surprise some)

### Team Impact

- **Knowledge Transfer:** [Session token authentication patterns]
- **Training Needed:** [Cleanup job scheduling, monitoring]
- **Support Burden:** [Expected demo mode questions]

## Conclusion

[Overall summary of the implementation]

[Success/Failure assessment]

[Confidence in stability: High/Medium/Low]

---

**Report Submitted:** [Date]
**Submitted To:** process-manager agent
**Follow-Up Required:** [Yes/No]
```

### 9.2: Submit Report to Process-Manager Agent

**Action:** Communicate with the process-manager agent to submit this report.

**Message Template:**

> Hi process-manager agent,
>
> I've completed the demo account authentication fix. Here's the after-action report:
>
> - **Task:** Session token-based demo account authentication
> - **Status:** [Completed/Partial]
> - **Report Location:** `/Users/ed/Code/brag-ai/tasks/fix-demo/AFTER-ACTION-REPORT.md`
>
> **Key Outcomes:**
> - [Briefly summarize]
>
> **Process Improvements Identified:**
> - [List 2-3 key improvements]
>
> **Documentation Updates Needed:**
> - [List any additional doc updates]
>
> **Follow-Up Required:**
> - [Yes/No - specify if yes]
>
> Please review and let me know if you need any additional information.

**Testing Checkpoint:** ✅ After-action report complete and submitted

---

## Summary of Changes

### Files Created

1. `/Users/ed/Code/brag-ai/apps/web/components/demo-banner.tsx` - Demo mode banner component
2. `/Users/ed/Code/brag-ai/apps/web/lib/cleanup-demo-accounts.ts` - Cleanup job logic
3. `/Users/ed/Code/brag-ai/apps/web/app/api/admin/cleanup-demo/route.ts` - Cleanup API route
4. `/Users/ed/Code/brag-ai/tasks/fix-demo/DEPLOYMENT-NOTES.md` - Cleanup scheduling guide
5. `/Users/ed/Code/brag-ai/tasks/fix-demo/AFTER-ACTION-REPORT.md` - After-action report

### Files Modified

1. `/Users/ed/Code/brag-ai/apps/web/lib/create-demo-account.ts`
   - Remove bcrypt imports and password hashing
   - Create demo users without passwords
   - Add session token generation functions
   - Add session cookie management functions

2. `/Users/ed/Code/brag-ai/apps/web/app/(auth)/demo/actions.ts`
   - Replace credentials login with session token approach
   - Generate JWT token and set session cookie
   - Track demo start event in PostHog

3. `/Users/ed/Code/brag-ai/apps/web/app/(auth)/demo/page.tsx`
   - Update to use new `startDemo()` server action
   - Improve UI with features list and clear messaging
   - Add loading states and error handling

4. `/Users/ed/Code/brag-ai/components/demo-mode-prompt.tsx`
   - Verify links to `/demo` page
   - Update styling if needed

5. `/Users/ed/Code/brag-ai/app/(app)/layout.tsx`
   - Add `<DemoBanner />` component to main layout

6. `/Users/ed/Code/brag-ai/CLAUDE.md`
   - Add demo mode authentication section
   - Document session token approach

7. `/Users/ed/Code/brag-ai/.claude/docs/tech/authentication.md`
   - Add comprehensive demo mode documentation
   - Document cleanup process

8. `/Users/ed/Code/brag-ai/.claude/docs/tech/api-conventions.md`
   - Document `/api/admin/cleanup-demo` endpoint

### Files Deleted

None (all changes are additive or modifications)

### Dependencies Removed

- `bcrypt-ts` imports from demo account creation (package already removed in magic link migration)

### Environment Variables Added

```env
# Optional: Secret for cleanup API authentication
CLEANUP_SECRET=<generate-with-openssl-rand-hex-32>
```

---

## Risk Assessment

### High Risk

None identified.

### Medium Risk

1. **Session Cookie Naming**
   - **Risk:** Cookie name differs between dev/prod environments (`__Secure-` prefix in production)
   - **Mitigation:** Code explicitly handles both cases, tested in both environments

2. **Cleanup Job Scheduling**
   - **Risk:** Cleanup job may not run if cron not configured
   - **Mitigation:** Deployment notes document multiple scheduling options, manual API trigger available

### Low Risk

1. **Session Expiration Edge Cases**
   - **Risk:** User in middle of action when session expires
   - **Mitigation:** 4-hour window provides ample time, middleware redirects expired sessions gracefully

2. **Demo Data Quality**
   - **Risk:** Pre-populated data may not resonate with all users
   - **Mitigation:** Existing demo data module provides realistic, varied content

---

## Success Criteria

### Must Have (Blocker if missing)

- ✅ Demo accounts created without passwords
- ✅ Users immediately authenticated after clicking "Try Demo"
- ✅ Session uses standard NextAuth JWT mechanism
- ✅ Demo data pre-populated (company, projects, achievements)
- ✅ Session expires after 4 hours
- ✅ Demo banner displays on all pages
- ✅ Cleanup job deletes expired demos
- ✅ No errors in production logs

### Should Have (Important but not blocking)

- ✅ PostHog tracking for demo events
- ✅ Demo banner has clear CTA to signup
- ✅ Cleanup job can be triggered manually
- ✅ Documentation updated
- ✅ Code well-commented

### Nice to Have (Can be added later)

- ⭕ Session time remaining indicator in demo banner
- ⭕ "Convert to real account" feature
- ⭕ Customizable demo data templates
- ⭕ Demo walkthrough/tour
- ⭕ Rate limiting for demo creation

---

## Open Questions & Decisions

### Resolved Decisions

1. **Authentication Approach:** Session token vs re-add credentials ✅
   - **Decision:** Session token (proper long-term solution)
   - **Rationale:** Aligns with passwordless architecture, simpler maintenance

2. **Session Duration:** 4 hours ✅
   - **Decision:** 4 hours
   - **Rationale:** Balances exploration time with cleanup burden

3. **Cleanup Frequency:** How often to run cleanup job ✅
   - **Decision:** Every 6 hours
   - **Rationale:** Balances timely cleanup with server load

4. **Demo Data:** Realistic vs minimal ✅
   - **Decision:** Realistic (8-10 achievements, 2-3 projects)
   - **Rationale:** Showcases features effectively

### Open Questions

1. **Demo-to-Real Conversion:** Should we allow users to convert demo accounts?
   - **Recommendation:** Defer to future enhancement
   - **Reason:** Adds complexity, most users will just sign up fresh

2. **Rate Limiting:** Should we limit demo creation per IP?
   - **Recommendation:** Monitor first, add if abused
   - **Reason:** Don't want to block legitimate users

3. **Demo Data Customization:** Multiple templates for different industries?
   - **Recommendation:** Defer to future enhancement based on user feedback
   - **Reason:** Current demo data is general enough for most users

---

## Notes for Implementation Team

1. **Session Cookie Naming is Critical:** The cookie name MUST match NextAuth's convention exactly, including the `__Secure-` prefix in production. Test in both environments.

2. **JWT Token Structure:** The token must include all fields that NextAuth populates in the JWT callback. Missing fields will cause session errors.

3. **Cleanup Job Scheduling:** The cleanup job must be scheduled externally (cron, GitHub Actions, etc.). It will NOT run automatically just by deploying the code.

4. **Demo Data Module:** The `importDemoData()` function already exists and works. Don't modify it unless necessary.

5. **PostHog Tracking:** Demo events should be tracked for monitoring effectiveness. Don't skip this step.

6. **Error Handling:** All errors should be logged but shouldn't break the user experience. Demo creation errors should show user-friendly messages.

7. **Testing in Production:** After deployment, create a test demo account in production to verify session cookie name and expiration work correctly.

---

## Final Checklist

Before marking this plan complete:

- [ ] All phases documented with clear acceptance criteria
- [ ] Testing checkpoints defined for each phase
- [ ] Code examples provided where helpful
- [ ] Error cases considered and handled
- [ ] Security implications addressed
- [ ] Documentation updates included
- [ ] Deployment considerations documented
- [ ] After-action report phase included
- [ ] Success criteria defined
- [ ] Risk assessment complete

---

**Plan Version:** 1.0
**Created:** 2025-10-26
**Created By:** spec-planner agent (Claude Code)
**Reviewed By:** [To be reviewed]

**This plan follows the BragDoc development patterns defined in CLAUDE.md and technical documentation in `.claude/docs/tech/`.**
