# API Conventions

## Overview

BragDoc follows RESTful conventions for all API routes, with consistent patterns for authentication, validation, error handling, and responses.

## Route Structure

### Standard REST Patterns

```
/api/achievements          GET (list), POST (create)
/api/achievements/[id]     GET (read), PUT (update), DELETE (delete)
/api/projects             GET (list), POST (create)
/api/projects/[id]        GET (read), PUT (update), DELETE (delete)
/api/companies            GET (list), POST (create)
/api/companies/[id]       GET (read), PUT (update), DELETE (delete)
/api/documents            GET (list), POST (create)
/api/documents/[id]       GET (read), PUT (update), DELETE (delete)
/api/documents/generate   POST (AI generation)
/api/standups             GET (list), POST (create)
/api/standups/[id]        GET (read), PUT (update), DELETE (delete)
/api/user                 GET (profile), PUT (update preferences)
/api/counts               GET (dashboard statistics)
/api/cli/token            POST (generate CLI JWT token)
```

## Authentication Pattern

Every API route uses the unified auth helper:

```typescript
import { getAuthUser } from 'lib/getAuthUser';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // auth.user contains complete user object
  // auth.source is 'session' (browser) or 'jwt' (CLI)

  // Proceed with authorized logic
}
```

## Request Validation

Use Zod schemas for all input validation:

```typescript
import { z } from 'zod';

const createAchievementSchema = z.object({
  title: z.string().min(1).max(256),
  summary: z.string().optional(),
  impact: z.number().int().min(1).max(10).optional(),
  projectId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createAchievementSchema.parse(body);

    const [achievement] = await createAchievement({
      ...validated,
      userId: auth.user.id,
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

## Response Patterns

### Success Responses

```typescript
// List (200)
return NextResponse.json({
  achievements: [...],
  total: 42,
  page: 1,
  limit: 10,
});

// Single Resource (200)
return NextResponse.json(achievement);

// Created (201)
return NextResponse.json(newResource, { status: 201 });

// No Content (204)
return new NextResponse(null, { status: 204 });
```

### Error Responses

```typescript
// Unauthorized (401)
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Forbidden (403)
return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// Not Found (404)
return NextResponse.json({ error: 'Not Found' }, { status: 404 });

// Validation Error (400)
return NextResponse.json(
  { error: 'Validation Error', details: zodError.errors },
  { status: 400 }
);

// Server Error (500)
return NextResponse.json(
  { error: 'Internal Server Error' },
  { status: 500 }
);
```

## CORS for CLI

All API routes must handle OPTIONS for CLI requests:

```typescript
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

## Pagination

```typescript
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  const { achievements, total } = await getAchievements({
    userId: auth.user.id,
    limit,
    offset,
  });

  return NextResponse.json({
    achievements,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

## Filtering & Querying

```typescript
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const { achievements, total } = await getAchievements({
    userId: auth.user.id,
    companyId: searchParams.get('companyId') || undefined,
    projectId: searchParams.get('projectId') || undefined,
    isArchived: searchParams.get('archived') === 'true',
    limit: parseInt(searchParams.get('limit') || '10'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  return NextResponse.json({ achievements, total });
}
```

## Example Routes

### GET /api/achievements
```typescript
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const achievements = await getAchievementsByUserId({
    userId: auth.user.id,
    limit,
    offset,
  });

  return NextResponse.json({ achievements });
}
```

### POST /api/achievements
```typescript
export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = createAchievementSchema.parse(body);

  const [achievement] = await createAchievement({
    ...validated,
    userId: auth.user.id,
  });

  return NextResponse.json(achievement, { status: 201 });
}
```

### PUT /api/achievements/[id]
```typescript
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = updateAchievementSchema.parse(body);

  const [updated] = await updateAchievement({
    id: params.id,
    userId: auth.user.id,  // Security: verify ownership
    data: validated,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
```

### DELETE /api/achievements/[id]
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [deleted] = await deleteAchievement({
    id: params.id,
    userId: auth.user.id,  // Security: verify ownership
  });

  if (!deleted) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
```

## Server-Side Analytics Tracking

### PostHog Integration Pattern

For tracking user events server-side (authentication, feature adoption, etc.):

```typescript
import { captureServerEvent } from '@/lib/posthog-server';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... API logic (validation, database operations, etc.)

  // Track event (non-blocking)
  await captureServerEvent(auth.user.id, 'event_name', {
    property_name: 'value',
    source: 'api',
  });

  return NextResponse.json(result);
}
```

### First-Time Feature Usage Pattern

Track first-time usage by checking record counts before creating analytics events:

```typescript
import { captureServerEvent } from '@/lib/posthog-server';
import { db } from '@bragdoc/database';
import { achievement } from '@bragdoc/database/schema';
import { eq, count } from 'drizzle-orm';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create achievement
  const [newAchievement] = await db.insert(achievement).values({
    userId: auth.user.id,
    title: validated.title,
    // ... other fields
  });

  // Check if this is first achievement
  const [{ count: achievementCount }] = await db
    .select({ count: count() })
    .from(achievement)
    .where(eq(achievement.userId, auth.user.id));

  if (achievementCount === 1) {
    // Track first achievement created
    await captureServerEvent(auth.user.id, 'first_achievement_created', {
      source: validated.source || 'manual',
    });
  }

  return NextResponse.json(newAchievement, { status: 201 });
}
```

### HTTP API Approach for Cloudflare Workers

**File:** `apps/web/lib/posthog-server.ts`

```typescript
/**
 * Server-side PostHog client optimized for Cloudflare Workers
 * Uses HTTP API for immediate event delivery in stateless environment
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
```

**Why HTTP API instead of posthog-node:**
- **Cloudflare Workers**: Stateless isolates with no persistent process
- **Immediate delivery**: No batching or flush cycles needed
- **No shutdown lifecycle**: Each request completes independently
- **Simpler**: No singleton management or cleanup

### Analytics Best Practices

**Always:**
- Use `await` with `captureServerEvent()` to ensure delivery
- Include contextual properties (source, type, etc.)
- Never let analytics errors break API responses
- Never include PII in event properties (passwords, private data)

**Never:**
- Track sensitive user content (achievement details, document text)
- Block API response on analytics completion (it's already async)
- Use analytics tracking as primary data source (use database)

---

**Last Updated:** 2025-10-24 (PostHog analytics tracking pattern)
**API Version:** v1 (implicit)
