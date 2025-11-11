import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getWorkstreamById,
  updateWorkstream,
  archiveWorkstream,
  unassignAchievementsFromWorkstream,
} from '@bragdoc/database';

// Validation schema for update request
const updateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

type UpdateRequest = z.infer<typeof updateSchema>;

/**
 * Validates if a string is a valid UUID v4
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/workstreams/[id]
 *
 * Retrieves a single workstream by ID.
 * Returns 404 if workstream doesn't exist or doesn't belong to user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workstreamId } = await params;
    const userId = auth.user.id;

    // Validate UUID format
    if (!isValidUUID(workstreamId)) {
      return NextResponse.json(
        { error: 'Workstream not found' },
        { status: 404 },
      );
    }

    // Fetch workstream
    const workstream = await getWorkstreamById(workstreamId);

    // Verify workstream exists and belongs to user
    if (!workstream || workstream.userId !== userId) {
      return NextResponse.json(
        { error: 'Workstream not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(workstream);
  } catch (error) {
    console.error('Error fetching workstream:', error);
    return NextResponse.json(
      { error: 'Workstream not found' },
      { status: 404 },
    );
  }
}

/**
 * PUT /api/workstreams/[id]
 *
 * Updates a workstream's details (name, description, color).
 * Returns 404 if workstream doesn't exist or doesn't belong to user.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workstreamId } = await params;
    const userId = auth.user.id;

    // Fetch workstream and verify ownership
    const workstream = await getWorkstreamById(workstreamId);
    if (!workstream || workstream.userId !== userId) {
      return NextResponse.json(
        { error: 'Workstream not found' },
        { status: 404 },
      );
    }

    // Validate request body
    const body = await request.json();
    let validatedData: UpdateRequest;
    try {
      validatedData = updateSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation Error', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Update workstream with validated data
    const updates: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updates.name = validatedData.name;
    if (validatedData.description !== undefined)
      updates.description = validatedData.description;
    if (validatedData.color !== undefined) updates.color = validatedData.color;

    const updatedWorkstream = await updateWorkstream(
      workstreamId,
      updates as Parameters<typeof updateWorkstream>[1],
    );

    return NextResponse.json(updatedWorkstream);
  } catch (error) {
    console.error('Error updating workstream:', error);
    return NextResponse.json(
      { error: 'Failed to update workstream' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/workstreams/[id]
 *
 * Archives a workstream and unassigns all its achievements.
 * Returns 404 if workstream doesn't exist or doesn't belong to user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workstreamId } = await params;
    const userId = auth.user.id;

    // Fetch workstream and verify ownership
    const workstream = await getWorkstreamById(workstreamId);
    if (!workstream || workstream.userId !== userId) {
      return NextResponse.json(
        { error: 'Workstream not found' },
        { status: 404 },
      );
    }

    // Archive workstream
    await archiveWorkstream(workstreamId);

    // Unassign all achievements from this workstream
    await unassignAchievementsFromWorkstream(workstreamId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workstream:', error);
    return NextResponse.json(
      { error: 'Failed to delete workstream' },
      { status: 500 },
    );
  }
}
