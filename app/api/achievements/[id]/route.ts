import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import type { UpdateAchievementRequest } from '@/lib/types/achievement';
import { updateAchievement, deleteAchievement } from '@/lib/db/queries';

type Params = { id: string }

// Validation schema for achievement updates
const updateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'year'], {
    invalid_type_error: 'Invalid event duration',
  }).optional(),
  eventStart: z.string().datetime().optional(),
  eventEnd: z.string().datetime().optional(),
  summary: z.string().optional(),
  details: z.string().optional(),
  companyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  impact: z.number().int().min(1).max(5).optional(),
  impactSource: z.enum(['user', 'llm']).optional(),
  impactUpdatedAt: z.string().datetime().optional(),
  source: z.enum(['manual', 'llm']).optional(),
});

// Utility to validate UUID format
const isValidUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// PUT /api/achievements/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const session = await auth();
    const {id} = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: 'Invalid achievement data',
        details: result.error.errors,
      }, { status: 400 });
    }

    // Convert date strings to Date objects and prepare data
    const data: UpdateAchievementRequest = {
      ...result.data,
      eventStart: result.data.eventStart ? new Date(result.data.eventStart) : null,
      eventEnd: result.data.eventEnd ? new Date(result.data.eventEnd) : null,
      impactUpdatedAt: result.data.impactUpdatedAt ? new Date(result.data.impactUpdatedAt) : null,
      summary: result.data.summary ?? null,
      details: result.data.details ?? null,
      companyId: result.data.companyId ?? null,
      projectId: result.data.projectId ?? null,
      impact: result.data.impact ?? null,
      impactSource: result.data.impactSource ?? null,
      source: result.data.source,
    };

    const [updated] = await updateAchievement({
      id,
      userId: session.user.id,
      data
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
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    const [deleted] = await deleteAchievement({
      id,
      userId: session.user.id
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
