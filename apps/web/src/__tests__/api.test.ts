import { GET, PUT, DELETE } from '@/app/api/companies/[id]/route';
import {
  GET as getCompanies,
  POST as createCompany,
} from '@/app/api/companies/route';
import { company, user, project, achievement } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { db } from '@/lib/db';

// Mock the auth module
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

describe('Companies API', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
    email: 'test@example.com',
    provider: 'credentials',
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clean up any existing data in correct order
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);

    // Insert the mock user before each test
    await db.insert(user).values(mockUser);

    // Set up auth mock to return our test user
    (auth as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
  });

  afterEach(async () => {
    // Clean up after each test in correct order
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);
  });

  describe('GET /api/companies', () => {
    it('returns empty array when no companies exist', async () => {
      const response = await getCompanies();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    it('returns all companies for the authenticated user', async () => {
      const testCompany = {
        name: 'Test Company',
        userId: mockUser.id,
        role: 'Software Engineer',
        startDate: new Date(),
        domain: 'test.com',
        endDate: null,
      };
      await db.insert(company).values(testCompany);

      const response = await getCompanies();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe(testCompany.name);
    });
  });

  describe('POST /api/companies', () => {
    it('creates a new company', async () => {
      const newCompany = {
        name: 'New Company',
        role: 'Software Engineer',
        domain: 'test.com',
        startDate: new Date().toISOString(),
        endDate: null,
      };

      const response = await createCompany(
        new NextRequest('http://localhost/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCompany),
        }),
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe(newCompany.name);
      expect(data.role).toBe(newCompany.role);

      // Verify company was created in database
      const companies = await db
        .select()
        .from(company)
        .where(eq(company.userId, mockUser.id));
      expect(companies).toHaveLength(1);
      expect(companies[0].name).toBe(newCompany.name);
    });

    it('validates company data', async () => {
      const response = await createCompany(
        new NextRequest('http://localhost/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid input');
    });
  });

  describe('GET /api/companies/[id]', () => {
    it('returns a specific company', async () => {
      const testCompany = {
        name: 'Test Company',
        userId: mockUser.id,
        role: 'Software Engineer',
        startDate: new Date(),
        domain: 'test.com',
        endDate: null,
      };
      const [created] = await db
        .insert(company)
        .values(testCompany)
        .returning();

      const response = await GET(
        new NextRequest(
          new NextRequest(`http://localhost/api/companies/${created.id}`),
        ),
        { params: Promise.resolve({ id: created.id }) },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe(testCompany.name);
    });

    it('returns 404 for non-existent company', async () => {
      const response = await GET(
        new NextRequest(
          new NextRequest(
            'http://localhost/api/companies/123e4567-e89b-12d3-a456-426614174001',
          ),
        ),
        {
          params: Promise.resolve({
            id: '123e4567-e89b-12d3-a456-426614174001',
          }),
        },
      );

      expect(response.status).toBe(404);
      const data = await response.text();
      expect(data).toBe('Not Found');
    });
  });

  describe('PUT /api/companies/[id]', () => {
    it('updates a company', async () => {
      const testCompany = {
        name: 'Test Company',
        userId: mockUser.id,
        role: 'Software Engineer',
        startDate: new Date(),
        domain: 'test.com',
        endDate: null,
      };
      const [created] = await db
        .insert(company)
        .values(testCompany)
        .returning();

      const updateData = {
        name: 'Updated Company',
        role: 'Senior Engineer',
        startDate: new Date().toISOString(),
        domain: 'updated.com',
        endDate: null,
      };

      const response = await PUT(
        new NextRequest(`http://localhost/api/companies/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: created.id }) },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe(updateData.name);
      expect(data.role).toBe(updateData.role);
    });

    it('returns 404 for non-existent company', async () => {
      const updateData = {
        name: 'Updated Company',
        role: 'Senior Engineer',
        startDate: new Date().toISOString(),
        domain: 'updated.com',
        endDate: null,
      };

      const response = await PUT(
        new NextRequest(
          'http://localhost/api/companies/123e4567-e89b-12d3-a456-426614174001',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          },
        ),
        {
          params: Promise.resolve({
            id: '123e4567-e89b-12d3-a456-426614174001',
          }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/companies/[id]', () => {
    it('deletes a company', async () => {
      const testCompany = {
        name: 'Test Company',
        userId: mockUser.id,
        role: 'Software Engineer',
        startDate: new Date(),
        domain: 'test.com',
        endDate: null,
      };
      const [created] = await db
        .insert(company)
        .values(testCompany)
        .returning();

      const response = await DELETE(
        new NextRequest(`http://localhost/api/companies/${created.id}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: created.id }) },
      );

      expect(response.status).toBe(204);

      // Verify company was deleted
      const companies = await db
        .select()
        .from(company)
        .where(eq(company.id, created.id));
      expect(companies.length).toBe(0);
    });

    it('returns 404 for non-existent company', async () => {
      const response = await DELETE(
        new NextRequest(
          'http://localhost/api/companies/123e4567-e89b-12d3-a456-426614174002',
          {
            method: 'DELETE',
          },
        ),
        {
          params: Promise.resolve({
            id: '123e4567-e89b-12d3-a456-426614174002',
          }),
        },
      );

      expect(response.status).toBe(404);
    });
  });
});
