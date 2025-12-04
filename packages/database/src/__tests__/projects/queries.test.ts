import { db } from '../../index';
import { project, user, company } from '../../schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  getProjectsByUserId,
  getProjectById,
  getProjectsByCompanyId,
  getActiveProjects,
  createProject,
  updateProject,
  deleteProject,
  ensureProject,
} from '../../projects/queries';
import * as fuzzyFind from '../../projects/fuzzyFind';

jest.mock('../../projects/fuzzyFind');
const mockFuzzyFind = fuzzyFind as jest.Mocked<typeof fuzzyFind>;

describe('Project Queries', () => {
  // Generate unique test identifiers
  const testId = uuidv4();
  const testUser = {
    id: uuidv4(),
    email: `test${testId}@example.com`,
    name: `Test User ${testId}`,
  };

  const testCompany = {
    id: uuidv4(),
    userId: testUser.id,
    name: `Test Company ${testId}`,
    domain: `test${testId}.com`,
    role: 'Software Engineer',
    startDate: new Date('2023-01-01'),
  };

  const testProject = {
    id: uuidv4(),
    userId: testUser.id,
    companyId: testCompany.id,
    name: `Test Project ${testId}`,
    description: `A test project ${testId}`,
    status: 'active',
    startDate: new Date('2023-01-01'),
  };

  beforeEach(async () => {
    // Create test user first
    const [_createdUser] = await db.insert(user).values(testUser).returning();

    // Clean up existing data for this user
    await db.delete(project).where(eq(project.userId, testUser.id)).execute();
    await db.delete(company).where(eq(company.userId, testUser.id)).execute();

    // Create test company
    const [_createdCompany] = await db
      .insert(company)
      .values(testCompany)
      .returning();

    // Create test project
    const [_createdProject] = await db
      .insert(project)
      .values(testProject)
      .returning();
  });

  afterEach(async () => {
    // Clean up in correct order with specific where clauses
    await db.delete(project).where(eq(project.userId, testUser.id)).execute();
    await db.delete(company).where(eq(company.userId, testUser.id)).execute();
    await db.delete(user).where(eq(user.id, testUser.id)).execute();
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(project).where(eq(project.userId, testUser.id)).execute();
    await db.delete(company).where(eq(company.userId, testUser.id)).execute();
    await db.delete(user).where(eq(user.id, testUser.id)).execute();
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
        email: `other${testId}@example.com`,
        name: `Other User ${testId}`,
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
        email: `other${testId}@example.com`,
        name: `Other User ${testId}`,
      };
      await db.insert(user).values(otherUser);

      const project = await getProjectById(testProject.id, otherUser.id);
      expect(project).toBeNull();
    });
  });

  describe('getProjectsByCompanyId', () => {
    it('returns projects for valid company', async () => {
      const projects = await getProjectsByCompanyId(
        testCompany.id,
        testUser.id,
      );
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe(testProject.name);
    });

    it('returns empty array for company with no projects', async () => {
      const newCompany = {
        id: uuidv4(),
        userId: testUser.id,
        name: `New Company ${testId}`,
        domain: `new${testId}.com`,
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
        name: `Completed Project ${testId}`,
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
        name: `New Project ${testId}`,
        description: `A new project ${testId}`,
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
        name: `New Project ${testId}`,
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
        name: `Updated Project ${testId}`,
        description: `Updated description ${testId}`,
      };

      const updated = await updateProject(testProject.id, testUser.id, update);
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe(update.name);
      expect(updated?.description).toBe(update.description);
    });

    it('returns null if project not found', async () => {
      const updated = await updateProject(uuidv4(), testUser.id, {
        name: `Updated ${testId}`,
      });
      expect(updated).toBeNull();
    });

    it('only updates if owned by user', async () => {
      const otherUser = {
        id: uuidv4(),
        email: `other${testId}@example.com`,
        name: `Other User ${testId}`,
      };
      await db.insert(user).values(otherUser);

      const updated = await updateProject(testProject.id, otherUser.id, {
        name: `Updated ${testId}`,
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
        email: `other${testId}@example.com`,
        name: `Other User ${testId}`,
      };
      await db.insert(user).values(otherUser);

      const deleted = await deleteProject(testProject.id, otherUser.id);
      expect(deleted).toBeNull();

      const project = await getProjectById(testProject.id, testUser.id);
      expect(project).not.toBeNull();
    });
  });

  describe('ensureProject', () => {
    let testProject: any;
    let fuzzyFindProject: jest.Mock;

    beforeEach(async () => {
      // Get the mock function
      fuzzyFindProject = jest.requireMock(
        '@/database/projects/fuzzyFind',
      ).fuzzyFindProject;
      fuzzyFindProject.mockReset();

      // Clear all projects
      await db.delete(project).where(eq(project.userId, testUser.id));

      // Create a test project
      testProject = await createProject({
        userId: testUser.id,
        name: 'Test Project',
        description: 'Test project description',
        status: 'active',
        startDate: new Date(),
      });
    });

    it('returns existing project when remote URL matches', async () => {
      // Update test project with remote URL
      await db
        .update(project)
        .set({ repoRemoteUrl: 'git@github.com:edspencer/test-repo.git' })
        .where(eq(project.id, testProject.id));

      const result = await ensureProject({
        userId: testUser.id,
        remoteUrl: 'git@github.com:edspencer/test-repo.git',
        repositoryName: 'test-repo',
      });

      expect(result.projectId).toBe(testProject.id);
      expect(fuzzyFindProject).not.toHaveBeenCalled();

      const foundProject = await getProjectById(result.projectId, testUser.id);
      expect(foundProject).toBeTruthy();
      expect(foundProject?.repoRemoteUrl).toBe(
        'git@github.com:edspencer/test-repo.git',
      );
    });

    it('creates new project when no match found', async () => {
      mockFuzzyFind.fuzzyFindProject.mockResolvedValue(null);

      const result = await ensureProject({
        userId: testUser.id,
        remoteUrl: 'git@github.com:edspencer/new-repo.git',
        repositoryName: 'new-repo',
      });

      // Verify a new project was created
      const newProject = await getProjectById(result.projectId, testUser.id);
      expect(newProject).toBeTruthy();
      expect(newProject?.name).toBe('new-repo');
      expect(newProject?.repoRemoteUrl).toBe(
        'git@github.com:edspencer/new-repo.git',
      );
      expect(newProject?.startDate).toBeTruthy();
      expect(newProject?.status).toBe('active');
      expect(fuzzyFindProject).toHaveBeenCalled();
    });

    it('updates existing project when fuzzy match found', async () => {
      fuzzyFindProject.mockResolvedValue(testProject.id);

      const result = await ensureProject({
        userId: testUser.id,
        remoteUrl: 'git@github.com:edspencer/matched-repo.git',
        repositoryName: 'Test Project',
      });

      // Verify the existing project was updated
      expect(result.projectId).toBe(testProject.id);
      const updatedProject = await getProjectById(testProject.id, testUser.id);
      expect(updatedProject?.repoRemoteUrl).toBe(
        'git@github.com:edspencer/matched-repo.git',
      );
      expect(fuzzyFindProject).toHaveBeenCalled();
    });

    it('only considers projects from the correct user', async () => {
      // Create a project with matching URL but different user
      const otherUser = {
        id: uuidv4(),
        email: `other${testId}@example.com`,
        name: `Other User ${testId}`,
      };
      await db.insert(user).values(otherUser);

      await createProject({
        userId: otherUser.id,
        name: 'Other User Project',
        description: 'Project belonging to other user',
        repoRemoteUrl: 'git@github.com:edspencer/test-repo.git',
        status: 'active',
        startDate: new Date(),
      });

      fuzzyFindProject.mockResolvedValue(null);

      const result = await ensureProject({
        userId: testUser.id,
        remoteUrl: 'git@github.com:edspencer/test-repo.git',
        repositoryName: 'test-repo',
      });

      // Should create new project since the existing one belongs to different user
      const newProject = await getProjectById(result.projectId, testUser.id);
      expect(newProject?.userId).toBe(testUser.id);
      expect(newProject?.repoRemoteUrl).toBe(
        'git@github.com:edspencer/test-repo.git',
      );
      expect(newProject?.startDate).toBeTruthy();
      expect(newProject?.status).toBe('active');
      expect(fuzzyFindProject).toHaveBeenCalled();
    });
  });
});
