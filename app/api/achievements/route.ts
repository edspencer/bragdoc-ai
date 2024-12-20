import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { achievementRequestSchema } from '@/lib/types/achievement';
import { 
  createAchievement,
  getAchievements, 
  updateAchievement, 
  deleteAchievement 
} from '@/lib/db/queries';

// GET /api/achievements
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get('page') ?? '1');
    const limit = Number.parseInt(searchParams.get('limit') ?? '10');
    const companyId = searchParams.get('companyId');
    const projectId = searchParams.get('projectId');
    const source = searchParams.get('source') as 'llm' | 'manual' | null;
    const isArchived = searchParams.get('isArchived');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const { achievements, total } = await getAchievements({
      userId: session.user.id,
      companyId: companyId || null,
      projectId: projectId || null,
      source: source || undefined,
      isArchived: isArchived ? isArchived === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      achievements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

// POST /api/achievements
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = achievementRequestSchema.parse(body);

    const achievement = await createAchievement(
      session.user.id,
      validatedData,
      'manual'
    );

    return NextResponse.json(achievement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid achievement data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    );
  }
}

type Params = Promise<{ id: string }>

// PUT /api/achievements/[id]
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await auth();
    const {id} = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  { params }: { params: Params }
) {
  const {id} = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
