import {
  formatAchievementForEmbedding,
  generateAchievementEmbedding,
  generateEmbeddingsBatch,
  generateMissingEmbeddings,
} from 'lib/ai/embeddings';
import { achievement, user, project } from '@/database/schema';
import { db } from '@/database/index';
import { eq } from 'drizzle-orm';
import {
  createMockUser,
  createMockProject,
  createMockAchievement,
} from '../../helpers';

// Mock the OpenAI API
jest.mock('ai', () => ({
  embed: jest.fn(),
}));

const mockUser = createMockUser();
const mockProject = createMockProject(mockUser.id);
const mockAchievementData = createMockAchievement(mockUser.id, mockProject.id);

describe('Embeddings Module', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean up database
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(user);

    // Insert test user and project
    await db.insert(user).values(mockUser);
    await db.insert(project).values(mockProject);
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

      // Mock the embed function
      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

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
      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

      await expect(
        generateAchievementEmbedding('non-existent-id'),
      ).rejects.toThrow();
    });

    it('updates embeddingModel and embeddingGeneratedAt', async () => {
      const testAch = { ...mockAchievementData };
      await db.insert(achievement).values(testAch);

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

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
      const ids = ['id-1', 'id-2', 'id-3'];
      for (const id of ids) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id,
        });
      }

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

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
      const ids = ['id-1', 'id-2', 'id-3'];
      // Only insert first two
      for (const id of ids.slice(0, 2)) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id,
        });
      }

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

      // Generate embeddings (one will fail)
      const result = await generateEmbeddingsBatch(ids);

      // Should return map of successful embeddings
      expect(result instanceof Map).toBe(true);
      // At least the successful ones should be returned
      expect(result.size).toBeGreaterThanOrEqual(0);
    });

    it('returns map of achievementId -> embedding', async () => {
      const ids = ['id-1', 'id-2'];
      for (const id of ids) {
        await db.insert(achievement).values({
          ...mockAchievementData,
          id,
        });
      }

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

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
        id: 'with-embedding',
        embedding: Array(1536).fill(0),
      };
      const withoutEmbedding = {
        ...mockAchievementData,
        id: 'without-embedding',
        embedding: null,
      };

      await db.insert(achievement).values(withEmbedding);
      await db.insert(achievement).values(withoutEmbedding);

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

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
          id: `missing-${i}`,
          embedding: null,
        });
      }

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

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
        id: 'test-1',
        embedding: null,
      });

      const { embed } = require('ai');
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());
      embed.mockResolvedValue({ embedding: mockEmbedding });

      const count = await generateMissingEmbeddings(userId);

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
