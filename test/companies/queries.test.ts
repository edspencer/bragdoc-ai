import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import {
  getCompaniesByUserId,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  type Company,
} from '../../lib/db/queries';
import { user, company, project, type User } from '../../lib/db/schema';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load test environment variables
config({ path: '.env.test' });

// Create test database connection
const client = postgres(
  process.env.TEST_POSTGRES_URL || 'postgres://localhost:5432/bragai-test',
);
const db = drizzle(client);

describe('Company Queries', () => {
  let testUser: User;
  let testCompany: Company;
  // Generate unique test identifiers
  const testId = uuidv4();

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(project).execute();
    await db
      .delete(company)
      .where(eq(company.name, `Test Company ${testId}`))
      .execute();
    await db
      .delete(user)
      .where(eq(user.email, `test${testId}@example.com`))
      .execute();

    // Create test user first with unique email
    const [createdUser] = await db
      .insert(user)
      .values({
        email: `test${testId}@example.com`,
        name: `Test User ${testId}`,
        provider: 'credentials',
        password: null,
        image: null,
        providerId: null,
        githubAccessToken: null,
        emailVerified: null,
      })
      .returning();
    testUser = createdUser;

    // Then create test company with unique name
    const [createdCompany] = await createCompany(
      {
        userId: testUser.id,
        name: `Test Company ${testId}`,
        domain: `test${testId}.com`,
        role: 'Software Engineer',
        startDate: new Date('2023-01-01'),
        endDate: null,
      },
      db,
    );
    testCompany = createdCompany;
  });

  afterEach(async () => {
    // Clean up in correct order with specific where clauses
    await db.delete(project).execute();
    await db
      .delete(company)
      .where(eq(company.name, `Test Company ${testId}`))
      .execute();
    await db
      .delete(user)
      .where(eq(user.email, `test${testId}@example.com`))
      .execute();
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(project).execute();
    await db
      .delete(company)
      .where(eq(company.name, `Test Company ${testId}`))
      .execute();
    await db
      .delete(user)
      .where(eq(user.email, `test${testId}@example.com`))
      .execute();
    // Close database connection
    await client.end();
  });

  describe('getCompaniesByUserId', () => {
    test('returns empty array for new user', async () => {
      // Create a new user
      const [newUser] = await db
        .insert(user)
        .values({
          email: `new${testId}@example.com`,
          name: `New User ${testId}`,
          provider: 'credentials',
          password: null,
          image: null,
          providerId: null,
          githubAccessToken: null,
          emailVerified: null,
        })
        .returning();

      try {
        const companies = await getCompaniesByUserId({
          userId: newUser.id,
          db,
        });
        expect(companies).toEqual([]);
      } finally {
        // Clean up the new user with specific where clause
        await db
          .delete(company)
          .where(eq(company.userId, newUser.id))
          .execute();
        await db
          .delete(user)
          .where(eq(user.email, `new${testId}@example.com`))
          .execute();
      }
    });

    test('returns all companies for user', async () => {
      const companies = await getCompaniesByUserId({ userId: testUser.id, db });
      expect(companies.length).toBeGreaterThan(0);
      expect(companies[0].userId).toBe(testUser.id);
    });

    test('does not return other users companies', async () => {
      const [otherUser] = await db
        .insert(user)
        .values({
          email: `other${testId}@example.com`,
          name: `Other User ${testId}`,
          provider: 'credentials',
          password: null,
          image: null,
          providerId: null,
          githubAccessToken: null,
          emailVerified: null,
        })
        .returning();

      const companies = await getCompaniesByUserId({
        userId: otherUser.id,
        db,
      });
      expect(companies).toEqual([]);

      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    test('correctly orders by start date', async () => {
      // Create another company with earlier start date
      await createCompany(
        {
          userId: testUser.id,
          name: `Earlier Company ${testId}`,
          domain: `earlier${testId}.com`,
          role: 'Developer',
          startDate: new Date('2022-01-01'),
          endDate: new Date('2022-12-31'),
        },
        db,
      );

      const companies = await getCompaniesByUserId({ userId: testUser.id, db });
      expect(companies.length).toBeGreaterThan(1);
      expect(new Date(companies[0].startDate).getTime()).toBeGreaterThan(
        new Date(companies[1].startDate).getTime(),
      );
    });
  });

  describe('getCompanyById', () => {
    test('returns company for valid ID', async () => {
      const company = await getCompanyById({
        id: testCompany.id,
        userId: testUser.id,
        db,
      });
      expect(company).toBeTruthy();
      expect(company?.id).toBe(testCompany.id);
    });

    test('returns null for invalid ID', async () => {
      const company = await getCompanyById({
        id: '00000000-0000-0000-0000-000000000000',
        userId: testUser.id,
        db,
      });
      expect(company).toBeNull();
    });

    test('returns null if not owned by user', async () => {
      // Create another user
      const [otherUser] = await db
        .insert(user)
        .values({
          email: `other${testId}@example.com`,
          name: `Other User ${testId}`,
          provider: 'credentials',
          password: null,
          image: null,
          providerId: null,
          githubAccessToken: null,
          emailVerified: null,
        })
        .returning();

      try {
        const company = await getCompanyById({
          id: testCompany.id,
          userId: otherUser.id,
          db,
        });
        expect(company).toBeNull();
      } finally {
        // Clean up the other user
        await db
          .delete(company)
          .where(eq(company.userId, otherUser.id))
          .execute();
        await db.delete(user).where(eq(user.id, otherUser.id)).execute();
      }
    });
  });

  describe('createCompany', () => {
    test('creates with all required fields', async () => {
      const newCompany = {
        userId: testUser.id,
        name: `New Company ${testId}`,
        domain: `new${testId}.com`,
        role: 'Manager',
        startDate: new Date(),
        endDate: null,
      };

      const [created] = await createCompany(newCompany, db);
      expect(created).toBeTruthy();
      expect(created.name).toBe(newCompany.name);
      expect(created.domain).toBe(newCompany.domain);
      expect(created.role).toBe(newCompany.role);
    });

    test('creates with optional fields', async () => {
      const newCompany = {
        userId: testUser.id,
        name: `Optional Company ${testId}`,
        domain: null,
        role: 'Developer',
        startDate: new Date(),
        endDate: new Date(),
      };

      const [created] = await createCompany(newCompany, db);
      expect(created).toBeTruthy();
      expect(created.domain).toBeNull();
      expect(created.endDate).toBeTruthy();
    });
  });

  describe('updateCompany', () => {
    test('updates all fields', async () => {
      const updates = {
        name: `Updated Company ${testId}`,
        domain: `updated${testId}.com`,
        role: 'Senior Engineer',
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-12-31'),
      };

      const [updated] = await updateCompany({
        id: testCompany.id,
        userId: testUser.id,
        data: updates,
        db,
      });

      expect(updated).toBeTruthy();
      expect(updated.name).toBe(updates.name);
      expect(updated.domain).toBe(updates.domain);
      expect(updated.role).toBe(updates.role);
    });

    test('updates partial fields', async () => {
      const originalName = testCompany.name;
      const updates = {
        role: 'Lead Engineer',
      };

      const [updated] = await updateCompany({
        id: testCompany.id,
        userId: testUser.id,
        data: updates,
        db,
      });

      expect(updated).toBeTruthy();
      expect(updated.name).toBe(originalName);
      expect(updated.role).toBe(updates.role);
    });

    test('only updates if owned by user', async () => {
      const [otherUser] = await db
        .insert(user)
        .values({
          email: `other${testId}@example.com`,
          name: `Other User ${testId}`,
          provider: 'credentials',
          password: null,
          image: null,
          providerId: null,
          githubAccessToken: null,
          emailVerified: null,
        })
        .returning();

      const updates = {
        name: `Unauthorized Update ${testId}`,
      };

      const updated = await updateCompany({
        id: testCompany.id,
        userId: otherUser.id,
        data: updates,
        db,
      });

      expect(updated).toHaveLength(0);

      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });

  describe('deleteCompany', () => {
    test('removes company', async () => {
      const [company] = await createCompany(
        {
          userId: testUser.id,
          name: `To Delete ${testId}`,
          domain: `delete${testId}.com`,
          role: 'Developer',
          startDate: new Date(),
          endDate: null,
        },
        db,
      );

      const deleted = await deleteCompany({
        id: company.id,
        userId: testUser.id,
        db,
      });
      expect(deleted).toHaveLength(1);

      const found = await getCompanyById({
        id: company.id,
        userId: testUser.id,
        db,
      });
      expect(found).toBeNull();
    });

    test('only deletes if owned by user', async () => {
      const [otherUser] = await db
        .insert(user)
        .values({
          email: `other${testId}@example.com`,
          name: `Other User ${testId}`,
          provider: 'credentials',
          password: null,
          image: null,
          providerId: null,
          githubAccessToken: null,
          emailVerified: null,
        })
        .returning();

      const deleted = await deleteCompany({
        id: testCompany.id,
        userId: otherUser.id,
        db,
      });
      expect(deleted).toHaveLength(0);

      const stillExists = await getCompanyById({
        id: testCompany.id,
        userId: testUser.id,
        db,
      });
      expect(stillExists).toBeTruthy();

      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });
});
