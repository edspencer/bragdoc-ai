import { NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { getCompaniesByUserId, createCompany } from 'lib/db/queries';
import { z } from 'zod';
import { db } from 'lib/db';

// Validation schema for creating a company
const createCompanySchema = z.object({
  name: z.string().min(1).max(256),
  domain: z.string().max(256).nullable().optional(),
  role: z.string().min(1).max(256),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await getCompaniesByUserId({
      userId: session.user.id,
      db,
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Failed to get companies:', error);
    return NextResponse.json(
      { error: 'Failed to get companies' },
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
    const validatedData = createCompanySchema.parse(body);

    const company = await createCompany(
      {
        ...validatedData,
        domain: validatedData.domain || null,
        endDate: validatedData.endDate || null,
        userId: session.user.id,
      },
      db,
    );

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Failed to create company:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 },
    );
  }
}
