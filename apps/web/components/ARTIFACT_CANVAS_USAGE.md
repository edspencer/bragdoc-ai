# Using the Global Artifact Canvas

The artifact canvas is now a global component that can be triggered from anywhere in the app.

## Architecture

The canvas infrastructure consists of:

1. **ArtifactProvider** - React Context provider at `(app)` layout level that manages artifact state
2. **DataStreamProvider** - Manages streaming AI responses at layout level
3. **DataStreamHandler** - Processes streaming data and updates artifact state
4. **ArtifactCanvas** - The global canvas component that renders when artifact is visible

## How to Open a Document in Canvas Mode

From any page in the app, you can open a document in canvas mode by:

1. Import the `useArtifact` hook:
```typescript
import { useArtifact } from '@/hooks/use-artifact';
```

2. Call `setArtifact` with the document details:
```typescript
const { setArtifact } = useArtifact();

// When user clicks to open a document
const handleOpenDocument = (doc: Document) => {
  setArtifact({
    documentId: doc.id,
    chatId: doc.chatId,        // The chat ID associated with this document
    kind: 'text',               // Type of artifact (currently only 'text' is supported)
    title: doc.title,
    content: doc.content || '',
    isVisible: true,            // This triggers the canvas to open
    status: 'idle',
    boundingBox: {              // Animation origin point (usually just use defaults)
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    },
  });
};
```

## Requirements

1. **Document must have a chatId** - Every document needs an associated chat to load the message history
2. **Chat must exist in database** - The chatId must reference a valid Chat record
3. **User must have permission** - The chat's userId must match the authenticated user

## What Happens When You Open the Canvas

1. The `ArtifactCanvas` component detects `chatId` is set
2. It automatically fetches messages from `/api/messages?chatId=${chatId}`
3. It initializes `useChat` with those messages
4. The `Artifact` component renders with full-screen animation
5. User can chat with AI to edit the document
6. Streaming responses are processed by `DataStreamHandler`
7. Document updates are saved automatically

## Example: Opening from a Table

```typescript
'use client';

import { useArtifact } from '@/hooks/use-artifact';
import { Button } from '@/components/ui/button';

export function DocumentTable({ documents }: { documents: Document[] }) {
  const { setArtifact } = useArtifact();

  const handleEdit = (doc: Document) => {
    if (!doc.chatId) {
      toast.error('This document is missing a chat');
      return;
    }

    setArtifact({
      documentId: doc.id,
      chatId: doc.chatId,
      kind: 'text',
      title: doc.title,
      content: doc.content || '',
      isVisible: true,
      status: 'idle',
      boundingBox: { top: 0, left: 0, width: 100, height: 100 },
    });
  };

  return (
    <table>
      {documents.map(doc => (
        <tr key={doc.id}>
          <td>{doc.title}</td>
          <td>
            <Button onClick={() => handleEdit(doc)}>Edit</Button>
          </td>
        </tr>
      ))}
    </table>
  );
}
```

## Closing the Canvas

The canvas will close when the user clicks the close button. This sets `artifact.isVisible = false` and triggers the exit animation.

## Implementation Details

- **State Management**: Uses React Context (not SWR) for reliable state persistence
- **Message Loading**: Automatic via `/api/messages` endpoint when chatId is set
- **Streaming**: Connected to DataStreamProvider via `onData` callback in `useChat`
- **Auto-save**: Document changes are debounced and saved automatically
- **Version History**: Users can navigate through document versions within the canvas
