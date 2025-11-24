import { v4 as uuidv4 } from 'uuid';
import { createAchievement } from '../../src/achievements/utils';
import { db } from '../../src/index';
import { user, project, achievement } from '../../src/schema';
import { eq } from 'drizzle-orm';
import type { CreateAchievementRequest } from '../../src/types/achievement';
import type { EventDuration } from '../../src/types/achievement';

/**
 * Phase 4 Tests: Utility Function Duplicate Handling
 * Tests the createAchievement function's ability to handle duplicates gracefully
 * Tests 4.10 and 4.11 from the PLAN
 */
describe('createAchievement Utility Function - Duplicate Prevention', () => {
  const testUserId = uuidv4();
  const testProjectId = uuidv4();

  const testUser = {
    id: testUserId,
    email: 'test@example.com',
    name: 'Test User',
    provider: 'credentials' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testProject = {
    id: testProjectId,
    userId: testUserId,
    name: 'Test Project',
    status: 'active' as const,
    startDate: new Date('2025-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const achievementData: CreateAchievementRequest = {
    title: 'Test Achievement',
    eventDuration: 'week' as EventDuration,
    projectId: testProjectId,
    uniqueSourceId: 'test-source-id-123',
    source: 'commit',
  };

  beforeEach(async () => {
    // Clean up existing data
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(user);

    // Insert test data
    await db.insert(user).values(testUser);
    await db.insert(project).values(testProject);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(user);
  });

  describe('Task 4.10: Duplicate Detection and Return', () => {
    it('should create new achievement when no duplicate exists', async () => {
      // First time creating this achievement
      const result = await createAchievement(
        testUserId,
        achievementData,
        'commit',
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(achievementData.title);
      expect(result.projectId).toBe(testProjectId);
      expect(result.uniqueSourceId).toBe('test-source-id-123');
      expect(result.userId).toBe(testUserId);

      // Verify it was stored in database
      const stored = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, result.id));
      expect(stored).toHaveLength(1);
    });

    it('should return existing achievement on duplicate submission', async () => {
      // First submission
      const result1 = await createAchievement(
        testUserId,
        achievementData,
        'commit',
      );
      expect(result1.id).toBeDefined();

      // Second submission with identical data - should return existing
      const result2 = await createAchievement(
        testUserId,
        achievementData,
        'commit',
      );

      // Should return the same achievement
      expect(result2.id).toBe(result1.id);
      expect(result2.title).toBe(result1.title);
      expect(result2.projectId).toBe(result1.projectId);
      expect(result2.uniqueSourceId).toBe(result1.uniqueSourceId);

      // Database should still have only one achievement record
      const all = await db.select().from(achievement);
      const matching = all.filter(
        (a) => a.uniqueSourceId === 'test-source-id-123',
      );
      expect(matching).toHaveLength(1);
    });

    it('should maintain userId scoping in duplicate query', async () => {
      // Create first achievement for testUser
      const result1 = await createAchievement(
        testUserId,
        achievementData,
        'commit',
      );
      expect(result1.userId).toBe(testUserId);

      // Create a different user
      const otherUserId = uuidv4();
      const otherUser = {
        id: otherUserId,
        email: 'other@example.com',
        name: 'Other User',
        provider: 'credentials' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(user).values(otherUser);

      // Try to create same achievement for different user - should create new
      const result2 = await createAchievement(
        otherUserId,
        achievementData,
        'commit',
      );

      // Should be different achievements (different userId)
      expect(result2.id).not.toBe(result1.id);
      expect(result2.userId).toBe(otherUserId);

      // Database should have two achievement records
      const all = await db.select().from(achievement);
      expect(all).toHaveLength(2);
    });

    it('should handle NULL projectId correctly (constraint should not apply)', async () => {
      const dataWithoutProject: CreateAchievementRequest = {
        title: 'Manual Achievement',
        eventDuration: 'week' as EventDuration,
        uniqueSourceId: 'test-source-id-123', // Same uniqueSourceId
        // projectId is intentionally NULL
      };

      // First submission
      const result1 = await createAchievement(
        testUserId,
        dataWithoutProject,
        'manual',
      );
      expect(result1.projectId).toBeNull();

      // Second submission with same uniqueSourceId but no projectId
      const result2 = await createAchievement(
        testUserId,
        dataWithoutProject,
        'manual',
      );

      // Should create different achievements (constraint doesn't apply when projectId is NULL)
      expect(result2.id).not.toBe(result1.id);

      // Database should have two achievement records
      const all = await db
        .select()
        .from(achievement)
        .where(eq(achievement.userId, testUserId));
      expect(all).toHaveLength(2);
    });

    it('should handle NULL uniqueSourceId correctly (constraint should not apply)', async () => {
      const dataWithoutSourceId: CreateAchievementRequest = {
        title: 'Manual Achievement',
        eventDuration: 'week' as EventDuration,
        projectId: testProjectId,
        // uniqueSourceId is intentionally NULL
      };

      // First submission
      const result1 = await createAchievement(
        testUserId,
        dataWithoutSourceId,
        'manual',
      );
      expect(result1.uniqueSourceId).toBeNull();

      // Second submission with same projectId but no uniqueSourceId
      const result2 = await createAchievement(
        testUserId,
        dataWithoutSourceId,
        'manual',
      );

      // Should create different achievements (constraint doesn't apply when uniqueSourceId is NULL)
      expect(result2.id).not.toBe(result1.id);

      // Database should have two achievement records
      const all = await db
        .select()
        .from(achievement)
        .where(eq(achievement.userId, testUserId));
      expect(all).toHaveLength(2);
    });

    it('should handle multiple different achievements in same project', async () => {
      // Create three different achievements in the same project with different uniqueSourceIds
      const data1: CreateAchievementRequest = {
        ...achievementData,
        uniqueSourceId: 'github-pr-001',
      };

      const data2: CreateAchievementRequest = {
        ...achievementData,
        title: 'Different Achievement',
        uniqueSourceId: 'github-pr-002',
      };

      const data3: CreateAchievementRequest = {
        ...achievementData,
        title: 'Third Achievement',
        uniqueSourceId: 'github-pr-003',
      };

      const result1 = await createAchievement(testUserId, data1, 'commit');
      const result2 = await createAchievement(testUserId, data2, 'commit');
      const result3 = await createAchievement(testUserId, data3, 'commit');

      // All should have different IDs
      expect(result1.id).not.toBe(result2.id);
      expect(result2.id).not.toBe(result3.id);
      expect(result1.id).not.toBe(result3.id);

      // Database should have three achievements
      const all = await db
        .select()
        .from(achievement)
        .where(eq(achievement.userId, testUserId));
      expect(all).toHaveLength(3);
    });
  });

  describe('Task 4.11: Error Handling', () => {
    it('should return existing achievement instead of throwing on constraint violation', async () => {
      // First submission
      const result1 = await createAchievement(
        testUserId,
        achievementData,
        'commit',
      );

      // Second submission should NOT throw - should return existing
      let result2;
      let error;

      try {
        result2 = await createAchievement(
          testUserId,
          achievementData,
          'commit',
        );
      } catch (e) {
        error = e;
      }

      // Should not have thrown
      expect(error).toBeUndefined();
      expect(result2).toBeDefined();
      expect(result2.id).toBe(result1.id);
    });

    it('should allow manual achievements without source tracking (same title allowed)', async () => {
      // Manual achievements without projectId/uniqueSourceId should be allowed multiple times
      const manualData: CreateAchievementRequest = {
        title: 'Manual Achievement',
        eventDuration: 'week' as EventDuration,
        // No projectId or uniqueSourceId
      };

      const result1 = await createAchievement(testUserId, manualData, 'manual');
      const result2 = await createAchievement(testUserId, manualData, 'manual');

      // Should be different achievements
      expect(result1.id).not.toBe(result2.id);
      expect(result1.source).toBe('manual');
      expect(result2.source).toBe('manual');
    });

    it('should preserve all achievement data on duplicate return', async () => {
      const complexData: CreateAchievementRequest = {
        title: 'Complex Achievement',
        eventDuration: 'month' as EventDuration,
        projectId: testProjectId,
        uniqueSourceId: 'complex-test-id',
        summary: 'A complex test achievement',
        details: 'With detailed information',
        impact: 8,
      };

      // First submission
      const result1 = await createAchievement(
        testUserId,
        complexData,
        'commit',
      );

      // Second submission - should return same data
      const result2 = await createAchievement(
        testUserId,
        complexData,
        'commit',
      );

      // All fields should match
      expect(result2.id).toBe(result1.id);
      expect(result2.title).toBe(result1.title);
      expect(result2.summary).toBe(result1.summary);
      expect(result2.details).toBe(result1.details);
      expect(result2.impact).toBe(result1.impact);
      expect(result2.projectId).toBe(result1.projectId);
      expect(result2.uniqueSourceId).toBe(result1.uniqueSourceId);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle achievements with special characters in uniqueSourceId', async () => {
      const specialData: CreateAchievementRequest = {
        ...achievementData,
        uniqueSourceId: 'github-pr-123/feature-branch#special!@chars',
      };

      const result1 = await createAchievement(
        testUserId,
        specialData,
        'commit',
      );
      const result2 = await createAchievement(
        testUserId,
        specialData,
        'commit',
      );

      expect(result2.id).toBe(result1.id);
    });

    it('should handle very long uniqueSourceId values', async () => {
      const longSourceId = 'a'.repeat(255); // Very long string
      const longData: CreateAchievementRequest = {
        ...achievementData,
        uniqueSourceId: longSourceId,
      };

      const result1 = await createAchievement(testUserId, longData, 'commit');
      const result2 = await createAchievement(testUserId, longData, 'commit');

      expect(result2.id).toBe(result1.id);
      expect(result2.uniqueSourceId).toBe(longSourceId);
    });

    it('should handle case-sensitive uniqueSourceId comparison', async () => {
      const data1: CreateAchievementRequest = {
        ...achievementData,
        uniqueSourceId: 'TestSourceId',
      };

      const data2: CreateAchievementRequest = {
        ...achievementData,
        uniqueSourceId: 'testsourceid', // Different case
      };

      const result1 = await createAchievement(testUserId, data1, 'commit');
      const result2 = await createAchievement(testUserId, data2, 'commit');

      // Should be different achievements (case-sensitive)
      expect(result1.id).not.toBe(result2.id);
    });

    it('should isolate achievements by userId even with same projectId and uniqueSourceId', async () => {
      // Setup another user
      const userId2 = uuidv4();
      const user2 = {
        id: userId2,
        email: 'test2@example.com',
        name: 'Test User 2',
        provider: 'credentials' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(user).values(user2);

      // Both users create achievement with same projectId and uniqueSourceId
      const result1 = await createAchievement(
        testUserId,
        achievementData,
        'commit',
      );
      const result2 = await createAchievement(
        userId2,
        achievementData,
        'commit',
      );

      // Should be different achievements (different userId)
      expect(result1.id).not.toBe(result2.id);
      expect(result1.userId).toBe(testUserId);
      expect(result2.userId).toBe(userId2);

      // Database should have two achievement records
      const all = await db.select().from(achievement);
      expect(all).toHaveLength(2);
    });
  });

  describe('Logging Verification', () => {
    it('should log duplicate achievement detection', async () => {
      const logSpy = jest.spyOn(console, 'log');

      // First submission
      await createAchievement(testUserId, achievementData, 'commit');
      logSpy.mockClear();

      // Second submission - should log
      await createAchievement(testUserId, achievementData, 'commit');

      // Check if duplicate detection was logged
      const duplicateLogs = logSpy.mock.calls.filter((call) =>
        call[0]?.includes?.('Duplicate achievement detected'),
      );

      expect(duplicateLogs.length).toBeGreaterThan(0);
      const logMessage = duplicateLogs[0]?.[0];
      expect(logMessage).toContain(testUserId);
      expect(logMessage).toContain(testProjectId);
      expect(logMessage).toContain('test-source-id-123');

      logSpy.mockRestore();
    });

    it('should not log for new achievements (only for duplicates)', async () => {
      const logSpy = jest.spyOn(console, 'log');

      // First submission
      await createAchievement(testUserId, achievementData, 'commit');

      // Check that duplicate log was not called
      const duplicateLogs = logSpy.mock.calls.filter((call) =>
        call[0]?.includes?.('Duplicate achievement detected'),
      );

      expect(duplicateLogs).toHaveLength(0);

      logSpy.mockRestore();
    });
  });
});
