import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { z } from 'zod/v3';
import { updateAchievement, deleteAchievement } from '@/database/queries';

type Params = { id: string };

// Runtime validation schema
const updateValidationSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  eventDuration: z
    .enum(['day', 'week', 'month', 'quarter', 'year'] as const)
    .optional(),
  eventStart: z.string().datetime().optional(),
  eventEnd: z.string().datetime().optional().nullable(),
  summary: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  companyId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  impact: z.number().int().min(1).max(10).optional(),
  impactSource: z.enum(['user', 'llm']).optional(),
  impactUpdatedAt: z.string().datetime().optional(),
  source: z.enum(['manual', 'llm', 'commit']).optional(),
});

// Utility to validate UUID format
const isValidUUID = (uuid: string) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// PUT /api/achievements/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(req);
    const { id } = await params;
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 },
      );
    }

    const body = await req.json();
    const result = updateValidationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid achievement data',
          details: result.error.errors,
        },
        { status: 400 },
      );
    }

    // Convert date strings to Date objects and prepare data
    const data = {
      ...result.data,
      eventStart: result.data.eventStart
        ? new Date(result.data.eventStart)
        : undefined,
      eventEnd:
        result.data.eventEnd === null
          ? null
          : result.data.eventEnd
            ? new Date(result.data.eventEnd)
            : undefined,
      impactUpdatedAt: result.data.impactUpdatedAt
        ? new Date(result.data.impactUpdatedAt)
        : undefined,
      updatedAt: new Date(),
    };

    const [updated] = await updateAchievement({
      id,
      userId: auth.user.id,
      data,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 },
      );
    }

    // Strip embedding vectors from response - they're only used server-side for ML clustering
    const { embedding, embeddingModel, embeddingGeneratedAt, ...achievement } =
      updated;

    return NextResponse.json(achievement);
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to update achievement' },
      { status: 500 },
    );
  }
}

// DELETE /api/achievements/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 },
      );
    }

    const [deleted] = await deleteAchievement({
      id,
      userId: auth.user.id,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 },
    );
  }
}
