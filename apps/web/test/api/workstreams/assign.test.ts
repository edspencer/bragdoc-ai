import { POST } from 'app/api/workstreams/assign/route';
import { achievement, user, workstream, project } from '@/database/schema';
import { db } from '@/database/index';
import { auth } from '@/lib/better-auth/server';
import { NextRequest } from 'next/server';
import { createMockUser, createMockProject } from '../../helpers';

const mockUser = createMockUser();
const mockProject = createMockProject(mockUser.id);

describe('POST /api/workstreams/assign', () => {
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

    const request = new NextRequest('http://localhost/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: 'ach-1',
        workstreamId: 'ws-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('assigns achievement to workstream', async () => {
    const ach = {
      id: 'ach-1',
      userId: mockUser.id,
      projectId: mockProject.id,
      title: 'Test Achievement',
      summary: 'Summary',
      details: null,
      impact: 'Impact',
      eventStart: new Date(),
      eventEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      workstreamId: null,
      workstreamSource: null,
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
    };

    const ws = {
      id: 'ws-1',
      userId: mockUser.id,
      name: 'Test Workstream',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(achievement).values(ach);
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: 'ach-1',
        workstreamId: 'ws-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify assignment
    const assigned = await db
      .select()
      .from(achievement)
      .where((a) => a.id === 'ach-1');
    expect(assigned[0].workstreamId).toBe('ws-1');
  });

  it('sets workstreamSource to user', async () => {
    const ach = {
      id: 'ach-1',
      userId: mockUser.id,
      projectId: mockProject.id,
      title: 'Test',
      summary: 'Summary',
      details: null,
      impact: 'Impact',
      eventStart: new Date(),
      eventEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      workstreamId: null,
      workstreamSource: null,
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
    };

    const ws = {
      id: 'ws-1',
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

    await db.insert(achievement).values(ach);
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: 'ach-1',
        workstreamId: 'ws-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const assigned = await db
      .select()
      .from(achievement)
      .where((a) => a.id === 'ach-1');
    expect(assigned[0].workstreamSource).toBe('user');
  });

  it('allows null workstreamId (unassign)', async () => {
    const ach = {
      id: 'ach-1',
      userId: mockUser.id,
      projectId: mockProject.id,
      title: 'Test',
      summary: 'Summary',
      details: null,
      impact: 'Impact',
      eventStart: new Date(),
      eventEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      workstreamId: 'ws-1',
      workstreamSource: 'ai',
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
    };

    await db.insert(achievement).values(ach);

    const request = new NextRequest('http://localhost/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: 'ach-1',
        workstreamId: null,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const unassigned = await db
      .select()
      .from(achievement)
      .where((a) => a.id === 'ach-1');
    expect(unassigned[0].workstreamId).toBeNull();
  });

  it('returns 404 for other user achievement', async () => {
    const otherUser = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      email: 'other@example.com',
      provider: 'credentials',
    };
    await db.insert(user).values(otherUser);

    const ach = {
      id: 'ach-1',
      userId: otherUser.id,
      projectId: mockProject.id,
      title: 'Other User Achievement',
      summary: 'Summary',
      details: null,
      impact: 'Impact',
      eventStart: new Date(),
      eventEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      workstreamId: null,
      workstreamSource: null,
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
    };

    const ws = {
      id: 'ws-1',
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

    await db.insert(achievement).values(ach);
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: 'ach-1',
        workstreamId: 'ws-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it('returns success response', async () => {
    const ach = {
      id: 'ach-1',
      userId: mockUser.id,
      projectId: mockProject.id,
      title: 'Test',
      summary: 'Summary',
      details: null,
      impact: 'Impact',
      eventStart: new Date(),
      eventEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      workstreamId: null,
      workstreamSource: null,
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
    };

    const ws = {
      id: 'ws-1',
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

    await db.insert(achievement).values(ach);
    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: 'ach-1',
        workstreamId: 'ws-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
