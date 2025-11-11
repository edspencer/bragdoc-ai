import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getUnassignedAchievements,
  getTotalAchievementCount,
  getWorkstreamsByUserIdWithDateFilter,
  getAchievementsByUserIdWithDates,
} from '@bragdoc/database';

// Validation schema for date range query parameters
const dateFilterSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * GET /api/workstreams
 *
 * Fetches workstreams for the authenticated user.
 * Supports optional date range filtering via startDate and endDate query parameters.
 * Returns list of active (non-archived) workstreams along with achievement counts.
 * Counts reflect only achievements within the specified date range.
 *
 * Query Parameters:
 * - startDate: Optional ISO 8601 date string (YYYY-MM-DD) for start of range (inclusive)
 * - endDate: Optional ISO 8601 date string (YYYY-MM-DD) for end of range (inclusive)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    // Extract and validate date parameters
    const startDateStr = request.nextUrl.searchParams.get('startDate');
    const endDateStr = request.nextUrl.searchParams.get('endDate');

    const dateValidation = dateFilterSchema.safeParse({
      startDate: startDateStr || undefined,
      endDate: endDateStr || undefined,
    });

    if (!dateValidation.success) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 },
      );
    }

    // Convert validated strings to Date objects
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateValidation.data.startDate) {
      startDate = new Date(dateValidation.data.startDate);
      // Ensure it's a valid date
      if (Number.isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
          { status: 400 },
        );
      }
    }

    if (dateValidation.data.endDate) {
      endDate = new Date(dateValidation.data.endDate);
      // Ensure it's a valid date and add one day to make it inclusive of the end date
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
          { status: 400 },
        );
      }
      // Move end date to end of day for inclusive filtering
      endDate.setUTCHours(23, 59, 59, 999);
    }

    // Validate that startDate <= endDate if both provided
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be less than or equal to endDate' },
        { status: 400 },
      );
    }

    // Fetch user's workstreams with optional date filtering
    const workstreams = await getWorkstreamsByUserIdWithDateFilter(
      userId,
      startDate,
      endDate,
      false,
    );

    // Get counts with date filtering
    let unassignedCount = 0;
    let achievementCount = 0;

    if (startDate || endDate) {
      // Use date-filtered achievements for counts
      const achievements = await getAchievementsByUserIdWithDates(
        userId,
        startDate,
        endDate,
      );
      // For zero state, count ALL achievements (embeddings will be generated on demand)
      achievementCount = achievements.length;
      // Count unassigned achievements (no workstream assignment)
      unassignedCount = achievements.filter((a) => !a.workstreamId).length;
    } else {
      // Use existing functions for all-time counts
      const unassignedAchievements = await getUnassignedAchievements(userId);
      unassignedCount = unassignedAchievements.length;
      achievementCount = await getTotalAchievementCount(userId);
    }

    return NextResponse.json({
      workstreams,
      unassignedCount,
      achievementCount,
    });
  } catch (error) {
    console.error('Error fetching workstreams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workstreams' },
      { status: 500 },
    );
  }
}
