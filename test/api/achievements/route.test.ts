import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { user, company, project, achievement, userMessage } from '@/lib/db/schema';
import { GET, POST } from '@/app/api/achievements/route';
import {
  PUT as updateAchievement,
  DELETE as deleteAchievement,
} from '@/app/api/achievements/[id]/route';
import { eq } from 'drizzle-orm';
import { EventDuration } from '@/lib/types/achievement';
import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

describe('Achievement API Routes', () => {
  const testUser = {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
    provider: 'credentials',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testCompany = {
    id: uuidv4(),
    userId: testUser.id,
    name: 'Test Company',
    domain: 'test.com',
    role: 'Software Engineer',
    startDate: new Date('2023-01-01'),
  };

  const testProject = {
    id: uuidv4(),
    userId: testUser.id,
    companyId: testCompany.id,
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    startDate: new Date('2023-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testAchievement = {
    id: uuidv4(),
    userId: testUser.id,
    companyId: testCompany.id,
    projectId: testProject.id,
    title: 'Test Achievement',
    summary: 'A test achievement',
    details: 'Detailed description of the achievement',
    eventStart: new Date('2023-01-01'),
    eventDuration: 'week' as EventDuration,
    source: 'manual' as const,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    // Clean up existing data
    await db.delete(achievement);
    await db.delete(userMessage);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);
    // Insert test data
    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompany);
    await db.insert(project).values(testProject);
    await db.insert(achievement).values(testAchievement);
  });

  describe('GET /api/achievements', () => {
    it('returns achievements for authenticated user', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const url = new URL('http://localhost/api/achievements');
      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].title).toBe('Test Achievement');
    });

    it('returns filtered achievements based on query parameters', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('companyId', testCompany.id);
      url.searchParams.set('projectId', testProject.id);
      url.searchParams.set('isArchived', 'false');

      const response = await GET(new NextRequest(url));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.achievements).toHaveLength(1);
      expect(data.achievements[0].companyId).toBe(testCompany.id);
      expect(data.achievements[0].projectId).toBe(testProject.id);
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const url = new URL('http://localhost/api/achievements');
      const response = await GET(new NextRequest(url));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/achievements', () => {
    it('creates achievement with valid data', async () => {
      const newAchievement = {
        title: 'New Achievement',
        summary: 'A new achievement',
        details: 'Details about the new achievement',
        companyId: testCompany.id,
        projectId: testProject.id,
        eventStart: '2024-01-01',
        eventDuration: 'week' as EventDuration,
      };

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await POST(new NextRequest('http://localhost/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAchievement),
      }));

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.title).toBe(newAchievement.title);
      expect(data.userId).toBe(testUser.id);
    });

    it('returns 400 for invalid achievement data', async () => {
      const invalidAchievement = {
        // Missing required fields
        summary: 'Invalid achievement',
      };

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await POST(new NextRequest('http://localhost/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidAchievement),
      }));

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid achievement data');
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const response = await POST(new NextRequest('http://localhost/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }));

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/achievements/[id]', () => {
    it('updates achievement with valid data', async () => {
      const update = {
        title: 'Updated Achievement',
        summary: 'Updated summary',
      };

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await updateAchievement(
        new NextRequest('http://localhost/api/achievements/' + testAchievement.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        }),
        { params: Promise.resolve({ id: testAchievement.id }) }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.title).toBe(update.title);
      expect(data.summary).toBe(update.summary);
    });

    it('returns 404 for non-existent achievement', async () => {
      const nonExistentId = uuidv4();

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await updateAchievement(
        new NextRequest('http://localhost/api/achievements/' + nonExistentId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Achievement' }),
        }),
        { params: Promise.resolve({ id: nonExistentId }) }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Achievement not found');
    });
  });

  describe('DELETE /api/achievements/[id]', () => {
    it('deletes existing achievement', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteAchievement(
        new NextRequest('http://localhost/api/achievements/' + testAchievement.id, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: testAchievement.id }) }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify achievement was deleted
      const achievements = await db.select().from(achievement).where(eq(achievement.id, testAchievement.id));
      expect(achievements).toHaveLength(0);
    });

    it('returns 404 for non-existent achievement', async () => {
      const nonExistentId = uuidv4();

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteAchievement(
        new NextRequest('http://localhost/api/achievements/' + nonExistentId, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: nonExistentId }) }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Achievement not found');
    });
  });
});
