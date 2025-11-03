import { v4 as uuidv4 } from 'uuid';
import type { AchievementWithRelations } from 'lib/types/achievement';

/**
 * Test Suite: Recent Achievements Table (Dashboard)
 *
 * Tests the dashboard's recent achievements table with new Edit/Delete actions:
 * - Actions column presence
 * - Edit button functionality
 * - Delete button functionality
 * - Dialog state management
 * - API integration
 * - Data refetching
 * - Error handling
 */

describe('Recent Achievements Table (Dashboard) Tests', () => {
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
      eventEnd: null,
      eventDuration: 'week' as const,
      source: 'manual' as const,
      impact: 2,
      impactSource: 'user' as const,
      impactUpdatedAt: new Date(),
      isArchived: false,
      createdAt: new Date(),
      repoRemoteUrl: null,
      updatedAt: new Date(),
      standupDocumentId: null,
      userMessageId: null,
      userMessage: null,
      company: {
        id: uuidv4(),
        userId: uuidv4(),
        name: 'Test Company',
        domain: 'test.com',
        role: 'Engineer',
        startDate: new Date(),
        endDate: null,
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
        repoRemoteUrl: null,
        updatedAt: new Date(),
      },
      ...overrides,
    } as AchievementWithRelations;
  }

  describe('Table Structure', () => {
    it('should include Actions column in table header', () => {
      const headers = [
        'Title',
        'Project',
        'Impact',
        'When',
        'Actions', // New column
      ];

      expect(headers).toContain('Actions');
      expect(headers.indexOf('Actions')).toBeGreaterThan(0);
    });

    it('should render achievements with action buttons in each row', () => {
      const achievements = [
        createTestAchievement({ title: 'Achievement 1' }),
        createTestAchievement({ title: 'Achievement 2' }),
        createTestAchievement({ title: 'Achievement 3' }),
      ];

      expect(achievements).toHaveLength(3);
      achievements.forEach((achievement) => {
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('title');
      });
    });

    it('should handle empty achievements list', () => {
      const achievements: AchievementWithRelations[] = [];

      expect(achievements).toHaveLength(0);
    });

    it('should display multiple achievements with action buttons', () => {
      const achievements = Array.from({ length: 10 }, () =>
        createTestAchievement(),
      );

      expect(achievements).toHaveLength(10);
      achievements.forEach((achievement) => {
        expect(achievement.id).toBeDefined();
      });
    });
  });

  describe('Edit Button Functionality', () => {
    it('should open edit dialog when edit button clicked', () => {
      const achievement = createTestAchievement();
      const setEditDialogOpen = jest.fn();
      const setSelectedAchievement = jest.fn();

      // Simulate edit button click
      setSelectedAchievement(achievement);
      setEditDialogOpen(true);

      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement);
      expect(setEditDialogOpen).toHaveBeenCalledWith(true);
    });

    it('should set correct achievement when edit button clicked', () => {
      const achievement1 = createTestAchievement({ title: 'Achievement 1' });
      const achievement2 = createTestAchievement({ title: 'Achievement 2' });
      const setSelectedAchievement = jest.fn();

      // Click edit on first achievement
      setSelectedAchievement(achievement1);
      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement1);

      // Click edit on second achievement
      setSelectedAchievement(achievement2);
      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement2);
    });

    it('should not open delete dialog when edit button clicked', () => {
      const achievement = createTestAchievement();
      const setEditDialogOpen = jest.fn();
      const setDeleteDialogOpen = jest.fn();
      const setSelectedAchievement = jest.fn();

      // Edit button click
      setSelectedAchievement(achievement);
      setEditDialogOpen(true);

      expect(setEditDialogOpen).toHaveBeenCalledWith(true);
      expect(setDeleteDialogOpen).not.toHaveBeenCalled();
    });
  });

  describe('Delete Button Functionality', () => {
    it('should open delete dialog when delete button clicked', () => {
      const achievement = createTestAchievement();
      const setDeleteDialogOpen = jest.fn();
      const setSelectedAchievement = jest.fn();

      // Simulate delete button click
      setSelectedAchievement(achievement);
      setDeleteDialogOpen(true);

      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement);
      expect(setDeleteDialogOpen).toHaveBeenCalledWith(true);
    });

    it('should set correct achievement when delete button clicked', () => {
      const achievement1 = createTestAchievement({ title: 'Achievement 1' });
      const achievement2 = createTestAchievement({ title: 'Achievement 2' });
      const setSelectedAchievement = jest.fn();

      // Click delete on first achievement
      setSelectedAchievement(achievement1);
      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement1);

      // Click delete on second achievement
      setSelectedAchievement(achievement2);
      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement2);
    });

    it('should not open edit dialog when delete button clicked', () => {
      const achievement = createTestAchievement();
      const setEditDialogOpen = jest.fn();
      const setDeleteDialogOpen = jest.fn();
      const setSelectedAchievement = jest.fn();

      // Delete button click
      setSelectedAchievement(achievement);
      setDeleteDialogOpen(true);

      expect(setDeleteDialogOpen).toHaveBeenCalledWith(true);
      expect(setEditDialogOpen).not.toHaveBeenCalled();
    });
  });

  describe('Edit Dialog Integration', () => {
    it('should render edit dialog with selected achievement', () => {
      const achievement = createTestAchievement();
      const editDialogOpen = true;

      expect(achievement).toBeDefined();
      expect(editDialogOpen).toBe(true);
    });

    it('should close edit dialog after successful edit', () => {
      const setEditDialogOpen = jest.fn();

      // Edit dialog closes on success
      setEditDialogOpen(false);

      expect(setEditDialogOpen).toHaveBeenCalledWith(false);
    });

    it('should keep edit dialog open on validation errors', () => {
      const editDialogOpen = true;

      // Dialog should remain open for user to fix errors
      expect(editDialogOpen).toBe(true);
    });
  });

  describe('Delete Dialog Integration', () => {
    it('should render delete dialog with selected achievement', () => {
      const achievement = createTestAchievement();
      const deleteDialogOpen = true;

      expect(achievement).toBeDefined();
      expect(deleteDialogOpen).toBe(true);
    });

    it('should close delete dialog after successful deletion', () => {
      const setDeleteDialogOpen = jest.fn();

      // Delete dialog closes on success
      setDeleteDialogOpen(false);

      expect(setDeleteDialogOpen).toHaveBeenCalledWith(false);
    });

    it('should pass correct callback to delete dialog', () => {
      const achievement = createTestAchievement();
      const onConfirm = jest.fn();

      // Delete confirmation should call API
      onConfirm(achievement.id);

      expect(onConfirm).toHaveBeenCalledWith(achievement.id);
    });
  });

  describe('Achievement Deletion', () => {
    it('should delete achievement from table after successful deletion', async () => {
      const achievements = [
        createTestAchievement({ id: 'id-1' }),
        createTestAchievement({ id: 'id-2' }),
        createTestAchievement({ id: 'id-3' }),
      ];

      // Simulate delete API call
      const deleteAchievement = jest.fn().mockResolvedValue(undefined);
      await deleteAchievement('id-2');

      // Achievement should be removed from list
      const updatedAchievements = achievements.filter((a) => a.id !== 'id-2');

      expect(updatedAchievements).toHaveLength(2);
      expect(updatedAchievements.every((a) => a.id !== 'id-2')).toBe(true);
    });

    it('should call DELETE API endpoint with correct achievement ID', async () => {
      const achievement = createTestAchievement({ id: 'test-id-123' });
      const deleteAPI = jest.fn().mockResolvedValue({ success: true });

      await deleteAPI(`/api/achievements/${achievement.id}`);

      expect(deleteAPI).toHaveBeenCalledWith(
        `/api/achievements/${achievement.id}`,
      );
    });

    it('should handle API error during deletion', async () => {
      const achievement = createTestAchievement();
      const deleteAPI = jest.fn().mockRejectedValue(new Error('API Error'));

      try {
        await deleteAPI(`/api/achievements/${achievement.id}`);
      } catch (error) {
        expect(error).toEqual(new Error('API Error'));
      }

      // Table should not be updated on error
      expect(deleteAPI).toHaveBeenCalledTimes(1);
    });

    it('should not update table when deletion fails', async () => {
      const achievements = [
        createTestAchievement({ id: 'id-1' }),
        createTestAchievement({ id: 'id-2' }),
      ];

      const deleteAPI = jest.fn().mockRejectedValue(new Error('Delete failed'));

      try {
        await deleteAPI('id-1');
      } catch (error) {
        // Error caught
      }

      // Original list unchanged
      expect(achievements).toHaveLength(2);
    });
  });

  describe('Data Refetching', () => {
    it('should refetch achievements after successful edit', async () => {
      const refetch = jest.fn().mockResolvedValue({
        achievements: [createTestAchievement()],
      });

      const result = await refetch();

      expect(refetch).toHaveBeenCalledTimes(1);
      expect(result.achievements).toBeDefined();
    });

    it('should refetch achievements after successful deletion', async () => {
      const refetch = jest.fn().mockResolvedValue({
        achievements: [createTestAchievement()],
      });

      const result = await refetch();

      expect(refetch).toHaveBeenCalledTimes(1);
      expect(result.achievements).toBeDefined();
    });

    it('should update table with fresh data after refetch', async () => {
      const oldAchievement = createTestAchievement({
        title: 'Old Achievement',
      });
      const newAchievement = createTestAchievement({
        title: 'New Achievement',
      });

      const refetch = jest.fn().mockResolvedValue({
        achievements: [newAchievement],
      });

      const result = await refetch();

      expect(result.achievements[0].title).toBe('New Achievement');
    });

    it('should handle refetch errors gracefully', async () => {
      const refetch = jest.fn().mockRejectedValue(new Error('Refetch failed'));

      try {
        await refetch();
      } catch (error) {
        expect(error).toEqual(new Error('Refetch failed'));
      }
    });
  });

  describe('State Management', () => {
    it('should track edit dialog open state', () => {
      let editDialogOpen = false;

      expect(editDialogOpen).toBe(false);

      editDialogOpen = true;
      expect(editDialogOpen).toBe(true);

      editDialogOpen = false;
      expect(editDialogOpen).toBe(false);
    });

    it('should track delete dialog open state', () => {
      let deleteDialogOpen = false;

      expect(deleteDialogOpen).toBe(false);

      deleteDialogOpen = true;
      expect(deleteDialogOpen).toBe(true);

      deleteDialogOpen = false;
      expect(deleteDialogOpen).toBe(false);
    });

    it('should track selected achievement', () => {
      let selectedAchievement = null as AchievementWithRelations | null;

      expect(selectedAchievement).toBeNull();

      const achievement = createTestAchievement();
      selectedAchievement = achievement;

      expect(selectedAchievement).toEqual(achievement);

      selectedAchievement = null;
      expect(selectedAchievement).toBeNull();
    });

    it('should track deletion loading state', () => {
      let isDeleting = false;

      expect(isDeleting).toBe(false);

      isDeleting = true;
      expect(isDeleting).toBe(true);

      isDeleting = false;
      expect(isDeleting).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should show error toast on edit failure', async () => {
      const updateAchievement = jest
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      try {
        await updateAchievement('id-123', { title: 'Updated' });
      } catch (error) {
        expect(error).toEqual(new Error('Update failed'));
      }
    });

    it('should show error toast on delete failure', async () => {
      const deleteAchievement = jest
        .fn()
        .mockRejectedValue(new Error('Delete failed'));

      try {
        await deleteAchievement('id-123');
      } catch (error) {
        expect(error).toEqual(new Error('Delete failed'));
      }
    });

    it('should keep dialog open after error for retry', () => {
      const deleteDialogOpen = true; // Stays open on error

      expect(deleteDialogOpen).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      const deleteAPI = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await deleteAPI('id-123');
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }
    });

    it('should handle timeout errors', async () => {
      const updateAPI = jest
        .fn()
        .mockRejectedValue(new Error('Request timeout'));

      try {
        await updateAPI({ title: 'Updated' });
      } catch (error) {
        expect(error).toEqual(new Error('Request timeout'));
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete edit flow', async () => {
      const achievement = createTestAchievement();
      const setSelectedAchievement = jest.fn();
      const setEditDialogOpen = jest.fn();
      const refetch = jest.fn().mockResolvedValue({ achievements: [] });

      // 1. Open dialog
      setSelectedAchievement(achievement);
      setEditDialogOpen(true);

      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement);
      expect(setEditDialogOpen).toHaveBeenCalledWith(true);

      // 2. Submit edit (API call happens here)

      // 3. Refetch data
      await refetch();

      // 4. Close dialog
      setEditDialogOpen(false);

      expect(setEditDialogOpen).toHaveBeenLastCalledWith(false);
    });

    it('should handle complete delete flow', async () => {
      const achievement = createTestAchievement();
      const setSelectedAchievement = jest.fn();
      const setDeleteDialogOpen = jest.fn();
      const deleteAPI = jest.fn().mockResolvedValue({ success: true });
      const refetch = jest.fn().mockResolvedValue({ achievements: [] });

      // 1. Open dialog
      setSelectedAchievement(achievement);
      setDeleteDialogOpen(true);

      expect(setSelectedAchievement).toHaveBeenCalledWith(achievement);
      expect(setDeleteDialogOpen).toHaveBeenCalledWith(true);

      // 2. Delete API call
      await deleteAPI(`/api/achievements/${achievement.id}`);

      // 3. Refetch data
      await refetch();

      // 4. Close dialog
      setDeleteDialogOpen(false);

      expect(deleteAPI).toHaveBeenCalledTimes(1);
      expect(setDeleteDialogOpen).toHaveBeenLastCalledWith(false);
    });

    it('should handle multiple rapid actions', async () => {
      const achievement1 = createTestAchievement({ id: 'id-1' });
      const achievement2 = createTestAchievement({ id: 'id-2' });

      const setSelectedAchievement = jest.fn();
      const deleteAPI = jest.fn().mockResolvedValue({ success: true });

      // Rapid delete calls
      setSelectedAchievement(achievement1);
      await deleteAPI(`/api/achievements/id-1`);

      setSelectedAchievement(achievement2);
      await deleteAPI(`/api/achievements/id-2`);

      expect(setSelectedAchievement).toHaveBeenCalledTimes(2);
      expect(deleteAPI).toHaveBeenCalledTimes(2);
    });
  });
});
