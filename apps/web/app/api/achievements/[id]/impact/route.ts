import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { updateAchievement } from '@/database/queries';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { impact } = body;

    if (!impact || impact < 1 || impact > 3) {
      return NextResponse.json(
        { error: 'Impact must be between 1 and 3' },
        { status: 400 }
      );
    }

    const [updatedAchievement] = await updateAchievement({
      id,
      userId: session.user.id,
      data: {
        impact,
        impactSource: 'user' as const,
        impactUpdatedAt: new Date(),
      },
    });

    if (!updatedAchievement) {
      return NextResponse.json(
        { error: 'Achievement not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedAchievement);
  } catch (error) {
    console.error('Error updating achievement impact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
