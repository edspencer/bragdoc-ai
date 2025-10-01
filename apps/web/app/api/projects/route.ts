import { NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import {
  createProject,
  getProjectsByUserId,
} from '@/database/projects/queries';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(256),
  description: z
    .string()
    .optional()
    .transform((val) => (val === null ? undefined : val)),
  companyId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']),
  color: z
    .string()
    .length(7)
    .regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
    .optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await getProjectsByUserId(session.user.id);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    const project = await createProject({
      userId: session.user.id,
      ...validatedData,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
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
