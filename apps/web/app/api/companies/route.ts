import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { getCompaniesByUserId, createCompany } from '@/database/queries';
import { z } from 'zod';
import { db } from '@/database/index';

// Validation schema for creating a company
const createCompanySchema = z.object({
  name: z.string().min(1).max(256),
  domain: z.string().max(256).nullable().optional(),
  role: z.string().min(1).max(256),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await getCompaniesByUserId({
      userId: auth.user.id,
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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    const company = await createCompany(
      {
        ...validatedData,
        domain: validatedData.domain || null,
        endDate: validatedData.endDate || null,
        userId: auth.user.id,
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
