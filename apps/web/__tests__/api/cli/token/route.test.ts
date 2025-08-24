import { v4 as uuidv4 } from 'uuid';
import { db } from 'lib/db';
import { user, cliToken, project } from 'lib/db/schema';
import { POST } from 'app/api/cli/token/route';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

describe('CLI Token API Routes', () => {
  const testUser = {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
    provider: 'credentials',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Delete all related records first
    await db.delete(cliToken);
    await db.delete(project);
    await db.delete(user);
    await db.insert(user).values(testUser);
  });

  afterEach(async () => {
    // Delete all related records first
    await db.delete(cliToken);
    await db.delete(project);
    await db.delete(user);
  });

  describe('POST /api/cli/token', () => {
    it('creates CLI token with valid data', async () => {
      // Mock authenticated user
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const deviceName = 'Test Device';
      const state = 'test-state';

      const response = await POST(
        new NextRequest('http://localhost/api/cli/token', {
          method: 'POST',
          body: JSON.stringify({ deviceName, state }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('expiresAt');
      expect(typeof data.token).toBe('string');
      expect(typeof data.expiresAt).toBe('number');

      // Verify token was stored in database
      const tokens = await db
        .select()
        .from(cliToken)
        .where(eq(cliToken.userId, testUser.id))
        .execute();

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        userId: testUser.id,
        token: data.token,
        deviceName,
      });
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
      expect(tokens[0].lastUsedAt).toBeInstanceOf(Date);
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const response = await POST(
        new NextRequest('http://localhost/api/cli/token', {
          method: 'POST',
          body: JSON.stringify({
            deviceName: 'Test Device',
            state: 'test-state',
          }),
        })
      );

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');

      // Verify no token was stored
      const tokens = await db
        .select()
        .from(cliToken)
        .where(eq(cliToken.userId, testUser.id))
        .execute();
      expect(tokens).toHaveLength(0);
    });

    it('returns 400 for invalid request data', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      // Missing deviceName
      const response = await POST(
        new NextRequest('http://localhost/api/cli/token', {
          method: 'POST',
          body: JSON.stringify({ state: 'test-state' }),
        })
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid request body');

      // Verify no token was stored
      const tokens = await db
        .select()
        .from(cliToken)
        .where(eq(cliToken.userId, testUser.id))
        .execute();
      expect(tokens).toHaveLength(0);
    });

    it('sets token expiration to 30 days from now', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      const response = await POST(
        new NextRequest('http://localhost/api/cli/token', {
          method: 'POST',
          body: JSON.stringify({
            deviceName: 'Test Device',
            state: 'test-state',
          }),
        })
      );

      const data = await response.json();
      expect(data.expiresAt).toBe(now + thirtyDaysInMs);

      const tokens = await db
        .select()
        .from(cliToken)
        .where(eq(cliToken.userId, testUser.id))
        .execute();

      expect(tokens[0].expiresAt.getTime()).toBe(now + thirtyDaysInMs);

      dateSpy.mockRestore();
    });
  });
});
