import { getAuthUser } from '@/lib/getAuthUser';
import { getDocumentById, updateDocument } from '@bragdoc/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Parameter id is missing' }, { status: 400 });
  }

  const auth = await getAuthUser(request);

  if (!auth?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const document = await getDocumentById({ id });

  if (!document) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  if (document.userId !== auth.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return Response.json(document, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json(
      { error: 'Parameter id is required' },
      { status: 400 },
    );
  }

  const auth = await getAuthUser(request);

  if (!auth?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    );
  }

  const { content, title } = body;

  if (!content || !title) {
    console.error('Missing required fields:', {
      content: !!content,
      title: !!title,
    });
    return Response.json(
      { error: 'Missing required fields: content and title are required' },
      { status: 400 },
    );
  }

  const existingDoc = await getDocumentById({ id });

  if (!existingDoc) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  if (existingDoc.userId !== auth.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const document = await updateDocument({
    id,
    userId: auth.user.id,
    data: {
      content,
      title,
    },
  });

  return Response.json(document, { status: 200 });
}
