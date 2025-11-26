import { v4 as uuidv4 } from 'uuid';
import { db } from '@/database/index';
import {
  user,
  company,
  project,
  achievement,
  userMessage,
} from '@/database/schema';
import { GET, POST } from 'app/api/achievements/route';
import {
  PUT as updateAchievement,
  DELETE as deleteAchievement,
} from 'app/api/achievements/[id]/route';
import { eq } from 'drizzle-orm';
import type { EventDuration } from 'lib/types/achievement';
import { NextRequest } from 'next/server';

import { auth } from '@/lib/better-auth/server';

// Better Auth is already mocked in jest.setup.ts
const mockGetSession = auth.api.getSession as unknown as jest.Mock;

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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
      });

      const url = new URL('http://localhost/api/achievements');
      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].title).toBe('Test Achievement');
    });

    it('returns filtered achievements based on query parameters', async () => {
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
      });

      const url = new URL('http://localhost/api/achievements');
      url.searchParams.set('startDate', 'invalid-date');

      const response = await GET(new NextRequest(url));
      const { achievements } = await response.json();

      expect(response.status).toBe(200);
      expect(achievements).toHaveLength(1); // Should return all achievements since date is ignored
    });

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

    it('returns empty results when no achievements match filters', async () => {
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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

    it('handles invalid UUID format for companyId/projectId', async () => {
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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

      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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

      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: null,
        user: null,
      });

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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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

    describe('Duplicate Prevention (Phase 4)', () => {
      it('should return existing achievement on duplicate submission', async () => {
        // Task 4.3: Test duplicate submission returns existing
        const duplicateAchievement = {
          title: 'Duplicate Test Achievement',
          eventDuration: 'week' as EventDuration,
          projectId: testProject.id,
          uniqueSourceId: 'github-pr-123',
          source: 'commit' as const,
          sourceItemType: 'commit' as const,
        };

        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        // First submission
        const response1 = await POST(
          new NextRequest('http://localhost/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicateAchievement),
          }),
        );

        expect(response1.status).toBe(200);
        const achievement1 = await response1.json();
        expect(achievement1.id).toBeDefined();

        // Reset mock for second call
        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        // Second submission (duplicate)
        const response2 = await POST(
          new NextRequest('http://localhost/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicateAchievement),
          }),
        );

        expect(response2.status).toBe(200);
        const achievement2 = await response2.json();
        // Should return same achievement ID
        expect(achievement2.id).toBe(achievement1.id);
        // Should have same content
        expect(achievement2.title).toBe(achievement1.title);
        expect(achievement2.uniqueSourceId).toBe(achievement1.uniqueSourceId);
      });

      it('should handle rapid duplicate submissions correctly', async () => {
        // Task 4.4: Test multiple rapid duplicates
        const duplicateAchievement = {
          title: 'Rapid Duplicate Test',
          eventDuration: 'week' as EventDuration,
          projectId: testProject.id,
          uniqueSourceId: 'github-issue-456',
          source: 'commit' as const,
          sourceItemType: 'commit' as const,
        };

        // Submit same achievement 3 times
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
        ]);

        // All should succeed
        const achievements = await Promise.all(responses.map((r) => r.json()));
        const achievementIds = achievements.map((a) => a.id);

        // All should have HTTP 200
        responses.forEach((r) => {
          expect(r.status).toBe(200);
        });

        // All should return same achievement ID
        expect(achievementIds[1]).toBe(achievementIds[0]);
        expect(achievementIds[2]).toBe(achievementIds[0]);

        // Database should have only one achievement record
        const url = new URL('http://localhost/api/achievements');
        url.searchParams.set('projectId', testProject.id);
        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        const getResponse = await GET(new NextRequest(url));
        const { achievements: queryAchievements } = await getResponse.json();
        // Filter to only our rapid duplicates
        const rapidDuplicates = queryAchievements.filter(
          (a: any) => a.uniqueSourceId === 'github-issue-456',
        );
        expect(rapidDuplicates).toHaveLength(1);
      });

      it('should allow multiple achievements without projectId', async () => {
        // Task 4.5: Test achievements without projectId - constraint should not apply
        const achievement1 = {
          title: 'No Project Achievement 1',
          eventDuration: 'week' as EventDuration,
          uniqueSourceId: 'commit-123',
          source: 'commit' as const,
          // projectId is intentionally omitted
        };

        const achievement2 = {
          title: 'No Project Achievement 2',
          eventDuration: 'week' as EventDuration,
          uniqueSourceId: 'commit-123', // Same uniqueSourceId
          source: 'commit' as const,
          // projectId is intentionally omitted
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
            body: JSON.stringify(achievement1),
          }),
        );

        expect(response1.status).toBe(200);
        const result1 = await response1.json();

        // Second submission (same uniqueSourceId but different projectId)
        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        const response2 = await POST(
          new NextRequest('http://localhost/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(achievement2),
          }),
        );

        expect(response2.status).toBe(200);
        const result2 = await response2.json();

        // Should be different achievements since constraint only applies when both projectId AND uniqueSourceId exist
        expect(result2.id).not.toBe(result1.id);
      });

      it('should allow multiple achievements without uniqueSourceId', async () => {
        // Task 4.6: Test achievements without uniqueSourceId - constraint should not apply
        const achievement1 = {
          title: 'No Source ID Achievement 1',
          eventDuration: 'week' as EventDuration,
          projectId: testProject.id,
          source: 'manual' as const,
          // uniqueSourceId is intentionally omitted
        };

        const achievement2 = {
          title: 'No Source ID Achievement 2',
          eventDuration: 'week' as EventDuration,
          projectId: testProject.id, // Same projectId
          source: 'manual' as const,
          // uniqueSourceId is intentionally omitted
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
            body: JSON.stringify(achievement1),
          }),
        );

        expect(response1.status).toBe(200);
        const result1 = await response1.json();

        // Second submission (same projectId but different uniqueSourceId)
        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        const response2 = await POST(
          new NextRequest('http://localhost/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(achievement2),
          }),
        );

        expect(response2.status).toBe(200);
        const result2 = await response2.json();

        // Should be different achievements since constraint only applies when both projectId AND uniqueSourceId exist
        expect(result2.id).not.toBe(result1.id);
      });

      it('should log duplicate achievements at INFO level', async () => {
        // Task 4.9: Test duplicate logging
        const logSpy = jest.spyOn(console, 'log');

        const duplicateAchievement = {
          title: 'Logged Duplicate',
          eventDuration: 'week' as EventDuration,
          projectId: testProject.id,
          uniqueSourceId: 'log-test-789',
          source: 'commit' as const,
          sourceItemType: 'commit' as const,
        };

        // First submission
        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        await POST(
          new NextRequest('http://localhost/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicateAchievement),
          }),
        );

        // Clear the first creation log
        logSpy.mockClear();

        // Second submission (duplicate)
        mockGetSession.mockResolvedValueOnce({
          session: { id: 'test-session' },
          user: testUser,
        });

        await POST(
          new NextRequest('http://localhost/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicateAchievement),
          }),
        );

        // Should have logged the duplicate detection at utility level
        const duplicateLog = logSpy.mock.calls.find((call) =>
          call[0]?.includes?.('Duplicate achievement detected'),
        );
        expect(duplicateLog).toBeDefined();

        logSpy.mockRestore();
      });
    });
  });

  describe('PUT /api/achievements/[id]', () => {
    it('updates achievement with valid data', async () => {
      const update = {
        title: 'Updated Achievement',
        summary: 'Updated summary',
      };

      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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

      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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

      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
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
      mockGetSession.mockResolvedValueOnce({
        session: { id: 'test-session' },
        user: testUser,
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
