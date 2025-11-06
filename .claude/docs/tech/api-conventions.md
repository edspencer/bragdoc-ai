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

### POST /api/cli/commits

This endpoint is used by the CLI tool to submit achievements extracted from Git commits. It differs from standard achievement creation in that it handles batch submission and preserves source classification.

**Request Format:**
```typescript
// Array of achievements extracted from commits
[
  {
    title: string;
    summary?: string;
    details?: string;
    eventStart?: Date;
    eventEnd?: Date;
    eventDuration?: string;
    companyId?: string;
    projectId?: string;
    impact?: number;
    impactSource?: 'llm' | 'user';
    source: 'commit';  // Achievement came from Git commit extraction
  },
  // ... more achievements
]
```

**Response Format:**
```typescript
[
  {
    id: string;
    title: string;
    summary?: string;
    details?: string;
    source: 'commit';  // Confirmed achievement source
    impact?: number;
    impactSource?: 'llm' | 'user';
    createdAt: string;
    // ... other achievement fields
  },
  // ... more created achievements
]
```

**Achievement Source Classification:**

When the CLI submits achievements extracted from Git commits:
- The endpoint expects `source='commit'` (indicating Git commit extraction)
- The endpoint saves `impactSource='llm'` (indicating LLM-based impact estimation during extraction)
- These values are stored in the database for tracking and filtering

**Key Distinction:**
- **source**: Where the achievement came from (should be 'commit' for CLI extraction)
- **impactSource**: How the impact score was calculated (typically 'llm' for CLI-extracted achievements)

This allows the system to accurately distinguish between:
- Achievements from actual Git commits (source='commit')
- Achievements manually created by users (source='manual')
- And their respective impact estimation methods

### Workstreams Endpoints

**POST /api/workstreams/generate**
Triggers workstream generation or update. Handles both full re-clustering and incremental assignment based on heuristics.

- Generates missing embeddings for achievements
- Requires minimum 20 achievements with embeddings
- Returns strategy used (full/incremental) and statistics

**GET /api/workstreams**
Lists user's active workstreams with metadata.

- Returns workstreams ordered by achievement count
- Includes unassigned achievement count
- Excludes archived workstreams by default

**GET/PUT/DELETE /api/workstreams/[id]**
CRUD operations for individual workstreams.

- GET: Retrieve single workstream with ownership verification
- PUT: Update name, description, or color with Zod validation
- DELETE: Archive workstream and unassign all achievements

**POST /api/workstreams/assign**
Manually assign achievement to workstream.

- Sets `workstreamSource='user'` to preserve manual assignments
- Updates workstream centroids after assignment
- Supports null workstreamId for unassignment

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

## Workstreams API Endpoints

### POST /api/workstreams/generate

**Purpose**: Generate new workstreams or update existing ones using DBSCAN clustering.

**Authentication**: Required (401 if unauthorized)

**Request Body**: (None - uses user's achievements)

**Response (Full Clustering):**

```json
{
  "strategy": "full",
  "reason": "Initial clustering",
  "embeddingsGenerated": 50,
  "workstreamsCreated": 8,
  "achievementsAssigned": 48,
  "outliers": 2,
  "metadata": {
    "lastFullClusteringAt": "2025-11-06T12:30:00Z",
    "achievementCountAtLastClustering": 50,
    "epsilon": 0.45,
    "minPts": 5,
    "workstreamCount": 8,
    "outlierCount": 2
  }
}
```

**Response (Incremental Assignment):**

```json
{
  "strategy": "incremental",
  "reason": "Small number of new achievements",
  "embeddingsGenerated": 3,
  "assigned": 2,
  "unassigned": 1
}
```

**Error Responses:**

```json
// 400: Not enough achievements
{
  "error": "Insufficient achievements",
  "message": "You need at least 20 achievements to generate workstreams. You currently have 15."
}

// 500: Clustering error
{
  "error": "Clustering failed",
  "message": "An error occurred while generating workstreams. Please try again."
}
```

### GET /api/workstreams

**Purpose**: Fetch user's workstreams with associated metadata.

**Authentication**: Required (401 if unauthorized)

**Query Parameters**: None

**Response:**

```json
{
  "workstreams": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Backend Infrastructure",
      "description": "Building scalable backend systems",
      "color": "#3B82F6",
      "achievementCount": 12,
      "isArchived": false,
      "createdAt": "2025-11-06T12:00:00Z",
      "updatedAt": "2025-11-06T12:30:00Z"
    }
  ],
  "metadata": {
    "workstreamCount": 8,
    "outlierCount": 2,
    "lastClusteringAt": "2025-11-06T12:30:00Z"
  },
  "achievementCount": 50,
  "unassignedCount": 2
}
```

### GET /api/workstreams/[id]

**Purpose**: Fetch individual workstream details.

**Authentication**: Required (401 if unauthorized)

**Ownership Verification**: Returns 404 if workstream belongs to different user

**Response:**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Backend Infrastructure",
  "description": "Building scalable backend systems",
  "color": "#3B82F6",
  "achievementCount": 12,
  "isArchived": false,
  "createdAt": "2025-11-06T12:00:00Z",
  "updatedAt": "2025-11-06T12:30:00Z"
}
```

### PUT /api/workstreams/[id]

**Purpose**: Update workstream name, description, or color.

**Authentication**: Required (401 if unauthorized)

**Ownership Verification**: Returns 404 if workstream belongs to different user

**Request Body:**

```typescript
const updateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
```

**Example Request:**

```json
{
  "name": "Backend Infrastructure",
  "description": "Building scalable backend systems and databases",
  "color": "#10B981"
}
```

**Response:** Updated workstream object (same as GET)

**Error Response:**

```json
// 400: Invalid color format
{
  "error": "Validation error",
  "message": "Invalid color format. Use hex format like #3B82F6"
}
```

### DELETE /api/workstreams/[id]

**Purpose**: Archive workstream and unassign all achievements.

**Authentication**: Required (401 if unauthorized)

**Ownership Verification**: Returns 404 if workstream belongs to different user

**Side Effects:**
- Sets `isArchived = true` on workstream
- Sets `workstreamId = null` on all associated achievements
- Preserves history (soft delete)

**Response:**

```json
{
  "success": true,
  "message": "Workstream archived and achievements unassigned"
}
```

### POST /api/workstreams/assign

**Purpose**: Manually assign achievement to workstream or unassign.

**Authentication**: Required (401 if unauthorized)

**Request Body:**

```typescript
const assignSchema = z.object({
  achievementId: z.string().uuid(),
  workstreamId: z.string().uuid().nullable(), // null = unassign
});
```

**Example Request:**

```json
{
  "achievementId": "achievement-uuid",
  "workstreamId": "workstream-uuid"
}
```

**Unassign Request:**

```json
{
  "achievementId": "achievement-uuid",
  "workstreamId": null
}
```

**Response:**

```json
{
  "success": true,
  "achievement": {
    "id": "achievement-uuid",
    "workstreamId": "workstream-uuid",
    "workstreamSource": "user"
  }
}
```

**Side Effects:**
- Sets `workstreamSource = 'user'` to prevent re-clustering from overriding
- Updates old and new workstream centroids
- Updates achievement counts on both workstreams

**Error Responses:**

```json
// 404: Achievement not found or belongs to different user
{
  "error": "Not found",
  "message": "Achievement not found"
}

// 404: Workstream doesn't exist
{
  "error": "Not found",
  "message": "Workstream not found"
}

// 400: Trying to assign to archived workstream
{
  "error": "Invalid operation",
  "message": "Cannot assign to archived workstream"
}
```

### Error Handling Patterns

**Authentication Errors (401):**

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource"
}
```

**Authorization Errors (403 or 404):**

Return 404 instead of 403 to avoid leaking information about resource existence.

```json
{
  "error": "Not found",
  "message": "The requested resource was not found"
}
```

**Validation Errors (400):**

```json
{
  "error": "Validation error",
  "message": "Description must be less than 1000 characters"
}
```

### Implementation Checklist

- [x] All endpoints use `getAuthUser(request)` for authentication
- [x] All endpoints verify user ownership before operations
- [x] All endpoints validate request bodies with Zod schemas
- [x] All responses follow consistent JSON structure
- [x] All errors include descriptive messages for client handling
- [x] No sensitive data included in error responses
- [x] CORS headers not needed (modern Next.js handles it)

---

**Last Updated:** 2025-11-06 (Workstreams API endpoints)
**API Version:** v1 (implicit)
