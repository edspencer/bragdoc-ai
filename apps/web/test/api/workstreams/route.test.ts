import { GET } from 'app/api/workstreams/route';
import { achievement, user, workstream, project } from '@/database/schema';
import { db } from '@/database/index';
import { auth } from '@/lib/better-auth/server';
import { NextRequest } from 'next/server';
import { createMockUser, createMockProject } from '../../helpers';

const mockUser = createMockUser();
const mockProject = createMockProject(mockUser.id);

describe('GET /api/workstreams', () => {
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

    const request = new NextRequest('http://localhost/api/workstreams');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns empty array when no workstreams exist', async () => {
    const request = new NextRequest('http://localhost/api/workstreams');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.workstreams).toEqual([]);
  });

  it('returns user workstreams only', async () => {
    const otherUser = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      email: 'other@example.com',
      provider: 'credentials',
    };
    await db.insert(user).values(otherUser);

    // Create workstreams for both users
    const ws1 = {
      id: 'ws-1',
      userId: mockUser.id,
      name: 'My Workstream',
      description: 'Mine',
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 5,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ws2 = {
      id: 'ws-2',
      userId: otherUser.id,
      name: 'Other Workstream',
      description: 'Not mine',
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 3,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(workstream).values(ws1);
    await db.insert(workstream).values(ws2);

    const request = new NextRequest('http://localhost/api/workstreams');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.workstreams).toHaveLength(1);
    expect(data.workstreams[0].id).toBe('ws-1');
    expect(data.workstreams[0].userId).toBe(mockUser.id);
  });

  it('excludes archived workstreams by default', async () => {
    const ws1 = {
      id: 'ws-1',
      userId: mockUser.id,
      name: 'Active',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 5,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ws2 = {
      id: 'ws-2',
      userId: mockUser.id,
      name: 'Archived',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 3,
      isArchived: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(workstream).values(ws1);
    await db.insert(workstream).values(ws2);

    const request = new NextRequest('http://localhost/api/workstreams');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.workstreams).toHaveLength(1);
    expect(data.workstreams[0].name).toBe('Active');
  });

  it('returns workstreams ordered by achievement count descending', async () => {
    const ws1 = {
      id: 'ws-1',
      userId: mockUser.id,
      name: 'High Count',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 10,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ws2 = {
      id: 'ws-2',
      userId: mockUser.id,
      name: 'Low Count',
      description: null,
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 2,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(workstream).values(ws2);
    await db.insert(workstream).values(ws1);

    const request = new NextRequest('http://localhost/api/workstreams');
    const response = await GET(request);
    const data = await response.json();

    expect(data.workstreams[0].achievementCount).toBe(10);
    expect(data.workstreams[1].achievementCount).toBe(2);
  });

  it('returns response with workstreams and metadata', async () => {
    const ws = {
      id: 'ws-1',
      userId: mockUser.id,
      name: 'Test WS',
      description: 'Test',
      color: '#3B82F6',
      centroidEmbedding: null,
      centroidUpdatedAt: null,
      achievementCount: 5,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(workstream).values(ws);

    const request = new NextRequest('http://localhost/api/workstreams');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('workstreams');
    expect(Array.isArray(data.workstreams)).toBe(true);
  });
});
