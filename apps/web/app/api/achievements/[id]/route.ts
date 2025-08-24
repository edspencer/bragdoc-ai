import { type NextRequest, NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { z } from 'zod';
import { updateAchievement, deleteAchievement } from 'lib/db/queries';

type Params = { id: string };

// Runtime validation schema
const updateValidationSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  eventDuration: z
    .enum(['day', 'week', 'month', 'quarter', 'half year', 'year'] as const)
    .optional(),
  eventStart: z.string().datetime().optional(),
  eventEnd: z.string().datetime().optional().nullable(),
  summary: z.string().optional(),
  details: z.string().optional(),
  companyId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  impact: z.number().int().min(1).max(5).optional(),
  impactSource: z.enum(['user', 'llm']).optional(),
  impactUpdatedAt: z.string().datetime().optional(),
  source: z.enum(['manual', 'llm']).optional(),
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
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
        { status: 400 }
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
      userId: session.user.id,
      data,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to update achievement' },
      { status: 500 }
    );
  }
}

// DELETE /api/achievements/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    const [deleted] = await deleteAchievement({
      id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 }
    );
  }
}
