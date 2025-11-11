import { GET, PUT, DELETE } from 'app/api/workstreams/[id]/route';
import { achievement, user, workstream, project } from '@/database/schema';
import { db } from '@/database/index';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/getAuthUser';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

jest.mock('@/lib/getAuthUser', () => ({
  getAuthUser: jest.fn(),
}));

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

describe('GET /api/workstreams/[id]', () => {
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
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(user);
  });

  it('returns 404 for non-existent workstream', async () => {
    const request = new NextRequest(
      'http://localhost/api/workstreams/non-existent',
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'non-existent' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 404 for other user workstream', async () => {
    const otherUser = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      email: 'other@example.com',
      provider: 'credentials',
    };
    await db.insert(user).values(otherUser);

    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: otherUser.id,
      name: 'Other User WS',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns workstream for owner', async () => {
    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      name: 'My Workstream',
      description: 'Description',
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 5,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('323e4567-e89b-12d3-a456-426614174001');
    expect(data.name).toBe('My Workstream');
  });
});

describe('PUT /api/workstreams/[id]', () => {
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
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(user);
  });

  it('updates workstream name', async () => {
    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      name: 'Original Name',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('New Name');
  });

  it('validates color format (hex code)', async () => {
    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      name: 'Test',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: 'invalid-color' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(400);
  });

  it('accepts valid hex color code', async () => {
    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      name: 'Test',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: '#FF0000' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.color).toBe('#FF0000');
  });

  it('returns 404 for other user workstream', async () => {
    const otherUser = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      email: 'other@example.com',
      provider: 'credentials',
    };
    await db.insert(user).values(otherUser);

    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: otherUser.id,
      name: 'Other WS',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hack Attempt' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/workstreams/[id]', () => {
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
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(user);
  });

  it('archives workstream', async () => {
    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      name: 'Test',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(200);

    // Verify archived
    const archived = await db
      .select()
      .from(workstream)
      .where(eq(workstream.id, '323e4567-e89b-12d3-a456-426614174001'));
    expect(archived[0]?.isArchived).toBe(true);
  });

  it('unassigns all achievements', async () => {
    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      name: 'Test',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 2,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    // Insert achievements assigned to this workstream
    for (let i = 0; i < 2; i++) {
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
        workstreamId: '323e4567-e89b-12d3-a456-426614174001',
        workstreamSource: 'ai',
        embedding: null,
        embeddingModel: null,
        embeddingGeneratedAt: null,
      });
    }

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(200);

    // Verify achievements are unassigned
    const achs = await db.select().from(achievement);
    expect(achs.every((a) => a.workstreamId === null)).toBe(true);
  });

  it('returns 404 for other user workstream', async () => {
    const otherUser = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      email: 'other@example.com',
      provider: 'credentials',
    };
    await db.insert(user).values(otherUser);

    const ws = {
      id: '323e4567-e89b-12d3-a456-426614174001',
      userId: otherUser.id,
      name: 'Other WS',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/ws-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '323e4567-e89b-12d3-a456-426614174001' }),
    });
    expect(response.status).toBe(404);
  });
});
