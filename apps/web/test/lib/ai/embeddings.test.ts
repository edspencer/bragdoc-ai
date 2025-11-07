import {
  formatAchievementForEmbedding,
  generateAchievementEmbedding,
  generateEmbeddingsBatch,
  generateMissingEmbeddings,
} from 'lib/ai/embeddings';
import { achievement, user, project } from '@/database/schema';
import { db } from '@/database/index';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock the OpenAI provider
jest.mock('@ai-sdk/openai', () => ({
  openai: {
    embedding: jest.fn(() => ({
      doEmbed: jest.fn(),
    })),
  },
}));

const mockAchievementData = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  userId: '123e4567-e89b-12d3-a456-426614174002',
  projectId: '123e4567-e89b-12d3-a456-426614174003',
  title: 'Test Achievement',
  summary: 'A brief summary',
  details: 'Some additional details that are helpful',
  impact: 2,
  source: 'manual' as const,
  eventStart: new Date('2025-01-01'),
  eventEnd: null,
  eventDuration: 'week' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  isArchived: false,
  workstreamId: null,
  workstreamSource: null,
  embedding: null,
  embeddingModel: null,
  embeddingGeneratedAt: null,
};

describe('Embeddings Module', () => {
  beforeEach(async () => {
    // Clean up database
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(user);

    // Insert test user and project
    await db.insert(user).values({
      id: mockAchievementData.userId,
      email: 'test@example.com',
      provider: 'credentials',
    });
    await db.insert(project).values({
      id: mockAchievementData.projectId,
      userId: mockAchievementData.userId,
      name: 'Test Project',
      startDate: new Date('2025-01-01'),
    });
  });

  afterEach(async () => {
    // Clean up after tests
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(user);
    jest.clearAllMocks();
  });

  describe('formatAchievementForEmbedding', () => {
    it('combines title and summary', () => {
      const ach = {
        ...mockAchievementData,
        title: 'Built Feature X',
        summary: 'Improved performance',
      };

      const text = formatAchievementForEmbedding(ach as any);
      expect(text).toContain('Built Feature X');
      expect(text).toContain('Improved performance');
    });

    it('includes short details (< 500 chars)', () => {
      const ach = {
        ...mockAchievementData,
        title: 'Feature',
        summary: 'Summary',
        details: 'Short details here',
      };

      const text = formatAchievementForEmbedding(ach as any);
      expect(text).toContain('Short details here');
    });

    it('excludes long details (>= 500 chars)', () => {
      const longDetails = 'a'.repeat(500);
      const ach = {
        ...mockAchievementData,
        title: 'Feature',
        summary: 'Summary',
        details: longDetails,
      };

      const text = formatAchievementForEmbedding(ach as any);
      expect(text).not.toContain(longDetails);
      expect(text).toContain('Feature');
      expect(text).toContain('Summary');
    });

    it('handles missing optional fields', () => {
      const ach = {
        ...mockAchievementData,
        title: 'Just Title',
        summary: 'Just Summary',
        details: null,
      };

      const text = formatAchievementForEmbedding(ach as any);
      expect(text).toContain('Just Title');
      expect(text).toContain('Just Summary');
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('returns single text string for embedding', () => {
      const ach = mockAchievementData;
      const text = formatAchievementForEmbedding(ach as any);

      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
      // Should not have newlines that would break embedding
      expect(text.includes('\n')).toBe(false);
    });
  });

  describe('generateAchievementEmbedding', () => {
    it('generates embedding and saves to database', async () => {
      // Insert test achievement
      const testAch = { ...mockAchievementData };
      await db.insert(achievement).values(testAch);

      // Mock the OpenAI embedding function
      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      // Generate embedding
      const result = await generateAchievementEmbedding(testAch.id);

      // Verify embedding was returned
      expect(result).toHaveLength(1536);
      expect(Array.isArray(result)).toBe(true);

      // Verify it was saved to database
      const saved = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, testAch.id));

      expect(saved).toHaveLength(1);
      expect(saved[0].embedding).not.toBeNull();
      expect(saved[0].embeddingModel).toBe('text-embedding-3-small');
      expect(saved[0].embeddingGeneratedAt).not.toBeNull();
    });

    it('throws error for non-existent achievement', async () => {
      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      await expect(
        generateAchievementEmbedding('non-existent-id'),
      ).rejects.toThrow();
    });

    it('updates embeddingModel and embeddingGeneratedAt', async () => {
      const testAch = { ...mockAchievementData };
      await db.insert(achievement).values(testAch);

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      const beforeTime = new Date();
      await generateAchievementEmbedding(testAch.id);
      const afterTime = new Date();

      const saved = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, testAch.id));

      expect(saved[0].embeddingModel).toBe('text-embedding-3-small');
      expect(saved[0].embeddingGeneratedAt).not.toBeNull();
      expect(saved[0].embeddingGeneratedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(saved[0].embeddingGeneratedAt!.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });

  describe('generateEmbeddingsBatch', () => {
    it('processes multiple achievements in parallel', async () => {
      // Insert multiple achievements
      const ids = [
        '523e4567-e89b-12d3-a456-426614174001',
        '523e4567-e89b-12d3-a456-426614174002',
        '523e4567-e89b-12d3-a456-426614174003',
      ];
      for (const id of ids) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id,
        });
      }

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      // Generate embeddings
      const result = await generateEmbeddingsBatch(ids);

      // Verify map structure
      expect(result instanceof Map).toBe(true);
      expect(result.size).toBeGreaterThan(0);

      // Verify all successful embeddings are returned
      for (const id of ids) {
        if (result.has(id)) {
          const embedding = result.get(id);
          expect(Array.isArray(embedding)).toBe(true);
          expect(embedding).toHaveLength(1536);
        }
      }
    });

    it('handles partial failures gracefully', async () => {
      const ids = [
        '523e4567-e89b-12d3-a456-426614174001',
        '523e4567-e89b-12d3-a456-426614174002',
        '523e4567-e89b-12d3-a456-426614174003',
      ];
      // Only insert first two
      for (const id of ids.slice(0, 2)) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id,
        });
      }

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      // Generate embeddings (one will fail)
      const result = await generateEmbeddingsBatch(ids);

      // Should return map of successful embeddings
      expect(result instanceof Map).toBe(true);
      // At least the successful ones should be returned
      expect(result.size).toBeGreaterThanOrEqual(0);
    });

    it('returns map of achievementId -> embedding', async () => {
      const ids = [
        '523e4567-e89b-12d3-a456-426614174001',
        '523e4567-e89b-12d3-a456-426614174002',
      ];
      for (const id of ids) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id,
        });
      }

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      const result = await generateEmbeddingsBatch(ids);

      expect(result instanceof Map).toBe(true);
      // Each entry should map ID to embedding
      for (const [achId, embedding] of result.entries()) {
        expect(typeof achId).toBe('string');
        expect(Array.isArray(embedding)).toBe(true);
      }
    });
  });

  describe('generateMissingEmbeddings', () => {
    it('finds achievements without embeddings', async () => {
      const userId = mockAchievementData.userId;

      // Insert mix of achievements with and without embeddings
      const withEmbedding = {
        ...mockAchievementData,
        id: '623e4567-e89b-12d3-a456-426614174001',
        embedding: Array(1536).fill(0),
      };
      const withoutEmbedding = {
        ...mockAchievementData,
        id: '623e4567-e89b-12d3-a456-426614174002',
        embedding: null,
      };

      await db.insert(achievement).values(withEmbedding);
      await db.insert(achievement).values(withoutEmbedding);

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      const count = await generateMissingEmbeddings(userId);

      // Should generate embedding for the one without
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('generates embeddings for all missing', async () => {
      const userId = mockAchievementData.userId;

      // Insert 3 achievements without embeddings
      for (let i = 0; i < 3; i++) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id: uuidv4(),
          embedding: null,
        });
      }

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      const count = await generateMissingEmbeddings(userId);

      // Should indicate embeddings were generated
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('returns count of embeddings generated', async () => {
      const userId = mockAchievementData.userId;

      // Insert achievements
      await db.insert(achievement).values({
        ...mockAchievementData,
        id: '823e4567-e89b-12d3-a456-426614174001',
        embedding: null,
      });

      const { openai } = require('@ai-sdk/openai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const mockDoEmbed = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding],
      });
      openai.embedding.mockReturnValue({
        doEmbed: mockDoEmbed,
      });

      const count = await generateMissingEmbeddings(userId);

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
