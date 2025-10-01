import { type NextRequest, NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import {
  getCompanyById,
  updateCompany,
  deleteCompany,
} from '@/database/queries';
import { z } from 'zod';
import { db } from '@/database/index';

// Validation schema for updating a company
const updateCompanySchema = z.object({
  name: z.string().min(1).max(256).optional(),
  domain: z.string().max(256).nullable().optional(),
  role: z.string().min(1).max(256).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
});

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await getCompanyById({
      id,
      userId: session.user.id,
      db,
    });

    if (!company) {
      return new Response('Not Found', { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    const company = await updateCompany({
      id,
      userId: session.user.id,
      data: validatedData,
      db,
    });

    if (!company) {
      return new Response('Not Found', { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await deleteCompany({
      id,
      userId: session.user.id,
      db,
    });

    if (!company) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
