import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import {
  user,
  company,
  project,
  achievement,
  userMessage,
} from '@/lib/db/schema';
import { GET, POST } from '@/app/api/achievements/route';
import {
  PUT as updateAchievement,
  DELETE as deleteAchievement,
} from '@/app/api/achievements/[id]/route';
import { eq } from 'drizzle-orm';
import type { EventDuration } from '@/lib/types/achievement';
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

  afterEach(async () => {
    // Clean up after each test
    await db.delete(achievement);
    await db.delete(userMessage);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);
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

    it('returns paginated achievements', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      // Insert additional achievements
      const additionalAchievements = Array.from({ length: 15 }, (_, i) => ({
        id: uuidv4(),
        userId: testUser.id,
        title: `Achievement ${i}`,
        summary: `Summary ${i}`,
        details: `Details ${i}`,
        eventStart: new Date(),
        eventDuration: 'week' as EventDuration,
        source: 'manual' as const,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await db.insert(achievement).values(additionalAchievements);

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('page', '2');
      url.searchParams.set('limit', '10');

      const response = await GET(new NextRequest(url));
      const { achievements, pagination } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements.length).toBeLessThanOrEqual(10);
      expect(pagination).toEqual(
        expect.objectContaining({
          page: 2,
          limit: 10,
          total: 16, // 15 new + 1 original
          totalPages: 2,
        }),
      );
    });

    it('filters achievements by source', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      // Insert an LLM-sourced achievement
      const llmAchievement = {
        id: uuidv4(),
        userId: testUser.id,
        title: 'LLM Achievement',
        summary: 'Generated by LLM',
        details: 'Details',
        eventStart: new Date(),
        eventDuration: 'week' as EventDuration,
        source: 'llm' as const,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(achievement).values(llmAchievement);

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('source', 'llm');

      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].source).toBe('llm');
    });

    it('filters achievements by date range', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const startDate = '2023-01-01';
      const endDate = '2023-12-31';
      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('startDate', startDate);
      url.searchParams.set('endDate', endDate);

      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1); // Should only return testAchievement
      expect(new Date(achievements[0].eventStart)).toBeInstanceOf(Date);
    });

    it('ignores invalid date parameters', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('startDate', 'invalid-date');

      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1); // Should return all achievements since date is ignored
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const url = new URL('http://localhost/api/achievements');
      const response = await GET(new NextRequest(url));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns empty results when no achievements match filters', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('startDate', '2024-01-01');
      url.searchParams.set('endDate', '2024-12-31');
      url.searchParams.set('source', 'llm');

      const response = await GET(new NextRequest(url));
      const { achievements, pagination } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(0);
      expect(pagination.total).toBe(0);
    });

    it('handles multiple filters simultaneously', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
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

    it('handles invalid UUID format for companyId/projectId', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('companyId', 'invalid-uuid');

      const response = await GET(new NextRequest(url));

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch achievements');
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
        eventStart: new Date('2024-01-01').toISOString(),
        eventDuration: 'week' as EventDuration,
        source: 'manual' as const,
        impact: 2,
        impactSource: 'user' as const,
        impactUpdatedAt: new Date().toISOString(),
      };

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await POST(
        new NextRequest('http://localhost/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAchievement),
        }),
      );

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

      const response = await POST(
        new NextRequest('http://localhost/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidAchievement),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid achievement data');
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const response = await POST(
        new NextRequest('http://localhost/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('validates required fields', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const invalidAchievement = {
        summary: 'Missing required fields',
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
          expect.objectContaining({ path: ['eventDuration'] }),
        ]),
      );
    });

    it('validates field constraints', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const invalidAchievement = {
        title: '', // Empty title
        eventDuration: 'invalid-duration', // Invalid duration
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
          expect.objectContaining({ path: ['eventDuration'] }),
        ]),
      );
    });

    it('handles optional fields correctly', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const minimalAchievement = {
        title: 'Minimal Achievement',
        eventDuration: 'week',
      };

      const response = await POST(
        new NextRequest('http://localhost/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(minimalAchievement),
        }),
      );

      expect(response.status).toBe(200);
      const achievement = await response.json();
      expect(achievement).toEqual(
        expect.objectContaining({
          title: 'Minimal Achievement',
          eventDuration: 'week',
          summary: null,
          details: null,
          companyId: null,
          projectId: null,
        }),
      );
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
        new NextRequest(
          `http://localhost/api/achievements/${testAchievement.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          },
        ),
        { params: Promise.resolve({ id: testAchievement.id }) },
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
        new NextRequest(`http://localhost/api/achievements/${nonExistentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Achievement' }),
        }),
        { params: Promise.resolve({ id: nonExistentId }) },
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Achievement not found');
    });

    it('validates partial updates correctly', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const update = {
        eventDuration: 'month' as const,
      };

      const response = await updateAchievement(
        new NextRequest(
          `http://localhost/api/achievements/${testAchievement.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          },
        ),
        { params: Promise.resolve({ id: testAchievement.id }) },
      );

      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated).toEqual(
        expect.objectContaining({
          id: testAchievement.id,
          eventDuration: 'month',
          // Other fields should remain unchanged
          title: testAchievement.title,
        }),
      );
    });

    it('validates field constraints in updates', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const update = {
        title: '', // Empty title
        eventDuration: 'invalid-duration', // Invalid duration
      };

      const response = await updateAchievement(
        new NextRequest(
          `http://localhost/api/achievements/${testAchievement.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          },
        ),
        { params: Promise.resolve({ id: testAchievement.id }) },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid achievement data');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['title'] }),
          expect.objectContaining({ path: ['eventDuration'] }),
        ]),
      );
    });
  });

  describe('DELETE /api/achievements/[id]', () => {
    it('deletes existing achievement', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteAchievement(
        new NextRequest(
          `http://localhost/api/achievements/${testAchievement.id}`,
          {
            method: 'DELETE',
          },
        ),
        { params: Promise.resolve({ id: testAchievement.id }) },
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify achievement was deleted
      const achievements = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, testAchievement.id));
      expect(achievements).toHaveLength(0);
    });

    it('returns 404 for non-existent achievement', async () => {
      const nonExistentId = uuidv4();

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteAchievement(
        new NextRequest(`http://localhost/api/achievements/${nonExistentId}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: nonExistentId }) },
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Achievement not found');
    });

    it('prevents deleting achievements of other users', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: uuidv4() },
      });

      const response = await deleteAchievement(
        new NextRequest(
          `http://localhost/api/achievements/${testAchievement.id}`,
        ),
        { params: Promise.resolve({ id: testAchievement.id }) },
      );

      expect(response.status).toBe(404); // Should return 404 to not leak info about existence
      const data = await response.json();
      expect(data.error).toBe('Achievement not found');

      // Verify achievement still exists
      const achievements = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, testAchievement.id));
      expect(achievements).toHaveLength(1);
    });

    it('handles malformed achievement ID', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteAchievement(
        new NextRequest('http://localhost/api/achievements/invalid-id', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'invalid-id' }) },
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Achievement not found');
    });
  });
});
