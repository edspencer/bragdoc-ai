/**
 * Regression coverage for demo-mode model resolution.
 *
 * Demo mode swaps the session onto a shadow user row with `isDemo = true`,
 * and `resolveModelForUser` relies on that flag reaching `session.user` to
 * keep demo AI features on the platform OPENAI_API_KEY.
 *
 * Better Auth's Drizzle adapter does NOT pass DB rows through untouched.
 * `transformOutput` rebuilds a fresh object by iterating the declared table
 * schema (`id` + Better Auth's core user fields + `user.additionalFields`),
 * so any column not declared in `additionalFields` is dropped before it ever
 * reaches `session.user` — and before it is written to the session cookie
 * cache. That is exactly how `isDemo` went missing.
 *
 * These tests therefore drive the resolver with a user object built the way
 * Better Auth actually produces one: a full DB row projected through the
 * *declared* field set. If `isDemo` is ever removed from `additionalFields`,
 * the projection silently drops it and these tests fail.
 */

process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || 'test-secret';
process.env.BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || 'http://localhost:3000';

import { v4 as uuidv4 } from 'uuid';

// Mock the platform OpenAI provider (demo path)
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((modelId: string) => ({ provider: 'platform', modelId })),
}));

// `lib/better-auth/config` needs the Drizzle tables and `db`; the resolver
// needs the query helpers. One mock serves both.
jest.mock('@bragdoc/database', () => ({
  db: {},
  user: {},
  session: {},
  account: {},
  verification: {},
  getDefaultLLMConfig: jest.fn(),
  getUserById: jest.fn(),
}));

// Better Auth's own entrypoints pull a zod build Jest's CJS resolution
// can't satisfy. We only care about the plain-object config this module
// exports, so stub the two runtime imports it makes.
jest.mock('better-auth/api', () => ({
  createAuthMiddleware: (fn: unknown) => fn,
  APIError: class APIError extends Error {},
}));

jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(() => jest.fn()),
}));

jest.mock('@bragdoc/ai', () => ({
  createLLMFromConfig: jest.fn(),
}));

jest.mock('lib/crypto/llm-keys', () => ({
  decryptApiKey: jest.fn(),
}));

const { openai } = require('@ai-sdk/openai');
const { getDefaultLLMConfig, getUserById } = require('@bragdoc/database');
const { betterAuthConfig } = require('@/lib/better-auth/config');
const {
  NoLLMConfigError,
  resolveModelForUser,
} = require('lib/ai/resolve-model');

/**
 * Better Auth's built-in user fields (see `getAuthTables`), plus the `id`
 * key that `transformOutput` injects. Everything else on the user object
 * comes from `options.user.additionalFields`.
 */
const BETTER_AUTH_CORE_USER_FIELDS = [
  'id',
  'name',
  'email',
  'emailVerified',
  'image',
  'createdAt',
  'updatedAt',
];

function declaredUserFields(): string[] {
  return [
    ...BETTER_AUTH_CORE_USER_FIELDS,
    ...Object.keys(betterAuthConfig.user?.additionalFields ?? {}),
  ];
}

/**
 * Replays Better Auth's `transformOutput` for the user model: build a fresh
 * object containing only the declared fields, copied off the DB row.
 */
function asBetterAuthSessionUser(
  dbRow: Record<string, unknown>,
): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const key of declaredUserFields()) {
    projected[key] = dbRow[key];
  }
  return projected;
}

/** A full shadow-user row as `getOrCreateShadowUser` writes it. */
function makeShadowUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: uuidv4(),
    name: 'Demo User',
    email: `shadow-${uuidv4()}@demo.bragdoc.ai`,
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'credentials',
    providerId: null,
    preferences: null,
    status: 'active',
    tosAcceptedAt: null,
    isDemo: true,
    // Columns that are NOT declared as additionalFields — Better Auth drops
    // these, which is what makes this projection a meaningful test.
    demoUserId: null,
    lastLoginAt: null,
    ...overrides,
  };
}

describe('Better Auth user.additionalFields', () => {
  it('declares isDemo so it survives the adapter output transform', () => {
    const additionalFields = betterAuthConfig.user?.additionalFields;

    expect(additionalFields).toBeDefined();
    expect(additionalFields.isDemo).toBeDefined();
    expect(additionalFields.isDemo.type).toBe('boolean');
  });

  it('marks isDemo as non-input so it cannot be self-assigned', () => {
    // isDemo grants platform-key LLM access; a user must never be able to
    // set it on themselves via Better Auth's update-user endpoint.
    expect(betterAuthConfig.user.additionalFields.isDemo.input).toBe(false);
  });
});

describe('demo model resolution against a real Better Auth session user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDefaultLLMConfig.mockResolvedValue(null);
    // Force the resolver to rely on the session flag alone: if isDemo does
    // not survive the projection, nothing can rescue it and the test fails.
    getUserById.mockResolvedValue(null);
  });

  it('drops columns that are not declared as additionalFields', () => {
    const sessionUser = asBetterAuthSessionUser(makeShadowUserRow());

    // Sanity check that the projection actually strips something —
    // otherwise the tests below would pass for the wrong reason.
    expect(sessionUser).not.toHaveProperty('demoUserId');
    expect(sessionUser).not.toHaveProperty('lastLoginAt');
    expect(sessionUser).toHaveProperty('isDemo', true);
  });

  it.each([
    ['extraction', 'gpt-4o-mini'],
    ['generation', 'gpt-4.1-mini'],
    ['chat', 'gpt-4o-mini'],
  ] as const)('resolves the platform %s model for a projected demo user', async (task, expectedModel) => {
    const sessionUser = asBetterAuthSessionUser(makeShadowUserRow());

    const model = await resolveModelForUser(sessionUser as any, task);

    expect(openai).toHaveBeenCalledWith(expectedModel);
    expect(model).toEqual({ provider: 'platform', modelId: expectedModel });
    // Demo users must never be asked for their own config.
    expect(getDefaultLLMConfig).not.toHaveBeenCalled();
  });

  it('still 409s for a projected non-demo user with no config', async () => {
    const sessionUser = asBetterAuthSessionUser(
      makeShadowUserRow({ isDemo: false }),
    );

    await expect(
      resolveModelForUser(sessionUser as any, 'generation'),
    ).rejects.toThrow(NoLLMConfigError);
    expect(openai).not.toHaveBeenCalled();
  });
});
