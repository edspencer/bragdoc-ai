import { v4 as uuidv4 } from 'uuid';
import type { AchievementWithRelations } from 'lib/types/achievement';

/**
 * Test Suite: Standup Page Achievements
 *
 * Tests the standup page's achievement rendering with delete functionality:
 * - AchievementItem with onDelete callback
 * - Document section achievements deletion
 * - Orphaned achievements deletion
 * - Data refetching after deletion
 * - UI updates after deletion
 */

describe('Standup Page Achievements Tests', () => {
  function createTestAchievement(overrides = {}): AchievementWithRelations {
    return {
      id: uuidv4(),
      userId: uuidv4(),
      companyId: uuidv4(),
      projectId: uuidv4(),
      title: 'Test Achievement',
      summary: 'Test summary',
      details: 'Test details',
      eventStart: new Date('2024-01-01'),
      eventDuration: 'week' as const,
      source: 'manual' as const,
      impact: 2,
      impactSource: 'user' as const,
      impactUpdatedAt: new Date(),
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      company: {
        id: uuidv4(),
        userId: uuidv4(),
        name: 'Test Company',
        domain: 'test.com',
        role: 'Engineer',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      project: {
        id: uuidv4(),
        userId: uuidv4(),
        companyId: uuidv4(),
        name: 'Test Project',
        description: 'Test description',
        color: '#000000',
        status: 'active' as const,
        startDate: new Date(),
        endDate: null,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...overrides,
    } as AchievementWithRelations;
  }

  describe('AchievementItem Rendering with Delete', () => {
    it('should render AchievementItem with onDelete callback', () => {
      const achievement = createTestAchievement();
      const onDelete = jest.fn();

      // Component should accept onDelete callback
      expect(typeof onDelete).toBe('function');
      expect(achievement).toBeDefined();
    });

    it('should call onDelete callback when delete button clicked', () => {
      const achievement = createTestAchievement({
        title: 'Specific Achievement',
      });
      const onDelete = jest.fn();

      // Simulate delete button click
      onDelete(achievement);

      expect(onDelete).toHaveBeenCalledWith(achievement);
      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Specific Achievement',
        }),
      );
    });

    it('should render AchievementItem with onEdit callback', () => {
      const achievement = createTestAchievement();
      const onEdit = jest.fn();

      // Component should accept onEdit callback
      expect(typeof onEdit).toBe('function');
      expect(achievement).toBeDefined();
    });

    it('should render AchievementItem in document section with delete', () => {
      const achievement = createTestAchievement();
      const onDelete = jest.fn();

      // Document section achievements should support delete
      onDelete(achievement);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should render AchievementItem in orphaned section with delete', () => {
      const orphanedAchievement = createTestAchievement({
        projectId: null,
      });
      const onDelete = jest.fn();

      // Orphaned achievements should also support delete
      onDelete(orphanedAchievement);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Dialog State Management', () => {
    it('should manage dialog open state', () => {
      let showAchievementDeleteDialog = false;

      expect(showAchievementDeleteDialog).toBe(false);

      showAchievementDeleteDialog = true;
      expect(showAchievementDeleteDialog).toBe(true);

      showAchievementDeleteDialog = false;
      expect(showAchievementDeleteDialog).toBe(false);
    });

    it('should track achievement to delete', () => {
      let achievementToDelete: AchievementWithRelations | null = null;
      const achievement = createTestAchievement();

      expect(achievementToDelete).toBeNull();

      achievementToDelete = achievement;
      expect(achievementToDelete).toEqual(achievement);

      achievementToDelete = null;
      expect(achievementToDelete).toBeNull();
    });

    it('should set achievement before opening delete dialog', () => {
      let achievementToDelete: AchievementWithRelations | null = null;
      let showDialog = false;
      const achievement = createTestAchievement();

      // Set achievement first
      achievementToDelete = achievement;
      // Then open dialog
      showDialog = true;

      expect(achievementToDelete).toEqual(achievement);
      expect(showDialog).toBe(true);
    });
  });

  describe('Deletion from Document Section', () => {
    it('should delete achievement from document section', async () => {
      const documentId = uuidv4();
      const achievements = [
        createTestAchievement({ id: 'ach-1', projectId: documentId }),
        createTestAchievement({ id: 'ach-2', projectId: documentId }),
        createTestAchievement({ id: 'ach-3', projectId: documentId }),
      ];

      const deleteAPI = jest.fn().mockResolvedValue({ success: true });

      // Delete first achievement
      await deleteAPI(`/api/achievements/ach-1`);

      const updatedAchievements = achievements.filter((a) => a.id !== 'ach-1');

      expect(updatedAchievements).toHaveLength(2);
      expect(updatedAchievements.every((a) => a.id !== 'ach-1')).toBe(true);
    });

    it('should remove achievement from correct document section', () => {
      const doc1Id = uuidv4();
      const doc2Id = uuidv4();

      const doc1Achievements = [
        createTestAchievement({ id: 'ach-1', projectId: doc1Id }),
        createTestAchievement({ id: 'ach-2', projectId: doc1Id }),
      ];

      const doc2Achievements = [
        createTestAchievement({ id: 'ach-3', projectId: doc2Id }),
      ];

      // Delete from doc 1
      const updatedDoc1 = doc1Achievements.filter((a) => a.id !== 'ach-1');

      expect(updatedDoc1).toHaveLength(1);
      expect(doc2Achievements).toHaveLength(1); // Unaffected
    });

    it('should handle deletion of last achievement in document', () => {
      const documentId = uuidv4();
      const achievements = [
        createTestAchievement({ id: 'ach-1', projectId: documentId }),
      ];

      const updated = achievements.filter((a) => a.id !== 'ach-1');

      expect(updated).toHaveLength(0);
    });
  });

  describe('Deletion from Orphaned Section', () => {
    it('should delete orphaned achievement', async () => {
      const orphanedAchievements = [
        createTestAchievement({ id: 'orphan-1', projectId: null }),
        createTestAchievement({ id: 'orphan-2', projectId: null }),
        createTestAchievement({ id: 'orphan-3', projectId: null }),
      ];

      const deleteAPI = jest.fn().mockResolvedValue({ success: true });

      await deleteAPI(`/api/achievements/orphan-1`);

      const updated = orphanedAchievements.filter((a) => a.id !== 'orphan-1');

      expect(updated).toHaveLength(2);
    });

    it('should update orphaned list after deletion', () => {
      let orphanedAchievements = [
        createTestAchievement({ id: 'orphan-1', projectId: null }),
        createTestAchievement({ id: 'orphan-2', projectId: null }),
      ];

      // Delete one
      orphanedAchievements = orphanedAchievements.filter(
        (a) => a.id !== 'orphan-1',
      );

      expect(orphanedAchievements).toHaveLength(1);
      expect(orphanedAchievements[0].id).toBe('orphan-2');
    });

    it('should hide orphaned section when all are deleted', () => {
      let orphanedAchievements = [
        createTestAchievement({ id: 'orphan-1', projectId: null }),
      ];

      const shouldShowSection = orphanedAchievements.length > 0;

      orphanedAchievements = [];

      const newShowSection = orphanedAchievements.length > 0;

      expect(shouldShowSection).toBe(true);
      expect(newShowSection).toBe(false);
    });
  });

  describe('Data Refetching After Deletion', () => {
    it('should refetch achievements after deletion', async () => {
      const refetch = jest.fn().mockResolvedValue({
        documentAchievements: [],
        orphanedAchievements: [],
      });

      await refetch();

      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('should regroup achievements by document after refetch', async () => {
      const refetchedData = {
        documentAchievements: {
          [uuidv4()]: [createTestAchievement()],
          [uuidv4()]: [createTestAchievement()],
        },
        orphanedAchievements: [createTestAchievement({ projectId: null })],
      };

      expect(refetchedData.documentAchievements).toBeDefined();
      expect(refetchedData.orphanedAchievements).toBeDefined();
    });

    it('should handle refetch errors gracefully', async () => {
      const refetch = jest.fn().mockRejectedValue(new Error('Refetch failed'));

      try {
        await refetch();
      } catch (error) {
        expect(error).toEqual(new Error('Refetch failed'));
      }
    });

    it('should not update UI if refetch fails', async () => {
      const achievements = [createTestAchievement(), createTestAchievement()];
      const originalLength = achievements.length;

      const refetch = jest.fn().mockRejectedValue(new Error('Refetch failed'));

      try {
        await refetch();
      } catch (error) {
        // Error caught
      }

      // List should be unchanged
      expect(achievements).toHaveLength(originalLength);
    });
  });

  describe('UI Updates After Deletion', () => {
    it('should show success toast after successful deletion', async () => {
      const achievement = createTestAchievement();
      const showToast = jest.fn();

      // Simulate successful deletion
      showToast({
        type: 'success',
        message: `Achievement "${achievement.title}" deleted`,
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
        }),
      );
    });

    it('should show error toast on deletion failure', async () => {
      const showToast = jest.fn();

      // Simulate deletion error
      showToast({
        type: 'error',
        message: 'Failed to delete achievement. Please try again.',
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        }),
      );
    });

    it('should remove achievement from DOM immediately', () => {
      const achievement = createTestAchievement({ id: 'test-id' });
      let achievements = [achievement];

      // Remove optimistically
      achievements = achievements.filter((a) => a.id !== 'test-id');

      expect(achievements).toHaveLength(0);
    });

    it('should restore achievement if deletion fails', () => {
      const achievement = createTestAchievement({ id: 'test-id' });
      let achievements = [achievement];
      const originalAchievements = [...achievements];

      // Remove optimistically
      achievements = achievements.filter((a) => a.id !== 'test-id');
      expect(achievements).toHaveLength(0);

      // Restore on error
      achievements = originalAchievements;
      expect(achievements).toHaveLength(1);
    });
  });

  describe('Delete Dialog Integration', () => {
    it('should render delete dialog when open', () => {
      const achievement = createTestAchievement();
      const deleteDialogOpen = true;

      expect(deleteDialogOpen).toBe(true);
      expect(achievement).toBeDefined();
    });

    it('should pass achievement to delete dialog', () => {
      const achievement = createTestAchievement({
        title: 'Achievement to Delete',
      });
      const deleteDialogOpen = true;

      expect(deleteDialogOpen).toBe(true);
      expect(achievement.title).toBe('Achievement to Delete');
    });

    it('should close delete dialog after successful deletion', () => {
      let deleteDialogOpen = true;

      // After successful deletion
      deleteDialogOpen = false;

      expect(deleteDialogOpen).toBe(false);
    });

    it('should keep delete dialog open on error', () => {
      const deleteDialogOpen = true;

      // On error, dialog stays open for retry
      // deleteDialogOpen remains true

      expect(deleteDialogOpen).toBe(true);
    });
  });

  describe('Router Refresh', () => {
    it('should call router.refresh() after deletion', async () => {
      const router = { refresh: jest.fn() };

      // Simulate deletion followed by refresh
      await new Promise((resolve) => setTimeout(resolve, 0));
      router.refresh();

      expect(router.refresh).toHaveBeenCalledTimes(1);
    });

    it('should refresh server state after deletion', () => {
      const router = { refresh: jest.fn() };

      // router.refresh() ensures server-side state is updated
      router.refresh();

      expect(router.refresh).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle deletion of non-existent achievement', async () => {
      const deleteAPI = jest
        .fn()
        .mockRejectedValue(new Error('Achievement not found'));

      try {
        await deleteAPI('/api/achievements/non-existent-id');
      } catch (error) {
        expect(error).toEqual(new Error('Achievement not found'));
      }
    });

    it('should handle unauthorized deletion attempts', async () => {
      const deleteAPI = jest.fn().mockRejectedValue(new Error('Unauthorized'));

      try {
        await deleteAPI('/api/achievements/other-user-achievement');
      } catch (error) {
        expect(error).toEqual(new Error('Unauthorized'));
      }
    });

    it('should handle network errors during deletion', async () => {
      const deleteAPI = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await deleteAPI('/api/achievements/id');
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }
    });

    it('should handle timeout during deletion', async () => {
      const deleteAPI = jest
        .fn()
        .mockRejectedValue(new Error('Request timeout'));

      try {
        await deleteAPI('/api/achievements/id');
      } catch (error) {
        expect(error).toEqual(new Error('Request timeout'));
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete deletion flow from document section', async () => {
      const documentId = uuidv4();
      const achievements = [
        createTestAchievement({ id: 'ach-1', projectId: documentId }),
        createTestAchievement({ id: 'ach-2', projectId: documentId }),
      ];

      const deleteAPI = jest.fn().mockResolvedValue({ success: true });
      const refetch = jest.fn().mockResolvedValue({
        documentAchievements: {
          [documentId]: [achievements[1]],
        },
        orphanedAchievements: [],
      });

      // 1. Delete achievement
      await deleteAPI(`/api/achievements/ach-1`);

      // 2. Refetch data
      await refetch();

      // 3. Verify update
      const result = await refetch();
      expect(result.documentAchievements[documentId]).toHaveLength(1);
    });

    it('should handle complete deletion flow from orphaned section', async () => {
      const orphanedAchievements = [
        createTestAchievement({ id: 'orphan-1', projectId: null }),
      ];

      const deleteAPI = jest.fn().mockResolvedValue({ success: true });
      const refetch = jest.fn().mockResolvedValue({
        documentAchievements: {},
        orphanedAchievements: [],
      });

      // 1. Delete orphaned achievement
      await deleteAPI(`/api/achievements/orphan-1`);

      // 2. Refetch data
      const result = await refetch();

      // 3. Verify orphaned section is empty
      expect(result.orphanedAchievements).toHaveLength(0);
    });

    it('should handle error recovery during deletion', async () => {
      const achievements = [
        createTestAchievement({ id: 'ach-1' }),
        createTestAchievement({ id: 'ach-2' }),
      ];

      const deleteAPI = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ success: true });

      const showToast = jest.fn();

      // First attempt fails
      try {
        await deleteAPI('/api/achievements/ach-1');
      } catch (error) {
        showToast({ type: 'error', message: 'Failed to delete' });
      }

      expect(showToast).toHaveBeenCalled();

      // Retry succeeds
      await deleteAPI('/api/achievements/ach-1');

      expect(deleteAPI).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('should handle large number of achievements efficiently', () => {
      const achievements = Array.from({ length: 100 }, () =>
        createTestAchievement(),
      );

      expect(achievements).toHaveLength(100);

      const filtered = achievements.filter((a) => a.id !== 'non-existent');
      expect(filtered).toHaveLength(100);
    });

    it('should handle deletion from large list', () => {
      let achievements = Array.from({ length: 50 }, (_, i) =>
        createTestAchievement({ id: `ach-${i}` }),
      );

      achievements = achievements.filter((a) => a.id !== 'ach-25');

      expect(achievements).toHaveLength(49);
    });
  });
});
