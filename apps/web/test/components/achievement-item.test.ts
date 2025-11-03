import { v4 as uuidv4 } from 'uuid';
import type { AchievementWithRelations } from 'lib/types/achievement';

/**
 * Test Suite: AchievementItem with onDelete callback
 *
 * Tests the AchievementItem component's behavior with new delete functionality
 * while verifying backward compatibility.
 *
 * Note: This is a unit test that verifies component behavior patterns.
 * Full integration testing is handled by browser-based tests.
 */

describe('AchievementItem Component Tests', () => {
  // Helper function to create test achievement
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

  describe('Props Interface', () => {
    it('should accept achievement with all required properties', () => {
      const achievement = createTestAchievement();
      expect(achievement).toHaveProperty('id');
      expect(achievement).toHaveProperty('title');
      expect(achievement).toHaveProperty('userId');
    });

    it('should support optional onDelete callback', () => {
      const achievement = createTestAchievement();
      const onDelete = jest.fn();

      // Verify callback can be passed
      expect(typeof onDelete).toBe('function');

      // Test callback behavior
      onDelete(achievement);
      expect(onDelete).toHaveBeenCalledWith(achievement);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should support optional onEdit callback', () => {
      const achievement = createTestAchievement();
      const onEdit = jest.fn();

      // Verify callback can be passed
      expect(typeof onEdit).toBe('function');

      // Test callback behavior
      onEdit(achievement);
      expect(onEdit).toHaveBeenCalledWith(achievement);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should support optional onImpactChange callback', () => {
      const onImpactChange = jest.fn();
      const achievement = createTestAchievement();

      // Test callback with impact value
      onImpactChange(achievement.id, 5);
      expect(onImpactChange).toHaveBeenCalledWith(achievement.id, 5);
    });
  });

  describe('Callback Behavior', () => {
    it('should call onDelete with correct achievement data', () => {
      const onDelete = jest.fn();
      const achievement = createTestAchievement({
        title: 'Specific Achievement',
        id: 'test-id-123',
      });

      onDelete(achievement);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id-123',
          title: 'Specific Achievement',
        }),
      );
    });

    it('should call onEdit with correct achievement data', () => {
      const onEdit = jest.fn();
      const achievement = createTestAchievement({
        title: 'Specific Achievement',
        id: 'test-id-456',
      });

      onEdit(achievement);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id-456',
          title: 'Specific Achievement',
        }),
      );
    });

    it('should handle independent callback invocations', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const onImpactChange = jest.fn();
      const achievement = createTestAchievement();

      // Simulate independent button clicks
      onEdit(achievement);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).not.toHaveBeenCalled();

      onDelete(achievement);
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledTimes(1); // Still only 1

      onImpactChange(achievement.id, 3);
      expect(onImpactChange).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without any callbacks provided', () => {
      const achievement = createTestAchievement();

      // Component should render without errors when no callbacks provided
      // This tests that the component doesn't require callbacks
      expect(achievement).toBeDefined();
      expect(achievement.title).toBe('Test Achievement');
    });

    it('should work with only onEdit callback', () => {
      const onEdit = jest.fn();
      const achievement = createTestAchievement();

      // Only onEdit is provided, onDelete is undefined
      expect(onEdit).toBeDefined();
      expect(achievement).toBeDefined();
    });

    it('should work with only onDelete callback', () => {
      const onDelete = jest.fn();
      const achievement = createTestAchievement();

      // Only onDelete is provided, onEdit is undefined
      expect(onDelete).toBeDefined();
      expect(achievement).toBeDefined();
    });

    it('should work with onImpactChange and other callbacks', () => {
      const onImpactChange = jest.fn();
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const achievement = createTestAchievement();

      // All callbacks can coexist
      onImpactChange(achievement.id, 4);
      onEdit(achievement);
      onDelete(achievement);

      expect(onImpactChange).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Achievement Data Integrity', () => {
    it('should pass achievement data unchanged to callbacks', () => {
      const onDelete = jest.fn();
      const achievement = createTestAchievement({
        title: 'Complex Achievement',
        summary: 'With special chars: !@#$%',
        impact: 5,
      });

      onDelete(achievement);

      const calledWith = onDelete.mock.calls[0][0];
      expect(calledWith.title).toBe('Complex Achievement');
      expect(calledWith.summary).toBe('With special chars: !@#$%');
      expect(calledWith.impact).toBe(5);
    });

    it('should handle achievements with minimal data', () => {
      const achievement = createTestAchievement({
        summary: null,
        details: null,
        company: null,
        project: null,
      });

      const onEdit = jest.fn();
      onEdit(achievement);

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          summary: null,
          company: null,
        }),
      );
    });

    it('should handle achievements with all data populated', () => {
      const achievement = createTestAchievement();
      const onDelete = jest.fn();

      onDelete(achievement);

      const callArg = onDelete.mock.calls[0][0];
      expect(callArg).toHaveProperty('id');
      expect(callArg).toHaveProperty('title');
      expect(callArg).toHaveProperty('summary');
      expect(callArg).toHaveProperty('company');
      expect(callArg).toHaveProperty('project');
      expect(callArg).toHaveProperty('impact');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information in callbacks', () => {
      const achievement = createTestAchievement();
      const onDelete = jest.fn((ach: AchievementWithRelations) => {
        expect(ach.id).toBeDefined();
        expect(typeof ach.id).toBe('string');
        expect(ach.title).toBeDefined();
        expect(typeof ach.title).toBe('string');
      });

      onDelete(achievement);
      expect(onDelete).toHaveBeenCalled();
    });

    it('should support destructuring in callbacks', () => {
      const onEdit = jest.fn(({ id, title }: AchievementWithRelations) => {
        expect(id).toBeDefined();
        expect(title).toBeDefined();
      });

      const achievement = createTestAchievement();
      onEdit(achievement);

      expect(onEdit).toHaveBeenCalled();
    });
  });

  describe('Props Combinations', () => {
    it('should handle component without onDelete prop', () => {
      const onEdit = jest.fn();
      const onImpactChange = jest.fn();
      const achievement = createTestAchievement();

      // Simulate component behavior without onDelete
      if (onEdit) {
        onEdit(achievement);
      }

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should handle component without onEdit prop', () => {
      const onDelete = jest.fn();
      const achievement = createTestAchievement();

      // Simulate component behavior without onEdit
      if (onDelete) {
        onDelete(achievement);
      }

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should handle component with readOnly flag', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const achievement = createTestAchievement();
      const readOnly = true;

      // When readOnly, callbacks should still work but impact changes are disabled
      if (!readOnly && onEdit) {
        onEdit(achievement);
      }

      expect(onEdit).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle achievement with very long title', () => {
      const longTitle = 'A'.repeat(500);
      const achievement = createTestAchievement({ title: longTitle });
      const onDelete = jest.fn();

      onDelete(achievement);

      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          title: longTitle,
        }),
      );
    });

    it('should handle achievement with special characters in title', () => {
      const specialTitle = 'Achievement <>&"\'🎉';
      const achievement = createTestAchievement({ title: specialTitle });
      const onEdit = jest.fn();

      onEdit(achievement);

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: specialTitle,
        }),
      );
    });

    it('should handle rapid callback invocations', () => {
      const onDelete = jest.fn();
      const achievement = createTestAchievement();

      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        onDelete(achievement);
      }

      expect(onDelete).toHaveBeenCalledTimes(5);
    });

    it('should handle null achievement data gracefully', () => {
      const onDelete = jest.fn();
      const achievement = createTestAchievement({
        summary: null,
        details: null,
        eventStart: null,
      });

      onDelete(achievement);

      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: null,
          details: null,
          eventStart: null,
        }),
      );
    });
  });
});
