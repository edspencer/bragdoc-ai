import { POST } from 'app/api/workstreams/generate/route';
import {
  achievement,
  user,
  workstream,
  project,
  company,
} from '@/database/schema';
import { db } from '@/database/index';
import { getAuthUser } from '@/lib/getAuthUser';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

jest.mock('@/lib/getAuthUser', () => ({
  getAuthUser: jest.fn(),
}));

jest.mock('ai', () => ({
  embed: jest.fn(),
}));

// Mock the LLM naming function to avoid actual API calls in tests
jest.mock('@/lib/ai/workstreams', () => {
  const actual = jest.requireActual('@/lib/ai/workstreams');
  return {
    ...actual,
    nameWorkstreamsBatch: jest.fn(),
  };
});

// Note: Embeddings are already mocked globally in jest.setup.ts
// We don't need to re-mock them here

// Helper function to parse SSE response
async function parseSSEResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'complete') {
          result = data.result;
        } else if (data.type === 'error') {
          throw new Error(data.message);
        }
      }
    }
  }

  return result;
}

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  provider: 'credentials',
};

const mockProject = {
  id: '123e4567-e89b-12d3-a456-426614174100',
  userId: mockUser.id,
  name: 'Test Project',
  description: 'Test Description',
  startDate: new Date('2025-01-01'),
  endDate: null,
  company: 'Test Company',
  repoUrl: null,
  repoRemoteUrl: null,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/workstreams/generate', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(user);

    await db.insert(user).values(mockUser);
    await db.insert(project).values(mockProject);

    (getAuthUser as jest.Mock).mockResolvedValue({
      user: mockUser,
      source: 'session' as const,
    });

    // Mock nameWorkstreamsBatch to return dummy names without calling LLM
    const { nameWorkstreamsBatch } = require('@/lib/ai/workstreams');
    (nameWorkstreamsBatch as jest.Mock).mockImplementation(
      async (clusters: any[][]) => {
        // Return a name and description for each cluster
        return clusters.map((_, idx) => ({
          name: `Test Workstream ${idx + 1}`,
          description: `Description for test workstream ${idx + 1}`,
        }));
      },
    );
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(user);
  });

  it('returns 401 for unauthenticated request', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost/api/workstreams/generate',
      {
        method: 'POST',
      },
    );

    const response = await POST(request);
    // Auth check happens before SSE stream, so this still returns JSON
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for less than 20 achievements', async () => {
    // Add only 15 achievements
    for (let i = 0; i < 15; i++) {
      await db.insert(achievement).values({
        id: uuidv4(),
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536).fill(0),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      });
    }

    const request = new NextRequest(
      'http://localhost/api/workstreams/generate',
      {
        method: 'POST',
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200); // SSE always returns 200
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    // Parse SSE error
    try {
      await parseSSEResponse(response);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('20 achievements');
    }
  });

  it('performs full clustering on first run', async () => {
    // Add 30 achievements
    for (let i = 0; i < 30; i++) {
      await db.insert(achievement).values({
        id: uuidv4(),
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      });
    }

    const request = new NextRequest(
      'http://localhost/api/workstreams/generate',
      {
        method: 'POST',
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    const data = await parseSSEResponse(response);
    expect(data).toBeDefined();
    expect(data.strategy).toBe('full');
    expect(data.reason).toBeDefined();
    expect(typeof data.workstreamsCreated).toBe('number');
    expect(typeof data.achievementsAssigned).toBe('number');
  }, 15000);

  it('generates embeddings for missing achievements', async () => {
    // Add 25 achievements, some without embeddings
    for (let i = 0; i < 25; i++) {
      await db.insert(achievement).values({
        id: uuidv4(),
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding:
          i < 20
            ? Array(1536)
                .fill(0)
                .map(() => Math.random())
            : null,
        embeddingModel: i < 20 ? 'text-embedding-3-small' : null,
        embeddingGeneratedAt: i < 20 ? new Date() : null,
      });
    }

    const { embed } = require('ai');
    embed.mockResolvedValue({
      embedding: Array(1536)
        .fill(0)
        .map(() => Math.random()),
    });

    const request = new NextRequest(
      'http://localhost/api/workstreams/generate',
      {
        method: 'POST',
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await parseSSEResponse(response);
    expect(data).toBeDefined();
    expect(typeof data.embeddingsGenerated).toBe('number');
    expect(data.embeddingsGenerated).toBeGreaterThanOrEqual(0);
  }, 15000);

  it('returns correct response structure', async () => {
    // Add 20 achievements
    for (let i = 0; i < 20; i++) {
      await db.insert(achievement).values({
        id: uuidv4(),
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      });
    }

    const request = new NextRequest(
      'http://localhost/api/workstreams/generate',
      {
        method: 'POST',
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await parseSSEResponse(response);
    expect(data).toBeDefined();

    expect(data).toHaveProperty('strategy');
    expect(data).toHaveProperty('reason');
    expect(['full', 'incremental']).toContain(data.strategy);
  }, 15000);

  describe('Full Clustering Response Structure (Phase 2)', () => {
    it('returns workstreamDetails and outlierAchievements for full clustering', async () => {
      // Add 30 achievements with varied embeddings
      for (let i = 0; i < 30; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: Math.floor(Math.random() * 5) + 1,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const request = new NextRequest(
        'http://localhost/api/workstreams/generate',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await parseSSEResponse(response);
      expect(data).toBeDefined();

      // Verify strategy is 'full'
      expect(data.strategy).toBe('full');

      // Verify new fields exist
      expect(data).toHaveProperty('workstreamDetails');
      expect(data).toHaveProperty('outlierAchievements');

      // Verify workstreamDetails is array
      expect(Array.isArray(data.workstreamDetails)).toBe(true);

      // Verify outlierAchievements is array
      expect(Array.isArray(data.outlierAchievements)).toBe(true);

      // If workstreams were created, verify structure
      if (data.workstreamDetails.length > 0) {
        const workstream = data.workstreamDetails[0];
        expect(workstream).toHaveProperty('workstreamId');
        expect(workstream).toHaveProperty('workstreamName');
        expect(workstream).toHaveProperty('workstreamColor');
        expect(workstream).toHaveProperty('isNew');
        expect(workstream).toHaveProperty('achievements');
        expect(workstream.isNew).toBe(true);
        expect(Array.isArray(workstream.achievements)).toBe(true);
      }

      // Verify backward compatibility - old count fields present
      expect(data).toHaveProperty('workstreamsCreated');
      expect(data).toHaveProperty('achievementsAssigned');
      expect(data).toHaveProperty('outliers');
      expect(typeof data.workstreamsCreated).toBe('number');
      expect(typeof data.achievementsAssigned).toBe('number');
      expect(typeof data.outliers).toBe('number');
    }, 15000);

    it('includes achievement summaries with project/company context', async () => {
      // Create a company
      await db.insert(company).values({
        id: uuidv4(),
        userId: mockUser.id,
        name: 'Test Company',
        domain: 'test.com',
        role: 'Engineer',
        startDate: new Date(),
      });

      // Add 25 achievements
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: `Summary for achievement ${i}`,
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const request = new NextRequest(
        'http://localhost/api/workstreams/generate',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await parseSSEResponse(response);
      expect(data).toBeDefined();

      // Check outlier achievements
      if (data.outlierAchievements.length > 0) {
        const achievement = data.outlierAchievements[0];
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('title');
        expect(achievement).toHaveProperty('eventStart');
        expect(achievement).toHaveProperty('impact');
        expect(achievement).toHaveProperty('summary');
        expect(achievement).toHaveProperty('projectId');
        expect(achievement).toHaveProperty('projectName');
        expect(achievement).toHaveProperty('companyId');
        expect(achievement).toHaveProperty('companyName');
      }

      // Check workstream achievements
      if (data.workstreamDetails.length > 0) {
        const ws = data.workstreamDetails[0];
        if (ws.achievements.length > 0) {
          const ach = ws.achievements[0];
          expect(ach).toHaveProperty('id');
          expect(ach).toHaveProperty('title');
          expect(ach).toHaveProperty('eventStart');
          expect(ach).toHaveProperty('impact');
          expect(ach).toHaveProperty('summary');
          expect(ach).toHaveProperty('projectId');
          expect(ach).toHaveProperty('projectName');
          expect(ach).toHaveProperty('companyId');
          expect(ach).toHaveProperty('companyName');
        }
      }
    }, 10000); // Increased timeout to 10 seconds for this complex test
  });

  describe('Incremental Response Structure (Phase 2)', () => {
    it('returns assignmentsByWorkstream and unassignedAchievements for incremental', async () => {
      // First do a full clustering to create workstreams
      for (let i = 0; i < 30; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const request1 = new NextRequest(
        'http://localhost/api/workstreams/generate',
        {
          method: 'POST',
        },
      );

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);
      await parseSSEResponse(response1); // Consume the response

      // Add a few more achievements to trigger incremental
      for (let i = 0; i < 5; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `New Achievement ${i}`,
          summary: 'New Summary',
          details: null,
          impact: 3,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const request2 = new NextRequest(
        'http://localhost/api/workstreams/generate',
        {
          method: 'POST',
        },
      );

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);
      const data = await parseSSEResponse(response2);
      expect(data).toBeDefined();

      // This should likely be incremental, but could be full depending on clustering decision
      // If it is incremental, verify structure
      if (data.strategy === 'incremental') {
        expect(data).toHaveProperty('assignmentsByWorkstream');
        expect(data).toHaveProperty('unassignedAchievements');
        expect(Array.isArray(data.assignmentsByWorkstream)).toBe(true);
        expect(Array.isArray(data.unassignedAchievements)).toBe(true);

        // Verify backward compatibility
        expect(data).toHaveProperty('assigned');
        expect(data).toHaveProperty('unassigned');
        expect(typeof data.assigned).toBe('number');
        expect(typeof data.unassigned).toBe('number');

        // Verify workstream structure in assignments
        if (data.assignmentsByWorkstream.length > 0) {
          const ws = data.assignmentsByWorkstream[0];
          expect(ws).toHaveProperty('workstreamId');
          expect(ws).toHaveProperty('workstreamName');
          expect(ws).toHaveProperty('workstreamColor');
          expect(ws).toHaveProperty('achievements');
          expect(Array.isArray(ws.achievements)).toBe(true);
        }
      }
    }, 15000); // Increased timeout to 15 seconds - this test runs two full clustering operations
  });

  describe('Backward Compatibility (Phase 2)', () => {
    it('preserves count fields for toast notifications', async () => {
      // Add 20 achievements
      for (let i = 0; i < 20; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const request = new NextRequest(
        'http://localhost/api/workstreams/generate',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await parseSSEResponse(response);
      expect(data).toBeDefined();

      if (data.strategy === 'full') {
        // Full clustering must have these fields
        expect(data).toHaveProperty('workstreamsCreated');
        expect(data).toHaveProperty('achievementsAssigned');
        expect(data).toHaveProperty('outliers');
        expect(typeof data.workstreamsCreated).toBe('number');
        expect(typeof data.achievementsAssigned).toBe('number');
        expect(typeof data.outliers).toBe('number');
      } else if (data.strategy === 'incremental') {
        // Incremental must have these fields
        expect(data).toHaveProperty('assigned');
        expect(data).toHaveProperty('unassigned');
        expect(typeof data.assigned).toBe('number');
        expect(typeof data.unassigned).toBe('number');
      }

      // Both must have these
      expect(data).toHaveProperty('strategy');
      expect(data).toHaveProperty('reason');
      expect(data).toHaveProperty('embeddingsGenerated');
    }, 15000);
  });
});
