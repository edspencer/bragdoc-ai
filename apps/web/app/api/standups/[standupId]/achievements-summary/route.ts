import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from 'lib/getAuthUser';
import { getStandupById } from '@bragdoc/database';
import { createOrUpdateStandupDocument } from 'lib/standups/create-standup-document';

const summarySchema = z.object({
  achievementsSummary: z.string().optional(),
  regenerate: z.boolean().optional(), // If true, generate from achievements
});

/**
 * POST /api/standups/:standupId/achievements-summary
 * Update or generate the achievements summary for the current standup document
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ standupId: string }> },
) {
  try {
    const params = await props.params;
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify standup exists and belongs to user
    const standup = await getStandupById(params.standupId, auth.user.id);
    if (!standup) {
      return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
    }

    // Validate request body
    const body = await req.json();
    const { regenerate } = summarySchema.parse(body);

    // Use shared function to create or update the standup document
    const document = await createOrUpdateStandupDocument(
      params.standupId,
      auth.user.id,
      standup,
      undefined, // No target date - uses next scheduled date
      regenerate || false,
    );

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating achievements summary:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update achievements summary' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId/achievements-summary
 * CORS preflight handler
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
