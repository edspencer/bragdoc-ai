# Frontend Patterns

## Overview

BragDoc uses Next.js 15 App Router with React 19 Server Components, Tailwind CSS, and shadcn/ui for a modern, performant frontend.

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

---

**Last Updated:** 2025-10-21
**Next.js:** 15.1.8
**React:** 19.0.0
