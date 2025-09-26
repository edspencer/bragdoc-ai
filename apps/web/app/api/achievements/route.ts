import { type NextRequest, NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { z } from 'zod';
import { getAchievements } from 'lib/db/queries';
import { createAchievement } from 'lib/db/achievements/utils';

// Validation schema for achievement data
const achievementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'year'], {
    required_error: 'Event duration is required',
    invalid_type_error: 'Invalid event duration',
  }),
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

// GET /api/achievements
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;
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
      { status: 500 },
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
    const result = achievementSchema.safeParse(body);

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
        : null,
      eventEnd:
        result.data.eventEnd === null
          ? null
          : result.data.eventEnd
            ? new Date(result.data.eventEnd)
            : null,
      impactUpdatedAt: result.data.impactUpdatedAt
        ? new Date(result.data.impactUpdatedAt)
        : new Date(),
      source: result.data.source ?? 'manual',
      isArchived: false,
      userMessageId: null,
      summary: result.data.summary ?? null,
      details: result.data.details ?? null,
      companyId: result.data.companyId ?? null,
      projectId: result.data.projectId ?? null,
      impact: result.data.impact ?? null,
      impactSource: result.data.impactSource ?? 'user',
    };

    const achievement = await createAchievement(session.user.id, data);
    return NextResponse.json(achievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 },
    );
  }
}
