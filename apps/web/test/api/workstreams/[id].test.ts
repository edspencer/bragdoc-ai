import { GET, PUT, DELETE } from 'app/api/workstreams/[id]/route';
import { achievement, user, workstream, project } from '@/database/schema';
import { db } from '@/database/index';
import { auth } from '@/lib/better-auth/server';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import {
  createMockUser,
  createMockProject,
  createMockAchievement,
  createMockWorkstream,
} from '../../helpers';

const mockUser = createMockUser();
const mockProject = createMockProject(mockUser.id);

describe('GET /api/workstreams/[id]', () => {
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

  it('returns 404 for non-existent workstream', async () => {
    const fakeId = uuidv4();
    const request = new NextRequest(
      `http://localhost/api/workstreams/${fakeId}`,
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: fakeId }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 404 for other user workstream', async () => {
    const otherUser = createMockUser({ id: uuidv4() });
    await db.insert(user).values(otherUser);

    const ws = createMockWorkstream(otherUser.id, {
      id: uuidv4(),
      name: 'Other User WS',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${ws.id}`,
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: ws.id }),
    });
    expect(response.status).toBe(404);
  });

  it('returns workstream for owner', async () => {
    const ws = createMockWorkstream(mockUser.id, {
      id: uuidv4(),
      name: 'My Workstream',
      description: 'Description',
      achievementCount: 5,
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${ws.id}`,
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: ws.id }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(ws.id);
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

  it('updates workstream name', async () => {
    const wsId = uuidv4();
    const ws = createMockWorkstream(mockUser.id, {
      id: wsId,
      name: 'Original Name',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: wsId }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('New Name');
  });

  it('validates color format (hex code)', async () => {
    const wsId = uuidv4();
    const ws = createMockWorkstream(mockUser.id, {
      id: wsId,
      name: 'Test',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: 'invalid-color' }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: wsId }),
    });
    expect(response.status).toBe(400);
  });

  it('accepts valid hex color code', async () => {
    const wsId = uuidv4();
    const ws = createMockWorkstream(mockUser.id, {
      id: wsId,
      name: 'Test',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: '#FF0000' }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: wsId }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.color).toBe('#FF0000');
  });

  it('returns 404 for other user workstream', async () => {
    const otherUser = createMockUser({ id: uuidv4() });
    await db.insert(user).values(otherUser);

    const wsId = uuidv4();
    const ws = createMockWorkstream(otherUser.id, {
      id: wsId,
      name: 'Other WS',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hack Attempt' }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: wsId }),
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

  it('archives workstream', async () => {
    const wsId = uuidv4();
    const ws = createMockWorkstream(mockUser.id, {
      id: wsId,
      name: 'Test',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'DELETE',
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: wsId }),
    });
    expect(response.status).toBe(200);

    // Verify archived
    const archived = await db
      .select()
      .from(workstream)
      .where(eq(workstream.id, wsId));
    expect(archived[0]?.isArchived).toBe(true);
  });

  it('unassigns all achievements', async () => {
    const wsId = uuidv4();
    const ws = createMockWorkstream(mockUser.id, {
      id: wsId,
      name: 'Test',
      achievementCount: 2,
    });
    await db.insert(workstream).values(ws);

    // Insert achievements assigned to this workstream
    for (let i = 0; i < 2; i++) {
      await db.insert(achievement).values(
        createMockAchievement(mockUser.id, mockProject.id, {
          id: uuidv4(),
          title: `Achievement ${i}`,
          workstreamId: wsId,
          workstreamSource: 'ai',
        }),
      );
    }

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'DELETE',
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: wsId }),
    });
    expect(response.status).toBe(200);

    // Verify achievements are unassigned
    const achs = await db.select().from(achievement);
    expect(achs.every((a) => a.workstreamId === null)).toBe(true);
  });

  it('returns 404 for other user workstream', async () => {
    const otherUser = createMockUser({ id: uuidv4() });
    await db.insert(user).values(otherUser);

    const wsId = uuidv4();
    const ws = createMockWorkstream(otherUser.id, {
      id: wsId,
      name: 'Other WS',
    });
    await db.insert(workstream).values(ws);

    const request = new NextRequest(
      `http://localhost/api/workstreams/${wsId}`,
      {
        method: 'DELETE',
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: wsId }),
    });
    expect(response.status).toBe(404);
  });
});
