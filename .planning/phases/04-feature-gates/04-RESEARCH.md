# Phase 4: Feature Gates - Research

**Researched:** 2026-02-06
**Domain:** API endpoint gating, credit enforcement, streaming LLM operations
**Confidence:** HIGH

## Summary

This phase integrates the credit checking utilities from Phase 2 and subscription status helpers from Phase 3 into all LLM-powered API endpoints. The existing codebase already has all the building blocks in place: `checkUserCredits()`, `checkUserChatMessages()`, `deductCredits()`, `deductChatMessage()`, `withCreditReservation()`, and `hasUnlimitedAccess()`.

The primary work involves inserting credit checks at the start of each endpoint (before any LLM work begins) and wrapping operations appropriately. The streaming nature of most endpoints (using Vercel AI SDK v5's `streamText`) requires careful consideration of where to place credit deduction: upfront reservation with refund on failure.

**Primary recommendation:** Add credit gates at the top of each route handler using the existing utilities, return 402 Payment Required with structured JSON for blocked requests, and use the `withCreditReservation` pattern for non-streaming operations and upfront checks for streaming.

## Standard Stack

The established libraries/tools for this phase:

### Core (Already in Codebase)
| Library | Version | Purpose | Location |
|---------|---------|---------|----------|
| Credit utilities | N/A | Credit checking/deduction | `apps/web/lib/credits/` |
| Subscription status | N/A | Unlimited access detection | `apps/web/lib/stripe/subscription.ts` |
| Vercel AI SDK | ^5.0.76 | Streaming LLM operations | `apps/web/lib/ai/` |
| Drizzle ORM | N/A | Atomic database operations | `@bragdoc/database` |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| zod | Request validation | Already used in all endpoints |

### No New Dependencies Required

This phase uses only existing utilities. No new npm packages needed.

## Architecture Patterns

### Recommended Gate Placement

```
apps/web/app/api/
├── documents/
│   ├── generate/
│   │   └── route.ts           # Add credit gate (FEATURE-GATE-01)
│   └── [id]/
│       └── chat/
│           └── route.ts       # Add message gate + tool credit gate (FEATURE-GATE-03, FEATURE-GATE-04)
├── performance-review/
│   ├── generate/
│   │   └── route.ts           # Add credit gate (FEATURE-GATE-01)
│   └── chat/
│       └── route.ts           # Add message gate + tool credit gate (FEATURE-GATE-03, FEATURE-GATE-04)
└── workstreams/
    └── generate/
        └── route.ts           # Add credit gate (FEATURE-GATE-02)
```

### Pattern 1: Document Generation Credit Gate

**What:** Pre-check credits before any LLM operation starts
**When to use:** Non-streaming endpoints that return a complete document
**Example:**
```typescript
// Source: Existing codebase pattern with credit utilities
import { getAuthUser } from '@/lib/getAuthUser';
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import { checkUserCredits, withCreditReservation, CREDIT_COSTS, getDocumentCost } from '@/lib/credits';
import type { User } from '@bragdoc/database';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = auth.user as User;

  // Check if user has unlimited access (paid or demo)
  if (!hasUnlimitedAccess(user)) {
    const cost = getDocumentCost('performance_review'); // 2 credits
    const { hasCredits, remainingCredits } = checkUserCredits(user, cost);

    if (!hasCredits) {
      return Response.json({
        error: 'insufficient_credits',
        message: `This operation requires ${cost} credits. You have ${remainingCredits} remaining.`,
        required: cost,
        available: remainingCredits,
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }
  }

  // ... rest of handler
}
```

### Pattern 2: Streaming Endpoint with Credit Reservation

**What:** Reserve credits upfront, execute streaming operation, refund on error
**When to use:** Streaming endpoints like document generation
**Example:**
```typescript
// For streaming endpoints that need credit tracking
if (!hasUnlimitedAccess(user)) {
  const cost = getDocumentCost(type);

  // Pre-check before reservation
  const { hasCredits, remainingCredits } = checkUserCredits(user, cost);
  if (!hasCredits) {
    return Response.json({
      error: 'insufficient_credits',
      message: `Insufficient credits for ${type} generation`,
      required: cost,
      available: remainingCredits,
      upgradeUrl: '/pricing',
    }, { status: 402 });
  }

  // Deduct credits upfront
  const { success } = await deductCredits(user.id, cost);
  if (!success) {
    // Race condition: another request consumed credits
    return Response.json({
      error: 'insufficient_credits',
      message: 'Credits were consumed by another request. Please try again.',
      upgradeUrl: '/pricing',
    }, { status: 402 });
  }

  // Track for potential refund on error
  // Note: For streaming, we accept the cost even if stream fails partially
}
```

### Pattern 3: Chat Message Counter Gate

**What:** Check and decrement chat message counter before processing
**When to use:** All chat endpoints
**Example:**
```typescript
import { deductChatMessage, checkUserChatMessages, InsufficientChatMessagesError } from '@/lib/credits';

// At the start of chat POST handler, after auth
if (!hasUnlimitedAccess(user)) {
  const { hasMessages, remainingMessages } = checkUserChatMessages(user);

  if (!hasMessages) {
    return Response.json({
      error: 'insufficient_chat_messages',
      message: "You've used all 20 free messages. Upgrade for unlimited chat.",
      remaining: 0,
      upgradeUrl: '/pricing',
    }, { status: 402 });
  }

  // Deduct message atomically
  const { success, remaining } = await deductChatMessage(user.id, user.level);
  if (!success) {
    return Response.json({
      error: 'insufficient_chat_messages',
      message: "You've used all free messages. Upgrade for unlimited chat.",
      remaining: 0,
      upgradeUrl: '/pricing',
    }, { status: 402 });
  }
}
```

### Pattern 4: Tool Call Credit Checking

**What:** Wrap tool execution with credit check
**When to use:** Tool definitions in chat routes
**Example:**
```typescript
// Wrap existing tool with credit check
const createDocumentWithCredits = ({ user, dataStream }: CreateDocumentProps) => {
  const baseTool = createDocument({ user, dataStream });

  return tool({
    ...baseTool,
    execute: async (args) => {
      // Check credits before tool execution
      if (!hasUnlimitedAccess(user)) {
        const cost = CREDIT_COSTS.chat_tool_call; // 1 credit
        const { hasCredits } = checkUserCredits(user, cost);

        if (!hasCredits) {
          return {
            error: 'insufficient_credits',
            message: 'This action requires 1 credit. Please upgrade for unlimited access.',
          };
        }

        const { success } = await deductCredits(user.id, cost);
        if (!success) {
          return {
            error: 'insufficient_credits',
            message: 'Unable to process request. Please try again.',
          };
        }
      }

      return baseTool.execute(args);
    },
  });
};
```

### Anti-Patterns to Avoid

- **Checking credits after LLM operation starts:** Credits must be verified BEFORE any LLM API calls. Once streaming starts, it's too late.
- **Trusting client-side credit checks:** Always verify server-side. Client checks are UX hints only.
- **Throwing errors inside tool execute:** Tool errors should return error objects, not throw. Throwing breaks the LLM conversation flow.
- **Forgetting demo mode:** Every credit check must include `hasUnlimitedAccess(user)` or equivalent demo bypass.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race-safe credit deduction | Custom transaction code | `deductCredits()` from lib/credits | Already handles atomic UPDATE with WHERE |
| Subscription status check | Multiple if/else checks | `hasUnlimitedAccess()` | Handles all edge cases (yearly expiry, lifetime, demo) |
| Credit cost lookup | Inline numbers | `CREDIT_COSTS` and `getDocumentCost()` | Centralized, type-safe |
| Message counter check | Custom SQL | `checkUserChatMessages()` and `deductChatMessage()` | Already handles paid/demo bypass |

**Key insight:** Phase 2 and 3 built all the primitives. This phase is purely integration work.

## Common Pitfalls

### Pitfall 1: Forgetting to Fetch Fresh User Data
**What goes wrong:** Using stale user data from JWT token doesn't have current credit balance
**Why it happens:** `getAuthUser()` returns user from session/JWT, not fresh from DB
**How to avoid:** For credit operations, fetch fresh user: `const user = await getUserById(auth.user.id)`
**Warning signs:** Credits showing as NULL or wrong value after deduction

### Pitfall 2: Double-Gating Demo Mode
**What goes wrong:** Demo users hit credit checks because gate logic is duplicated/inconsistent
**Why it happens:** Multiple places check `user.level` with slightly different conditions
**How to avoid:** Always use `hasUnlimitedAccess(user)` - it handles demo, paid, and yearly expiry
**Warning signs:** Demo users seeing upgrade prompts or being blocked

### Pitfall 3: SSE Stream Error Handling
**What goes wrong:** 402 response sent after stream headers already sent
**Why it happens:** Credit check happens inside streaming response instead of before
**How to avoid:** All credit checks must happen BEFORE `new ReadableStream()` is created
**Warning signs:** Malformed responses, client sees partial stream then error

### Pitfall 4: Tool Credit Check Timing
**What goes wrong:** Tool executes but credit check happens after LLM decides to call it
**Why it happens:** Tool selection is LLM's decision, credit check is in execute function
**How to avoid:** This is actually correct - we charge when tool executes, not when selected
**Warning signs:** None - this is expected behavior

### Pitfall 5: Concurrent Request Race Conditions
**What goes wrong:** Two requests both pass check, both try to deduct, one fails mid-operation
**Why it happens:** Check-then-deduct has a race window
**How to avoid:** Use atomic `deductCredits()` which does check+deduct in single UPDATE
**Warning signs:** Rare failures on high-concurrency, negative balance attempts (blocked by CHECK constraint)

## Code Examples

### Complete Document Generation Gate
```typescript
// Source: apps/web/app/api/documents/generate/route.ts (to be modified)
import { getAuthUser } from '@/lib/getAuthUser';
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import { checkUserCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate request body first (before credit check)
  const json = await request.json();
  const parsed = generateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { type } = parsed.data;

  // Credit gate - skip for paid/demo users
  if (!hasUnlimitedAccess(auth.user)) {
    // Map document type to credit cost
    const cost = CREDIT_COSTS.document_generation[type] ?? 1;
    const { hasCredits, remainingCredits } = checkUserCredits(auth.user, cost);

    if (!hasCredits) {
      return Response.json({
        error: 'insufficient_credits',
        message: `Document generation requires ${cost} credits. You have ${remainingCredits} remaining.`,
        required: cost,
        available: remainingCredits,
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }

    // Atomic deduction
    const { success } = await deductCredits(auth.user.id, cost);
    if (!success) {
      return Response.json({
        error: 'insufficient_credits',
        message: 'Credits consumed by concurrent request. Please try again.',
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }
  }

  // ... existing document generation logic
}
```

### Complete Workstream Generation Gate
```typescript
// Source: apps/web/app/api/workstreams/generate/route.ts (to be modified)
// Gate must be added BEFORE the SSE stream is created

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Credit gate - BEFORE creating ReadableStream
  if (!hasUnlimitedAccess(auth.user)) {
    const cost = CREDIT_COSTS.workstream_clustering; // 2 credits
    const { hasCredits, remainingCredits } = checkUserCredits(auth.user, cost);

    if (!hasCredits) {
      return NextResponse.json({
        error: 'insufficient_credits',
        message: `Workstream generation requires ${cost} credits. You have ${remainingCredits} remaining.`,
        required: cost,
        available: remainingCredits,
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }

    const { success } = await deductCredits(auth.user.id, cost);
    if (!success) {
      return NextResponse.json({
        error: 'insufficient_credits',
        message: 'Credits consumed by concurrent request. Please try again.',
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }
  }

  // Only now create the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      // ... existing streaming logic
    }
  });

  return new NextResponse(stream, { ... });
}
```

### Chat Message Gate with Tool Credit Wrapper
```typescript
// Source: apps/web/app/api/documents/[id]/chat/route.ts (to be modified)
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import { checkUserChatMessages, deductChatMessage, checkUserCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // ... existing auth and validation

  // Chat message gate
  if (!hasUnlimitedAccess(user)) {
    const { hasMessages, remainingMessages } = checkUserChatMessages(user);

    if (!hasMessages) {
      return Response.json({
        error: 'insufficient_chat_messages',
        message: "You've used all 20 free messages. Upgrade for unlimited chat.",
        remaining: 0,
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }

    const { success, remaining } = await deductChatMessage(user.id, user.level);
    if (!success) {
      return Response.json({
        error: 'insufficient_chat_messages',
        message: "Messages exhausted. Upgrade for unlimited chat.",
        remaining: 0,
        upgradeUrl: '/pricing',
      }, { status: 402 });
    }
  }

  // Wrap tools with credit checking
  const tools = {
    createDocument: wrapToolWithCreditCheck(
      createDocument({ user, dataStream }),
      user,
      CREDIT_COSTS.chat_tool_call
    ),
    updateDocument: wrapToolWithCreditCheck(
      updateDocument({ user, dataStream }),
      user,
      CREDIT_COSTS.chat_tool_call
    ),
  };

  // ... rest of streaming logic with wrapped tools
}

// Helper function for tool wrapping
function wrapToolWithCreditCheck<T extends { execute: Function }>(
  baseTool: T,
  user: User,
  cost: number
): T {
  return {
    ...baseTool,
    execute: async (...args: any[]) => {
      if (!hasUnlimitedAccess(user)) {
        const { hasCredits } = checkUserCredits(user, cost);
        if (!hasCredits) {
          return {
            error: 'insufficient_credits',
            message: `This action requires ${cost} credit. Upgrade for unlimited access.`,
          };
        }

        const { success } = await deductCredits(user.id, cost);
        if (!success) {
          return {
            error: 'insufficient_credits',
            message: 'Unable to complete action. Please try again.',
          };
        }
      }

      return baseTool.execute(...args);
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Check credits client-side | Server-side atomic checks | Always server-side | Prevents bypass via API calls |
| Throw on insufficient | Return 402 with structured JSON | RFC 9457 pattern | Better client error handling |
| Per-endpoint credit logic | Centralized credit utilities | Phase 2 | Consistent behavior |

**Deprecated/outdated:**
- Client-side credit enforcement (never secure)
- 403 Forbidden for payment issues (402 is correct status)
- Inline credit values (use CREDIT_COSTS constant)

## Testing Strategy

### Unit Tests Required (FEATURE-GATE-06)

1. **Zero credits blocks operation:**
```typescript
it('returns 402 when user has 0 credits', async () => {
  const user = createTestUser({ freeCredits: 0, level: 'free' });
  const response = await POST(createRequest(user));
  expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({
    error: 'insufficient_credits',
    upgradeUrl: '/pricing',
  });
});
```

2. **Concurrent requests - only one succeeds:**
```typescript
it('handles concurrent requests correctly', async () => {
  const user = createTestUser({ freeCredits: 1, level: 'free' });
  const [r1, r2] = await Promise.all([
    POST(createRequest(user)),
    POST(createRequest(user)),
  ]);
  const statuses = [r1.status, r2.status].sort();
  expect(statuses).toEqual([200, 402]); // One succeeds, one fails
});
```

3. **Paid users bypass:**
```typescript
it('allows paid users without credit check', async () => {
  const user = createTestUser({ freeCredits: 0, level: 'paid', renewalPeriod: 'lifetime' });
  const response = await POST(createRequest(user));
  expect(response.status).toBe(200);
});
```

4. **Demo users bypass:**
```typescript
it('allows demo users without credit check', async () => {
  const user = createTestUser({ freeCredits: 0, level: 'demo' });
  const response = await POST(createRequest(user));
  expect(response.status).toBe(200);
});
```

5. **Database constraint prevents negative:**
```typescript
it('database constraint prevents negative balance', async () => {
  // This is tested at database level, but verify behavior
  const user = createTestUser({ freeCredits: 1, level: 'free' });
  const { success } = await deductCredits(user.id, 5); // More than available
  expect(success).toBe(false);

  const updated = await getUserById(user.id);
  expect(updated.freeCredits).toBe(1); // Unchanged
});
```

## Open Questions

1. **Fresh User Data for Credit Checks**
   - What we know: `getAuthUser()` returns session user, may not have current credit balance
   - What's unclear: Whether to always fetch fresh user or rely on session data
   - Recommendation: For credit-gated endpoints, fetch fresh user from DB. The credit utilities already use atomic DB operations, but the check uses stale data. May need a helper that fetches fresh user.

2. **Tool Call Failure Refunds**
   - What we know: Tool calls cost 1 credit each
   - What's unclear: Should failed tool calls (e.g., document not found) be refunded?
   - Recommendation: No refunds for tool calls. The credit covers the attempt, not success. This is simpler and prevents gaming.

3. **Streaming Operation Partial Failures**
   - What we know: Streaming endpoints deduct credits upfront
   - What's unclear: Should partial stream failures (e.g., network timeout mid-stream) trigger refund?
   - Recommendation: No refunds for streaming. The LLM work was done. User can retry with new credit if needed.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/web/lib/credits/` - All credit utilities examined
- Existing codebase: `apps/web/lib/stripe/subscription.ts` - Subscription status helper
- Existing codebase: `apps/web/app/api/*/route.ts` - Current endpoint patterns

### Secondary (MEDIUM confidence)
- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) - Tool execution patterns
- [MDN 402 Status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/402) - HTTP status code usage
- [RFC 9457 Problem Details](https://blog.restcase.com/rest-api-error-handling-problem-details-response/) - Error response format

### Tertiary (LOW confidence)
- None - all findings verified with codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All utilities exist in codebase
- Architecture patterns: HIGH - Following existing endpoint patterns
- Pitfalls: HIGH - Based on codebase analysis and prior phase decisions
- Testing: MEDIUM - Test patterns inferred from existing tests

**Research date:** 2026-02-06
**Valid until:** 30 days (stable patterns, internal integration)
