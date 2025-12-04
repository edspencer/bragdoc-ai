import { db } from '@/database/index';
import { document } from '@/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.shareToken, token));

    const [doc] = documents;
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Don't expose sensitive information in shared view
    const { userId, shareToken, ...safeDocument } = doc;

    return Response.json({ document: safeDocument });
  } catch (error) {
    console.error('Error fetching shared document:', error);
    return Response.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    );
  }
}
