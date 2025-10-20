# Demo Mode Implementation Plan

## Overview

This plan outlines the implementation of a demo login mode feature that allows users to try BragDoc with pre-populated sample data. The feature creates temporary demo accounts with anonymous email addresses and auto-populates them with data from `packages/database/demo-data.json`. On logout, all demo data is deleted while the user record is preserved for analytics purposes.

## Key Requirements Summary

- Environment variable `DEMO_MODE_ENABLED` controls feature visibility
- Demo accounts use email format: `demo{timestamp}@bragdoc.ai`
- Demo accounts are automatically populated with sample data
- Demo accounts have user level set to 'demo'
- Demo account data is deleted on logout (user record preserved for analytics)
- Demo accounts cannot be logged into again after logout
- Add 'demo' to existing user level pgEnum (safe, non-destructive migration)

## Technical Context

### Existing Patterns Identified

1. **Authentication Flow**: Uses NextAuth with JWT strategy, supporting credentials, Google, and GitHub providers
2. **User Creation**: Handled via `createUser()` function in `@/database/queries`
3. **JSON Import**: Existing import functionality at `/api/account/import` that validates and imports companies, projects, achievements, and documents
4. **Database Schema**: Uses Drizzle ORM with pgEnum for user levels (`userLevelEnum`)
5. **Login/Register Pages**: Client components using server actions from `app/(auth)/actions.ts`

### Architecture Decisions

1. **Demo User Email Format**: `demo{secondsSince2025}@bragdoc.ai` for uniqueness
2. **Temporary Password Approach**: Demo accounts will have a randomly generated temporary password that is used once for auto-login via NextAuth credentials provider, then the account is deleted on logout
3. **Enum Extension**: Add 'demo' to existing `userLevelEnum` pgEnum (safe, non-destructive operation)
4. **Data Loading**: Reuse existing import logic but read from file system instead of request body
5. **Auto-login**: Use NextAuth's `signIn()` after account creation to automatically log user in

---

## Instructions for Implementation

This plan should be followed sequentially. As you implement:

1. **Mark tasks as complete** - Check off each task using the checkbox as you complete it
2. **Update this document** - If you encounter issues or make different decisions, update the plan to reflect reality
3. **Follow BragDoc conventions** - Refer to CLAUDE.md for:
   - Named exports (not default exports)
   - TypeScript strict mode
   - Component patterns
   - API conventions
4. **Test as you go** - Don't wait until Phase 6 to test; verify each phase works before moving on
5. **Ask for clarification** - If any step is unclear, ask before implementing
6. **Order matters** - The import logic requires specific ordering: Companies → Projects → Achievements → Documents due to foreign key relationships
7. **Move demo data file first** - Before implementing Phase 2, move `packages/database/demo-data.json` to `apps/web/lib/demo-data.json`

---

## Phase 1: Database Schema Updates

### Step 1.1: Add 'demo' to Existing User Level Enum

**File**: `packages/database/src/schema.ts`

**Changes**:

- [x] Add 'demo' value to the existing pgEnum definition:

  ```typescript
  // Old:
  export const userLevelEnum = pgEnum('user_level', ['free', 'basic', 'pro']);

  // New:
  export const userLevelEnum = pgEnum('user_level', ['free', 'basic', 'pro', 'demo']);
  ```

**Rationale**: Adding a value to an existing PostgreSQL enum is a non-destructive operation. The database will execute `ALTER TYPE user_level ADD VALUE 'demo'` which preserves all existing data.

### Step 1.2: Generate and Apply Database Migration

- [x] **Commands**:

```bash
cd packages/database
pnpm db:generate
pnpm db:push
```

**Verification**:

- [x] Check that migration file adds 'demo' to the enum (ALTER TYPE command)
- [x] Verify existing data is preserved
- [x] Test that default value 'free' still works
- [x] Verify 'demo' can be assigned to user.level field

**Notes**:

- This is a safe, non-destructive migration
- PostgreSQL will add the new enum value without data loss
- Existing user records remain unchanged

---

## Phase 2: Backend - Demo Account Creation API

### Step 2.1: Create Demo Account Utilities

**File**: `apps/web/lib/demo-mode-utils.ts` (new file)

- [x] Create file with three utility functions

**Functions**:

- [x] 1. `generateDemoEmail(): string`

  - Calculates seconds since 2025-01-01
  - Returns `demo{seconds}@bragdoc.ai`

2. `isDemoModeEnabled(): boolean`

   - Returns `process.env.DEMO_MODE_ENABLED === 'true'`

3. `isDemoAccount(email: string): boolean`
   - Returns `email.startsWith('demo') && email.endsWith('@bragdoc.ai')`
   - Used for identifying demo accounts in analytics or future cleanup jobs

**Code Pattern**:

```typescript
export function generateDemoEmail(): string {
  const start2025 = new Date('2025-01-01T00:00:00Z').getTime();
  const now = Date.now();
  const secondsSince2025 = Math.floor((now - start2025) / 1000);
  return `demo${secondsSince2025}@bragdoc.ai`;
}

export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE_ENABLED === 'true';
}

export function isDemoAccount(email: string): boolean {
  return email.startsWith('demo') && email.endsWith('@bragdoc.ai');
}
```

### Step 2.2: Create Shared Import Library

**File**: `apps/web/lib/import-user-data.ts` (new file)

- [x] Create shared import library with `importUserData()` function

**Purpose**: Extract the import logic from `/api/account/import/route.ts` into a reusable library that handles both regular imports and demo data imports.

**Function**: `importUserData(options: ImportOptions): Promise<ImportStats>`

**Interface**:

```typescript
import type { z } from 'zod';
import type { exportDataSchema } from './export-import-schema';

export interface ImportOptions {
  userId: string;
  data: z.infer<typeof exportDataSchema>;
  checkDuplicates?: boolean; // true for normal import, false for demo (default: true)
}

export interface ImportStats {
  companies: { created: number; skipped: number };
  projects: { created: number; skipped: number };
  achievements: { created: number; skipped: number };
  documents: { created: number; skipped: number };
}
```

**Implementation**:

```typescript
import { db } from '@/database/index';
import { achievement, company, project, document } from '@/database/schema';
import { eq, and } from 'drizzle-orm';

export async function importUserData(
  options: ImportOptions
): Promise<ImportStats> {
  const { userId, data: importData, checkDuplicates = true } = options;

  const stats: ImportStats = {
    companies: { created: 0, skipped: 0 },
    projects: { created: 0, skipped: 0 },
    achievements: { created: 0, skipped: 0 },
    documents: { created: 0, skipped: 0 },
  };

  // IMPORTANT: Order matters due to foreign key relationships
  // 1. Companies (no dependencies)
  // 2. Projects (depend on companies)
  // 3. Achievements (depend on companies and projects)
  // 4. Documents (depend on companies)

  // Import companies
  for (const companyData of importData.companies) {
    if (checkDuplicates) {
      const existing = await db
        .select()
        .from(company)
        .where(and(eq(company.id, companyData.id), eq(company.userId, userId)));

      if (existing.length > 0) {
        stats.companies.skipped++;
        continue;
      }
    }

    await db.insert(company).values({
      id: companyData.id,
      userId, // Override with target user's id
      name: companyData.name,
      domain: companyData.domain,
      role: companyData.role,
      startDate: new Date(companyData.startDate),
      endDate: companyData.endDate ? new Date(companyData.endDate) : null,
    });
    stats.companies.created++;
  }

  // Import projects
  for (const projectData of importData.projects) {
    if (checkDuplicates) {
      const existing = await db
        .select()
        .from(project)
        .where(and(eq(project.id, projectData.id), eq(project.userId, userId)));

      if (existing.length > 0) {
        stats.projects.skipped++;
        continue;
      }
    }

    await db.insert(project).values({
      id: projectData.id,
      userId, // Override with target user's id
      companyId: projectData.companyId, // Preserved from import data
      name: projectData.name,
      description: projectData.description,
      status: projectData.status,
      color: projectData.color,
      startDate: new Date(projectData.startDate),
      endDate: projectData.endDate ? new Date(projectData.endDate) : null,
      repoRemoteUrl: projectData.repoRemoteUrl,
      createdAt: new Date(projectData.createdAt),
      updatedAt: new Date(projectData.updatedAt),
    });
    stats.projects.created++;
  }

  // Import achievements
  for (const achievementData of importData.achievements) {
    if (checkDuplicates) {
      const existing = await db
        .select()
        .from(achievement)
        .where(
          and(
            eq(achievement.id, achievementData.id),
            eq(achievement.userId, userId)
          )
        );

      if (existing.length > 0) {
        stats.achievements.skipped++;
        continue;
      }
    }

    await db.insert(achievement).values({
      id: achievementData.id,
      userId, // Override with target user's id
      companyId: achievementData.companyId, // Preserved from import data
      projectId: achievementData.projectId, // Preserved from import data
      userMessageId: achievementData.userMessageId,
      title: achievementData.title,
      summary: achievementData.summary,
      details: achievementData.details,
      eventStart: achievementData.eventStart
        ? new Date(achievementData.eventStart)
        : null,
      eventEnd: achievementData.eventEnd
        ? new Date(achievementData.eventEnd)
        : null,
      eventDuration: achievementData.eventDuration,
      isArchived: achievementData.isArchived ?? false,
      source: achievementData.source,
      impact: achievementData.impact,
      impactSource: achievementData.impactSource ?? 'user',
      impactUpdatedAt: achievementData.impactUpdatedAt
        ? new Date(achievementData.impactUpdatedAt)
        : new Date(),
      createdAt: new Date(achievementData.createdAt),
      updatedAt: new Date(achievementData.updatedAt),
    });
    stats.achievements.created++;
  }

  // Import documents
  for (const documentData of importData.documents) {
    if (checkDuplicates) {
      const existing = await db
        .select()
        .from(document)
        .where(
          and(eq(document.id, documentData.id), eq(document.userId, userId))
        );

      if (existing.length > 0) {
        stats.documents.skipped++;
        continue;
      }
    }

    await db.insert(document).values({
      id: documentData.id,
      userId, // Override with target user's id
      companyId: documentData.companyId, // Preserved from import data
      title: documentData.title,
      content: documentData.content,
      type: documentData.type,
      shareToken: documentData.shareToken,
      createdAt: new Date(documentData.createdAt),
      updatedAt: new Date(documentData.updatedAt),
    });
    stats.documents.created++;
  }

  return stats;
}
```

**Notes**:

- No transactions used (current Drizzle driver doesn't support them)
- Order is critical: companies → projects → achievements → documents
- Foreign keys (companyId, projectId) are preserved from import data
- Only userId is overridden for all entities
- For demo imports, set `checkDuplicates: false` for better performance

### Step 2.3: Create Demo Data Import Service

**File**: `apps/web/lib/demo-data-import.ts` (new file)

- [x] Create demo data import service
- [x] Move `packages/database/demo-data.json` to `apps/web/lib/demo-data.json` before implementing (Note: file already exists at `apps/web/lib/ai/demo-data.json`)

**Function**: `importDemoData(userId: string): Promise<ImportStats>`

**Implementation**:

```typescript
import fs from 'fs';
import path from 'path';
import { exportDataSchema } from '@/lib/export-import-schema';
import { importUserData, type ImportStats } from '@/lib/import-user-data';

export async function importDemoData(userId: string): Promise<ImportStats> {
  // Read demo data file from lib directory (bundled with app)
  const demoDataPath = path.join(process.cwd(), 'lib', 'demo-data.json');
  const demoDataRaw = fs.readFileSync(demoDataPath, 'utf-8');
  const demoData = JSON.parse(demoDataRaw);

  // Validate
  const result = exportDataSchema.safeParse(demoData);
  if (!result.success) {
    throw new Error('Invalid demo data format');
  }

  // Use shared import function without duplicate checking
  return importUserData({
    userId,
    data: result.data,
    checkDuplicates: false, // New account, no need to check
  });
}
```

**Note**: The demo-data.json file should be moved from `packages/database/` to `apps/web/lib/` before implementation to ensure it's bundled correctly with the Next.js app in Cloudflare Workers deployment.

### Step 2.4: Refactor Existing Import Route

**File**: `apps/web/app/api/account/import/route.ts` (modify)

- [x] Refactor to use shared `importUserData()` library

**Purpose**: Update the existing import route to use the new shared `importUserData` library function.

**Changes**:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { exportDataSchema } from '@/lib/export-import-schema';
import { importUserData } from '@/lib/import-user-data';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;
    const body = await req.json();

    // Validate the import data
    const result = exportDataSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid import data format',
          details: result.error.errors,
        },
        { status: 400 }
      );
    }

    // Use shared import function with duplicate checking
    const stats = await importUserData({
      userId,
      data: result.data,
      checkDuplicates: true, // Check for duplicates in normal imports
    });

    return NextResponse.json({
      message: 'Data imported successfully',
      stats,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
```

**Benefits**:

- Reduces code duplication
- Ensures consistent import behavior
- Makes testing easier (test the library once)
- Single source of truth for import logic

### Step 2.5: Create Shared Demo Account Creation Function

**File**: `apps/web/lib/create-demo-account.ts` (new file)

- [x] Create shared function for demo account creation logic

**Function**: `createDemoAccount(): Promise<CreateDemoAccountResult>`

**Purpose**: Centralized logic for creating demo accounts that can be called from both API routes and server actions.

**Interface**:

```typescript
export interface CreateDemoAccountResult {
  success: boolean;
  userId?: string;
  email?: string;
  temporaryPassword?: string;
  stats?: ImportStats;
  error?: string;
}
```

**Implementation**:

```typescript
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { generateDemoEmail } from './demo-mode-utils';
import { importDemoData } from './demo-data-import';
import { db } from '@/database/index';
import { user } from '@/database/schema';

export async function createDemoAccount(): Promise<CreateDemoAccountResult> {
  try {
    // Generate demo email
    const email = generateDemoEmail();

    // Generate temporary password for auto-login
    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create demo user
    const [demoUser] = await db
      .insert(user)
      .values({
        email,
        password: hashedPassword,
        name: 'Demo User',
        level: 'demo',
        emailVerified: new Date(),
        provider: 'demo',
        preferences: {
          hasSeenWelcome: false,
          language: 'en',
        },
      })
      .returning();

    // Import demo data
    const stats = await importDemoData(demoUser.id);

    return {
      success: true,
      userId: demoUser.id,
      email,
      temporaryPassword, // Return plaintext password for immediate login
      stats,
    };
  } catch (error) {
    console.error('Error creating demo account:', error);
    return {
      success: false,
      error: 'Failed to create demo account',
    };
  }
}
```

### Step 2.6: Create Demo Account Creation API Route

**File**: `apps/web/app/api/demo/create/route.ts` (new file)

- [x] Create API route that calls shared demo account creation function

**Endpoint**: `POST /api/demo/create`

**Purpose**: Allow external clients (future CLI integration, etc.) to create demo accounts programmatically.

**Implementation**:

```typescript
import { NextResponse } from 'next/server';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';
import { createDemoAccount } from '@/lib/create-demo-account';

export async function POST() {
  // Check if demo mode is enabled
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const result = await createDemoAccount();

  if (result.success) {
    return NextResponse.json({
      success: true,
      userId: result.userId,
      email: result.email,
      temporaryPassword: result.temporaryPassword,
      stats: result.stats,
    });
  } else {
    return NextResponse.json(
      { error: result.error || 'Failed to create demo account' },
      { status: 500 }
    );
  }
}
```

---

## Phase 3: Frontend - Demo Mode UI

### Step 3.1: Create Demo Login Page

**Files**:

- `apps/web/app/(auth)/demo/page.tsx` (new file) - Server component
- `apps/web/app/(auth)/demo/demo-form.tsx` (new file) - Client component

- [ ] Create demo page as server component
- [ ] Create demo form as separate client component with button logic

**Requirements**:

- Explain that a demo account will be created
- Anonymous email address
- Pre-populated with sample data
- Data deleted on logout (account preserved for analytics)
- Single "Try Demo Mode" button
- Show loading state during account creation
- Redirect to /dashboard on success

**Implementation**:

**File**: `apps/web/app/(auth)/demo/page.tsx` (Server Component)

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoForm } from './demo-form';

export default function DemoPage() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Try Demo Mode</CardTitle>
          <CardDescription className="text-base mt-2">
            Experience BragDoc without signing up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              When you click the button below, we'll create a temporary demo account for you with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>An anonymous email address (demo*****@bragdoc.ai)</li>
              <li>Pre-populated sample data including achievements, projects, and documents</li>
              <li>Full access to all features</li>
            </ul>
            <p className="text-sm font-medium text-foreground">
              Important: All your demo data will be automatically deleted when you log out.
            </p>
          </div>

          <DemoForm />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-foreground hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**File**: `apps/web/app/(auth)/demo/demo-form.tsx` (Client Component)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createDemoAccountAction } from './actions';

export function DemoForm() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDemo = async () => {
    setIsCreating(true);
    try {
      const result = await createDemoAccountAction();

      if (result.status === 'success') {
        toast.success('Demo account created! Redirecting...');
        router.push('/dashboard');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to create demo account');
        setIsCreating(false);
      }
    } catch (error) {
      toast.error('An error occurred');
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateDemo}
      disabled={isCreating}
      className="w-full"
      size="lg"
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating demo account...
        </>
      ) : (
        'Try Demo Mode'
      )}
    </Button>
  );
}
```

### Step 3.2: Create Demo Account Server Action

**File**: `apps/web/app/(auth)/demo/actions.ts` (new file)

- [ ] Create server action that calls shared demo account creation function

**Function**: `createDemoAccountAction()`

**Implementation**:

1. Check if demo mode is enabled
2. Call shared `createDemoAccount()` function
3. On success, use NextAuth's `signIn()` with temporary password
4. Return success/error status

```typescript
'use server';

import { signIn } from '../auth';
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';
import { createDemoAccount } from '@/lib/create-demo-account';

export interface CreateDemoActionState {
  status: 'success' | 'failed' | 'unavailable';
  error?: string;
}

export async function createDemoAccountAction(): Promise<CreateDemoActionState> {
  try {
    // Check if demo mode is enabled
    if (!isDemoModeEnabled()) {
      return { status: 'unavailable', error: 'Demo mode not available' };
    }

    // Create demo account using shared function
    const result = await createDemoAccount();

    if (!result.success) {
      return {
        status: 'failed',
        error: result.error || 'Failed to create demo account',
      };
    }

    // Sign in with the demo account using temporary password
    await signIn('credentials', {
      email: result.email!,
      password: result.temporaryPassword!,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    console.error('Error in createDemoAccountAction:', error);
    return { status: 'failed', error: 'An error occurred' };
  }
}
```

**Note**: Both the server action and API endpoint call the same underlying `createDemoAccount()` function, ensuring consistent behavior.

### Step 3.3: Update Login Page with Demo Mode Link

**File**: `apps/web/app/(auth)/login/page.tsx`

- [ ] Add import for `DemoModePrompt` component
- [ ] Add `<DemoModePrompt />` after sign-up link

**Changes**:
Add conditional rendering for demo mode link after the social auth buttons section.

**Location**: After the "Sign up for free" link (around line 68)

**Code to Add**:

```typescript
import { isDemoModeEnabled } from '@/lib/demo-mode-utils';

// At the top of the component
const demoModeEnabled = isDemoModeEnabled();

// After the existing "Sign up for free" paragraph, add:
{demoModeEnabled && (
  <div className="mt-6 pt-6 border-t border-border">
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <p className="text-sm text-center text-muted-foreground mb-3">
          Want to try BragDoc without signing up?
        </p>
        <Link href="/demo">
          <Button variant="outline" className="w-full">
            Try Demo Mode
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
)}
```

**Note**: This requires making `isDemoModeEnabled()` work in both server and client contexts. May need to:

- Make the login page a server component (check env var during render)
- Pass `demoModeEnabled` as a prop
- Or use a client component with the check done server-side

**Recommended**: Keep login page as client component, but wrap the demo mode section in a separate server component:

**File**: `apps/web/components/demo-mode-prompt.tsx` (new file)

- [ ] Create server component for demo mode prompt

```typescript
import Link from 'next/link';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export function DemoModePrompt() {
  const demoModeEnabled = process.env.DEMO_MODE_ENABLED === 'true';

  if (!demoModeEnabled) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-center text-muted-foreground mb-3">
            Want to try BragDoc without signing up?
          </p>
          <Link href="/demo">
            <Button variant="outline" className="w-full">
              Try Demo Mode
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
```

Then import and use in login page:

```typescript
import { DemoModePrompt } from 'components/demo-mode-prompt';

// In the render, after the sign up link:
<DemoModePrompt />
```

### Step 3.4: Create Demo Mode Banner Component

**File**: `apps/web/components/demo-mode-banner.tsx` (new file)

- [ ] Create client component for demo mode banner
- [ ] Add to main app layout

**Requirements**:

- Full-width sticky banner at top of page
- 30-40px height
- Only shown when user level is 'demo'
- Clear warning about data deletion on logout
- Possibly link to upgrade to real account

**Implementation**:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export function DemoModeBanner() {
  const { data: session } = useSession();

  // Only show for demo users
  if (session?.user?.level !== 'demo') {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">
            Demo Mode - Your data will be deleted when you log out
          </span>
        </div>
        <Link
          href="/register"
          className="text-amber-950 underline hover:no-underline font-medium"
        >
          Create account to save your data
        </Link>
      </div>
    </div>
  );
}
```

**Integration**:

- [ ] Add `DemoModeBanner` import to `apps/web/app/(app)/layout.tsx`
- [ ] Add `<DemoModeBanner />` at the top of the layout, before existing content

```typescript
import { DemoModeBanner } from '@/components/demo-mode-banner';

export default function AppLayout({ children }) {
  return (
    <>
      <DemoModeBanner />
      {/* existing layout content */}
      {children}
    </>
  );
}
```

---

## Phase 4: Demo Account Cleanup on Logout

### Step 4.1: Create Demo Account Data Cleanup Utility

**File**: `apps/web/lib/demo-data-cleanup.ts` (new file)

- [ ] Create cleanup utility with safety checks

**Function**: `cleanupDemoAccountData(userId: string): Promise<void>`

**Purpose**: Delete all data associated with a demo account while preserving the user record for analytics.

**Implementation**:

- [ ] 1. Verify the user is a demo account (check level === 'demo')
- [ ] 2. Delete all related data in order: documents, achievements, projects, companies
- [ ] 3. Keep the user record for analytics tracking

```typescript
import { db } from '@/database/index';
import {
  user,
  document,
  achievement,
  project,
  company,
} from '@/database/schema';
import { eq } from 'drizzle-orm';

export async function cleanupDemoAccountData(userId: string): Promise<void> {
  // Verify user is a demo account
  const [demoUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!demoUser) {
    console.warn(`User ${userId} not found for cleanup`);
    return;
  }

  if (demoUser.level !== 'demo') {
    console.warn(`User ${userId} is not a demo account, skipping cleanup`);
    return;
  }

  // Delete related data (keep user record for analytics)
  // Order: documents → achievements → projects → companies
  // Note: Check schema.ts for any additional user-related tables

  // Delete documents
  await db.delete(document).where(eq(document.userId, userId));

  // Delete achievements
  await db.delete(achievement).where(eq(achievement.userId, userId));

  // Delete projects
  await db.delete(project).where(eq(project.userId, userId));

  // Delete companies
  await db.delete(company).where(eq(company.userId, userId));

  // TODO: Review schema.ts for other user-related tables:
  // - userMessage (if exists)
  // - chats (if user-specific)
  // - standupDocuments (if user-specific)
  // - sessions (handled by NextAuth on signOut, but verify)

  // User record is preserved for analytics (email, createdAt, etc.)
}
```

**Note**: The user record remains in the database with email, creation timestamp, and level='demo'. This allows tracking demo usage metrics without storing actual user data.

**Important**: During implementation, review all tables in `schema.ts` that have a `userId` foreign key to ensure comprehensive data cleanup.

### Step 4.2: Update Auth Configuration to Handle Demo Logout

**File**: `apps/web/app/(auth)/auth.ts`

- [ ] Import `cleanupDemoAccountData` from cleanup utility
- [ ] Add `signOut` event handler to events object

**Changes**:
Add a `signOut` event handler to check if the user is a demo account and clean up their data.

**Location**: In the `events` section (after `createUser`)

**Code to Add**:

```typescript
import { cleanupDemoAccountData } from '@/lib/demo-data-cleanup';

// In the events object:
events: {
  createUser({ user }) {
    // ... existing code ...
  },
  async signOut({ token }) {
    // Check if this is a demo account
    if (token?.id && token?.level === 'demo') {
      try {
        await cleanupDemoAccountData(token.id as string);
      } catch (error) {
        console.error('Failed to cleanup demo account data:', error);
        // Don't fail the logout if cleanup fails
      }
    }
  },
}
```

**Note**: The `signOut` event receives the token, which contains the user level. The cleanup deletes all related data (companies, projects, achievements, documents) but preserves the user record for analytics.

---

## Phase 5: Environment Variable Configuration

### Step 5.1: Update Environment Variable Documentation

**File**: `apps/web/.env.example`

- [ ] Add `DEMO_MODE_ENABLED` environment variable with documentation

**Add**:

```bash
# Demo Mode
# Set to 'true' to enable demo mode login option
DEMO_MODE_ENABLED=false
```

### Step 5.2: Update CLAUDE.md Documentation

**File**: `CLAUDE.md`

- [ ] Add `DEMO_MODE_ENABLED` to optional environment variables section

**Section**: Environment Variables

**Add to the optional variables section**:

```markdown
- `DEMO_MODE_ENABLED` - Set to 'true' to enable demo mode (allows users to try the app with pre-populated data)
```

---

## Phase 6: Testing and Validation

### Step 6.1: Manual Testing Checklist

- [ ] **Environment Setup**:

  - [ ] Set `DEMO_MODE_ENABLED=true` in `.env.local`
  - [ ] Restart development server
  - [ ] Verify demo-data.json exists and is valid

- [ ] **Login Page Tests**:

  - [ ] Visit `/login` - should see demo mode prompt
  - [ ] Demo mode prompt should have link to `/demo`
  - [ ] Set `DEMO_MODE_ENABLED=false` - prompt should not appear
  - [ ] Set `DEMO_MODE_ENABLED=true` - prompt should reappear

- [ ] **Demo Page Tests**:

  - [ ] Visit `/demo` - should see explanation and button
  - [ ] Click "Try Demo Mode" button
  - [ ] Should see loading state
  - [ ] Should be redirected to `/dashboard`
  - [ ] Should be logged in

- [ ] **Demo Account Tests**:

  - [ ] Check email format is `demo{number}@bragdoc.ai`
  - [ ] Verify sample data is loaded (companies, projects, achievements, documents)
  - [ ] Check user level is 'demo' in database
  - [ ] Verify all features work normally
  - [ ] Check that achievements page shows sample data
  - [ ] Check that documents page shows sample documents

- [ ] **Logout Tests**:

  - [ ] Click logout while logged in as demo user
  - [ ] Verify redirect to home/login page
  - [ ] Check database - demo user record should still exist
  - [ ] Verify all related data is deleted (companies, projects, achievements, documents)
  - [ ] Verify user record properties are preserved (email, createdAt, level='demo')

- [ ] **Security Tests**:

  - [ ] Try to visit `/demo` when `DEMO_MODE_ENABLED=false` - should return 404
  - [ ] Try to call `/api/demo/create` when disabled - should return 404
  - [ ] Verify demo account has temporary password
  - [ ] Try to access demo email address externally - should not be a real email

- [ ] **Edge Cases**:
  - [ ] Create multiple demo accounts in succession - should get unique emails
  - [ ] Test with empty demo-data.json (should fail gracefully)
  - [ ] Test with malformed demo-data.json (should fail gracefully)
  - [ ] Test logout of regular account - should not trigger deletion

### Step 6.2: Automated Tests

**File**: `apps/web/__tests__/api/demo/create.test.ts` (new file)

- [ ] Create test file with the following tests:
  - [ ] Returns 404 when demo mode disabled
  - [ ] Calls shared `createDemoAccount()` function
  - [ ] Returns correct response structure on success
  - [ ] Returns error response on failure

**File**: `apps/web/__tests__/lib/demo-mode-utils.test.ts` (new file)

- [ ] Create test file with the following tests:
  - [ ] `generateDemoEmail()` returns correct format
  - [ ] `generateDemoEmail()` returns unique values
  - [ ] `isDemoModeEnabled()` reads env var correctly
  - [ ] `isDemoAccount()` correctly identifies demo emails

**File**: `apps/web/__tests__/lib/demo-data-cleanup.test.ts` (new file)

- [ ] Create test file with the following tests:
  - [ ] Deletes all demo account data (companies, projects, achievements, documents)
  - [ ] Preserves user record for analytics
  - [ ] Does not clean up non-demo accounts
  - [ ] Handles non-existent user IDs gracefully

**File**: `apps/web/__tests__/lib/create-demo-account.test.ts` (new file)

- [ ] Create test file with the following tests:
  - [ ] Creates demo account with correct structure
  - [ ] Generates unique email addresses
  - [ ] Returns temporary password
  - [ ] Imports demo data successfully
  - [ ] Handles errors gracefully

---

## Phase 7: Documentation

### Step 7.1: Update Feature Documentation

**File**: `tasks/demo-mode/README.md` (new file)

- [ ] Create feature documentation with usage instructions

Document:

- How to enable/disable demo mode
- How demo accounts are created
- How cleanup works
- Email format explanation
- Security considerations

### Step 7.2: Update FEATURES.md

**File**: `docs/FEATURES.md` or `FEATURES.md`

- [ ] Add entry for Demo Mode feature
- [ ] Document what it does, how to enable it, and key behaviors

Content to add:

```markdown
### Demo Mode

**Status**: ✅ Implemented
**Environment Variable**: `DEMO_MODE_ENABLED=true`

Allows users to try BragDoc without creating an account. When enabled:

- Login page displays "Try Demo Mode" option
- Creates temporary account with format `demo{timestamp}@bragdoc.ai`
- Auto-populates with sample data (companies, projects, achievements, documents)
- All demo data is automatically deleted on logout (user record preserved for analytics)
- Full-width banner reminds user of demo status
- Cannot re-login to demo accounts

**Use case**: Product demos, trial experiences, testing without commitment.

**Analytics**: User records (email, createdAt, level) are preserved after logout to track demo usage metrics.
```

### Step 7.3: Comprehensive CLAUDE.md Update

**File**: `CLAUDE.md`

Review and update the following sections based on this implementation:

- [ ] **Authentication section**: Add details about demo user level and temporary password approach

  - Note that demo accounts use credentials provider with temporary passwords
  - Explain demo account lifecycle (create → populate → cleanup data on logout)
  - Document that `signOut` event handler cleans up demo data while preserving user record for analytics

- [ ] **Database Layer section**: Document the UserLevel enum extension

  - Add note that 'demo' value was added to the existing userLevelEnum pgEnum
  - Explain this was a safe, non-destructive operation
  - Document the 'demo' level and its purpose

- [ ] **API Conventions section**: Document the demo account creation endpoint

  - Add `/api/demo/create` to the list of API routes
  - Explain it returns temporary password for auto-login
  - Note it's protected by `DEMO_MODE_ENABLED` check

- [ ] **Component Patterns section**: Add demo mode components

  - Document `DemoModePrompt` (server component for login page)
  - Document `DemoModeBanner` (client component with session check)
  - Explain when and where they're used

- [ ] **Testing section**: Add note about demo mode tests

  - Reference test files created for demo mode utilities
  - Note testing patterns for environment variable checks

- [ ] **Environment Variables section**: Ensure `DEMO_MODE_ENABLED` is documented (already done in Phase 5.2)

### Step 7.4: Error Handling Review

- [ ] Review all new functions for proper error handling
- [ ] Ensure all functions have try-catch blocks where appropriate
- [ ] Verify error responses are consistent with BragDoc patterns

Ensure all functions have proper try-catch blocks and return appropriate error responses:

- API routes return JSON error responses
- Server actions return typed error states
- Client components show toast notifications for errors
- Console logs include sufficient context for debugging

---

## Implementation Order

### Sprint 1: Database and Core Backend (Days 1-2)

- [x] 1. Phase 1: Database Schema Updates
- [x] 2. Phase 2.1: Demo Account Utilities
- [x] 3. Phase 2.2: Shared Import Library (extract from existing route)
- [x] 4. Phase 2.3: Demo Data Import Service
- [x] 5. Phase 2.4: Refactor Existing Import Route

### Sprint 2: API and Authentication (Days 3-4)

- [x] 6. Phase 2.5: Shared Demo Account Creation Function
- [x] 7. Phase 2.6: Demo Account Creation API Route
- [ ] 8. Phase 3.2: Demo Account Server Action
- [ ] 9. Phase 4: Demo Account Cleanup on Logout

### Sprint 3: Frontend UI (Day 5)

- [ ] 10. Phase 3.1: Demo Login Page (server component + client form)
- [ ] 11. Phase 3.3: Update Login Page with Demo Mode Link
- [ ] 12. Phase 3.4: Demo Mode Banner Component

### Sprint 4: Configuration and Testing (Day 6)

- [ ] 13. Phase 5: Environment Variable Configuration
- [ ] 14. Phase 6: Testing and Validation

### Sprint 5: Documentation (Day 7)

- [ ] 15. Phase 7: Documentation

---

## Risk Assessment and Mitigation

### Risk 1: Demo Data File Path Resolution

**Risk**: Path to `demo-data.json` may not resolve correctly in different environments (dev, production, Cloudflare Workers)

**Mitigation**:

- [ ] Test path resolution in both dev and production builds
- [ ] Consider embedding demo data as a TypeScript constant if file system access is problematic
- [ ] Add clear error messages if file cannot be found

### Risk 2: NextAuth Login for Passwordless Demo Accounts

**Risk**: NextAuth may not support logging in without credentials

**Mitigation**:

- [ ] Use temporary password approach (generate random password, use it once, potentially clear it after)
- [ ] Thoroughly test the sign-in flow
- [ ] Consider manual session creation as backup plan

### Risk 3: Database Migration for Enum to Varchar

**Risk**: Converting enum to varchar could fail or lose data

**Mitigation**:

- [ ] Review generated migration SQL carefully
- [ ] Test on development database first
- [ ] Backup production database before applying
- [ ] Consider keeping enum and using varchar only for new 'demo' value (though this defeats the purpose)

### Risk 4: Data Cleanup May Be Incomplete

**Risk**: Demo data cleanup might miss some related records or table relationships

**Mitigation**:

- [ ] Review all tables in schema.ts that reference user.id
- [ ] Add explicit deletion queries for all related entities (companies, projects, achievements, documents, etc.)
- [ ] Check for any other user-related tables (sessions, messages, etc.) that should be cleaned up
- [ ] Test thoroughly with multiple demo accounts to ensure complete cleanup

### Risk 5: Demo Mode Toggle Not Working

**Risk**: Environment variable check might not work correctly in different contexts (server/client)

**Mitigation**:

- [ ] Use server components for env var checks
- [ ] Add clear error messages if demo mode is accessed when disabled
- [ ] Test with env var both true and false
- [ ] Consider caching the check result

---

## Open Questions and Decisions Needed

### Question 1: Demo Data File Location ✅ RESOLVED

**Question**: Should demo-data.json stay in `packages/database/` or move to `apps/web/`?

**Options**:

- **A**: Keep in `packages/database/` (current location, shared across packages)
- **B**: Move to `apps/web/lib/` (easier path resolution)
- **C**: Move to `apps/web/public/` (can be fetched via HTTP in production)

**Decision**: Move to `apps/web/lib/demo-data.json` for reliable bundling in Cloudflare Workers deployment. The 602KB file size is acceptable for bundling, and this ensures filesystem access works correctly in all environments.

### Question 2: Temporary Password Approach ✅ RESOLVED

**Question**: Should we use a temporary password for demo accounts or implement custom session creation?

**Options**:

- **A**: Generate random temporary password, use it for sign-in, keep it in database
- **B**: Generate temporary password, use it for sign-in, clear it after successful login
- **C**: Manually create session without using NextAuth sign-in

**Decision**: Option A - Generate and keep temporary password. Schema supports nullable passwords (line 53 in schema.ts), so this is already supported for OAuth users. Demo accounts are deleted on logout anyway, so no security concern.

### Question 3: Demo Account Expiry ✅ RESOLVED

**Question**: Should demo accounts expire after a certain time period in addition to deletion on logout?

**Options**:

- **A**: Only delete on logout (as per spec)
- **B**: Also delete after 24 hours of inactivity
- **C**: Also delete after 7 days regardless of activity

**Decision**: Option A - Delete on logout only (as per spec). Future consideration for cron job cleanup of abandoned demo accounts can be added later if needed.

### Question 4: Demo Mode Visibility ✅ RESOLVED

**Question**: Should we add a visual indicator when user is logged in as demo account?

**Options**:

- **A**: No indicator (treat like normal account)
- **B**: Small badge in header showing "Demo Mode"
- **C**: Banner at top of page reminding user of demo status

**Decision**: Option C - **Full-width banner at the very top of every page**:

- Height: 30-40px
- Sticky positioning at top
- Clear messaging: "🔬 Demo Mode - All data will be deleted when you log out"
- Possibly include link to convert to real account
- Should be prominent but not intrusive

---

## Success Criteria

### Functional Requirements

- [ ] Demo mode can be enabled/disabled via environment variable
- [ ] Login page shows demo mode option when enabled
- [ ] Demo page creates new account and logs user in
- [ ] Demo accounts are populated with sample data from demo-data.json
- [ ] Demo accounts have level set to 'demo'
- [ ] Demo account data is deleted when user logs out (user record preserved)
- [ ] Demo accounts cannot be logged into again

### Non-Functional Requirements

- [ ] Page load time for demo creation is under 3 seconds
- [ ] Demo data import handles all entities correctly
- [ ] Error messages are clear and helpful
- [ ] UI is consistent with existing auth pages
- [ ] Code follows BragDoc conventions (named exports, TypeScript strict mode, etc.)
- [ ] All new code has appropriate error handling

### Quality Requirements

- [ ] Unit tests pass for utilities and services
- [ ] Manual testing checklist completed
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## Files to Create

1. `apps/web/lib/demo-mode-utils.ts` - Demo mode utilities (email generation, etc.)
2. `apps/web/lib/import-user-data.ts` - Shared import library (extracted from existing import route)
3. `apps/web/lib/demo-data-import.ts` - Demo-specific import wrapper
4. `apps/web/lib/demo-data-cleanup.ts` - Demo account data cleanup utility (preserves user record)
5. `apps/web/lib/create-demo-account.ts` - Shared demo account creation logic
6. `apps/web/lib/demo-data.json` - Demo data file (moved from `packages/database/`)
7. `apps/web/app/api/demo/create/route.ts` - Demo account creation API endpoint
8. `apps/web/app/(auth)/demo/page.tsx` - Demo mode landing page (server component)
9. `apps/web/app/(auth)/demo/demo-form.tsx` - Demo mode form with button logic (client component)
10. `apps/web/app/(auth)/demo/actions.ts` - Demo account server action
11. `apps/web/components/demo-mode-prompt.tsx` - Login page demo mode prompt
12. `apps/web/components/demo-mode-banner.tsx` - Full-width demo mode banner for logged-in users
13. `apps/web/__tests__/api/demo/create.test.ts` - API route tests
14. `apps/web/__tests__/lib/demo-mode-utils.test.ts` - Utility function tests
15. `apps/web/__tests__/lib/demo-data-cleanup.test.ts` - Cleanup function tests
16. `apps/web/__tests__/lib/import-user-data.test.ts` - Shared import library tests
17. `apps/web/__tests__/lib/create-demo-account.test.ts` - Demo account creation function tests
18. `tasks/demo-mode/README.md` - Feature documentation

## Files to Modify

1. `packages/database/src/schema.ts` - Add 'demo' to existing userLevelEnum pgEnum
2. `apps/web/app/api/account/import/route.ts` - Refactor to use shared `importUserData` library
3. `apps/web/app/(auth)/login/page.tsx` - Add demo mode prompt
4. `apps/web/app/(auth)/auth.ts` - Add signOut event handler for demo account cleanup
5. `apps/web/app/(app)/layout.tsx` - Add demo mode banner component
6. `apps/web/.env.example` - Add DEMO_MODE_ENABLED environment variable
7. `CLAUDE.md` - Document demo mode feature and environment variable

---

## Next Steps

- [x] 1. Move `packages/database/demo-data.json` to `apps/web/lib/demo-data.json`
- [ ] 2. Begin implementation with Phase 1 (Database Schema Updates)
- [ ] 3. Mark tasks complete in this plan as you progress
- [ ] 4. Schedule code reviews after each major phase
- [ ] 5. Plan deployment strategy for production rollout
