# Task: Fix Demo Account Authentication with Session Tokens

## Executive Summary

The demo account feature is currently broken due to the removal of the Credentials provider during the magic link authentication migration (completed in tasks/email-magiclink). This specification outlines the proper fix: implementing a session token-based authentication system for demo accounts that works with the new passwordless architecture.

**Status:** Ready for Planning

**Priority:** High (blocks production deployment of magic link auth)

**Estimated Complexity:** Medium (4-6 hours implementation)

**Dependencies:**
- Magic link authentication migration (completed)
- NextAuth v5 with JWT strategy
- Database schema supports user levels

---

## Background Reading

### Context

During the magic link authentication migration (tasks/email-magiclink), the Credentials provider was removed from NextAuth configuration as part of Phase 4. The demo account system relied on this provider to create temporary users with passwords, which is no longer possible.

**Current Broken Flow:**
1. User clicks "Try Demo"
2. System generates random email and password
3. System hashes password with bcrypt (dependency removed)
4. System creates user with hashed password
5. System attempts to log in via `signIn('credentials')` ❌ No longer exists
6. User is stuck - cannot access demo account

**Impact:**
- Demo mode completely non-functional
- Blocks production deployment of magic link authentication
- Users cannot try BragDoc before signing up

### Relevant Files

**Current (Broken) Implementation:**
- `apps/web/lib/create-demo-account.ts` - Creates demo user with password
- `apps/web/app/(auth)/demo/actions.ts` - Logs in with credentials provider
- `apps/web/app/(auth)/demo/page.tsx` - Demo signup page
- `apps/web/components/demo-mode-prompt.tsx` - Demo CTA on login page

**Related Documentation:**
- `tasks/email-magiclink/AFTER-ACTION-REPORT.md` - Documents the issue
- `tasks/email-magiclink/DEPLOYMENT.md` - Section 7 lists fix options
- `.claude/docs/tech/authentication.md` - NextAuth Email provider documentation
- `CLAUDE.md` - Authentication section (updated for magic links)

**Database Schema:**
- User table has `level` enum: 'free' | 'pro' | 'demo'
- Demo users should have `level: 'demo'`
- No password field required (removed in magic link migration)

### Alternative Solutions Considered

**Option 1: Quick Fix - Re-add Credentials Provider (NOT RECOMMENDED)**
- Pros: Fast (2 hours), minimal changes
- Cons: Tech debt, dual auth system, inconsistent with passwordless architecture
- Verdict: Temporary bandaid only

**Option 2: Session Token Approach (RECOMMENDED)**
- Pros: Clean architecture, no passwords, aligns with NextAuth
- Cons: More implementation time (4-6 hours)
- Verdict: Proper long-term solution

**Option 3: Remove Demo Mode**
- Pros: Simplest (0 hours)
- Cons: Loses valuable user acquisition tool
- Verdict: Not acceptable

This specification describes **Option 2: Session Token Approach**.

---

## Specific Requirements

### Functional Requirements

#### FR1: Demo Account Creation
- User clicks "Try Demo" button on login or demo page
- System creates temporary user account without password
- System generates unique demo identifier (e.g., `demo_abc123@bragdoc.ai`)
- System sets user level to 'demo'
- System creates JWT session token directly (no login flow)
- System sets session cookie in browser
- User is immediately authenticated and redirected to dashboard
- **No password required at any point**

#### FR2: Demo Session Management
- Demo session expires after 4 hours (configurable)
- Session expiration handled by JWT maxAge
- User is logged out automatically when session expires
- User can manually log out at any time
- Session uses same NextAuth JWT mechanism as regular auth

#### FR3: Demo Data Population
- Demo account is pre-populated with sample data:
  - 1 demo company ("Acme Corp")
  - 2-3 demo projects
  - 8-10 demo achievements with realistic content
  - 1 demo document/report
- Data is created immediately after user creation
- Data is realistic and showcases BragDoc features

#### FR4: Demo Account Cleanup
- Demo accounts are automatically deleted after 24 hours
- All associated data (achievements, projects, etc.) cascade deleted
- Cleanup runs via scheduled job or cron
- Cleanup logs number of accounts deleted

#### FR5: Demo User Experience
- Banner displayed on all pages indicating demo mode
- Banner shows time remaining in session
- Banner includes CTA to create real account
- User can convert demo to real account (future enhancement)
- Demo users cannot change email or account settings

### Non-Functional Requirements

#### NFR1: Security
- Session tokens are httpOnly cookies (not accessible to JavaScript)
- Tokens use same JWT secret as regular sessions
- Tokens signed and verified cryptographically
- Demo users isolated from production user data
- No password storage or transmission

#### NFR2: Performance
- Demo account creation completes in < 2 seconds
- Pre-population of demo data completes in < 3 seconds
- Cleanup job runs efficiently (deletes in batches if needed)
- No impact on regular authentication performance

#### NFR3: Maintainability
- Uses standard NextAuth session mechanism
- Compatible with existing `getAuthUser()` helper
- Works with existing auth middleware
- No custom authentication logic required
- Code is well-documented with comments

#### NFR4: Compatibility
- Works with Cloudflare Workers deployment
- Compatible with existing PostHog tracking
- Works with all existing protected routes
- Compatible with future auth changes

---

## Technical Design

### Architecture Overview

```
┌─────────────────┐
│  User clicks    │
│  "Try Demo"     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Server Action: startDemo()    │
│  - Generate unique demo ID      │
│  - Create user (no password)    │
│  - Generate JWT session token   │
│  - Set session cookie           │
│  - Populate demo data           │
│  - Track in PostHog             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User is authenticated          │
│  - Session cookie set           │
│  - Redirect to /dashboard       │
│  - Demo banner displayed        │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Session expires after 4 hours  │
│  - JWT maxAge enforced          │
│  - User logged out              │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Cleanup job (24 hours later)   │
│  - Delete demo user             │
│  - Cascade delete all data      │
└─────────────────────────────────┘
```

### Implementation Components

#### 1. Demo Account Creation (`apps/web/lib/create-demo-account.ts`)

**Functions:**
- `createDemoAccount()` - Main entry point
- `generateDemoId()` - Creates unique identifier
- `createSessionToken(user)` - Generates JWT
- `setSessionCookie(token)` - Sets cookie
- `populateDemoData(userId)` - Creates sample data

**Key Logic:**
```typescript
export async function createDemoAccount() {
  // 1. Generate unique demo email
  const demoId = crypto.randomUUID().slice(0, 8);
  const email = `demo_${demoId}@bragdoc.ai`;

  // 2. Create user WITHOUT password
  const [demoUser] = await db.insert(user).values({
    email,
    name: `Demo User ${demoId}`,
    level: 'demo',
    status: 'active',
    preferences: { language: 'en', documentInstructions: '' },
  }).returning();

  // 3. Generate session token (JWT)
  const token = await createSessionToken(demoUser);

  // 4. Set session cookie
  await setSessionCookie(token);

  // 5. Populate demo data
  await populateDemoData(demoUser.id);

  return demoUser;
}
```

#### 2. Session Token Generation

**Uses NextAuth's JWT encoding:**
```typescript
import { encode } from 'next-auth/jwt';

async function createSessionToken(user: User) {
  return await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      level: user.level,
      isDemo: true,
      demoCreatedAt: Date.now(),
    },
    secret: process.env.AUTH_SECRET!,
    maxAge: 4 * 60 * 60, // 4 hours
  });
}
```

#### 3. Session Cookie Management

**Sets NextAuth-compatible cookie:**
```typescript
async function setSessionCookie(token: string) {
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
}
```

#### 4. Server Action (`apps/web/app/(auth)/demo/actions.ts`)

**Single action for demo creation:**
```typescript
'use server';

import { createDemoAccount } from '@/lib/create-demo-account';
import { redirect } from 'next/navigation';
import { captureServerEvent } from '@/lib/posthog-server';

export async function startDemo() {
  const demoUser = await createDemoAccount();

  await captureServerEvent(demoUser.id, 'demo_started', {
    source: 'demo_page',
  });

  redirect('/dashboard');
}
```

#### 5. Demo Data Population

**Creates realistic sample data:**
```typescript
async function populateDemoData(userId: string) {
  // Create demo company
  const [company] = await db.insert(company).values({
    userId,
    name: 'Acme Corp',
    description: 'A leading technology company',
  }).returning();

  // Create demo projects
  const [project1, project2] = await db.insert(project).values([
    {
      userId,
      companyId: company.id,
      name: 'Q4 Product Launch',
      description: 'Launch new product features for Q4',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
    },
    {
      userId,
      companyId: company.id,
      name: 'Platform Modernization',
      description: 'Migrate legacy systems to cloud infrastructure',
      startDate: new Date('2024-02-01'),
    },
  ]).returning();

  // Create demo achievements
  await db.insert(achievement).values([
    {
      userId,
      projectId: project1.id,
      title: 'Increased user engagement by 40%',
      description: 'Implemented new onboarding flow with interactive tutorials and personalized recommendations, resulting in 40% increase in daily active users.',
      impact: 8,
      date: new Date('2024-03-15'),
    },
    {
      userId,
      projectId: project1.id,
      title: 'Reduced page load time by 60%',
      description: 'Optimized database queries and implemented Redis caching layer, reducing average page load time from 2.5s to 1.0s.',
      impact: 7,
      date: new Date('2024-03-10'),
    },
    // ... 6-8 more achievements
  ]);
}
```

#### 6. Demo Banner Component (`apps/web/components/demo-banner.tsx`)

**Displays demo status and CTA:**
```typescript
'use client';

import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

export function DemoBanner() {
  const { data: session } = useSession();

  if (session?.user?.level !== 'demo') return null;

  return (
    <Alert variant="warning" className="mb-4">
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          You're using a demo account. Data will be deleted after your session expires.
        </span>
        <Button asChild variant="outline" size="sm">
          <a href="/register">Create Free Account</a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

#### 7. Cleanup Job (`apps/web/lib/cleanup-demo-accounts.ts`)

**Automated cleanup of expired demos:**
```typescript
import { db } from '@bragdoc/database';
import { user } from '@bragdoc/database/schema';
import { eq, and, lt } from 'drizzle-orm';

export async function cleanupExpiredDemoAccounts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const deletedAccounts = await db
    .delete(user)
    .where(
      and(
        eq(user.level, 'demo'),
        lt(user.createdAt, cutoff)
      )
    )
    .returning({ id: user.id });

  console.log(`Cleaned up ${deletedAccounts.length} demo accounts`);
  return deletedAccounts.length;
}
```

### Environment Variables

**None required** - Uses existing NextAuth configuration:
- `AUTH_SECRET` - Already configured for JWT signing
- `NEXTAUTH_URL` - Already configured
- `POSTGRES_URL` - Already configured

### Database Changes

**None required** - Existing schema supports this:
- User table already has `level` enum with 'demo' value
- Password column already optional (removed in magic link migration)
- Cascade delete already configured for user relationships

---

## Integration Points

### NextAuth Integration
- Uses `encode` from `next-auth/jwt` for token generation
- Session cookie name matches NextAuth convention
- JWT claims compatible with existing session callbacks
- Works with `useSession()` hook on client
- Compatible with `auth()` helper on server

### PostHog Integration
- Track `demo_started` event when demo created
- Track `demo_expired` event when session expires
- Track `demo_converted` event if user registers (future)
- Include demo flag in user properties

### Existing Auth System
- Works with `getAuthUser()` helper (no changes needed)
- Compatible with auth middleware (already checks session)
- Demo users can access all protected routes
- Demo level can be checked via `session.user.level === 'demo'`

### UI Integration
- Add `DemoBanner` to main layout
- Update demo page to use new `startDemo()` action
- Keep existing demo CTA on login page
- Add demo indicator to user profile menu

---

## Testing Requirements

### Unit Tests
- `createDemoAccount()` creates user without password
- `generateDemoId()` generates unique identifiers
- `createSessionToken()` returns valid JWT
- `setSessionCookie()` sets correct cookie name and attributes
- `populateDemoData()` creates all required demo records
- `cleanupExpiredDemoAccounts()` deletes old demos

### Integration Tests
- End-to-end demo flow: click button → authenticated → redirected
- Session persists across page loads
- Session expires after 4 hours
- Cleanup job deletes demos older than 24 hours
- Demo users can access protected routes
- `getAuthUser()` works for demo users

### Manual Tests
1. Click "Try Demo" button
2. Verify immediately logged in to dashboard
3. Verify demo data is present (achievements, projects, company)
4. Verify demo banner is displayed
5. Verify can navigate to all pages
6. Verify can create/edit achievements (won't persist after cleanup)
7. Wait 4 hours, verify session expires
8. Run cleanup job, verify demo account deleted

### Edge Cases
- Multiple concurrent demo creations (unique IDs)
- Demo user tries to change email (should be prevented)
- Demo user tries to upgrade account (future feature)
- Demo session expires mid-operation (graceful logout)
- Cleanup job fails (retry logic)

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
- ✅ Works with Cloudflare Workers

### Should Have (Important but not blocking)
- ✅ PostHog tracking for demo events
- ✅ Demo indicator in user profile
- ✅ Graceful session expiration handling
- ✅ Cleanup job logging
- ✅ Demo data is realistic and comprehensive

### Nice to Have (Can be added later)
- ⭕ Demo session time remaining indicator
- ⭕ "Convert to real account" feature
- ⭕ Customizable demo data templates
- ⭕ Demo walkthrough/tour
- ⭕ Demo usage analytics

---

## Implementation Plan

### Phase 1: Core Demo Account Creation (2-3 hours)
1. Update `apps/web/lib/create-demo-account.ts`
2. Implement session token generation
3. Implement session cookie setting
4. Update `apps/web/app/(auth)/demo/actions.ts`
5. Test demo creation flow

### Phase 2: Demo Data Population (1-2 hours)
1. Create `populateDemoData()` function
2. Design realistic demo data
3. Implement company, project, achievement creation
4. Test data population

### Phase 3: UI Updates (1 hour)
1. Create `DemoBanner` component
2. Add banner to main layout
3. Update demo page UI
4. Update demo CTA on login page
5. Add demo indicator to profile menu

### Phase 4: Cleanup Job (1 hour)
1. Create `cleanupExpiredDemoAccounts()` function
2. Add scheduled job trigger (cron or background worker)
3. Test cleanup logic
4. Add logging

### Phase 5: Testing & Deployment (1-2 hours)
1. Write unit tests
2. Write integration tests
3. Manual end-to-end testing
4. Deploy to staging
5. Verify in production environment

**Total Estimated Time:** 4-8 hours

---

## Migration Path

### Current State
- Demo account creation broken
- Users cannot try BragDoc without signing up
- Blocks production deployment of magic link auth

### Transition Plan
1. **Immediately:** Implement session token approach
2. **Testing:** Verify demo flow works end-to-end
3. **Deploy:** Release with magic link authentication
4. **Monitor:** Track demo usage via PostHog
5. **Iterate:** Improve demo data based on user feedback

### Rollback Plan
If session token approach has issues:
1. Implement Quick Fix (re-add Credentials provider)
2. Deploy Quick Fix to production
3. Debug and fix session token approach in development
4. Re-deploy proper fix when stable

**Note:** No rollback should be needed - session token approach uses standard NextAuth mechanisms that are already battle-tested.

---

## Open Questions

### Resolved
- ✅ Should we use session tokens or re-add Credentials provider? → Session tokens (proper fix)
- ✅ How long should demo sessions last? → 4 hours (balances exploration vs cleanup)
- ✅ When should demo data be deleted? → 24 hours after creation
- ✅ Should demo data be realistic or minimal? → Realistic to showcase features

### Pending
- ⏳ Should we allow converting demo to real account? → Defer to future enhancement
- ⏳ Should we limit number of concurrent demos per IP? → Defer, monitor for abuse
- ⏳ Should we track demo feature usage separately? → Yes, via PostHog custom events
- ⏳ Should cleanup job run on cron or background worker? → Decide during implementation

---

## References

### Internal Documentation
- `tasks/email-magiclink/AFTER-ACTION-REPORT.md` - Documents demo account issue
- `tasks/email-magiclink/DEPLOYMENT.md` - Lists fix options
- `.claude/docs/tech/authentication.md` - NextAuth documentation
- `CLAUDE.md` - Authentication patterns

### External Documentation
- [NextAuth JWT Documentation](https://next-auth.js.org/configuration/options#jwt)
- [NextAuth Session Handling](https://next-auth.js.org/getting-started/client#usesession)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

### Related Tasks
- `tasks/email-magiclink/` - Magic link authentication migration (completed)
- Future: Demo-to-real account conversion
- Future: Advanced demo customization

---

## Approval

**Status:** ✅ Ready for Planning

**Approved By:** [To be filled]

**Date:** [To be filled]

**Next Steps:**
1. Create PLAN.md using spec-planner agent
2. Implement via plan-executor agent
3. Test with web-app-tester agent
4. Deploy to production

---

**Document Version:** 1.0
**Created:** 2025-10-26
**Last Updated:** 2025-10-26
**Author:** Claude Code (agentic-implement-plan orchestrator)
