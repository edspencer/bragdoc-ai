import { NextResponse } from 'next/server';
import {
  createPerformanceReview,
  getPerformanceReviewsByUserId,
} from '@bragdoc/database';
import { z } from 'zod/v3';
import { getAuthUser } from 'lib/getAuthUser';

const createSchema = z
  .object({
    name: z.string().min(1).max(256),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    instructions: z.string().nullable().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export async function GET(request: Request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviews = await getPerformanceReviewsByUserId(auth.user.id);
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
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
    const validatedData = createSchema.parse(body);

    const review = await createPerformanceReview({
      userId: auth.user.id,
      ...validatedData,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating performance review:', error);
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
