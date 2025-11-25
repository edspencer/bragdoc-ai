import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getWorkstreamsByUserIdWithDateFilter,
  getAchievementCounts,
  db,
  workstream,
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

// Validation schema for creating a new workstream
const createWorkstreamSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(256, 'Name must be under 256 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
    .optional()
    .default('#3B82F6'),
});

type CreateWorkstreamRequest = z.infer<typeof createWorkstreamSchema>;

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

    // Fetch workstreams and counts in parallel using optimized SQL COUNT
    const [workstreams, counts] = await Promise.all([
      getWorkstreamsByUserIdWithDateFilter(userId, startDate, endDate, false),
      getAchievementCounts(userId, startDate, endDate),
    ]);

    // Exclude centroidEmbedding from response (only used server-side for incremental assignment)
    const workstreamsWithoutEmbeddings = workstreams.map(
      ({ centroidEmbedding, ...ws }) => ws,
    );

    return NextResponse.json({
      workstreams: workstreamsWithoutEmbeddings,
      unassignedCount: counts.unassigned,
      achievementCount: counts.total,
    });
  } catch (error) {
    console.error('Error fetching workstreams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workstreams' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/workstreams
 *
 * Creates a new empty workstream for the authenticated user.
 * The workstream is created with the provided name, optional description, and optional color.
 * Achievement assignment happens in a separate step via POST /api/workstreams/assign.
 *
 * Request Body:
 * - name: string (required, 1-256 characters)
 * - description: string (optional, max 1000 characters)
 * - color: string (optional hex color, defaults to #3B82F6)
 *
 * Response:
 * - 201 Created: Returns the newly created workstream object
 * - 400 Bad Request: Validation error
 * - 401 Unauthorized: User not authenticated
 * - 500 Internal Server Error: Database error
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    // Parse and validate request body
    const body = await request.json();
    let validatedData: CreateWorkstreamRequest;
    try {
      validatedData = createWorkstreamSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation Error', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Create workstream in database
    const newWorkstream = await db
      .insert(workstream)
      .values({
        userId,
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color,
        // Default values from schema: achievementCount: 0, isArchived: false, centroidEmbedding: null, centroidUpdatedAt: null
      })
      .returning();

    if (!newWorkstream[0]) {
      return NextResponse.json(
        { error: 'Failed to create workstream' },
        { status: 500 },
      );
    }

    return NextResponse.json(newWorkstream[0], { status: 201 });
  } catch (error) {
    console.error('Error creating workstream:', error);
    return NextResponse.json(
      { error: 'Failed to create workstream' },
      { status: 500 },
    );
  }
}
