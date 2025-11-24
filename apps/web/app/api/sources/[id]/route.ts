import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getSourceById, updateSource, archiveSource } from '@bragdoc/database';
import { z } from 'zod/v3';

const updateSourceSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  config: z.record(z.any()).optional(),
  // Note: type is NOT updatable to prevent breaking existing achievements
});

type Params = Promise<{ id: string }>;

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 },
      );
    }

    const source = await getSourceById(id, auth.user.id);
    if (!source) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error('Error fetching source:', error);
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

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = updateSourceSchema.parse(body);

    const [source] = await updateSource(id, auth.user.id, validatedData);
    if (!source) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error('Error updating source:', error);
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

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 },
      );
    }

    const [source] = await archiveSource(id, auth.user.id);
    if (!source) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
