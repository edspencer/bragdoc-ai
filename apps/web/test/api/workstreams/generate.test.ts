import { POST } from 'app/api/workstreams/generate/route';
import { achievement, user, workstream, project } from '@/database/schema';
import { db } from '@/database/index';
import { auth } from '@/lib/better-auth/server';
import { NextRequest } from 'next/server';

jest.mock('ai', () => ({
  embed: jest.fn(),
}));

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  provider: 'credentials',
};

const mockProject = {
  id: '123e4567-e89b-12d3-a456-426614174100',
  userId: mockUser.id,
  title: 'Test Project',
  description: 'Test Description',
  startDate: new Date('2025-01-01'),
  endDate: null,
  company: 'Test Company',
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

    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
      session: { id: 'test-session' },
      user: mockUser,
    });
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(user);
  });

  it('returns 401 for unauthenticated request', async () => {
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost/api/workstreams/generate',
      {
        method: 'POST',
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for less than 20 achievements', async () => {
    // Add only 15 achievements
    for (let i = 0; i < 15; i++) {
      await db.insert(achievement).values({
        id: `ach-${i}`,
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 'Impact',
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
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Insufficient achievements');
  });

  it('performs full clustering on first run', async () => {
    // Add 30 achievements
    for (let i = 0; i < 30; i++) {
      await db.insert(achievement).values({
        id: `ach-${i}`,
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 'Impact',
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
    const data = await response.json();
    expect(data.strategy).toBe('full');
    expect(data.reason).toBeDefined();
    expect(typeof data.workstreamsCreated).toBe('number');
    expect(typeof data.achievementsAssigned).toBe('number');
  });

  it('generates embeddings for missing achievements', async () => {
    // Add 25 achievements, some without embeddings
    for (let i = 0; i < 25; i++) {
      await db.insert(achievement).values({
        id: `ach-${i}`,
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 'Impact',
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
    const data = await response.json();
    expect(typeof data.embeddingsGenerated).toBe('number');
    expect(data.embeddingsGenerated).toBeGreaterThanOrEqual(0);
  });

  it('returns correct response structure', async () => {
    // Add 20 achievements
    for (let i = 0; i < 20; i++) {
      await db.insert(achievement).values({
        id: `ach-${i}`,
        userId: mockUser.id,
        projectId: mockProject.id,
        title: `Achievement ${i}`,
        summary: 'Summary',
        details: null,
        impact: 'Impact',
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
    const data = await response.json();

    expect(data).toHaveProperty('strategy');
    expect(data).toHaveProperty('reason');
    expect(['full', 'incremental']).toContain(data.strategy);
  });
});
