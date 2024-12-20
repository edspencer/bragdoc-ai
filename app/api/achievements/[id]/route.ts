import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { achievementRequestSchema } from '@/lib/types/achievement';
import { updateAchievement, deleteAchievement } from '@/lib/db/queries';

type Params = { id: string }

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
    const validatedData = achievementRequestSchema.partial().parse(body);

    const [updated] = await updateAchievement({
      id,
      userId: session.user.id,
      data: validatedData
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid achievement data', details: error.errors },
        { status: 400 }
      );
    }

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
