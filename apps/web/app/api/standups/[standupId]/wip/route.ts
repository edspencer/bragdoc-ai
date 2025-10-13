import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getStandupById,
  getCurrentStandupDocument,
  createStandupDocument,
  updateStandupDocumentWip,
} from '@bragdoc/database';
import { computeNextRunUTC } from 'lib/scheduling';
import type { StandupDocument } from '@bragdoc/database';

const wipSchema = z.object({
  wip: z.string(), // Allow empty strings to clear content
  source: z.enum(['manual', 'llm']).optional().default('manual'), // Track who created the content
  documentId: z.string().optional(), // ID of document to update (if it exists)
});

/**
 * POST /api/standups/:standupId/wip
 * Update or create the WIP for the current standup document
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
    const { wip, source, documentId } = wipSchema.parse(body);

    let document: StandupDocument | null = null;

    if (documentId) {
      // Update existing document by ID
      document = await updateStandupDocumentWip(documentId, wip, source);
    } else {
      // Get or create current standup document
      document = await getCurrentStandupDocument(params.standupId);

      if (!document) {
        // Create a new document with the next scheduled date
        const nextRunDate = computeNextRunUTC(
          new Date(),
          standup.timezone,
          standup.meetingTime,
          standup.daysMask,
        );

        document = await createStandupDocument({
          standupId: params.standupId,
          userId: auth.user.id,
          date: nextRunDate,
          wip,
        });

        // Update with proper source
        document = await updateStandupDocumentWip(document.id, wip, source);
      } else {
        // Update existing document
        document = await updateStandupDocumentWip(document.id, wip, source);
      }
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating WIP:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update WIP' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups/:standupId/wip
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
