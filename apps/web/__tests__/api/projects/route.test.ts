import { v4 as uuidv4 } from 'uuid';
import { db } from 'lib/db';
import { user, company, project } from 'lib/db/schema';
import { GET, POST } from 'app/api/projects/route';
import {
  GET as getProject,
  PUT as updateProject,
  DELETE as deleteProject,
} from 'app/api/projects/[id]/route';
import { eq } from 'drizzle-orm';

// Mock auth
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

describe('Project API Routes', () => {
  const testUser = {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
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
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    try {
      // Clean up any existing test data in correct order (children first)
      await db.delete(project).where(eq(project.companyId, testCompany.id));
      await db.delete(project).where(eq(project.id, testProject.id));
      await db.delete(company).where(eq(company.id, testCompany.id));
      await db.delete(user).where(eq(user.id, testUser.id));

      // Insert test data in correct order (parents first)
      await db.insert(user).values(testUser);
      await db.insert(company).values(testCompany);
      await db.insert(project).values(testProject);
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Final cleanup in correct order (children first)
      await db.delete(project).where(eq(project.companyId, testCompany.id));
      await db.delete(project).where(eq(project.id, testProject.id));
      await db.delete(company).where(eq(company.id, testCompany.id));
      await db.delete(user).where(eq(user.id, testUser.id));
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('GET /api/projects', () => {
    it('returns projects for authenticated user', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe(testProject.name);
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/projects', () => {
    it('creates project with valid data', async () => {
      const newProject = {
        name: 'New Project',
        description: 'A new project',
        companyId: testCompany.id,
        status: 'active',
        startDate: '2024-01-01',
      };

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await POST(
        new Request('http://localhost/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProject),
        })
      );

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.name).toBe(newProject.name);
      expect(data.userId).toBe(testUser.id);
    });

    it('validates required fields', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await POST(
        new Request('http://localhost/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Missing required fields',
          }),
        })
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation Error');
      expect(data.details).toBeTruthy();
    });
  });

  describe('GET /api/projects/[id]', () => {
    it('returns project for valid ID', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await getProject(
        new Request(`http://localhost/api/projects/${testProject.id}`),
        { params: Promise.resolve({ id: testProject.id }) }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.id).toBe(testProject.id);
    });

    it('returns 404 for invalid ID', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await getProject(
        new Request(`http://localhost/api/projects/${uuidv4()}`),
        { params: Promise.resolve({ id: uuidv4() }) }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });
  });

  describe('PUT /api/projects/[id]', () => {
    it('updates project with valid data', async () => {
      const update = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await updateProject(
        new Request(`http://localhost/api/projects/${testProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        }),
        { params: Promise.resolve({ id: testProject.id }) }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.name).toBe(update.name);
      expect(data.description).toBe(update.description);
    });

    it('returns 404 for invalid ID', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await updateProject(
        new Request(`http://localhost/api/projects/${uuidv4()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        }),
        { params: Promise.resolve({ id: uuidv4() }) }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });
  });

  describe('DELETE /api/projects/[id]', () => {
    it('deletes project', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteProject(
        new Request(`http://localhost/api/projects/${testProject.id}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: testProject.id }) }
      );

      expect(response.status).toBe(200);

      const deleted = await db
        .select()
        .from(project)
        .where(eq(project.id, testProject.id));
      expect(deleted).toHaveLength(0);
    });

    it('returns 404 for invalid ID', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const response = await deleteProject(
        new Request(`http://localhost/api/projects/${uuidv4()}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: uuidv4() }) }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });
  });
});
