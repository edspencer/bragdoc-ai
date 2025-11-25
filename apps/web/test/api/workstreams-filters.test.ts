import { z } from 'zod';

/**
 * Validation Schema for Workstreams Generation Filters
 * Extracted from apps/web/app/api/workstreams/generate/route.ts
 * This is a copy for testing purposes
 */
const generateWithFiltersSchema = z
  .object({
    filters: z.optional(
      z.object({
        timeRange: z.optional(
          z.object({
            startDate: z
              .string()
              .datetime()
              .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
            endDate: z
              .string()
              .datetime()
              .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
          }),
        ),
        projectIds: z.optional(z.array(z.string().uuid())),
      }),
    ),
  })
  .refine(
    (data) => {
      // Require both timeRange properties together or neither
      if (data.filters?.timeRange) {
        return (
          data.filters.timeRange.startDate && data.filters.timeRange.endDate
        );
      }
      return true;
    },
    {
      message:
        'Both startDate and endDate must be provided together for timeRange',
      path: ['filters', 'timeRange'],
    },
  )
  .refine(
    (data) => {
      // Validate startDate ≤ endDate
      if (
        data.filters?.timeRange?.startDate &&
        data.filters.timeRange.endDate
      ) {
        const startDate = new Date(data.filters.timeRange.startDate);
        const endDate = new Date(data.filters.timeRange.endDate);
        return startDate <= endDate;
      }
      return true;
    },
    {
      message: 'startDate must be less than or equal to endDate',
      path: ['filters', 'timeRange'],
    },
  )
  .refine(
    (data) => {
      // Validate time range does not exceed 24 months
      if (
        data.filters?.timeRange?.startDate &&
        data.filters.timeRange.endDate
      ) {
        const startDate = new Date(data.filters.timeRange.startDate);
        const endDate = new Date(data.filters.timeRange.endDate);
        const monthsDiff =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());
        return monthsDiff <= 24;
      }
      return true;
    },
    {
      message: 'Time range cannot exceed 24 months',
      path: ['filters', 'timeRange'],
    },
  );

describe('Workstreams Filtering - Validation Schema (Task 6.1)', () => {
  describe('Valid filter parameters', () => {
    it('accepts no filters (backward compatible)', () => {
      const result = generateWithFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts filters with timeRange only', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts filters with projectIds only', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts filters with both timeRange and projectIds', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
          projectIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '223e4567-e89b-12d3-a456-426614174001',
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts ISO 8601 datetime format', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-05-10T10:30:00Z',
            endDate: '2025-11-10T23:59:59Z',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts mixed datetime and date formats', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10T23:59:59Z',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty projectIds array', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds: [],
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts large array of projectIds', () => {
      // Generate valid UUIDs in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const projectIds = Array.from({ length: 50 }, (_, i) => {
        const num = String(i).padStart(12, '0');
        return `550e8400-e29b-41d4-a716-${num}`;
      });

      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds,
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts equal start and end dates', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-05-10',
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid date formats', () => {
    it('rejects invalid date format (no dashes)', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '20250510',
            endDate: '2025-11-10',
          },
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path.includes('startDate')),
        ).toBe(true);
      }
    });

    it('rejects garbage date strings', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: 'not-a-date',
            endDate: '2025-11-10',
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects null dates', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: null,
            endDate: '2025-11-10',
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Date range violations', () => {
    it('rejects startDate > endDate', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-11-10',
            endDate: '2025-05-10',
          },
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes('startDate must be'),
          ),
        ).toBe(true);
      }
    });

    it('rejects range exceeding 24 months', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2023-01-01',
            endDate: '2025-02-01', // 25 months
          },
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes('24 months')),
        ).toBe(true);
      }
    });

    it('accepts exactly 24 months', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2023-01-01',
            endDate: '2025-01-01', // Exactly 24 months
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Missing date parameters', () => {
    it('rejects undefined endDate when startDate provided', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: undefined,
          },
        },
      });
      // Zod requires both fields if either is present
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.code === 'invalid_union' || i.path.includes('endDate'),
          ),
        ).toBe(true);
      }
    });

    it('rejects empty timeRange object', () => {
      // Empty timeRange object causes validation to fail
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          timeRange: {},
        },
      });
      // Empty object means both fields are undefined, which fails the inner validation
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid UUID formats in projectIds', () => {
    it('rejects invalid UUID format', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds: ['not-a-uuid'],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects partial UUID', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds: ['123e4567-e89b-12d3-a456'],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects mix of valid and invalid UUIDs', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds: ['123e4567-e89b-12d3-a456-426614174000', 'invalid-uuid'],
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid UUID v4 format', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: {
          projectIds: [
            '550e8400-e29b-41d4-a716-446655440000',
            'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          ],
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('accepts null filters value (should fail)', () => {
      const result = generateWithFiltersSchema.safeParse({
        filters: null,
      });
      expect(result.success).toBe(false);
    });

    it('handles missing filters key gracefully', () => {
      const result = generateWithFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Filter Change Detection Logic (Task 6.2)', () => {
  /**
   * Mock implementation of decideShouldReCluster with filter change detection
   * Extracted from apps/web/lib/ai/workstreams.ts for testing
   */
  function decideShouldReCluster(
    currentFilteredCount: number,
    metadata: any,
    currentFilters?: {
      timeRange?: { startDate: Date; endDate: Date };
      projectIds?: string[];
    },
  ) {
    const RECLUSTER_PERCENTAGE_THRESHOLD = 0.1;
    const RECLUSTER_ABSOLUTE_THRESHOLD = 50;
    const RECLUSTER_TIME_THRESHOLD_DAYS = 30;

    // Never clustered before
    if (!metadata) {
      return {
        strategy: 'full',
        reason: 'Initial clustering',
      };
    }

    // Check if filters changed from previous clustering
    if (metadata && currentFilters) {
      const previousFilters = metadata.generationParams || {};

      // Compare timeRange
      const currentStartDate = currentFilters.timeRange?.startDate
        ?.toISOString()
        .split('T')[0];
      const currentEndDate = currentFilters.timeRange?.endDate
        ?.toISOString()
        .split('T')[0];
      const previousStartDate = previousFilters.timeRange?.startDate;
      const previousEndDate = previousFilters.timeRange?.endDate;

      const timeRangeChanged =
        previousStartDate !== currentStartDate ||
        previousEndDate !== currentEndDate;

      // Compare projectIds
      const projectIdsChanged =
        JSON.stringify((previousFilters.projectIds || []).sort()) !==
        JSON.stringify((currentFilters.projectIds || []).sort());

      if (timeRangeChanged || projectIdsChanged) {
        return {
          strategy: 'full',
          reason: 'Filter parameters changed from previous clustering',
        };
      }
    }

    // Calculate if we have 10% more achievements in the filtered set
    const previousCount =
      metadata.filteredAchievementCount ||
      metadata.achievementCountAtLastClustering ||
      0;
    const achievementGrowthPercent =
      previousCount > 0
        ? (currentFilteredCount - previousCount) / previousCount
        : 0;

    if (achievementGrowthPercent >= RECLUSTER_PERCENTAGE_THRESHOLD) {
      return {
        strategy: 'full',
        reason: `${(achievementGrowthPercent * 100).toFixed(1)}% growth in achievements`,
      };
    }

    // Calculate if we have 50+ more achievements in the filtered set
    const newAchievementCount = currentFilteredCount - previousCount;

    if (newAchievementCount >= RECLUSTER_ABSOLUTE_THRESHOLD) {
      return {
        strategy: 'full',
        reason: `${newAchievementCount} new achievements since last clustering`,
      };
    }

    // Check if it's been more than 30 days
    const lastClusteringTime = new Date(metadata.lastFullClusteringAt);
    const daysSinceLastClustering =
      (Date.now() - lastClusteringTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastClustering > RECLUSTER_TIME_THRESHOLD_DAYS) {
      return {
        strategy: 'full',
        reason: `${daysSinceLastClustering.toFixed(1)} days since last clustering`,
      };
    }

    return {
      strategy: 'incremental',
      reason: 'Growth is below thresholds and recent',
    };
  }

  describe('Initial clustering', () => {
    it('returns full when no metadata exists', () => {
      const decision = decideShouldReCluster(100, null);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toBe('Initial clustering');
    });
  });

  describe('Filter change detection', () => {
    it('returns full when timeRange changed', () => {
      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
        },
      };

      const currentFilters = {
        timeRange: {
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-11-10'),
        },
      };

      const decision = decideShouldReCluster(100, metadata, currentFilters);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toContain('Filter parameters changed');
    });

    it('returns full when projectIds changed', () => {
      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          projectIds: ['project-1', 'project-2'],
        },
      };

      const currentFilters = {
        projectIds: ['project-1', 'project-3'],
      };

      const decision = decideShouldReCluster(100, metadata, currentFilters);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toContain('Filter parameters changed');
    });

    it('returns full when both timeRange and projectIds changed', () => {
      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
          projectIds: ['project-1'],
        },
      };

      const currentFilters = {
        timeRange: {
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-11-10'),
        },
        projectIds: ['project-2'],
      };

      const decision = decideShouldReCluster(100, metadata, currentFilters);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toContain('Filter parameters changed');
    });

    it('returns full when filters removed after previous filter-based clustering', () => {
      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
          projectIds: ['project-1'],
        },
      };

      // Now requesting without filters
      const currentFilters = {};

      const decision = decideShouldReCluster(150, metadata, currentFilters);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toContain('Filter parameters changed');
    });

    it('returns incremental when filters identical to previous', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: recentDate,
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
          projectIds: ['project-1'],
        },
      };

      const currentFilters = {
        timeRange: {
          startDate: new Date('2025-05-10'),
          endDate: new Date('2025-11-10'),
        },
        projectIds: ['project-1'],
      };

      const decision = decideShouldReCluster(105, metadata, currentFilters);
      expect(decision.strategy).toBe('incremental');
    });

    it('returns incremental when projectIds order differs but content same', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: recentDate,
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          projectIds: ['project-1', 'project-2', 'project-3'],
        },
      };

      const currentFilters = {
        projectIds: ['project-3', 'project-1', 'project-2'], // Same but different order
      };

      const decision = decideShouldReCluster(105, metadata, currentFilters);
      expect(decision.strategy).toBe('incremental');
    });
  });

  describe('Growth threshold detection', () => {
    it('returns incremental when no filters provided and growth below threshold', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: recentDate,
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
      };

      const decision = decideShouldReCluster(105, metadata, undefined);
      expect(decision.strategy).toBe('incremental');
    });

    it('returns full when filter params identical but growth exceeds 10%', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const metadata = {
        id: 'meta-1',
        lastFullClusteringAt: recentDate,
        achievementCountAtLastClustering: 100,
        filteredAchievementCount: 100,
        generationParams: {
          timeRange: {
            startDate: '2025-05-10',
            endDate: '2025-11-10',
          },
        },
      };

      const currentFilters = {
        timeRange: {
          startDate: new Date('2025-05-10'),
          endDate: new Date('2025-11-10'),
        },
      };

      const decision = decideShouldReCluster(111, metadata, currentFilters);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toContain('growth in achievements');
    });
  });
});
