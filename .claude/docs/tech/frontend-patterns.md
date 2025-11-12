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

### Detail Page Pattern

**Purpose:** Display individual entity pages (e.g., `/reports/:id`, `/projects/:id`) with view, edit, and delete capabilities.

**Architecture:** Split responsibility between Server Component (data) and Client Component (interactivity).

**Server Component Responsibilities:**

- Authenticate user via `auth()`
- Fetch entity by ID with database joins (e.g., document + company)
- Scope ALL queries by `userId` for security
- Return 404 via `notFound()` if entity not found or unauthorized
- Fetch supporting data (e.g., user's companies for edit dropdowns)
- Pass typed data as props to client component

**Client Component Responsibilities:**

- Manage local state for optimistic updates
- Handle user interactions (edit, delete, print)
- Call API routes for persistence
- Use `router.push()` or `router.refresh()` for navigation/revalidation

**Key Principles:**

- **Never use `redirect()` in server components** - breaks Cloudflare Workers builds
- **Always scope by userId** - both in initial fetch and in API routes
- **Use shared types** from `@bragdoc/database` (e.g., `DocumentWithCompany`)
- **Optimistic updates** - update client state immediately, rollback on error

**Example Implementation:** See `apps/web/app/(app)/reports/[id]/page.tsx` (server) and `report-detail-view.tsx` (client)

### Server/Client Data Fetching Pattern

When building components that need both server-side data and client-side interactivity, use this pattern to avoid client-side data fetching overhead and loading skeletons.

**Pattern: Server-Fetched Props with Client Interactivity**

The AppSidebar demonstrates this pattern:
- Layout fetches data server-side (`auth.api.getSession()`, `getTopProjectsByImpact()`)
- Data passed to client component as props
- Client component handles interactivity (mobile toggle, active state, user dropdown)

**Implementation:**

```typescript
// Server Component (app/(app)/layout.tsx)
import { auth } from '@/lib/better-auth/server';
import { getTopProjectsByImpact } from '@/database/projects/queries';
import { headers } from 'next/headers';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch session server-side
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Fetch top projects server-side
  const topProjects = session?.user
    ? await getTopProjectsByImpact(session.user.id, 5).catch(() => [])
    : [];

  // Transform user object for AppSidebar component
  const sidebarUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        image: session.user.image || undefined,
      }
    : undefined;

  return (
    <AppSidebar
      variant="inset"
      user={sidebarUser}
      topProjects={topProjects}
    />
  );
}

// Client Component (app-sidebar.tsx)
'use client';

import type { ProjectWithImpact } from '@bragdoc/database';
import { useSidebar } from '@/components/ui/sidebar';

interface AppSidebarProps {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  } | undefined;
  topProjects: ProjectWithImpact[];
}

export function AppSidebar({ user, topProjects }: AppSidebarProps) {
  // Use client hooks for interactivity only (no data fetching)
  const { isMobile, setOpenMobile } = useSidebar();

  // Render with server-provided data
  return (
    <Sidebar>
      {/* Render sidebar with user and topProjects */}
    </Sidebar>
  );
}

// Child Client Component (nav-projects.tsx)
'use client';

import type { ProjectWithImpact } from '@bragdoc/database';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/ui/sidebar';

interface NavProjectsProps {
  projects?: ProjectWithImpact[];
}

export function NavProjects({ projects = [] }: NavProjectsProps) {
  // Use client hooks for interactivity only (no data fetching)
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      {/* Render projects received as props */}
    </SidebarGroup>
  );
}
```

**Benefits:**

- **Zero client-side data fetching**: No loading states or skeleton screens
- **Faster initial render**: Data fetched server-side in parallel with component rendering
- **Smaller JavaScript bundle**: No data fetching code shipped to browser
- **No waterfall requests**: Parallel server fetches vs. sequential client fetches
- **Better SEO**: Server-rendered content immediately available
- **Simpler client components**: Only handle interactivity, not data management

**When to Use This Pattern:**

- Data needed for initial render (dashboards, layouts, sidebar navigation)
- Hierarchical data fetching (parent layout fetches for child components)
- Components that are primarily interactive UI, not data-driven
- Performance-critical pages (reduce JS bundle size and network requests)

**When NOT to Use This Pattern:**

- Data that changes frequently client-side (use useState + API calls)
- User-initiated data fetching (search, filtering, pagination)
- Data dependent on client state (theme, user preferences stored in localStorage)
- Real-time data (use WebSocket or polling instead)

**Key Principles:**

- **Pass data as props from server to client**, not via React Context
- **Keep server components for data fetching**, client components for interactivity
- **Client components can receive server-rendered props** - no `use client` restriction
- **Always scope data by userId** in server components for security
- **Transform data at server layer** (shape for component consumption)
- **Prefer error boundaries** for error handling over try-catch in individual components

**Files:**

- `apps/web/app/(app)/layout.tsx` - Server-side data fetching and component composition
- `apps/web/components/app-sidebar.tsx` - Client component with props interface
- `apps/web/components/nav-projects.tsx` - Child client component using props

### Canvas Editor Integration Pattern

**Purpose:** Launch the inline canvas editor for document content editing from any view (detail pages, tables, etc.).

**Mechanism:** Use the `useArtifact()` hook to set artifact state, which triggers the global `ArtifactCanvas` component to appear.

**Critical Requirement:** Documents MUST have a `chatId` field to load the conversation context. Legacy documents without `chatId` cannot use the canvas editor.

**Implementation Steps:**

1. Import `useArtifact` hook and destructure `setArtifact`
2. Validate `chatId` exists - show error toast and log if missing
3. Call `setArtifact()` with required fields: `documentId`, `chatId`, `kind`, `title`, `content`, `isVisible: true`, `status: 'idle'`
4. Global canvas renders automatically via shared layout

**Error Handling:**

- Always validate `chatId` exists before calling `setArtifact()`
- Show user-friendly toast: "This document is missing a chat. Please contact support."
- Log error details for debugging legacy data issues

**Example Implementation:** See `apps/web/app/(app)/reports/[id]/report-detail-view.tsx` `handleContentClick` function

### Print-Ready Content Rendering

**Purpose:** Make document content print beautifully by hiding UI chrome and optimizing typography for paper.

**Approach:** Use Tailwind's `print:` variant to conditionally apply styles only when printing.

**Elements to Hide:**

- Navigation (back links, breadcrumbs)
- Action buttons (Edit, Delete, Print)
- Dialogs and modals
- Zero state messages
- Hover effects and shadows

**Elements to Keep:**

- Main content with Markdown rendering
- Document title and metadata
- Company/date information (if relevant to printed document)

**Print Button:** Add a button that calls `window.print()` to trigger browser print dialog. Hide this button in print with `print:hidden`.

**Responsive Padding:** Use screen-size-aware padding (e.g., `p-4 sm:p-8 lg:p-12`) to ensure content looks good on screen AND when printed on letter/A4 paper.

**Example Implementation:** See `apps/web/app/(app)/reports/[id]/report-detail-view.tsx`

### Metadata Edit Dialog Pattern

**Purpose:** Allow users to edit entity metadata (title, type, company, etc.) without full page reload, with immediate visual feedback.

**Architecture:** Controlled dialog with callback-based optimistic updates.

**Component Structure:**

- **Dialog props**: `open`, `onOpenChange`, entity data, related data (e.g., companies dropdown)
- **Callback prop**: `onUpdate(updates)` - parent calls this to update its local state optimistically
- **Local state**: Form fields (title, type, etc.), loading state

**Validation Flow:**

1. Use Zod schema for client-side validation
2. Validate on submit - show toast error if validation fails
3. Only proceed to API call if validation passes

**Optimistic Update Flow:**

1. Call `onUpdate()` callback immediately with new values
2. Parent updates its local state instantly (user sees change)
3. Make API PUT request in background
4. On success: close dialog, `router.refresh()` to sync server state
5. On error: show toast, optionally rollback optimistic update

**Loading States:**

- Disable form fields during submission
- Disable submit button with loading text ("Saving...")
- Prevent dialog close during submission

**Key UX Principles:**

- Immediate visual feedback via optimistic updates
- Clear validation errors via toast notifications
- Loading states prevent double-submission
- `router.refresh()` ensures server and client stay in sync

**Example Implementation:** See `apps/web/components/reports/edit-report-metadata-dialog.tsx` and usage in `report-detail-view.tsx`

## Mobile Navigation Pattern

### SiteHeader Requirement

All pages in the authenticated app (`(app)` route group) MUST include the `SiteHeader` component to ensure mobile users can access navigation. The `SiteHeader` component provides:

- Sidebar toggle button (hamburger menu) for mobile navigation
- Consistent page title display
- GitHub link (desktop only)

**Critical:** Without `SiteHeader`, mobile users have NO way to access the sidebar navigation since it's hidden by default on mobile screens.

### Standard Page Structure

All authenticated app pages follow this structure using the `AppContent` wrapper component for consistent spacing:

```tsx
import { AppPage } from '@/components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { AppContent } from '@/components/shared/app-content';

export default function YourPage() {
  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Your Page Title" />
        <AppContent>
          {/* Page content with automatic responsive spacing */}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
```

**AppContent Component:**

- **Location:** `apps/web/components/shared/app-content.tsx`
- **Purpose:** Provides consistent responsive padding and gap spacing for page content
- **Mobile spacing:** `p-2` and `gap-2` (< lg breakpoint)
- **Desktop spacing:** `p-6` and `gap-6` (lg+ breakpoint)
- **Structure:** Wraps content with flex layout and container queries

### Key Principles

- **Always include SiteHeader**: Every app page needs it for mobile navigation
- **Pass explicit title**: Don't rely on the default "Achievement Dashboard" title
- **Position first**: `SiteHeader` should be the first child of `SidebarInset`
- **Avoid redundant headers**: Don't duplicate the page title in the content area

### Component Props

```typescript
interface SiteHeaderProps {
  title?: string; // Default: "Achievement Dashboard"
}
```

### Example: Standard Page with Actions

When adding `SiteHeader` with action buttons:

```tsx
<SidebarInset>
  <SiteHeader title="Companies">
    <Button onClick={handleAddCompany}>
      <IconPlus className="size-4" />
      <span className="hidden lg:inline">Add Company</span>
    </Button>
  </SiteHeader>
  <AppContent>
    <CompaniesTable data={companies} />
  </AppContent>
</SidebarInset>
```

**Guidelines:**

- Remove any duplicate `<h1>` titles (provided by `SiteHeader`)
- Use `AppContent` wrapper for consistent responsive spacing (no need for manual `p-6 gap-6`)
- Pass action buttons as children to `SiteHeader`
- Follow responsive button patterns for mobile vs. desktop display (see below)

## Responsive Spacing Convention

BragDoc uses a mobile-first responsive spacing convention throughout the app:

### Spacing Standards

- **Mobile (< lg breakpoint):** Use `p-2` and `gap-2` for padding and gaps
- **Desktop (lg+ breakpoint):** Use `p-6` and `gap-6` for padding and gaps
- **Tailwind classes:** `p-2 lg:p-6` and `gap-2 lg:gap-6`

### AppContent Implementation

The `AppContent` component automatically handles page-level spacing:

```tsx
// apps/web/components/shared/app-content.tsx
export function AppContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div
          className={cn('flex flex-col gap-2 p-2 md:p-6 md:gap-6', className)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Note:** `AppContent` uses `md:` breakpoint for padding to provide intermediate tablet sizing, but `gap-2` remains until `md:gap-6` for consistency.

### Component-Level Responsive Spacing

For components that need custom responsive spacing (not using `AppContent`):

```tsx
// Manual responsive spacing in components
<div className="flex flex-col gap-2 p-2 lg:gap-6 lg:p-6">
  {/* Component content */}
</div>

// Responsive grid gaps
<div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-6">
  {/* Grid items */}
</div>
```

### When to Use Manual Spacing

Use manual responsive spacing when:

- Building reusable components with internal spacing
- Creating layouts within dialogs or cards
- Implementing custom grid layouts
- Overriding default `AppContent` spacing (pass custom `className`)

**Always prefer `AppContent` for page-level content** to maintain consistency.

## Responsive Button Patterns

Action buttons in page headers (passed as `SiteHeader` children) follow responsive patterns for optimal mobile experience.

### Pattern 1: Icon-Only on Mobile, Full Button on Desktop

For single action buttons:

```tsx
<SiteHeader title="Companies">
  <Button onClick={handleAddCompany}>
    <IconPlus className="size-4" />
    <span className="hidden lg:inline">Add Company</span>
  </Button>
</SiteHeader>
```

**Behavior:**

- **Mobile (< lg):** Shows icon only
- **Desktop (lg+):** Shows icon + "Add Company" text

### Pattern 2: Dropdown Menu on Mobile, Multiple Buttons on Desktop

For multiple action buttons:

```tsx
<SiteHeader title="Reports">
  <ReportActions />
</SiteHeader>;

// apps/web/app/(app)/reports/report-actions.tsx
export function ReportActions() {
  return (
    <>
      {/* Desktop: Show all buttons */}
      <div className="hidden lg:flex gap-2">
        <Button asChild>
          <Link href="/reports/new/weekly">
            <IconPlus className="size-4" />
            Weekly
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports/new/monthly">
            <IconPlus className="size-4" />
            Monthly
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports/new/custom">
            <IconPlus className="size-4" />
            Custom
          </Link>
        </Button>
      </div>

      {/* Mobile: Show dropdown */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon">
              <IconPlus className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/reports/new/weekly">Weekly Report</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/reports/new/monthly">Monthly Report</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/reports/new/custom">Custom Report</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
```

**Behavior:**

- **Mobile (< lg):** Shows single icon button that opens dropdown menu
- **Desktop (lg+):** Shows all three buttons side-by-side

### Pattern 3: Icon-Only for Secondary Actions

For detail page secondary actions:

```tsx
<SiteHeader title={project.name}>
  {/* Desktop: full button */}
  <Button className="hidden lg:flex" onClick={handleEdit}>
    <IconEdit className="size-4" />
    Edit Project
  </Button>

  {/* Mobile: icon only */}
  <Button size="icon" className="lg:hidden" onClick={handleEdit}>
    <IconEdit className="size-4" />
  </Button>
</SiteHeader>
```

**Behavior:**

- **Mobile (< lg):** Shows icon-only button
- **Desktop (lg+):** Shows full button with text

### Guidelines

- **Use `lg` breakpoint** for button text visibility (1024px+)
- **Icon size:** Always use `size-4` for consistency
- **Button variants:** Primary action uses default, secondary uses `outline`
- **Dropdown alignment:** Use `align="end"` to align with trigger button
- **Multiple actions:** Use dropdown menu on mobile when > 2 actions
- **Single action:** Use text hide/show pattern for single buttons

## Stat Component Pattern

The `Stat` component provides a reusable card format for displaying statistical information with consistent styling.

### Component Location

**File:** `apps/web/components/shared/stat.tsx`

### Usage

```tsx
import { Stat } from '@/components/shared/stat';
import { IconTarget } from '@tabler/icons-react';

<Stat
  label="Total Achievements"
  value={84}
  badge={{
    icon: <IconTarget className="size-3" />,
    label: 'All Time',
  }}
  footerHeading={{
    text: 'Your career highlights',
    icon: <IconTarget className="size-4" />,
  }}
  footerDescription="Click to view all achievements"
  clickable
/>;
```

### Props

```typescript
interface StatProps {
  /** The label/description shown above the value */
  label: string;
  /** The main stat value to display */
  value: string | number;
  /** Badge content (icon + text) - hidden on mobile (< md) */
  badge?: {
    icon: React.ReactNode;
    label: string;
  };
  /** Footer heading with optional icon */
  footerHeading?: {
    text: string;
    icon?: React.ReactNode;
  };
  /** Footer description text */
  footerDescription?: string;
  /** Additional className for the card */
  className?: string;
  /** If true, adds hover effects for clickable stats */
  clickable?: boolean;
}
```

### Features

- **Built-in styling:** Gradient background (`from-primary/5 to-card`) and shadow
- **Responsive typography:** Value scales from `text-2xl` to `text-3xl` at 250px container width
- **Mobile-responsive badges:** Hidden on `< md` breakpoint to save space
- **Clickable variant:** Optional hover effects with `cursor-pointer transition-colors hover:bg-muted/50`
- **Container queries:** Uses `@container/card` for responsive sizing
- **Optional sections:** Badge, footer heading, and footer description are all optional

### Usage Examples

#### Basic Stat

```tsx
<Stat label="Total Projects" value={12} />
```

#### Clickable Stat with Link

```tsx
<Link href="/achievements">
  <Stat label="Total Achievements" value={84} clickable />
</Link>
```

#### Stat with All Features

```tsx
<Stat
  label="Achievements This Month"
  value={15}
  badge={{
    icon: <IconTrendingUp className="size-3" />,
    label: '+20%',
  }}
  footerHeading={{
    text: 'Great progress',
    icon: <IconSparkles className="size-4" />,
  }}
  footerDescription="Keep up the momentum"
/>
```

#### Stat Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-6">
  <Link href="/achievements">
    <Stat label="Total Achievements" value={achievements.total} clickable />
  </Link>
  <Link href="/projects">
    <Stat label="Active Projects" value={projects.active} clickable />
  </Link>
  <Link href="/reports">
    <Stat label="Reports Generated" value={reports.count} clickable />
  </Link>
</div>
```

### Design Guidelines

- **Use for dashboard metrics:** Achievement counts, project stats, document counts
- **Use for detail page stats:** Project achievement count, date ranges, status info
- **Wrap with Link:** Make stats clickable navigation elements when appropriate
- **Grid layouts:** Use responsive grid with matching gap spacing (gap-2 lg:gap-6)
- **Badge icons:** Use size-3 for badge icons, size-4 for footer heading icons
- **Value formatting:** Use numbers for counts, strings for formatted values (e.g., "$1,234")

### Current Usage

- **Dashboard page:** Achievement stats via `AchievementStats` component
- **Project details page:** Project-specific achievement statistics
- **Potential usage:** Companies page, reports page, any page with metrics

### Achievement Editing Pattern

Achievement editing uses a parent-managed dialog with callback-based mode switching. Child components (AchievementsTable, AchievementItem) expose `onEdit` callbacks that parent components handle by opening AchievementDialog in edit mode with the pre-selected achievement. The pattern mirrors the impact rating inline editing callback approach.

**Key components:**

- Parent page manages dialog state (open/closed, mode, selected achievement)
- Child components call `onEdit(achievement)` when edit button clicked
- AchievementDialog supports `mode` prop ('create' | 'edit')
- On save, parent calls appropriate mutation (create or update) and refreshes list

This pattern enables editing from multiple view contexts (table, list, card) without duplicating dialog logic.

## Achievement Display Patterns

BragDoc displays achievements in different formats depending on the context: full table views on desktop, compact list views on mobile/narrow columns, and detailed card views for focus.

### AchievementItem Component

The `AchievementItem` component provides a reusable, mobile-friendly layout for displaying achievements in list views and narrow columns.

**Location:** `apps/web/components/achievements/achievement-item.tsx`

**When to use:**

- Mobile views of achievement lists
- Dashboard or detail page achievement displays
- Narrow column layouts (e.g., stand-ups page half-width columns)
- Any context where a compact, card-like layout is preferred over a full table

**Key features:**

- Displays `eventStart` date using relative time format (e.g., "3 days ago")
- Shows impact rating via `ImpactRating` component with optional `onChange` callback for editing
- Displays project name with color coding and optional source badge
- Responsive layout (company hidden on mobile via `hidden lg:flex`)
- Handles null `eventStart` gracefully by only rendering the date if present

**Component Interface:**

```typescript
interface AchievementItemProps {
  achievement: AchievementWithRelations;
  onImpactChange?: (id: string, impact: number) => void;
  readOnly?: boolean;
  showSourceBadge?: boolean;
  linkToAchievements?: boolean;
}
```

**Current Usage:**

- Achievements table (mobile view) - `apps/web/components/achievements-table.tsx`
- Project details page - `apps/web/app/(app)/projects/[id]/page.tsx`
- Stand-ups page - `apps/web/components/standups/recent-achievements-table.tsx` (both assigned and orphaned achievements)

**Example:**

```tsx
import { AchievementItem } from '@/components/achievements/achievement-item';

<div className="space-y-4">
  {achievements.map((achievement) => (
    <div
      key={achievement.id}
      className="border-b border-border pb-4 last:border-b-0"
    >
      <AchievementItem
        achievement={achievement}
        onImpactChange={handleImpactChange}
        readOnly={false}
        showSourceBadge={true}
        linkToAchievements={false}
      />
    </div>
  ))}
</div>;
```

**Styling pattern:** Use `border-b border-border pb-4 last:border-b-0` to separate achievement items with bottom borders, removing the border on the last item.

### AchievementsTable Component

The `AchievementsTable` component provides a full-featured table view for desktop and automatically switches to `AchievementItem` cards on mobile.

**Location:** `apps/web/components/achievements-table.tsx`

**Key features:**

- Time period filtering (this-week, this-month, last-30-days, etc.) based on `eventStart` dates
- Sorting by `eventStart` (descending) with `createdAt` as tiebreaker
- Project and company filtering
- Search across title, summary, and details
- Responsive: table view on desktop, card view on mobile
- Selection checkboxes for bulk operations

**Filtering Logic:**
All time period filters apply to `eventStart` (when the achievement occurred) rather than `createdAt` (when it was recorded). This ensures users see achievements from the time period they expect, especially important for historical repositories and bulk imports.

**Sorting Logic:**
Achievements are sorted by `eventStart` (most recent first) with `createdAt` as a tiebreaker for achievements with the same event date. Achievements with null `eventStart` fall back to `createdAt` for sorting.

### When to Use Each Pattern

**Use `AchievementItem` when:**

- Displaying achievements on mobile or in narrow columns
- Context requires a compact, scannable list
- Want to show event dates prominently
- Need consistent styling across different page contexts

**Use `AchievementsTable` when:**

- Full-featured table view is appropriate (desktop with wide space)
- Need advanced filtering, sorting, and search
- Bulk operations (selection) are required
- Maximum information density is desired

### Achievement Sorting and Filtering

**Critical Pattern:** Always use `eventStart` for sorting and filtering achievements, not `createdAt`.

**Why:** Users importing historical repositories or bulk-adding achievements will have a significant mismatch between `eventStart` (when the achievement occurred) and `createdAt` (when it was recorded in BragDoc). Sorting or filtering by `createdAt` produces counterintuitive results where old achievements appear first if recently imported.

**Implementation:**

```typescript
// Sort by eventStart (descending), with createdAt as tiebreaker
const sorted = achievements.sort((a, b) => {
  const aDate = a.eventStart?.getTime() ?? a.createdAt.getTime();
  const bDate = b.eventStart?.getTime() ?? b.createdAt.getTime();
  if (aDate !== bDate) {
    return bDate - aDate; // Most recent first
  }
  return b.createdAt.getTime() - a.createdAt.getTime(); // Tiebreaker
});

// Filter by eventStart (with fallback to createdAt for null values)
const filtered = achievements.filter((achievement) => {
  const eventDate = achievement.eventStart ?? achievement.createdAt;
  // Apply date range filter to eventDate, not createdAt
  return eventDate >= startDate && eventDate <= endDate;
});
```

**Null Handling:** Always provide a fallback to `createdAt` when `eventStart` is null to ensure all achievements appear in filters and sorting.

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
│   ├── achievement-item.tsx  # Mobile-friendly achievement display
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

### SWR Multi-Hook Cache Synchronization

When a single user action affects multiple SWR cache keys (different API endpoints), ensure all affected caches are invalidated to keep the UI synchronized. This pattern prevents stale data when components fetch from different endpoints but display related information. For example, creating a project must invalidate both `/api/projects` (general list) and `/api/projects/top?limit=5` (top projects list) to ensure dashboard and sidebar components refresh immediately.

**Implementation:** Import all related SWR hooks in the mutation hook and call each `mutate()` function after the operation completes. This ensures components using different hooks stay synchronized without requiring manual page refreshes. See `apps/web/hooks/useProjects.ts` for the canonical implementation where `useCreateProject()`, `useUpdateProject()`, and `useDeleteProject()` all mutate both the general projects cache and the top projects cache.

**Why this matters:** SWR maintains independent caches for each unique cache key. Mutating only one cache leaves other components showing stale data until their cache expires or the user manually refreshes. Multi-hook mutation ensures immediate consistency across the entire UI, critical for operations that affect rankings, filtered lists, or multiple views of the same data.

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

BragDoc follows mobile-first responsive patterns with consistent spacing conventions (see Responsive Spacing Convention section).

### Grid Layouts

```tsx
// Responsive grid with consistent gap spacing
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-6">
  <Stat label="Total" value={100} />
  <Stat label="Active" value={45} />
  <Stat label="Completed" value={55} />
</div>

// Two-column responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-6">
  {/* Cards */}
</div>
```

### Flex Layouts

```tsx
// Vertical to horizontal responsive layout
<div className="flex flex-col md:flex-row gap-2 lg:gap-6">
  {/* Sidebar + Content */}
</div>

// Responsive wrapping with consistent gaps
<div className="flex flex-wrap gap-2 lg:gap-4">
  {/* Items */}
</div>
```

### Breakpoint Usage

- **Mobile-first:** Default styles target mobile, use responsive variants to adapt upward
- **Key breakpoints:**
  - `md:` (768px) - Tablet layout changes
  - `lg:` (1024px) - Desktop layout and spacing increases
- **Spacing convention:** `gap-2 lg:gap-6` and `p-2 lg:p-6` (or `md:p-6` for padding)

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

### Zero State Pattern in Detail Pages

Detail pages can display zero states when associated collections are empty (e.g., a project with no achievements). Unlike dashboard zero states, detail page zero states preserve the entity header (name, description) and swap out only the content area. Use conditional rendering: check if collection is empty, then show zero state OR full content.

Place zero state components in feature-specific subdirectories following the pattern `components/[feature]/[feature]-zero-state.tsx`. Components should use the same refresh pattern as dashboard zero states (router.refresh() with setTimeout for feedback) and maintain consistent styling (centered flex layout, max-w-2xl, shadcn/ui Card and Button components).

**Examples:** `ProjectDetailsZeroState` (apps/web/components/project-details/project-zero-state.tsx), `DashboardZeroState` (apps/web/components/dashboard/dashboard-zero-state.tsx)

### Other Zero State Examples

**Standup Zero State**: `apps/web/components/standups/standup-zero-state.tsx`

- Similar centered layout pattern
- Guides users to set up standups
- Uses same shadcn/ui components (Card, Button)

**Achievement Zero State**: Could be added to `/achievements` page

- "No achievements yet" message
- Link to dashboard or CLI instructions
- Create first achievement button

## Authentication Components

### Magic Link Authentication Pattern

BragDoc uses passwordless magic link authentication with a custom form component that provides two distinct states: email input form and "check your email" confirmation.

**File:** `apps/web/components/magic-link-auth-form.tsx`

```tsx
'use client';

import { useState } from 'react';
import Form from 'next/form';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Mail, Check } from 'lucide-react';

interface MagicLinkAuthFormProps {
  mode: 'login' | 'register';
  tosAccepted?: boolean;
  onTosChange?: (accepted: boolean) => void;
  children?: React.ReactNode;
}

export function MagicLinkAuthForm({
  mode,
  tosAccepted,
  onTosChange,
  children,
}: MagicLinkAuthFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    const email = formData.get('email') as string;

    try {
      // Use Better Auth signIn with magic link
      const { signIn } = await import('@/lib/better-auth/client');
      await signIn.magicLink({
        email,
        callbackURL: '/dashboard',
      });

      // Magic link sent successfully
      setIsEmailSent(true);
      setIsSubmitting(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="px-4 sm:px-16 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600 dark:text-green-300" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Click the link in the email to{' '}
            {mode === 'login' ? 'sign in' : 'complete your registration'}.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setIsEmailSent(false);
            setEmail('');
          }}
          className="mt-4"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <Form action={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {children}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Mail className="mr-2 h-4 w-4 animate-pulse" />
            Sending magic link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            {mode === 'login' ? 'Send magic link' : 'Continue with email'}
          </>
        )}
      </Button>
    </Form>
  );
}
```

**Key Features:**

- **Two-state UI**: Email input form and "check your email" confirmation
- **Mode prop**: Different text for login vs. registration
- **Loading states**: "Sending magic link..." with pulsing icon
- **Error handling**: User-friendly error messages
- **Success state**: Green checkmark with confirmation message
- **Reset option**: "Use a different email" button
- **Children prop**: Allows ToS checkbox to be passed in for registration
- **Dynamic import**: Better Auth signIn imported only when needed

**Form State:**

```typescript
<MagicLinkAuthForm mode="login" | "register">
  {/* Optional: ToS checkbox for registration */}
</MagicLinkAuthForm>
```

**Confirmation State:**
After submitting email, the form displays:

- Success icon (green checkmark in rounded circle)
- Email address confirmation
- Instructions to click the link
- "Use a different email" option to restart

**Implementation Details:**

- Uses Better Auth's `signIn.magicLink()` method
- No password fields
- Mobile-responsive (padding adjusts on sm screens)
- Email input with validation (required, type="email")
- Progressive enhancement with Next.js Form component

**Usage in Pages:**

```tsx
// Registration page
'use client';

import { useState } from 'react';
import { MagicLinkAuthForm } from '@/components/magic-link-auth-form';

export default function RegisterPage() {
  const [tosAccepted, setTosAccepted] = useState(false);

  return (
    <MagicLinkAuthForm mode="register">
      <div className="mb-4">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            required
          />
          <span>I agree to the Terms of Service</span>
        </label>
      </div>
    </MagicLinkAuthForm>
  );
}

// Login page
import { MagicLinkAuthForm } from '@/components/magic-link-auth-form';

export default function LoginPage() {
  return <MagicLinkAuthForm mode="login" />;
}
```

### OAuth ToS Acceptance Pattern

BragDoc displays Terms of Service acceptance text above OAuth buttons to inform users that signing in constitutes acceptance of the Terms of Service and Privacy Policy. This is the industry-standard "implicit acceptance" pattern used by major OAuth implementations.

**File:** `apps/web/components/social-auth-buttons.tsx`

```tsx
'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function SocialAuthButtons() {
  const marketingSiteHost =
    process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

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
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            {/* Google icon SVG */}
          </svg>
          Google
        </Button>
        <Button
          variant="outline"
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            {/* GitHub icon SVG */}
          </svg>
          GitHub
        </Button>
      </div>
    </div>
  );
}
```

**Key Features:**

- **Client Component**: Uses `'use client'` directive for onClick handlers
- **ToS Acceptance Text**: Displayed between divider and buttons with proper spacing
- **Clickable Links**: Terms and Privacy Policy links open in new tabs
- **Styling Conventions**:
  - Text color: `text-gray-600 dark:text-zinc-400` for main text
  - Link color: `text-gray-800 dark:text-zinc-200` with `underline`
  - Centered: `text-center` with horizontal padding `px-2`
  - Spacing: `mt-4 mb-3` separates from buttons
- **Environment Variable**: Uses `NEXT_PUBLIC_MARKETING_SITE_HOST` for link base URL
- **Accessibility**: `target="_blank"` with `rel="noopener noreferrer"` for security
- **Dark Mode**: Supports both light and dark theme variants

**Legal Text Styling Pattern:**

When displaying legal text with links in components:

1. Use muted text colors for main text (`text-gray-600 dark:text-zinc-400`)
2. Use darker colors for links (`text-gray-800 dark:text-zinc-200`)
3. Always include `underline` on links for visibility
4. Always use `target="_blank"` and `rel="noopener noreferrer"` for external links
5. Center text when it's a standalone legal notice
6. Provide adequate spacing from interactive elements

**Usage in Pages:**

```tsx
// apps/web/app/(auth)/login/page.tsx
import { SocialAuthButtons } from '@/components/social-auth-buttons';

export default function LoginPage() {
  return (
    <div>
      {/* Email/password form */}

      <SocialAuthButtons />
    </div>
  );
}
```

This component is used on both `/login` and `/register` pages, ensuring consistent ToS acceptance messaging across all OAuth flows.

## Middleware/Proxy Pattern

### Authentication Proxy

**Location**: `apps/web/proxy.ts` (Next.js 16+)

As of Next.js 16, the middleware file has been renamed to `proxy.ts`. The proxy handles authentication checks before requests reach pages or API routes.

**Implementation**:

```typescript
import { auth } from '@/lib/better-auth/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
  // Check for Better Auth session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Redirect to login if not authenticated
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
```

**Key Points**:

- **File naming**: `proxy.ts` in Next.js 16+ (was `middleware.ts` in Next.js 15)
- **Type annotation**: Use `NextMiddleware` type for proper type inference
- **Matcher config**: Excludes static files, images, and auth endpoints
- **Authentication**: Better Auth integration provides seamless session checks

**How it works**:

1. All requests matching the pattern go through the proxy first
2. Better Auth checks for valid session (database-backed with cookie caching)
3. Unauthorized requests to protected routes redirect to login
4. Authorized requests proceed to the target route
5. This allows Server Components to show fallback UI instead of using `redirect()`

**Prior to Next.js 16**: This file was named `middleware.ts` with the same functionality.

## Analytics Integration

### PostHog Setup

BragDoc uses PostHog for privacy-first product analytics with different configurations for marketing and web app.

#### Marketing Site (Cookieless Mode)

**File:** `apps/marketing/components/posthog-provider.tsx`

```typescript
'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        persistence: 'memory',  // Cookieless mode - GDPR compliant
        disable_persistence: true,  // No cookies or localStorage
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
      });
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

**Integration in Layout:**

```typescript
// apps/marketing/app/layout.tsx
import { PHProvider } from '@/components/posthog-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <PHProvider>
            {children}
          </PHProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Key Features:**

- **No cookies**: `persistence: 'memory'` - session-only tracking
- **GDPR compliant**: No persistent storage before consent
- **Automatic pageviews**: Tracks all page navigations
- **Debug mode**: Enabled in development for testing

#### Web App (Conditional Persistence)

**File:** `apps/web/components/posthog-provider.tsx`

```typescript
'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        persistence: session ? 'localStorage+cookie' : 'memory',  // Conditional
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
      });

      // Identify user after authentication
      if (session?.user?.id) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.name,
        });
      }
    }
  }, [session]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

**Integration in Providers:**

```typescript
// apps/web/components/providers.tsx
import { PHProvider } from '@/components/posthog-provider';

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <PHProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </PHProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
```

**Key Features:**

- **Conditional persistence**: Memory-only before auth, localStorage+cookie after
- **User identification**: Automatic identify() call on authentication
- **Session-aware**: Reacts to Better Auth session changes
- **Cross-domain tracking**: Same PostHog key as marketing site

### Client-Side Event Tracking

#### Custom Tracking Hook (Marketing Site)

**File:** `apps/marketing/hooks/use-posthog.ts`

```typescript
'use client';

import { usePostHog } from 'posthog-js/react';

export function useTracking() {
  const posthog = usePostHog();

  const trackCTAClick = (
    location: string,
    ctaText: string,
    destinationUrl: string
  ) => {
    posthog?.capture('marketing_cta_clicked', {
      location,
      cta_text: ctaText,
      destination_url: destinationUrl,
    });
  };

  const trackFeatureExplored = (featureName: string, page: string) => {
    posthog?.capture('feature_explored', {
      feature_name: featureName,
      page,
    });
  };

  const trackPricingInteraction = (planViewed: string) => {
    posthog?.capture('plan_comparison_interacted', {
      plan_viewed: planViewed,
    });
  };

  return {
    trackCTAClick,
    trackFeatureExplored,
    trackPricingInteraction,
  };
}
```

#### Usage in Components

```typescript
'use client';

import { useTracking } from '@/hooks/use-posthog';
import { Button } from '@/components/ui/button';

export function HeroCTA() {
  const { trackCTAClick } = useTracking();

  return (
    <Button
      onClick={() => trackCTAClick('homepage_hero', 'Get Started Free', '/register')}
      href="/register"
    >
      Get Started Free
    </Button>
  );
}
```

**Pattern:**

- Use `usePostHog()` hook from `posthog-js/react`
- Always use optional chaining (`posthog?.capture()`) to prevent errors
- Event names use snake_case
- Property names use snake_case
- Track before navigation (onClick handlers)

#### Direct PostHog Hook (Web App)

```typescript
'use client';

import { usePostHog } from 'posthog-js/react';

export function FeatureButton() {
  const posthog = usePostHog();

  const handleClick = () => {
    posthog?.capture('feature_used', {
      feature_name: 'achievement_export',
      source: 'dashboard',
    });
    // ... feature logic
  };

  return <button onClick={handleClick}>Export Achievements</button>;
}
```

### Server-Side Event Tracking

#### PostHog Server Client

**File:** `apps/web/lib/posthog-server.ts`

```typescript
/**
 * Server-side PostHog client optimized for Cloudflare Workers
 * Uses HTTP API approach for immediate event delivery in stateless environment
 */

export async function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event,
          properties: {
            ...properties,
            distinct_id: userId,
          },
          timestamp: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      console.error('PostHog capture failed:', await response.text());
    }
  } catch (error) {
    // Analytics failures should never break user experience
    console.error('PostHog error:', error);
  }
}

export async function identifyUser(
  userId: string,
  properties: Record<string, any>
) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event: '$identify',
          properties: {
            ...properties,
            distinct_id: userId,
          },
          timestamp: new Date().toISOString(),
        }),
      }
    );
  } catch (error) {
    console.error('PostHog identify error:', error);
  }
}
```

**Why HTTP API Instead of posthog-node:**

- **Cloudflare Workers**: Stateless isolates with no persistent process
- **Immediate delivery**: No batching or flush cycles needed
- **No shutdown lifecycle**: Each request completes independently
- **Simpler**: No singleton management or cleanup

#### Usage in API Routes

```typescript
// app/api/achievements/route.ts
import { captureServerEvent } from '@/lib/posthog-server';
import { getAuthUser } from '@/lib/getAuthUser';
import { db } from '@bragdoc/database';
import { achievement } from '@bragdoc/database/schema';
import { eq, count } from 'drizzle-orm';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... validation and creation logic

  // Check if this is first achievement
  const [{ count: achievementCount }] = await db
    .select({ count: count() })
    .from(achievement)
    .where(eq(achievement.userId, auth.user.id));

  if (achievementCount === 1) {
    await captureServerEvent(auth.user.id, 'first_achievement_created', {
      source: 'manual',
    });
  }

  return NextResponse.json(newAchievement);
}
```

**Pattern:**

- Always use `await` with `captureServerEvent()`
- Track first-time feature usage by checking counts
- Include contextual properties (source, type, etc.)
- Never let analytics errors break the API response

#### Usage in Server Actions

```typescript
// app/(auth)/actions.ts
'use server';

import { captureServerEvent, identifyUser } from '@/lib/posthog-server';

export async function register(formData: FormData) {
  // ... validation and user creation

  const user = await db.insert(user).values({
    email,
    password: hashedPassword,
    tosAcceptedAt: new Date(),
  });

  // Track signup and identify user
  await captureServerEvent(user.id, 'user_signed_up', {
    method: 'email',
  });

  await identifyUser(user.id, {
    email: user.email,
    name: user.name,
  });

  return { success: true };
}
```

### Event Naming Conventions

**Marketing Events:**

- `marketing_cta_clicked` - CTA button/link clicks
- `feature_explored` - Feature page interactions
- `plan_comparison_interacted` - Pricing page engagement

**Authentication Events:**

- `user_signed_up` - New user registration
- `user_logged_in` - User login

**Feature Adoption Events:**

- `first_achievement_created` - First achievement (any source)
- `first_project_created` - First project
- `first_report_generated` - First document generation

**CLI Events:**

- `cli_installed` - CLI authentication completed
- `cli_extract_completed` - Achievement extraction via CLI

**Engagement Events:**

- `zero_state_cta_clicked` - Zero state interactions
- `document_generated` - Document generation

### Properties Best Practices

**Always include:**

- Contextual information (location, source, type)
- User action details (what they clicked, selected, etc.)
- Never include PII (passwords, achievement content, document text)

**Property naming:**

- Use snake_case for consistency
- Be descriptive but concise
- Use consistent values across events

**Example:**

```typescript
posthog?.capture('marketing_cta_clicked', {
  location: 'homepage_hero', // Where on the page
  cta_text: 'Get Started Free', // What the button says
  destination_url: '/register', // Where it goes
});
```

### Privacy & GDPR Compliance

**Marketing Site:**

- ✅ Cookieless mode (no consent banner needed)
- ✅ No persistent storage
- ✅ Session-only tracking
- ✅ IP anonymization (PostHog default)

**Web App:**

- ✅ No tracking before authentication
- ✅ Persistent storage only after login
- ✅ User can delete account (removes all analytics data)
- ✅ No PII in event properties

**Legal:**

- Privacy Policy at `/privacy-policy` discloses PostHog usage
- Terms of Service at `/terms` requires acceptance
- ToS acceptance tracked with `tosAcceptedAt` timestamp in database

### Testing Analytics

**Development:**

```typescript
// PostHog automatically enables debug mode in development
posthog.init(key, {
  loaded: (posthog) => {
    if (process.env.NODE_ENV === 'development') posthog.debug();
  },
});
```

**Browser DevTools:**

1. Open Network tab, filter by "posthog"
2. See POST requests to `/capture/` endpoint
3. Inspect request payload for event data

**PostHog Dashboard:**

1. Navigate to Live Events
2. See events appear within 30 seconds
3. Verify event properties are correct

## Beta Messaging Patterns (Marketing Site)

**Context:** These patterns were established during the marketing site beta banners implementation (October 2025) to communicate open beta status, free features, and future pricing clearly to users.

### Beta Banner Pattern

**Purpose:** Prominent full-width banner to announce beta status and special offers.

**Location:** `apps/marketing/components/pricing/beta-banner.tsx`

**Pattern:**

```tsx
import { Sparkles } from 'lucide-react';

export function BetaBanner() {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-center">
          <Sparkles className="size-5 shrink-0" />
          <div>
            <p className="font-bold text-base sm:text-lg">
              OPEN BETA - All Features Currently{' '}
              <span className="text-green-300">FREE</span>
            </p>
            <p className="text-sm sm:text-base opacity-95">
              Sign up now and get <strong>one year free</strong> when we launch
              paid plans
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Usage:**

```tsx
// In page.tsx
import { BetaBanner } from '@/components/pricing/beta-banner';

export default function PricingPage() {
  return (
    <>
      <Header />
      <BetaBanner />
      <main>{/* ... */}</main>
    </>
  );
}
```

**Design Guidelines:**

- **Gradient background:** `from-purple-600 to-purple-500` (brand colors)
- **White text** for high contrast
- **Green emphasis** (`text-green-300`) for "FREE" keyword
- **Bold text** for main message and key phrases
- **Icon:** Sparkles icon to draw attention
- **Responsive:** Smaller text on mobile, larger on desktop
- **Centered:** Full-width container with centered content

### Strikethrough Pricing Pattern

**Purpose:** Display future pricing while emphasizing current free status.

**Pattern:**

```tsx
<div className="text-center mb-4">
  <Badge className="text-2xl px-6 py-2 bg-green-600 dark:bg-green-500 text-white">
    FREE During Beta
  </Badge>
</div>

<div className="text-center">
  <div className="flex items-baseline justify-center gap-2 text-muted-foreground">
    <span className="text-3xl font-semibold line-through opacity-60">$4.99</span>
    <span className="text-base line-through opacity-60">/month</span>
  </div>
  <p className="text-xs text-muted-foreground mt-1">
    Future price after beta
  </p>
</div>
```

**Design Guidelines:**

- **Large "FREE" badge:** 2xl text size, green background
- **Strikethrough pricing:** `line-through opacity-60` for muted appearance
- **Muted text color:** `text-muted-foreground` to de-emphasize future pricing
- **Label below:** "Future price after beta" to clarify pricing timeline
- **Semantic hierarchy:** FREE > Strikethrough > Label (decreasing emphasis)

### Beta Badge Pattern

**Purpose:** Subtle indicator for features still in beta.

**Location:** `apps/marketing/components/features-page-client.tsx`

**Pattern:**

```tsx
import { Badge } from '@/components/ui/badge';

interface Feature {
  heading: string;
  isBeta?: boolean;
  // ... other props
}

export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
        {feature.heading}
        {feature.isBeta && (
          <Badge variant="secondary" className="text-xs">
            Beta
          </Badge>
        )}
      </h2>
      {/* ... */}
    </div>
  );
}
```

**Design Guidelines:**

- **Badge variant:** `secondary` for subtle, muted appearance
- **Small size:** `text-xs` to avoid overwhelming the heading
- **Inline placement:** Next to heading using flexbox
- **Optional property:** `isBeta?: boolean` flag for maintainability
- **Flex wrap:** Ensures badge wraps on mobile if needed
- **When to use:** Only for actual beta features (not just new features)

### Promotional Callout Pattern

**Purpose:** Highlight special offers or benefits for beta users.

**Pattern:**

```tsx
<div className="w-full p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
  <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
    🎁 Sign up during beta → Get one year FREE when we launch
  </p>
</div>
```

**Design Guidelines:**

- **Green color scheme:** Positive, benefit-oriented messaging
- **Light background:** `bg-green-50` in light mode, `bg-green-950/30` in dark
- **Border:** Subtle green border for definition
- **Emoji:** Gift emoji (🎁) adds visual interest
- **Center alignment:** For promotional messaging
- **Font weight:** Medium for emphasis without being bold
- **Dark mode:** Lower opacity background to avoid overwhelming

### Color Scheme Guidelines

**Beta Messaging Colors:**

| Context                | Light Mode                                      | Dark Mode                          | Purpose                       |
| ---------------------- | ----------------------------------------------- | ---------------------------------- | ----------------------------- |
| FREE emphasis          | `text-green-600`                                | `text-green-500`                   | Positive, current benefit     |
| Beta banner background | `from-purple-600 to-purple-500`                 | `from-purple-700 to-purple-600`    | Brand colors, high visibility |
| Strikethrough pricing  | `text-muted-foreground line-through opacity-60` | Same                               | De-emphasized future pricing  |
| Promotional box        | `bg-green-50 border-green-200`                  | `bg-green-950/30 border-green-800` | Special offer highlight       |
| Beta badge             | `variant="secondary"`                           | Same                               | Subtle information badge      |

### Responsive Considerations

**Mobile (375px - 767px):**

- Beta banner text: `text-base` main, `text-sm` secondary
- Flex wrap on headings with badges
- Full-width promotional callouts
- Stack pricing cards vertically

**Tablet (768px - 1023px):**

- Beta banner text: `sm:text-lg` main, `sm:text-base` secondary
- Pricing cards may stack or show 2-up depending on content
- Badges remain inline with headings

**Desktop (1024px+):**

- Full text sizes
- Pricing cards show side-by-side
- Maximum visual impact for beta messaging

### When to Use These Patterns

**Use Beta Banner when:**

- Announcing product-wide beta status
- Communicating time-limited offers
- Driving action (sign-ups, early adoption)

**Use Strikethrough Pricing when:**

- Showing future pricing while emphasizing current free access
- Providing price transparency during beta
- Balancing "free now" with "paid later" messaging

**Use Beta Badges when:**

- Marking individual features as beta
- Communicating feature stability/maturity
- Setting expectations for feature completeness

**Use Promotional Callouts when:**

- Highlighting special beta user benefits
- Emphasizing time-sensitive offers
- Drawing attention to value propositions

### Example: Full Pricing Page Integration

```tsx
import { BetaBanner } from '@/components/pricing/beta-banner';
import { Badge } from '@/components/ui/badge';

export default function PricingPage() {
  return (
    <>
      <Header />
      <BetaBanner />

      <main className="pt-16">
        <PricingHeader />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Account */}
          <Card>
            <CardHeader>
              <CardTitle>Free Account</CardTitle>
              <CardDescription>Always free, even after beta</CardDescription>
            </CardHeader>
            {/* ... */}
          </Card>

          {/* Full Account */}
          <Card>
            <CardHeader>
              <CardTitle>Full Account</CardTitle>
              <CardDescription>
                Everything you need - currently FREE during open beta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Strikethrough Pricing Pattern */}
              <div className="text-center mb-4">
                <Badge className="text-2xl px-6 py-2 bg-green-600 text-white">
                  FREE During Beta
                </Badge>
              </div>
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-2 text-muted-foreground">
                  <span className="text-3xl font-semibold line-through opacity-60">
                    $4.99
                  </span>
                  <span className="text-base line-through opacity-60">
                    /month
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Future price after beta
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {/* Promotional Callout Pattern */}
              <div className="w-full p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                  🎁 Sign up during beta → Get one year FREE when we launch
                </p>
              </div>
              <Button size="lg" className="w-full">
                Get Started Free
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </>
  );
}
```

### Accessibility Notes

- **Color contrast:** All green text meets WCAG AA standards
- **Strikethrough clarity:** Combined with "Future price" label for screen readers
- **Badge semantics:** Uses proper Badge component with ARIA attributes
- **Keyboard navigation:** All interactive elements remain accessible
- **Screen reader testing:** Verify beta status is announced clearly

### Maintenance Guidelines

**When updating beta status:**

1. Update BetaBanner component first (most visible)
2. Update pricing tiers strikethrough/badges
3. Update FAQ data to match messaging
4. Update metadata (title, description) for SEO
5. Test all viewports and both color modes

**When transitioning out of beta:**

1. Remove or hide BetaBanner component
2. Remove "FREE During Beta" badges
3. Remove strikethrough from pricing
4. Update FAQ answers to remove beta references
5. Update metadata to remove beta status
6. Keep promotional callouts for early users (if applicable)

---

## Workstreams Components

### Component Architecture

**WorkstreamBadge** (`apps/web/components/workstreams/workstream-badge.tsx`)

- Client component displaying workstream as colored badge
- Uses shadcn/ui Badge with custom border/text color styling
- Optional remove button for interactive contexts
- Handles nullable color field with fallback to default blue

**WorkstreamCard** (`apps/web/components/workstreams/workstream-card.tsx`)

- Client component for workstream summary display
- Shows colored indicator, name, description, achievement count
- Optional edit/delete actions
- Wrappable with Link for navigation to detail pages

**WorkstreamList** (`apps/web/components/workstreams/workstream-list.tsx`)

- Grid layout with responsive columns (md:2, lg:3)
- Loading state with spinner
- Empty state messaging
- Uses useWorkstreams hook for data fetching

**AssignmentDialog** (`apps/web/components/workstreams/assignment-dialog.tsx`)

- Modal for manually assigning achievements to workstreams
- Shows current assignment with highlighting
- Supports unassignment (null workstreamId)
- Async assignment with loading states

### Data Hook

**useWorkstreams** (`apps/web/hooks/use-workstreams.ts`)

- SWR-based data fetching and caching
- Returns workstreams, counts, and metadata
- Provides generateWorkstreams() and assignWorkstream() methods
- Auto-refreshes after mutations
- Handles loading and error states

### Integration Patterns

**Achievement Cards:** Display workstream badge using conditional rendering based on workstreamId

**Achievements Table:** Add workstream filter dropdown that includes "Unassigned" option

**Dashboard:** Integrate WorkstreamStatus widget into dashboard grid layout

**Navigation:** Add /workstreams route to sidebar navigation with TrendingUp icon

**Detail Pages:** Server component fetching workstream and related achievements with ownership verification

---

## SEO Patterns (Marketing Site)

For comprehensive SEO documentation including metadata patterns, schema.org structured data, sitemap configuration, image optimization, and testing procedures, see **[seo.md](./seo.md)**.

---

**Last Updated:** 2025-10-29 (AppContent wrapper pattern, responsive spacing conventions, Stat component, responsive button patterns)
**Next.js:** 16.0.0
**React:** 19.2.0
