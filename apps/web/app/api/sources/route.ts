import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  getSourcesByUserId,
  getSourcesByProjectId,
  createSource,
  getProjectById,
} from '@bragdoc/database';
import { z } from 'zod/v3';

const createSourceSchema = z.object({
  projectId: z
    .string()
    .uuid('Invalid project ID format')
    .min(1, 'Project ID required'),
  name: z.string().min(1, 'Name required').max(256, 'Name too long'),
  type: z.enum(['git', 'github', 'jira'], {
    errorMap: () => ({ message: 'Type must be git, github, or jira' }),
  }),
  config: z.record(z.any()).optional(),
});

/**
 * GET /api/sources
 * Returns all sources for the authenticated user.
 * Supports optional projectId query parameter to filter by project.
 */
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
    const projectId = url.searchParams.get('projectId');

    // Get sources (filter by projectId if provided)
    const sources = projectId
      ? await getSourcesByProjectId(projectId, auth.user.id, {
          includeArchived,
        })
      : await getSourcesByUserId(auth.user.id, {
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

/**
 * POST /api/sources
 * Creates a new source for the specified project.
 * Requires projectId in request body and validates user ownership of the project.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSourceSchema.parse(body);

    // Validate that the project exists and belongs to the user
    const project = await getProjectById(validatedData.projectId, auth.user.id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 },
      );
    }

    const [source] = await createSource({
      userId: auth.user.id,
      projectId: validatedData.projectId,
      name: validatedData.name,
      type: validatedData.type,
      config: validatedData.config,
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
