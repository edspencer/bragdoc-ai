import { NextResponse } from 'next/server';
import {
  getProjectById,
  updateProject,
  deleteProject,
} from '@/database/projects/queries';
import { z } from 'zod';
import { getAuthUser } from 'lib/getAuthUser';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(256),
  description: z
    .string()
    .optional()
    .transform((val) => (val === null ? undefined : val)),
  companyId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  color: z
    .string()
    .length(7)
    .regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
    .optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .nullable()
    .transform((str) => (str ? new Date(str) : undefined))
    .optional(),
});

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProjectById(id, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    const project = await updateProject(id, auth.user.id, validatedData);
    if (!project) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await deleteProject(id, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 },
    );
  }
}
