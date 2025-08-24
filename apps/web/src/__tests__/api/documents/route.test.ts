import { GET, PUT, DELETE, } from '@/app/api/documents/[id]/route';
import {
  GET as getDocuments,
  POST as createDocument,
} from '@/app/api/documents/route';
import {
  POST as shareDocument,
  DELETE as unshareDocument,
} from '@/app/api/documents/[id]/share/route';
import { document, user, company, project } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { db } from '@/lib/db';

// Mock the auth module
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

describe('Documents API', () => {
  const mockUser = {
    id: uuidv4(),
    email: 'test@example.com',
    provider: 'credentials',
  };

  const mockCompany = {
    id: uuidv4(),
    name: 'Test Company',
    userId: mockUser.id,
    role: 'Software Engineer',
    startDate: new Date(),
    domain: 'test.com',
    endDate: null,
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test user first
    await db.insert(user).values(mockUser);

    // Clean up any existing data for this user
    await db
      .delete(document)
      .where(eq(document.userId, mockUser.id))
      .execute();
    await db
      .delete(project)
      .where(eq(project.userId, mockUser.id))
      .execute();
    await db
      .delete(company)
      .where(eq(company.userId, mockUser.id))
      .execute();

    // Insert the mock company
    await db.insert(company).values(mockCompany);

    // Mock auth to return our test user
    (auth as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
  });

  afterEach(async () => {
    // Clean up in correct order with specific where clauses
    await db
      .delete(document)
      .where(eq(document.userId, mockUser.id))
      .execute();
    await db
      .delete(project)
      .where(eq(project.userId, mockUser.id))
      .execute();
    await db
      .delete(company)
      .where(eq(company.userId, mockUser.id))
      .execute();
    await db
      .delete(user)
      .where(eq(user.id, mockUser.id))
      .execute();
  });

  afterAll(async () => {
    // Final cleanup
    await db
      .delete(document)
      .where(eq(document.userId, mockUser.id))
      .execute();
    await db
      .delete(project)
      .where(eq(project.userId, mockUser.id))
      .execute();
    await db
      .delete(company)
      .where(eq(company.userId, mockUser.id))
      .execute();
    await db
      .delete(user)
      .where(eq(user.id, mockUser.id))
      .execute();
  });

  describe('GET /api/documents', () => {
    it('returns empty array when no documents exist', async () => {
      const url = new URL('http://localhost/api/documents');
      const response = await getDocuments(new NextRequest(url));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.documents).toEqual([]);
    });

    it('returns all documents for the authenticated user', async () => {
      const testDoc = {
        id: uuidv4(),
        title: 'Test Document',
        content: 'Test Content',
        userId: mockUser.id,
        type: 'weekly_report',
        companyId: mockCompany.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(document).values(testDoc);

      const url = new URL('http://localhost/api/documents');
      const response = await getDocuments(new NextRequest(url));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].title).toBe(testDoc.title);
    });
  });

  describe('POST /api/documents', () => {
    it('creates a new document', async () => {
      const newDoc = {
        title: 'New Document',
        content: 'Document Content',
        type: 'weekly_report',
        companyId: mockCompany.id,
      };

      const response = await createDocument(
        new NextRequest('http://localhost/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDoc),
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.document.title).toBe(newDoc.title);
      expect(data.document.type).toBe(newDoc.type);

      // Verify document was created in database
      const dbDoc = await db
        .select()
        .from(document)
        .where(eq(document.title, newDoc.title));
      expect(dbDoc).toHaveLength(1);
      expect(dbDoc[0].content).toBe(newDoc.content);
    });

    it('validates required fields', async () => {
      const invalidDoc = {
        content: 'Missing Title',
      };

      const response = await createDocument(
        new NextRequest('http://localhost/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidDoc),
        }),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request');
    });
  });

  describe('GET /api/documents/[id]', () => {
    it('returns a specific document', async () => {
      const testDoc = {
        id: uuidv4(),
        title: 'Test Document',
        content: 'Test Content',
        userId: mockUser.id,
        type: 'weekly_report',
        companyId: mockCompany.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(document).values(testDoc);

      const url = new URL(`http://localhost/api/documents/${testDoc.id}`);
      const response = await GET(new NextRequest(url), { params: Promise.resolve({ id: testDoc.id }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.document.title).toBe(testDoc.title);
    });

    it('returns 404 for non-existent document', async () => {
      // Mock auth to return our test user
      (auth as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });

      const nonExistentId = uuidv4();
      const url = new URL(`http://localhost/api/documents/${nonExistentId}`);
      const response = await GET(new NextRequest(url), { params: Promise.resolve({ id: nonExistentId }) });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/documents/[id]', () => {
    it('updates a document', async () => {
      const testDoc = {
        id: uuidv4(),
        title: 'Test Document',
        content: 'Test Content',
        userId: mockUser.id,
        type: 'weekly_report',
        companyId: mockCompany.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(document).values(testDoc);

      const updates = {
        title: 'Updated Title',
        content: 'Updated Content',
        type: 'monthly_report',
      };

      const url = new URL(`http://localhost/api/documents/${testDoc.id}`);
      const response = await PUT(
        new NextRequest(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
        { params: Promise.resolve({ id: testDoc.id }) },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.document.title).toBe(updates.title);
      expect(data.document.type).toBe(updates.type);
    });
  });

  describe('DELETE /api/documents/[id]', () => {
    it('deletes a document', async () => {
      const testDoc = {
        id: uuidv4(),
        title: 'Test Document',
        content: 'Test Content',
        userId: mockUser.id,
        type: 'weekly_report',
        companyId: mockCompany.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(document).values(testDoc);

      const url = new URL(`http://localhost/api/documents/${testDoc.id}`);
      const response = await DELETE(new NextRequest(url), { params: Promise.resolve({ id: testDoc.id }) });

      expect(response.status).toBe(200);

      // Verify document was deleted
      const dbDoc = await db
        .select()
        .from(document)
        .where(eq(document.id, testDoc.id));
      expect(dbDoc).toHaveLength(0);
    });
  });

  describe('Document Sharing', () => {
    it('generates a share token', async () => {
      const testDoc = {
        id: uuidv4(),
        title: 'Test Document',
        content: 'Test Content',
        userId: mockUser.id,
        type: 'weekly_report',
        companyId: mockCompany.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(document).values(testDoc);

      const url = new URL(`http://localhost/api/documents/${testDoc.id}/share`);
      const response = await shareDocument(new NextRequest(url), { params: Promise.resolve({ id: testDoc.id }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.shareToken).toBeDefined();

      // Verify token was saved
      const dbDoc = await db
        .select()
        .from(document)
        .where(eq(document.id, testDoc.id));
      expect(dbDoc[0].shareToken).toBe(data.shareToken);
    });

    it('revokes a share token', async () => {
      const testDoc = {
        id: uuidv4(),
        title: 'Test Document',
        content: 'Test Content',
        userId: mockUser.id,
        type: 'weekly_report',
        companyId: mockCompany.id,
        shareToken: 'test-token',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(document).values(testDoc);

      const url = new URL(`http://localhost/api/documents/${testDoc.id}/share`);
      const response = await unshareDocument(new NextRequest(url), { params: Promise.resolve({ id: testDoc.id }) });

      expect(response.status).toBe(200);

      // Verify token was removed
      const dbDoc = await db
        .select()
        .from(document)
        .where(eq(document.id, testDoc.id));
      expect(dbDoc[0].shareToken).toBeNull();
    });
  });
});
