import { auth } from '@/app/(auth)/auth';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
  updateDocument,
} from '@/lib/db/queries';
import { z } from 'zod';

const documentSchema = z.object({
  content: z.string(),
  title: z.string(),
  type: z.enum(['weekly_report', 'monthly_report', 'quarterly_report', 'performance_review', 'custom']).optional(),
  companyId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  const parsed = documentSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error },
      { status: 400 },
    );
  }

  const { content, title, type, companyId } = parsed.data;

  if (session.user?.id) {
    const document = await saveDocument({
      id,
      content,
      title,
      type,
      companyId,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  }
  return new Response('Unauthorized', { status: 401 });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const action = searchParams.get('action');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id!;

  if (action === 'share') {
    // Generate a secure random token
    const shareToken = Buffer.from(crypto.randomUUID()).toString('base64url');
    const updated = await updateDocument({
      id,
      userId,
      data: { shareToken },
    });

    if (!updated) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ shareToken: updated.shareToken });
  } else if (action === 'unshare') {
    const updated = await updateDocument({
      id,
      userId,
      data: { shareToken: null },
    });

    if (!updated) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } else {
    const json = await request.json();
    const parsed = documentSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error },
        { status: 400 },
      );
    }

    const { content, title, type, companyId } = parsed.data;
    const updated = await updateDocument({
      id,
      userId,
      data: { content, title, type, companyId },
    });

    if (!updated) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json({ document: updated });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('Deleted', { status: 200 });
}
