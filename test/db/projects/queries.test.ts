import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { user, company, project } from '@/lib/db/schema';
import {
  getProjectsByUserId,
  getProjectById,
  getProjectsByCompanyId,
  getActiveProjects,
  createProject,
  updateProject,
  deleteProject,
} from '@/lib/db/projects/queries';

describe('Project Queries', () => {
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
    // Clean up existing data
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);

    // Insert test data
    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompany);
    await db.insert(project).values(testProject);
  });

  describe('getProjectsByUserId', () => {
    it('returns empty array for new user', async () => {
      const newUserId = uuidv4();
      const projects = await getProjectsByUserId(newUserId);
      expect(projects).toHaveLength(0);
    });

    it('returns all projects for user', async () => {
      const projects = await getProjectsByUserId(testUser.id);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe(testProject.name);
    });

    it('does not return other users projects', async () => {
      const otherUser = {
        id: uuidv4(),
        email: 'other@example.com',
        name: 'Other User',
      };
      await db.insert(user).values(otherUser);

      const projects = await getProjectsByUserId(otherUser.id);
      expect(projects).toHaveLength(0);
    });
  });

  describe('getProjectById', () => {
    it('returns project for valid ID', async () => {
      const project = await getProjectById(testProject.id, testUser.id);
      expect(project).not.toBeNull();
      expect(project?.name).toBe(testProject.name);
    });

    it('returns null for invalid ID', async () => {
      const project = await getProjectById(uuidv4(), testUser.id);
      expect(project).toBeNull();
    });

    it('returns null if not owned by user', async () => {
      const otherUser = {
        id: uuidv4(),
        email: 'other@example.com',
        name: 'Other User',
      };
      await db.insert(user).values(otherUser);

      const project = await getProjectById(testProject.id, otherUser.id);
      expect(project).toBeNull();
    });
  });

  describe('getProjectsByCompanyId', () => {
    it('returns projects for valid company', async () => {
      const projects = await getProjectsByCompanyId(testCompany.id, testUser.id);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe(testProject.name);
    });

    it('returns empty array for company with no projects', async () => {
      const newCompany = {
        id: uuidv4(),
        userId: testUser.id,
        name: 'New Company',
        domain: 'new.com',
        role: 'Developer',
        startDate: new Date(),
      };
      await db.insert(company).values(newCompany);

      const projects = await getProjectsByCompanyId(newCompany.id, testUser.id);
      expect(projects).toHaveLength(0);
    });
  });

  describe('getActiveProjects', () => {
    it('returns only active projects', async () => {
      const completedProject = {
        id: uuidv4(),
        userId: testUser.id,
        name: 'Completed Project',
        status: 'completed',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };
      await db.insert(project).values(completedProject);

      const projects = await getActiveProjects(testUser.id);
      expect(projects).toHaveLength(1);
      expect(projects[0].status).toBe('active');
    });
  });

  describe('createProject', () => {
    it('creates project with all fields', async () => {
      const newProject = {
        userId: testUser.id,
        name: 'New Project',
        description: 'A new project',
        companyId: testCompany.id,
        status: 'active' as const,
        startDate: new Date(),
      };

      const created = await createProject(newProject);
      expect(created).toMatchObject(newProject);
    });

    it('creates project without optional fields', async () => {
      const newProject = {
        userId: testUser.id,
        name: 'New Project',
        status: 'active' as const,
        startDate: new Date(),
      };

      const created = await createProject(newProject);
      expect(created).toMatchObject(newProject);
      expect(created.description).toBeNull();
      expect(created.companyId).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('updates project fields', async () => {
      const update = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      const updated = await updateProject(testProject.id, testUser.id, update);
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe(update.name);
      expect(updated?.description).toBe(update.description);
    });

    it('returns null if project not found', async () => {
      const updated = await updateProject(uuidv4(), testUser.id, {
        name: 'Updated',
      });
      expect(updated).toBeNull();
    });

    it('only updates if owned by user', async () => {
      const otherUser = {
        id: uuidv4(),
        email: 'other@example.com',
        name: 'Other User',
      };
      await db.insert(user).values(otherUser);

      const updated = await updateProject(testProject.id, otherUser.id, {
        name: 'Updated',
      });
      expect(updated).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('deletes project', async () => {
      const deleted = await deleteProject(testProject.id, testUser.id);
      expect(deleted).not.toBeNull();
      expect(deleted?.id).toBe(testProject.id);

      const project = await getProjectById(testProject.id, testUser.id);
      expect(project).toBeNull();
    });

    it('returns null if project not found', async () => {
      const deleted = await deleteProject(uuidv4(), testUser.id);
      expect(deleted).toBeNull();
    });

    it('only deletes if owned by user', async () => {
      const otherUser = {
        id: uuidv4(),
        email: 'other@example.com',
        name: 'Other User',
      };
      await db.insert(user).values(otherUser);

      const deleted = await deleteProject(testProject.id, otherUser.id);
      expect(deleted).toBeNull();

      const project = await getProjectById(testProject.id, testUser.id);
      expect(project).not.toBeNull();
    });
  });
});
