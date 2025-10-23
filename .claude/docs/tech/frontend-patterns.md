# Frontend Patterns

## Overview

BragDoc uses Next.js 16 App Router with React 19 Server Components, Tailwind CSS, and shadcn/ui for a modern, performant frontend.

## Component Architecture

### Server Components (Default)

```typescript
// app/achievements/page.tsx
export default async function AchievementsPage() {
  const session = await auth();
  const achievements = await getAchievementsByUserId(session.user.id);

  return (
    <div>
      <h1>Achievements</h1>
      <AchievementsTable data={achievements} />
    </div>
  );
}
```

**Benefits:**
- Zero JavaScript sent to client
- Direct database access
- SEO-friendly
- Automatic code splitting

### Client Components

```typescript
'use client';

import { useState } from 'react';

export function AchievementForm() {
  const [title, setTitle] = useState('');

  return (
    <form>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
    </form>
  );
}
```

**When to use:**
- User interactivity (state, events)
- Browser APIs (localStorage, etc.)
- React hooks (useState, useEffect)
- Third-party libraries requiring browser

## Directory Structure

```
apps/web/components/
├── ui/                    # shadcn/ui primitives
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
├── achievements/          # Feature-specific
│   ├── achievement-card.tsx
│   ├── achievement-form.tsx
│   └── achievements-table.tsx
├── projects/
│   ├── project-card.tsx
│   └── project-form.tsx
├── dashboard/
│   ├── stats-card.tsx
│   └── recent-achievements.tsx
└── ...
```

## Styling with Tailwind

### Theme System

**File:** `apps/web/tailwind.config.js`

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))',
        // ... CSS variables
      },
    },
  },
};
```

**CSS Variables:** `apps/web/app/globals.css`

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
}
```

### Utility Classes

```tsx
<div className="bg-background text-foreground p-4 rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-primary">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Conditional Classes

```typescript
import { cn } from '@/lib/utils';

<button
  className={cn(
    "px-4 py-2 rounded",
    isActive && "bg-primary text-white",
    disabled && "opacity-50 cursor-not-allowed"
  )}
/>
```

## shadcn/ui Components

**Location:** `apps/web/components/ui/`

### Common Components
- Button, Input, Label, Textarea
- Dialog, Popover, DropdownMenu
- Table, Card, Tabs
- Select, Checkbox, RadioGroup

### Usage Example

```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

export function CreateAchievementDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Achievement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Achievement</DialogTitle>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  );
}
```

## Server Actions

**File:** `app/actions/achievements.ts`

```typescript
'use server';

import { auth } from '@/app/(auth)/auth';
import { createAchievement } from '@/database/queries';
import { revalidatePath } from 'next/cache';

export async function createAchievementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const [achievement] = await createAchievement({
    userId: session.user.id,
    title: formData.get('title') as string,
    summary: formData.get('summary') as string,
  });

  revalidatePath('/achievements');
  return achievement;
}
```

**Usage in Client Component:**

```typescript
'use client';

import { createAchievementAction } from '@/app/actions/achievements';

export function AchievementForm() {
  async function handleSubmit(formData: FormData) {
    const achievement = await createAchievementAction(formData);
    console.log('Created:', achievement);
  }

  return (
    <form action={handleSubmit}>
      <input name="title" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

## Data Fetching Patterns

### Server Component Data Fetching

```typescript
export default async function Page() {
  const [achievements, projects] = await Promise.all([
    getAchievements(),
    getProjects(),
  ]);

  return (
    <div>
      <AchievementsList achievements={achievements} />
      <ProjectsList projects={projects} />
    </div>
  );
}
```

### Client Component Data Fetching

```typescript
'use client';

import { useEffect, useState } from 'react';

export function AchievementsClient() {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    fetch('/api/achievements')
      .then(res => res.json())
      .then(data => setAchievements(data.achievements));
  }, []);

  return <div>{/* Render achievements */}</div>;
}
```

## Type Safety

```typescript
import type { Achievement, Project } from '@/database/schema';

interface AchievementCardProps {
  achievement: Achievement;
  project?: Project | null;
}

export function AchievementCard({ achievement, project }: AchievementCardProps) {
  return (
    <div>
      <h3>{achievement.title}</h3>
      {project && <span>{project.name}</span>}
    </div>
  );
}
```

## Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* Sidebar + Content */}
</div>
```

## Dark Mode

```typescript
'use client';

import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

## Forms

### With react-hook-form

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1),
  impact: z.number().min(1).max(10),
});

export function AchievementForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    await fetch('/api/achievements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      <input type="number" {...register('impact', { valueAsNumber: true })} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Loading States

```typescript
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<AchievementsSkeleton />}>
      <AchievementsTable />
    </Suspense>
  );
}

function AchievementsSkeleton() {
  return (
    <div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

## Zero State Patterns

Zero states provide welcoming, helpful UIs when users have no data. They guide users through initial setup and explain what actions to take.

### When to Use Zero States

- **New user onboarding**: User has just signed up with no data yet
- **Empty collections**: User has deleted or archived all items
- **Filtered results**: Current filters return no matches (different from true empty state)

### Zero State vs. Loading States

- **Loading state**: Data is being fetched (use Skeleton components)
- **Zero state**: Data has been fetched but is empty (guide the user)
- **Error state**: Fetch failed (show error message with retry)

### Conditional Rendering Pattern

**File:** `apps/web/app/(app)/dashboard/page.tsx`

```typescript
export default async function DashboardPage() {
  const session = await auth();

  // IMPORTANT: Never use redirect() in Server Components
  // It breaks Cloudflare Workers builds. Use fallback UI instead.
  if (!session?.user?.id) {
    return <div className="p-4">Please log in to view your dashboard.</div>;
  }

  const achievementStats = await getAchievementStats({ userId: session.user.id });
  const hasNoAchievements = achievementStats.totalAchievements === 0;

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Stats shown in both states */}
              <AchievementStats />

              {/* Conditional rendering based on data */}
              {hasNoAchievements ? (
                <DashboardZeroState />
              ) : (
                <ClientDashboardContent />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
```

### Zero State Component Structure

**File:** `apps/web/components/dashboard/dashboard-zero-state.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function DashboardZeroState() {
  const [isChecking, setIsChecking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const router = useRouter();

  const handleCheckForAchievements = async () => {
    setIsChecking(true);
    setShowFeedback(false);

    // Refresh server components to re-fetch data
    router.refresh();

    // Show feedback if still in zero state after refresh
    setTimeout(() => {
      setShowFeedback(true);
      setIsChecking(false);
    }, 1000);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Welcome message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to BragDoc!</h1>
          <p className="text-lg text-muted-foreground">
            Let's get started by extracting achievements from your Git repositories
          </p>
        </div>

        {/* Instructions card */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step-by-step CLI instructions */}
          </CardContent>
        </Card>

        {/* Action button with feedback */}
        <div className="flex flex-col items-center gap-2">
          <Button
            size="lg"
            onClick={handleCheckForAchievements}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : "I've run the CLI - Check for achievements"}
          </Button>

          {showFeedback && (
            <p className="text-sm text-muted-foreground text-center">
              No achievements yet. Did you run <code>bragdoc extract</code>?
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Key Zero State Principles

1. **Centered Layout**: Use `flex items-center justify-center` with `max-w-2xl` constraint
2. **Clear Instructions**: Provide step-by-step guidance (numbered lists work well)
3. **Call to Action**: Include an interactive button or link to next step
4. **Helpful Feedback**: Show messages when user takes action but problem persists
5. **Client Component**: Zero states typically need interactivity (`'use client'`)
6. **Refresh Pattern**: Use `router.refresh()` to check for data updates

### Cloudflare Workers Compatibility

**CRITICAL**: Never use `redirect()` from `next/navigation` in Server Components. It causes build errors with Cloudflare Workers deployment.

```typescript
// ❌ WRONG - Breaks Cloudflare Workers build
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect('/login'); // ❌ Fails at build time
  }
}

// ✅ CORRECT - Use fallback UI
export default async function Page() {
  const session = await auth();
  if (!session) {
    return <div>Please log in.</div>; // ✅ Works in all environments
  }
}
```

**Why this matters**:
- Cloudflare Workers use edge runtime which doesn't support `redirect()` during build
- Proxy middleware at `apps/web/proxy.ts` handles authentication redirects at route level
- Fallback UI is rarely shown to users since proxy catches unauthorized requests
- This pattern ensures compatibility with all deployment targets

**Real-world example**: See `apps/web/app/cli-auth/page.tsx` for the canonical implementation of this pattern.

### Other Zero State Examples

**Standup Zero State**: `apps/web/components/standups/standup-zero-state.tsx`
- Similar centered layout pattern
- Guides users to set up standups
- Uses same shadcn/ui components (Card, Button)

**Achievement Zero State**: Could be added to `/achievements` page
- "No achievements yet" message
- Link to dashboard or CLI instructions
- Create first achievement button

## Middleware/Proxy Pattern

### Authentication Proxy

**Location**: `apps/web/proxy.ts` (Next.js 16+)

As of Next.js 16, the middleware file has been renamed to `proxy.ts`. The proxy handles authentication checks before requests reach pages or API routes.

**Implementation**:

```typescript
import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import type { NextMiddleware } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth as NextMiddleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
```

**Key Points**:
- **File naming**: `proxy.ts` in Next.js 16+ (was `middleware.ts` in Next.js 15)
- **Type annotation**: Use `NextMiddleware` type for proper type inference
- **Matcher config**: Excludes static files, images, and auth endpoints
- **Authentication**: NextAuth integration provides seamless session checks

**How it works**:
1. All requests matching the pattern go through the proxy first
2. NextAuth checks for valid session (cookie-based) or JWT (header-based)
3. Unauthorized requests to protected routes redirect to login
4. Authorized requests proceed to the target route
5. This allows Server Components to show fallback UI instead of using `redirect()`

**Prior to Next.js 16**: This file was named `middleware.ts` with the same functionality.

---

**Last Updated:** 2025-10-23 (Next.js 16 upgrade)
**Next.js:** 16.0.0
**React:** 19.2.0
