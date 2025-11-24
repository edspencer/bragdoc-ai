import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getSourcesByUserId, createSource } from '@bragdoc/database';
import { z } from 'zod/v3';

const createSourceSchema = z.object({
  name: z.string().min(1, 'Name required').max(256, 'Name too long'),
  type: z.enum(['git', 'github', 'jira'], {
    errorMap: () => ({ message: 'Type must be git, github, or jira' }),
  }),
  config: z.record(z.any()).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get('page') || '1');
    const limit = Number.parseInt(url.searchParams.get('limit') || '10');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    // Get sources
    const sources = await getSourcesByUserId(auth.user.id, {
      includeArchived,
    });

    // Calculate pagination
    const total = sources.length;
    const offset = (page - 1) * limit;
    const paginatedSources = sources.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedSources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSourceSchema.parse(body);

    const [source] = await createSource({
      userId: auth.user.id,
      ...validatedData,
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Error creating source:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
