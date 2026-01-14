import { NextResponse } from 'next/server';
import {
  getPerformanceReviewById,
  updatePerformanceReview,
  deletePerformanceReview,
  deleteChatById,
} from '@bragdoc/database';
import { z } from 'zod/v3';
import { getAuthUser } from 'lib/getAuthUser';

const updateSchema = z
  .object({
    name: z.string().min(1).max(256).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    instructions: z.string().nullable().optional(),
    documentId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      // Only validate if both dates are provided
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    },
  );

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await getPerformanceReviewById(id, auth.user.id);
    if (!review) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching performance review:', error);
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
    const validatedData = updateSchema.parse(body);

    // If documentId is being set to null (document deletion), also delete the associated chat
    if (validatedData.documentId === null) {
      const existingReview = await getPerformanceReviewById(id, auth.user.id);
      if (existingReview?.document?.chatId) {
        try {
          await deleteChatById({ id: existingReview.document.chatId });
        } catch (chatError) {
          console.error('Error deleting chat:', chatError);
          // Continue with document deletion even if chat deletion fails
        }
      }
    }

    const review = await updatePerformanceReview(
      id,
      auth.user.id,
      validatedData,
    );
    if (!review) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating performance review:', error);
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

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await deletePerformanceReview(id, auth.user.id);
    if (!review) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error deleting performance review:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
