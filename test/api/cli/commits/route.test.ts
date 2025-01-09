import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import {
  user,
  company,
  project,
  achievement,
} from '@/lib/db/schema';
import { POST } from '@/app/api/cli/commits/route';
import { NextRequest } from 'next/server';
import type { EventDuration } from '@/lib/types/achievement';

// Mock auth
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

// Mock extractFromCommits
jest.mock('@/lib/ai/extractFromCommits', () => ({
  extractFromCommits: jest.fn(),
}));

describe('CLI Commits API Route', () => {
  const testUser = {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
    provider: 'credentials',
    createdAt: new Date(),
    updatedAt: new Date(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testCommits = {
    repository: {
      name: 'test-repo',
      path: '/path/to/repo',
    },
    commits: [
      {
        hash: '123abc',
        message: 'feat: implement new feature',
        author: {
          name: 'Test User',
          email: 'test@example.com',
        },
        date: new Date().toISOString(),
        prDetails: {
          title: 'Add new feature',
          description: 'Implements the new feature with tests',
          number: 123,
        },
      },
    ],
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    // Clean up existing data
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);
    // Insert test data
    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompany);
    await db.insert(project).values(testProject);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(company);
    await db.delete(user);
  });

  describe('POST /api/cli/commits', () => {
    it('processes commits and creates achievements for authenticated user', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const mockAchievement = {
        title: 'Implemented new feature',
        summary: 'Added a significant feature with tests',
        eventStart: new Date(),
        eventDuration: 'week' as EventDuration,
        source: 'llm' as const,
        impact: 2,
        impactSource: 'llm' as const,
      };

      require('@/lib/ai/extractFromCommits').extractFromCommits.mockImplementation(
        function* () {
          yield mockAchievement;
        },
      );

      const response = await POST(
        new NextRequest('http://localhost/api/cli/commits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCommits),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.processedCount).toBe(1);
      expect(data.achievements).toHaveLength(1);
      expect(data.achievements[0]).toMatchObject({
        title: mockAchievement.title,
        userId: testUser.id,
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce(null);

      const response = await POST(
        new NextRequest('http://localhost/api/cli/commits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCommits),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('validates commit limit', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const tooManyCommits = {
        ...testCommits,
        commits: Array(101).fill(testCommits.commits[0]),
      };

      const response = await POST(
        new NextRequest('http://localhost/api/cli/commits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tooManyCommits),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data.details.commits._errors).toContain(
        'Maximum 100 commits per request',
      );
    });

    it('handles invalid request body', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      const invalidCommits = {
        repository: {
          // missing required fields
        },
        commits: [
          {
            // missing required fields
          },
        ],
      };

      const response = await POST(
        new NextRequest('http://localhost/api/cli/commits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidCommits),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('handles extraction errors gracefully', async () => {
      require('@/app/(auth)/auth').auth.mockResolvedValueOnce({
        user: { id: testUser.id },
      });

      require('@/lib/ai/extractFromCommits').extractFromCommits.mockImplementation(
        () => {
          throw new Error('Extraction failed');
        },
      );

      const response = await POST(
        new NextRequest('http://localhost/api/cli/commits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCommits),
        }),
      );

      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
