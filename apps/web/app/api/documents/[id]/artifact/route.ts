import type { ArtifactKind } from "@/components/artifact";
import { getAuthUser } from "@/lib/getAuthUser";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@bragdoc/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { error: "Parameter id is missing" },
      { status: 400 }
    );
  }

  const auth = await getAuthUser(request);

  if (!auth?.user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return Response.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  if (document.userId !== auth.user.id) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { error: "Parameter id is required" },
      { status: 400 }
    );
  }

  const auth = await getAuthUser(request);

  if (!auth?.user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return Response.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { content, title, kind, chatId } = body;

  if (!content || !title || !kind) {
    console.error("Missing required fields:", { content: !!content, title: !!title, kind: !!kind });
    return Response.json(
      { error: "Missing required fields: content, title, and kind are required" },
      { status: 400 }
    );
  }

  const documents = await getDocumentsById({ id });

  if (documents.length > 0) {
    const [doc] = documents;

    if (doc && doc.userId !== auth.user.id) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  }

  const document = await saveDocument({
    id,
    content,
    title,
    kind,
    userId: auth.user.id,
    chatId: chatId || undefined,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return Response.json(
      { error: "Parameter id is required" },
      { status: 400 }
    );
  }

  if (!timestamp) {
    return Response.json(
      { error: "Parameter timestamp is required" },
      { status: 400 }
    );
  }

  const auth = await getAuthUser(request);

  if (!auth?.user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return Response.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  if (document.userId !== auth.user.id) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
