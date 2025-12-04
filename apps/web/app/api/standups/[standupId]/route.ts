import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getStandupById,
  updateStandup,
  deleteStandup,
} from '@bragdoc/database';

// Validation schema for standup updates
const updateStandupSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  companyId: z.string().uuid().nullable().optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  daysMask: z.number().int().min(1).max(127).optional(),
  meetingTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  timezone: z.string().optional(),
  startDate: z.string().optional(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
});

/**
 * GET /api/standups/:standupId
 * Get a single standup by ID
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
) {
  try {
    const params = await props.params;
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const standup = await getStandupById(params.standupId, auth.user.id);

    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    return NextResponse.json({ standup });
  } catch (error) {
    console.error('Error fetching standup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standup' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/standups/:standupId
 * Update a standup
 */
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
) {
  try {
    const params = await props.params;
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate request data
    const validatedData = updateStandupSchema.parse(body);

    // Update standup
    const standup = await updateStandup(
      params.standupId,
      auth.user.id,
      validatedData,
    );

    return NextResponse.json({ standup });
  } catch (error) {
    console.error('Error updating standup:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      error.message === 'Standup not found or unauthorized'
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update standup' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/standups/:standupId
 * Delete a standup
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
) {
  try {
    const params = await props.params;
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteStandup(params.standupId, auth.user.id);

    return NextResponse.json(
      { message: 'Standup deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting standup:', error);

    if (
      error instanceof Error &&
      error.message === 'Standup not found or unauthorized'
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to delete standup' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId
 * CORS preflight handler
 */
export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
