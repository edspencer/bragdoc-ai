import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getAchievements } from '@/database/queries';
import { createAchievement } from '@/database/achievements/utils';
import { getAuthUser } from 'lib/getAuthUser';
import { db } from '@/database/index';
import { project } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { captureServerEvent } from '@/lib/posthog-server';

// Validation schema for achievement data
const achievementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'year'], {
    required_error: 'Event duration is required',
    invalid_type_error: 'Invalid event duration',
  }),
  eventStart: z.string().datetime().optional(),
  eventEnd: z.string().datetime().optional().nullable(),
  summary: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  companyId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  impact: z.number().int().min(1).max(10).optional(),
  impactSource: z.enum(['user', 'llm']).optional(),
  impactUpdatedAt: z.string().datetime().optional(),
  source: z.enum(['manual', 'llm']).optional(),
  userMessageId: z.string().uuid().optional().nullable(),
  standupDocumentId: z.string().uuid().optional().nullable(),
  isArchived: z.boolean().optional(),
});

// GET /api/achievements
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
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
      userId: auth.user.id,
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
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
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

    // If projectId is provided but companyId is not, look it up
    let finalCompanyId = result.data.companyId;
    if (result.data.projectId && !finalCompanyId) {
      const [projectRecord] = await db
        .select({ companyId: project.companyId })
        .from(project)
        .where(
          and(
            eq(project.id, result.data.projectId),
            eq(project.userId, auth.user.id),
          ),
        )
        .limit(1);

      if (projectRecord?.companyId) {
        finalCompanyId = projectRecord.companyId;
      }
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
      isArchived: result.data.isArchived ?? false,
      userMessageId: result.data.userMessageId ?? null,
      standupDocumentId: result.data.standupDocumentId ?? null,
      summary: result.data.summary ?? null,
      details: result.data.details ?? null,
      companyId: finalCompanyId ?? null,
      projectId: result.data.projectId ?? null,
      impact: result.data.impact ?? null,
      impactSource: result.data.impactSource ?? 'user',
    };

    const achievement = await createAchievement(
      auth.user.id,
      data,
      data.source,
    );

    // Track achievement creation
    try {
      await captureServerEvent(auth.user.id, 'achievement_created', {
        source: data.source,
        has_project: !!data.projectId,
        has_company: !!finalCompanyId,
      });
    } catch (error) {
      console.error('Failed to track achievement creation:', error);
      // Don't fail the request if tracking fails
    }

    return NextResponse.json(achievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 },
    );
  }
}
