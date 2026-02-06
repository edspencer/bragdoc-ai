# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Runner:**
- Jest (TypeScript via ts-jest preset)
- Configuration: `apps/web/jest.config.ts`
- Setup file: `apps/web/jest.setup.ts`

**Assertion Library:**
- Jest built-in assertions (`expect()`)
- No additional assertion libraries

**Transform:**
- **Primary:** @swc/jest (SWC compiler for speed)
- **Fallback:** ts-jest preset as basis

**Run Commands:**
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:ci           # CI mode (runs setup first)
pnpm test:cli          # CLI-specific tests only
```

## Test File Organization

**Location:**
- Co-located in `test/` directory at project root (e.g., `apps/web/test/`)
- Mirrors source structure: `test/api/`, `test/components/`, `test/lib/`, etc.

**Naming:**
- Convention: `{module-name}.test.ts` or `{module-name}.test.tsx`
- Examples: `achievements.test.ts`, `achievement-item.test.ts`, `embeddings.test.ts`

**File matching pattern:**
```
testMatch: ['<rootDir>/test/**/*.(test|spec).ts', '<rootDir>/test/**/*.(test|spec).tsx']
```

## Test Structure

**Suite organization using `describe` blocks:**
```typescript
describe('Module Name', () => {
  beforeEach(async () => {
    // Setup: Clean database, insert test data
    jest.clearAllMocks();
    await db.delete(achievement);
    await db.delete(userMessage);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);

    // Insert test fixtures
    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompany);
    await db.insert(project).values(testProject);
  });

  afterEach(async () => {
    // Teardown: Clean up database
    await db.delete(achievement);
    await db.delete(userMessage);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);
  });

  describe('Specific Feature', () => {
    it('should do something specific', async () => {
      // Arrange: Set up test conditions
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
      });

      // Act: Execute the function being tested
      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      // Assert: Verify expectations
      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].title).toBe('Test Achievement');
    });
  });
});
```

**Patterns:**
- **Setup:** `beforeEach()` for database setup before each test (all tests isolated)
- **Teardown:** `afterEach()` for database cleanup (ensures no test pollution)
- **Assertion order:** Arrange → Act → Assert (AAA pattern)
- **Nested describes:** Group related tests by feature/endpoint (e.g., `describe('GET /api/achievements')`)

## Mocking

**Framework:** Jest built-in `jest.mock()` and `jest.fn()`

**Global mocks configured in `jest.setup.ts`:**
```typescript
// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
  }),
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Better Auth
jest.mock('@/lib/better-auth/server');
jest.mock('@/lib/better-auth/client');

// Mock AI embeddings to avoid OpenAI API calls
jest.mock('@/lib/ai/embeddings', () => ({
  generateAchievementEmbedding: jest
    .fn()
    .mockResolvedValue([...Array(1536).fill(0)]),
  generateEmbeddingsBatch: jest.fn().mockResolvedValue(new Map()),
  generateMissingEmbeddings: jest.fn().mockResolvedValue(0),
  formatAchievementForEmbedding: jest.fn((ach, projectName) => {
    const parts = [];
    if (projectName) parts.push(`Project: ${projectName}`);
    if (ach.title) parts.push(ach.title);
    if (ach.summary) parts.push(ach.summary);
    return parts.join('. ').trim();
  }),
}));
```

**Patterns:**
- **Mock access in tests:** `const mockGetSession = auth.api.getSession as unknown as jest.Mock;`
- **Resetting mocks:** `jest.clearAllMocks()` in `beforeEach()` and `afterEach()`
- **Unmocking:** Use `jest.unmock()` to test real implementation (e.g., `jest.unmock('@/lib/ai/embeddings')`)
- **Mock resolution:** Use `.mockResolvedValueOnce()` for async functions returning promises
- **Return values:** Provide realistic mock data (e.g., 1536-dimensional vectors for embeddings)

**What to Mock:**
- Authentication/session functions (Better Auth)
- External API calls (OpenAI embeddings, Stripe)
- Next.js navigation and routing
- Environment-dependent modules

**What NOT to Mock:**
- Database queries (use real in-memory database via actual db connection)
- Database schema and ORM (Drizzle)
- Core business logic (query builders, calculations)
- Validation (Zod schema validation)

## Fixtures and Factories

**Test data creation pattern:**

```typescript
// Using object literals with helper functions
const testUser = {
  id: uuidv4(),
  email: 'test@example.com',
  name: 'Test User',
  provider: 'credentials',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Using factory functions for complex objects
function createTestAchievement(overrides = {}): AchievementWithRelations {
  return {
    id: uuidv4(),
    userId: uuidv4(),
    title: 'Test Achievement',
    // ... standard fields
    ...overrides, // Allow customization
  } as AchievementWithRelations;
}

// Usage in tests
it('should work with custom data', async () => {
  const achievement = createTestAchievement({
    title: 'Custom Title',
    impact: 5,
  });
  // Test with custom achievement
});
```

**Location:**
- Fixtures defined at top of test file (before `describe` blocks)
- Reused across multiple test cases in the same suite
- Factory functions for complex objects (e.g., `createTestAchievement()`)

**Pattern examples from codebase:**
- `testUser`: Standard user with email, name, timestamps
- `testCompany`: Company linked to user with domain and role
- `testProject`: Project linked to company with timestamps
- `testAchievement`: Achievement with all standard fields
- Arrays: Created with `Array.from()` for batch operations

## Coverage

**Requirements:** Not enforced (no `collectCoverage` configuration in jest.config.ts)

**Current configuration:**
- `maxWorkers: 1` (single-threaded for stability)
- `clearMocks: true` (auto-clear after each test)
- `forceExit: true` (force exit after completion, important for database connections)

**View Coverage:**
```bash
pnpm test -- --coverage
```

## Test Types

**Unit Tests:**
- **Scope:** Individual functions, utilities, calculations
- **Example:** `cosineDistance()`, `calculateCentroid()`, `formatAchievementForEmbedding()`
- **Approach:** Test with various inputs (normal, edge cases, boundary conditions), mock external dependencies

**Integration Tests:**
- **Scope:** API routes with database, multi-function workflows, end-to-end request/response
- **Example:** `GET /api/achievements` route with filtering, pagination, authentication
- **Approach:** Set up real database state, execute routes, verify database changes and responses
- **Database isolation:** Each test gets fresh isolated database state via `beforeEach`/`afterEach`

**E2E Tests:**
- **Framework:** Playwright (via `/smoke-test` Claude Code skill)
- **Location:** `scripts/smoke-test/`
- **Scope:** Critical user flows (signup, login, dashboard, achievement creation)
- **Type:** Automated smoke tests for production validation
- **Execution:** Manual invocation via `/smoke-test` command

## Common Patterns

**Async Testing:**
```typescript
it('should fetch achievements for authenticated user', async () => {
  mockGetSession.mockResolvedValueOnce({
    session: { id: 'test-session' },
    user: testUser,
  });

  const url = new URL('http://localhost/api/achievements');
  const response = await GET(new NextRequest(url));
  const { achievements } = await response.json();

  expect(response.status).toBe(200);
  expect(achievements).toHaveLength(1);
});
```

**Error Testing:**
```typescript
it('returns 401 for unauthenticated requests', async () => {
  mockGetSession.mockResolvedValueOnce({
    session: null,
    user: null,
  });

  const url = new URL('http://localhost/api/achievements');
  const response = await GET(new NextRequest(url));
  const data = await response.json();

  expect(response.status).toBe(401);
  expect(data.error).toBe('Unauthorized');
});

it('returns 400 for invalid data', async () => {
  const invalidAchievement = {
    summary: 'Missing required fields', // title is required
  };

  const response = await POST(
    new NextRequest('http://localhost/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidAchievement),
    }),
  );

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBe('Invalid achievement data');
  expect(data.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ['title'] }),
    ]),
  );
});
```

**Database Query Testing:**
```typescript
it('verifies achievement was deleted', async () => {
  mockGetSession.mockResolvedValueOnce({
    session: { id: 'test-session' },
    user: testUser,
  });

  // Execute delete
  const response = await deleteAchievement(...);
  expect(response.status).toBe(200);

  // Verify database state changed
  const achievements = await db
    .select()
    .from(achievement)
    .where(eq(achievement.id, testAchievement.id));
  expect(achievements).toHaveLength(0);
});
```

**Pagination Testing:**
```typescript
it('returns paginated results', async () => {
  mockGetSession.mockResolvedValueOnce({
    session: { id: 'test-session' },
    user: testUser,
  });

  // Insert multiple records
  const additionalAchievements = Array.from({ length: 15 }, (_, i) => ({
    id: uuidv4(),
    userId: testUser.id,
    title: `Achievement ${i}`,
    // ...
  }));
  await db.insert(achievement).values(additionalAchievements);

  // Request page 2
  const url = new URL('http://localhost/api/achievements');
  url.searchParams.set('page', '2');
  url.searchParams.set('limit', '10');

  const response = await GET(new NextRequest(url));
  const { achievements, pagination } = await response.json();

  expect(response.status).toBe(200);
  expect(pagination).toEqual(
    expect.objectContaining({
      page: 2,
      limit: 10,
      total: 16,
      totalPages: 2,
    }),
  );
});
```

**Filtering Testing:**
```typescript
it('filters achievements by multiple criteria', async () => {
  mockGetSession.mockResolvedValueOnce({
    session: { id: 'test-session' },
    user: testUser,
  });

  const url = new URL('http://localhost/api/achievements');
  url.searchParams.set('companyId', testCompany.id);
  url.searchParams.set('projectId', testProject.id);
  url.searchParams.set('source', 'manual');
  url.searchParams.set('isArchived', 'false');

  const response = await GET(new NextRequest(url));
  const { achievements } = await response.json();

  expect(response.status).toBe(200);
  expect(achievements).toHaveLength(1);
  expect(achievements[0]).toEqual(
    expect.objectContaining({
      companyId: testCompany.id,
      projectId: testProject.id,
      source: 'manual',
      isArchived: false,
    }),
  );
});
```

**Duplicate Detection Testing:**
```typescript
it('should return existing achievement on duplicate submission', async () => {
  const duplicateAchievement = {
    title: 'Duplicate Test Achievement',
    eventDuration: 'week' as EventDuration,
    projectId: testProject.id,
    uniqueSourceId: 'github-pr-123',
    source: 'commit' as const,
  };

  // First submission
  mockGetSession.mockResolvedValueOnce({
    session: { id: 'test-session' },
    user: testUser,
  });
  const response1 = await POST(
    new NextRequest('http://localhost/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateAchievement),
    }),
  );
  const achievement1 = await response1.json();

  // Second submission (duplicate)
  mockGetSession.mockResolvedValueOnce({
    session: { id: 'test-session' },
    user: testUser,
  });
  const response2 = await POST(
    new NextRequest('http://localhost/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateAchievement),
    }),
  );
  const achievement2 = await response2.json();

  // Should return same ID
  expect(achievement2.id).toBe(achievement1.id);
});
```

**Concurrent Testing:**
```typescript
it('handles rapid duplicate submissions correctly', async () => {
  const duplicateAchievement = { /* ... */ };

  // Submit same achievement 3 times concurrently
  const responses = await Promise.all([
    (async () => {
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
      });
      return await POST(
        new NextRequest('http://localhost/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicateAchievement),
        }),
      );
    })(),
    // ... repeat for other concurrent submissions
  ]);

  // All should return same ID
  const achievements = await Promise.all(responses.map((r) => r.json()));
  const ids = achievements.map((a) => a.id);

  expect(ids[0]).toBe(ids[1]);
  expect(ids[1]).toBe(ids[2]);
});
```

**Callback Testing:**
```typescript
it('should call onDelete with correct achievement data', () => {
  const onDelete = jest.fn();
  const achievement = createTestAchievement({
    title: 'Specific Achievement',
    id: 'test-id-123',
  });

  onDelete(achievement);

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'test-id-123',
      title: 'Specific Achievement',
    }),
  );
});
```

**Type Safety in Tests:**
```typescript
it('should maintain type information in callbacks', () => {
  const achievement = createTestAchievement();
  const onDelete = jest.fn((ach: AchievementWithRelations) => {
    expect(ach.id).toBeDefined();
    expect(typeof ach.id).toBe('string');
    expect(ach.title).toBeDefined();
    expect(typeof ach.title).toBe('string');
  });

  onDelete(achievement);
  expect(onDelete).toHaveBeenCalled();
});
```

## Test Configuration Details

**Module name mapping:**
```typescript
moduleNameMapper: {
  '^@/database/(.*)$': '<rootDir>/../../packages/database/src/$1',
  '^@/config/(.*)$': '<rootDir>/../../packages/config/src/$1',
  '^@/email/(.*)$': '<rootDir>/../../packages/email/src/$1',
  '^app/(.*)$': '<rootDir>/app/$1',
  '^lib/(.*)$': '<rootDir>/lib/$1',
  '^components/(.*)$': '<rootDir>/components/$1',
  '^@/(.*)$': '<rootDir>/$1',
  '\\.(css|less|sass|scss)$': 'identity-obj-proxy', // CSS modules
  '^nanoid$': 'nanoid',
}
```

**Environment setup:**
- Loads `.env.test` file for test-specific environment variables
- Clear mocks after each test via `afterEach(() => { jest.clearAllMocks(); })`
- Database connections use real Postgres (configured via test env variables)
- Force exit after test completion to handle hanging connections

---

*Testing analysis: 2026-02-06*
