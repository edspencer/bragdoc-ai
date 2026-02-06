# Phase 5: User Interface - Research

**Researched:** 2026-02-06
**Domain:** React UI components, real-time state updates, upgrade modals, subscription status display
**Confidence:** HIGH

## Summary

This phase implements the user-facing components that display credit status, chat message counters, and subscription information. The existing codebase already has all the foundational pieces: shadcn/ui Dialog component for modals, Progress component for visual indicators, Badge and Tooltip components for status display, and the sidebar architecture for global visibility. The credit checking utilities from Phase 2 and subscription status helpers from Phase 3 provide the data layer.

The primary patterns involve: (1) a global credit status context/provider to avoid prop drilling and enable real-time updates after operations, (2) upgrade modal dialogs triggered when credits/messages are exhausted, (3) sidebar integration for always-visible credit display, and (4) inline disabled states with tooltips for buttons when credits are insufficient.

**Primary recommendation:** Create a `CreditStatusProvider` context that wraps the app layout, fetches credit status on mount and after operations, and provides hooks for components to access status and trigger upgrade modals. Use the existing shadcn/ui Dialog for upgrade modals and the existing Progress component for visual credit indicators.

## Standard Stack

The established libraries/tools for this phase:

### Core (Already in Codebase)
| Library | Version | Purpose | Location |
|---------|---------|---------|----------|
| shadcn/ui Dialog | radix-ui unified | Modal dialogs | `components/ui/dialog.tsx` |
| shadcn/ui Progress | radix-ui unified | Credit progress bar | `components/ui/progress.tsx` |
| shadcn/ui Badge | radix-ui unified | Status badges | `components/ui/badge.tsx` |
| shadcn/ui Tooltip | radix-ui unified | Disabled button hints | `components/ui/tooltip.tsx` |
| shadcn/ui Card | radix-ui unified | Pricing comparison cards | `components/ui/card.tsx` |
| React Context | React 19+ | Global credit state | Built-in |
| useUser hook | Custom | User data fetching | `hooks/use-user.ts` |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| @tabler/icons-react | Icons for UI elements | Already used throughout |
| class-variance-authority | Component variants | Already used in Badge, Button |
| Tailwind CSS | Styling | Already used throughout |

### No New Dependencies Required

This phase uses only existing UI primitives and React patterns. No new npm packages needed.

## Architecture Patterns

### Recommended Component Structure

```
apps/web/
├── components/
│   ├── credit-status/
│   │   ├── credit-status-provider.tsx    # Context provider
│   │   ├── credit-status-display.tsx     # Sidebar/header display
│   │   ├── chat-message-counter.tsx      # Chat UI counter
│   │   ├── upgrade-modal.tsx             # Upgrade prompt dialog
│   │   └── index.ts                      # Exports
│   ├── subscription/
│   │   ├── subscription-status.tsx       # Account page status
│   │   └── pricing-comparison.tsx        # Annual vs lifetime cards
│   └── ui/
│       └── credit-gated-button.tsx       # Button with credit check
├── hooks/
│   └── use-credit-status.ts              # Hook to access context
└── app/(app)/
    ├── layout.tsx                        # Add CreditStatusProvider
    ├── account/
    │   └── page.tsx                      # Add subscription section
    └── upgrade/
        └── page.tsx                      # Pricing comparison page
```

### Pattern 1: Credit Status Context Provider

**What:** Global context for credit/message status with refresh capability
**When to use:** Wrap the authenticated app layout
**Example:**
```typescript
// Source: Codebase pattern from demo-mode-provider.tsx
'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@bragdoc/database';

interface CreditStatus {
  freeCredits: number;
  freeChatMessages: number;
  isUnlimited: boolean;
  subscriptionType: 'free' | 'yearly' | 'lifetime' | 'demo';
  daysRemaining?: number;
}

interface CreditStatusContextValue {
  status: CreditStatus | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  showUpgradeModal: (reason: 'credits' | 'messages') => void;
}

const CreditStatusContext = createContext<CreditStatusContextValue | null>(null);

export function CreditStatusProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User;
}) {
  const [status, setStatus] = useState<CreditStatus | null>(
    initialUser ? deriveStatusFromUser(initialUser) : null
  );
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'credits' | 'messages'>('credits');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/user/credit-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to refresh credit status:', err);
    }
  }, []);

  const showUpgradeModal = useCallback((reason: 'credits' | 'messages') => {
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  }, []);

  // Fetch on mount if no initial user
  useEffect(() => {
    if (!initialUser) {
      refresh().finally(() => setIsLoading(false));
    }
  }, [initialUser, refresh]);

  return (
    <CreditStatusContext.Provider value={{ status, isLoading, refresh, showUpgradeModal }}>
      {children}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        reason={upgradeReason}
      />
    </CreditStatusContext.Provider>
  );
}

export function useCreditStatus() {
  const context = useContext(CreditStatusContext);
  if (!context) {
    throw new Error('useCreditStatus must be used within CreditStatusProvider');
  }
  return context;
}
```

### Pattern 2: Sidebar Credit Display

**What:** Always-visible credit/message status in sidebar footer
**When to use:** Add to AppSidebar above NavUser
**Example:**
```typescript
// Source: Codebase pattern from app-sidebar.tsx
'use client';

import { useCreditStatus } from '@/components/credit-status';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SidebarGroup, SidebarGroupContent } from '@/components/ui/sidebar';

export function CreditStatusDisplay() {
  const { status, isLoading, showUpgradeModal } = useCreditStatus();

  // Don't show for paid/demo users or while loading
  if (isLoading || !status || status.isUnlimited) {
    if (status?.isUnlimited) {
      // Show "Unlimited" badge for paid users
      return (
        <SidebarGroup>
          <SidebarGroupContent>
            <Badge variant="secondary" className="w-full justify-center">
              Unlimited Access
            </Badge>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }
    return null;
  }

  const creditPercent = (status.freeCredits / 10) * 100;
  const messagePercent = (status.freeChatMessages / 20) * 100;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="space-y-3 px-2">
        {/* Credits display */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Credits</span>
            <span>{status.freeCredits}/10</span>
          </div>
          <Progress value={creditPercent} className="h-1.5" />
        </div>

        {/* Messages display */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Chat Messages</span>
            <span>{status.freeChatMessages}/20</span>
          </div>
          <Progress value={messagePercent} className="h-1.5" />
        </div>

        {/* Upgrade link when low */}
        {(status.freeCredits <= 2 || status.freeChatMessages <= 3) && (
          <button
            onClick={() => showUpgradeModal('credits')}
            className="text-xs text-primary hover:underline"
          >
            Upgrade for unlimited
          </button>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
```

### Pattern 3: Upgrade Modal Dialog

**What:** Modal shown when credits/messages exhausted
**When to use:** Triggered by API 402 responses or manual upgrade clicks
**Example:**
```typescript
// Source: Codebase pattern from dialog.tsx and delete-account-dialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconCheck, IconSparkles, IconCrown } from '@tabler/icons-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'credits' | 'messages';
}

export function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  const title = reason === 'credits'
    ? "You've used all your free credits"
    : "You've used all your free chat messages";

  const description = reason === 'credits'
    ? "You've used all 10 free credits. Upgrade for unlimited document generation."
    : "You've used all 20 free messages. Upgrade for unlimited chat conversations.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Annual Option */}
          <Card className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Annual</CardTitle>
              <CardDescription>Billed yearly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$45<span className="text-lg font-normal text-muted-foreground">/year</span></div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-green-600" />
                  Unlimited credits
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-green-600" />
                  Unlimited chat messages
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-green-600" />
                  Cancel anytime
                </li>
              </ul>
              <Button className="mt-4 w-full" asChild>
                <a href="/api/stripe/checkout?plan=yearly">Get Annual</a>
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime Option */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary">Best Value</Badge>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <IconCrown className="size-4 text-yellow-500" />
                Lifetime
              </CardTitle>
              <CardDescription>One-time payment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$99<span className="text-lg font-normal text-muted-foreground"> once</span></div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-green-600" />
                  Unlimited forever
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-green-600" />
                  No recurring payments
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-green-600" />
                  = 2.2 years of annual
                </li>
              </ul>
              <Button className="mt-4 w-full" variant="default" asChild>
                <a href="/api/stripe/checkout?plan=lifetime">Get Lifetime</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Secure payment via Stripe. You can dismiss this and continue with limited access.
        </p>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 4: Credit-Gated Button with Tooltip

**What:** Button that shows disabled state with tooltip when credits insufficient
**When to use:** Generate buttons throughout the app
**Example:**
```typescript
// Source: Codebase pattern from button.tsx and tooltip.tsx
'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreditStatus } from '@/components/credit-status';

interface CreditGatedButtonProps extends ButtonProps {
  creditsRequired?: number;
  requiresChatMessage?: boolean;
  children: React.ReactNode;
}

export function CreditGatedButton({
  creditsRequired = 1,
  requiresChatMessage = false,
  disabled,
  children,
  ...props
}: CreditGatedButtonProps) {
  const { status, showUpgradeModal } = useCreditStatus();

  // Paid users always enabled
  if (status?.isUnlimited) {
    return <Button disabled={disabled} {...props}>{children}</Button>;
  }

  // Check credit/message availability
  const hasSufficientCredits = !creditsRequired || (status?.freeCredits ?? 0) >= creditsRequired;
  const hasSufficientMessages = !requiresChatMessage || (status?.freeChatMessages ?? 0) > 0;
  const isBlocked = !hasSufficientCredits || !hasSufficientMessages;

  if (isBlocked) {
    const tooltipText = !hasSufficientCredits
      ? `Requires ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''}. Upgrade for unlimited access.`
      : 'No chat messages remaining. Upgrade for unlimited access.';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              disabled
              {...props}
              onClick={(e) => {
                e.preventDefault();
                showUpgradeModal(!hasSufficientCredits ? 'credits' : 'messages');
              }}
            >
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    );
  }

  return <Button disabled={disabled} {...props}>{children}</Button>;
}
```

### Pattern 5: Chat Message Counter

**What:** Inline counter in chat interface showing messages used
**When to use:** Chat components (performance review chat, document chat)
**Example:**
```typescript
// Source: Codebase pattern from chat-interface.tsx
'use client';

import { useCreditStatus } from '@/components/credit-status';
import { Badge } from '@/components/ui/badge';

export function ChatMessageCounter() {
  const { status } = useCreditStatus();

  // Don't show for unlimited users
  if (!status || status.isUnlimited) {
    return null;
  }

  const remaining = status.freeChatMessages;
  const isLow = remaining <= 3;

  return (
    <Badge
      variant={isLow ? 'destructive' : 'secondary'}
      className="text-xs"
    >
      {remaining}/20 messages
    </Badge>
  );
}
```

### Pattern 6: Subscription Status on Account Page

**What:** Section showing current plan and management options
**When to use:** Account settings page
**Example:**
```typescript
// Source: Codebase pattern from account/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCreditStatus } from '@/components/credit-status';
import { IconCrown, IconCalendar } from '@tabler/icons-react';

export function SubscriptionStatus() {
  const { status, isLoading } = useCreditStatus();

  if (isLoading || !status) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Your current plan and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.subscriptionType === 'lifetime' && (
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
              <IconCrown className="size-3 mr-1" />
              Lifetime Access
            </Badge>
            <span className="text-sm text-muted-foreground">
              No renewal needed - you're set forever!
            </span>
          </div>
        )}

        {status.subscriptionType === 'yearly' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Annual Plan</Badge>
              <span className="text-sm text-muted-foreground">
                <IconCalendar className="inline size-3 mr-1" />
                {status.daysRemaining} days until renewal
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/stripe/portal">Manage Subscription</a>
            </Button>
          </div>
        )}

        {status.subscriptionType === 'free' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline">Free Plan</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>{status.freeCredits} credits remaining</p>
              <p>{status.freeChatMessages} chat messages remaining</p>
            </div>
            <Button asChild>
              <a href="/upgrade">Upgrade to Unlimited</a>
            </Button>
          </div>
        )}

        {status.subscriptionType === 'demo' && (
          <div className="flex items-center gap-3">
            <Badge variant="outline">Demo Mode</Badge>
            <span className="text-sm text-muted-foreground">
              Full access for demonstration
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Anti-Patterns to Avoid

- **Prop drilling credit status:** Use context provider, don't pass status through 5+ component levels
- **Blocking UI for loading:** Show skeleton/placeholder, don't blank the sidebar while loading status
- **Dark patterns in upgrade modal:** Easy dismiss, no fake urgency timers, clear pricing
- **Client-only enforcement:** Real enforcement is server-side (402 responses); UI is advisory/UX only
- **Duplicate status fetching:** One provider, one API call, shared state via context

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialog | Custom overlay | shadcn/ui Dialog | Accessibility, focus trap, animations |
| Progress indicator | Custom div widths | shadcn/ui Progress | Proper ARIA, consistent styling |
| Tooltip on disabled | Title attribute | shadcn/ui Tooltip | Proper positioning, styling, accessibility |
| Global state | Multiple useState | React Context | Single source of truth, no prop drilling |
| Credit calculations | Inline math | `checkUserCredits()` from lib/credits | Handles paid/demo bypass |
| Subscription status | Multiple if/else | `getSubscriptionStatus()` from lib/stripe | Handles expiry, lifetime, demo |

**Key insight:** shadcn/ui already provides all the primitives. Focus on composition, not creation.

## Common Pitfalls

### Pitfall 1: Context Re-render Storm
**What goes wrong:** Every credit change re-renders entire app tree
**Why it happens:** Single context value object recreated on every state change
**How to avoid:** Split context into separate state and actions contexts, or use useMemo for value object
**Warning signs:** Sluggish UI after credit operations, profiler shows unnecessary re-renders

### Pitfall 2: Stale Credit Display After Operation
**What goes wrong:** User generates document, sidebar still shows old credit count
**Why it happens:** Credit display reads from initial server-fetched data, not refreshed after operation
**How to avoid:** Call `refresh()` from credit context after any credit-consuming API call
**Warning signs:** User refreshes page to see updated credits

### Pitfall 3: Demo/Paid Users See Credit UI
**What goes wrong:** Unlimited users see "10/10 credits" instead of "Unlimited" badge
**Why it happens:** Not checking `isUnlimited` before rendering credit display
**How to avoid:** Always check `status.isUnlimited` first in all credit display components
**Warning signs:** Demo mode showing credit counters

### Pitfall 4: Upgrade Modal Trap
**What goes wrong:** User cannot dismiss modal, feels forced to upgrade
**Why it happens:** `showCloseButton={false}` or preventing dismiss on overlay click
**How to avoid:** Always allow escape key and close button; modal should inform, not trap
**Warning signs:** User complaints about pushy upgrade prompts

### Pitfall 5: Hydration Mismatch
**What goes wrong:** Server renders "Loading..." but client immediately shows status
**Why it happens:** Initial server render doesn't have user data, client has it in context
**How to avoid:** Pass initial user data from server component to provider; use Suspense boundaries
**Warning signs:** React hydration errors in console, flickering UI

### Pitfall 6: Missing Loading States
**What goes wrong:** Button appears enabled, user clicks, nothing happens
**Why it happens:** Credit status still loading, button not disabled yet
**How to avoid:** Show skeleton/disabled state while `isLoading` is true
**Warning signs:** User can click generate before status is known

## Code Examples

### Credit Status API Endpoint
```typescript
// Source: apps/web/app/api/user/credit-status/route.ts (new)
import { getAuthUser } from '@/lib/getAuthUser';
import { getUserById } from '@bragdoc/database';
import { getSubscriptionStatus } from '@/lib/stripe/subscription';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch fresh user data for current credit balances
  const user = await getUserById(auth.user.id);
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const subscription = getSubscriptionStatus(user);

  return Response.json({
    freeCredits: user.freeCredits ?? 10,
    freeChatMessages: user.freeChatMessages ?? 20,
    isUnlimited: subscription.isActive,
    subscriptionType: subscription.type,
    daysRemaining: subscription.daysRemaining,
  });
}
```

### Refresh After Credit Operation
```typescript
// Source: Pattern for components that consume credits
'use client';

import { useCreditStatus } from '@/components/credit-status';

export function DocumentGenerateButton() {
  const { refresh, showUpgradeModal } = useCreditStatus();

  const handleGenerate = async () => {
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      // ...
    });

    if (response.status === 402) {
      // Insufficient credits - show upgrade modal
      showUpgradeModal('credits');
      return;
    }

    if (response.ok) {
      // Success - refresh credit display
      await refresh();
      // ... handle success
    }
  };

  return (
    <CreditGatedButton onClick={handleGenerate} creditsRequired={1}>
      Generate
    </CreditGatedButton>
  );
}
```

### Layout Integration
```typescript
// Source: apps/web/app/(app)/layout.tsx modification
import { CreditStatusProvider } from '@/components/credit-status';
import { getUserById } from '@bragdoc/database';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  // Fetch user with credit data for initial hydration
  const user = session?.user?.id
    ? await getUserById(session.user.id)
    : undefined;

  return (
    // ... existing providers
    <CreditStatusProvider initialUser={user}>
      <SidebarProvider>
        <AppSidebar /* ... existing props */ />
        <CreditStatusDisplay /> {/* Add to sidebar */}
        {children}
      </SidebarProvider>
    </CreditStatusProvider>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prop drilling status | React Context provider | React 16.3+ (stable) | Cleaner component tree |
| Global Redux store | Context + hooks for UI state | 2023+ trend | Less boilerplate |
| Modal as separate route | Dialog component inline | shadcn/ui pattern | Better UX, no navigation |
| Server-only rendering | Server + client hydration | Next.js 13+ | Initial data without fetch |

**Deprecated/outdated:**
- Class components for dialogs (use functional with hooks)
- jQuery-style DOM manipulation for modals
- Global event bus for UI state

## Open Questions

1. **Credit Status Polling vs Event-Based**
   - What we know: Current approach refreshes on demand (after operations)
   - What's unclear: Should we poll periodically in case credits change externally (e.g., admin grant)?
   - Recommendation: No polling. Refresh on mount and after operations. External changes are rare.

2. **Upgrade Modal Positioning**
   - What we know: shadcn Dialog centers in viewport
   - What's unclear: Should we use Drawer on mobile instead of Dialog?
   - Recommendation: Start with Dialog. Add responsive Drawer if user feedback indicates need.

3. **Pricing Page vs Inline Modal**
   - What we know: Requirements mention both upgrade modal and pricing comparison page
   - What's unclear: Should modal link to /upgrade page or contain full comparison inline?
   - Recommendation: Modal contains quick comparison. Link to /upgrade for full details.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/web/components/ui/dialog.tsx` - Dialog component examined
- Existing codebase: `apps/web/components/ui/progress.tsx` - Progress component examined
- Existing codebase: `apps/web/components/demo-mode-provider.tsx` - Context provider pattern
- Existing codebase: `apps/web/components/app-sidebar.tsx` - Sidebar structure
- Existing codebase: `apps/web/app/(app)/layout.tsx` - Layout provider nesting
- Existing codebase: `apps/web/lib/stripe/subscription.ts` - Subscription status helper
- Existing codebase: `apps/web/lib/credits/check.ts` - Credit checking utilities

### Secondary (MEDIUM confidence)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/radix/dialog) - Official shadcn docs (2026 update: unified Radix package)
- [shadcn Studio Pricing](https://shadcnstudio.com/blocks/marketing-ui/pricing-component) - Pricing card patterns
- [State Management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Context vs Redux guidance
- [SaaS Credits System Guide](https://colorwhistle.com/saas-credits-system-guide/) - Credit visibility best practices

### Tertiary (LOW confidence)
- None - all patterns verified with codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist in codebase
- Architecture patterns: HIGH - Following existing provider/context patterns
- Pitfalls: HIGH - Based on React best practices and codebase analysis
- Code examples: HIGH - Derived from existing codebase patterns

**Research date:** 2026-02-06
**Valid until:** 30 days (UI patterns are stable)
