import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from 'lib/getAuthUser';
import { getStandupsByUserId, createStandup } from '@bragdoc/database';

// Validation schema for standup creation
const standupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  companyId: z.string().uuid().nullable().optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  daysMask: z
    .number()
    .int()
    .min(1, 'At least one day must be selected')
    .max(127, 'Invalid days mask'),
  meetingTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  timezone: z.string().min(1, 'Timezone is required'),
  startDate: z.string().optional(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
});

/**
 * GET /api/standups
 * List all standups for authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const standups = await getStandupsByUserId(auth.user.id);

    return NextResponse.json({ standups });
  } catch (error) {
    console.error('Error fetching standups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standups' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/standups
 * Create a new standup
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate request data
    const validatedData = standupSchema.parse(body);

    // Create standup
    const standup = await createStandup({
      userId: auth.user.id,
      ...validatedData,
    });

    return NextResponse.json({ standup }, { status: 201 });
  } catch (error) {
    console.error('Error creating standup:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create standup' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/standups
 * CORS preflight handler
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
