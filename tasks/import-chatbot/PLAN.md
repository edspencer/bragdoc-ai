# Import Canvas-Mode Document Editor from ai-chatbot-main

## Overview

This plan details the implementation of a canvas-mode document editor with side-by-side chat and document editing capabilities. The feature will be integrated into the existing Reports page (`/reports`) in our apps/web application, importing components and functionality from the ai-chatbot-main reference implementation in `./tmp/ai-chatbot-main`.

## High-Level Implementation Overview

This implementation consists of 14 phases:

1. **Database Migration** - Update schema for new message format (parts + attachments), add artifact support
2. **Artifact System** - Copy text artifact implementation (foundation for document types)
3. **UI Components** - Import canvas, editor, and chat components from ai-chatbot-main
4. **State Management** - Copy hooks and providers for artifact/canvas state
5. **AI Tools** - Integrate document creation/update tools with our LLM router
6. **API Routes** - Adapt chat API to use our custom LLM router, add document artifact endpoint
7. **Database Queries** - Add query functions for new schema
8. **Reports Integration** - Connect canvas mode to existing Reports page
9. **Document-Chat Linking** - Ensure each document has associated chat
10. **UI Adjustments** - Remove file upload, model selector, adapt to our design
11. **Error Handling** - Add boundaries and graceful failures
12. **Testing** - Comprehensive testing of all features
13. **Documentation** - Update CLAUDE.md, create feature docs
14. **Cleanup** - Remove unused code, optimize performance

## Phase Table of Contents

- [Phase 1: Database Schema Updates](#phase-1-database-schema-updates)
- [Phase 2: Copy Artifact System Foundation](#phase-2-copy-artifact-system-foundation)
- [Phase 3: Copy Core UI Components](#phase-3-copy-core-ui-components)
- [Phase 4: Copy Hooks and State Management](#phase-4-copy-hooks-and-state-management)
- [Phase 5: Copy AI Tools and LLM Integration](#phase-5-copy-ai-tools-and-llm-integration)
- [Phase 6: Copy and Adapt API Routes](#phase-6-copy-and-adapt-api-routes)
- [Phase 7: Database Query Functions](#phase-7-database-query-functions)
- [Phase 8: Integration with Reports Page](#phase-8-integration-with-reports-page)
- [Phase 9: Link Documents to Chats](#phase-9-link-documents-to-chats)
- [Phase 10: UI/UX Adjustments](#phase-10-uiux-adjustments)
- [Phase 11: Error Handling and Edge Cases](#phase-11-error-handling-and-edge-cases)
- [Phase 12: Testing](#phase-12-testing)
- [Phase 13: Documentation](#phase-13-documentation)
- [Phase 14: Cleanup and Optimization](#phase-14-cleanup-and-optimization)

## Instructions for Implementation

**Important**: Follow these guidelines as you implement this plan:

1. **Mark Progress**: Update this plan document as you go. Each time you complete a task, check it off using the checkbox format `[x]`.

2. **Verify Prerequisites**: Before starting, confirm:

   - The `tasks/remove-existing-chat` task is complete (check git log)
   - The `tasks/ai-v5` task is complete (verify `ai` package is v5 in package.json)
   - No existing chat UI components remain in the codebase

3. **Database Changes**: After completing Phase 1 schema edits:

   - Run `pnpm db:generate` to generate migration files
   - Review the generated migration carefully
   - Run `pnpm db:push` to apply changes to database
   - Consider truncating the Message table if needed: `TRUNCATE TABLE "Message" CASCADE;`

4. **Follow Conventions**: Adhere to patterns documented in `/CLAUDE.md`:

   - Use `getAuthUser()` for all API authentication
   - Always scope database queries by `userId`
   - Use named exports for components
   - Prefer Server Components by default
   - Use Zod for API validation

5. **Test Each Phase**: Don't move to the next phase until the current phase is working. Test incrementally.

6. **File Paths**: All file paths in this plan are absolute from the project root. When copying files from `tmp/ai-chatbot-main`, ensure you update imports to match our project structure.

7. **Import Updates**: When copying components, remember to:

   - Update import paths to use our `@/` aliases
   - Import from `@bragdoc/database` instead of local db files
   - Use our auth system (`lib/getAuthUser.ts`) instead of theirs

8. **Ask Questions**: If any instruction is unclear or conflicts with existing code, stop and ask for clarification rather than guessing.

## Existing Code Reference

Before starting, familiarize yourself with these existing systems:

### Current Document Management

- **Location**: `apps/web/app/api/documents/`
- **Functionality**: Basic CRUD operations for documents
- **Database**: Uses `document` table with fields: `id`, `createdAt`, `updatedAt`, `title`, `content`, `userId`, `companyId`, `type`, `shareToken`
- **Current Usage**: Documents are displayed in Reports page as a table

### Current Reports Page

- **Location**: `apps/web/app/(app)/reports/page.tsx`
- **Component**: `ReportsTable` component displays list of documents
- **Structure**: Server component that fetches documents and companies, passes to client table component
- **What's Changing**: We're adding ability to open documents in canvas mode (side-by-side editor + chat)

### Authentication System

- **Location**: `apps/web/lib/getAuthUser.ts`
- **Functionality**: Unified auth helper that supports both:
  - Browser sessions (via NextAuth cookies)
  - CLI requests (via JWT in Authorization header)
- **Usage**: All API routes should use `await getAuthUser(request)` instead of `await auth()`
- **Returns**: `{ user, source }` where source is 'session' or 'jwt'

### LLM Router

- **Location**: `apps/web/lib/ai/llm-router.ts`
- **Key Function**: `streamFetchRenderExecute()`
- **Functionality**:
  - Routes to appropriate LLM based on user subscription level
  - Handles streaming responses
  - Executes tool calls
  - Custom `onEvent` callback for streaming data to client
- **Critical**: We are NOT replacing this with ai-chatbot-main's chat implementation. We're adapting it to support canvas mode.

### Message Table (Current State)

- **Location**: `packages/database/src/schema.ts`
- **Current Format**: Uses `content: json('content')` (old v4 format)
- **Status**: Table exists but is NOT currently in use (old chat UI was deleted)
- **What's Changing**: Migrating to `parts` + `attachments` format (v5)

## Schema Comparison and Required Changes

### ⚠️ CRITICAL: Schema Differences

The ai-chatbot-main schema differs from our current schema in several important ways:

1. **Message table structure**:

   - ai-chatbot-main uses `Message_v2` with `parts` and `attachments` fields (new format)
   - Our app uses `Message` with `content` field (old format)
   - **Decision**: We'll migrate to the new format. Existing messages can be truncated.

2. **Document table**:

   - ai-chatbot-main has `kind` enum field for artifact types
   - Our app doesn't have this field
   - **Decision**: Add `kind` field to document table

3. **Missing tables**:

   - ai-chatbot-main has `Stream` table for resumable streams
   - **Decision**: Add Stream table

4. **Chat table**:

   - ai-chatbot-main has `lastContext` field for usage tracking
   - **Decision**: Add lastContext field to track AI usage per chat

5. **Document-Chat relationship**:
   - Need to add `chatId` field to Document table to link documents to their chats

## Prerequisites

- Completed tasks:
  - ✅ `./tasks/remove-existing-chat` - Removed old chat UI components
  - ✅ `./tasks/ai-v5` - Migrated to AI SDK v5

## Implementation Plan

### Phase 1: Database Schema Updates

**File**: `packages/database/src/schema.ts`

**Important**: Our Document table is richer than ai-chatbot-main's. We will PRESERVE our existing fields (`companyId`, `type`, `shareToken`, `updatedAt`) and ADD the new fields they have (`kind`, `chatId`).

Make the following changes to the schema file:

- [x] **1.1 Update Message table structure**

Replace the current `message` table definition with:

```typescript
export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(), // NEW: Changed from 'content'
  attachments: json('attachments').notNull(), // NEW: Added attachments
  createdAt: timestamp('createdAt').notNull(),
});
```

**Note**: This is a breaking change. Existing messages can be truncated if needed.

- [x] **1.2 Add kind field to Document table**

Add to the `document` table definition:

```typescript
kind: varchar('kind', { enum: ['text', 'code', 'image', 'sheet'] })
  .notNull()
  .default('text'),
```

**Note**: We're keeping all artifact types in the enum for future expansion, but only implementing 'text' initially.

**Warning**: The ai-chatbot-main schema incorrectly uses `varchar('text', ...)` for this field. We're fixing it to use `varchar('kind', ...)` which is the correct column name.

- [x] **1.3 Add chatId field to Document table**

Add to the `document` table definition:

```typescript
chatId: uuid('chat_id').references(() => chat.id),
```

This links each document to its associated chat.

- [x] **1.4 Add lastContext field to Chat table**

Add to the `chat` table definition:

```typescript
lastContext: jsonb('lastContext').$type<AppUsage | null>(),
```

- [x] **1.5 Add Stream table**

**Note**: This table is used by ai-chatbot-main for resumable stream support. It may not be needed for our initial implementation, but we're including it for completeness. If you determine it's not needed after reviewing the code, you can skip this step.

Add new table definition:

```typescript
export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;
```

- [x] **1.6 Add AppUsage type definition**

**Source Check**: The ai-chatbot-main schema imports AppUsage from `"../usage"`. First, check if `tmp/ai-chatbot-main/lib/usage.ts` exists and review its type definition. If it has additional fields or logic, copy those. If the file doesn't exist or is simple, use the definition below.

Add near the top of the file with other type definitions:

```typescript
export interface AppUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  modelId?: string;
}
```

- [x] **1.7 Generate and apply migrations**

After making all schema changes, run:

```bash
pnpm db:generate
pnpm db:push
```

**Optional**: If you want to clear existing messages before pushing:

```sql
TRUNCATE TABLE "Message" CASCADE;
```

### Phase 2: Copy Artifact System Foundation

**Note**: We're only implementing the TEXT artifact type initially. Code, sheet, and image artifacts can be added in future phases.

- [x] **2.1 Copy artifact type definitions and core infrastructure**

Files to copy from `tmp/ai-chatbot-main/artifacts/`:

- `artifacts/actions.ts` → `apps/web/lib/artifacts/actions.ts`
- Copy artifact kind type definitions

Create `apps/web/lib/artifacts/server.ts` with:

- `artifactKinds` array (only include 'text' for now)
- `documentHandlersByArtifactKind` registry
- Document handler interface definitions

- [x] **2.2 Copy text artifact implementation**

Files to copy:

- `tmp/ai-chatbot-main/artifacts/text/client.tsx` → `apps/web/artifacts/text/client.tsx`
- `tmp/ai-chatbot-main/artifacts/text/server.ts` → `apps/web/artifacts/text/server.ts`

Update imports to match our project structure

This will provide a rich text editor for creating:

- Performance review documents
- Manager update reports
- Weekly/monthly summaries
- Achievement documentation

### Phase 3: Copy Core UI Components

- [x] **3.1 Copy artifact display components**

Files to copy from `tmp/ai-chatbot-main/components/`:

- `artifact.tsx` → `apps/web/components/artifact.tsx` (main canvas container)
- `artifact-actions.tsx` → `apps/web/components/artifact-actions.tsx`
- `artifact-close-button.tsx` → `apps/web/components/artifact-close-button.tsx`
- `artifact-messages.tsx` → `apps/web/components/artifact-messages.tsx`
- `create-artifact.tsx` → `apps/web/components/create-artifact.tsx`

Update all imports to match our project structure

- [x] **3.2 Copy document-related components**

Files to copy:

- `document.tsx` → `apps/web/components/document.tsx` (document tool result display)
- `document-preview.tsx` → `apps/web/components/document-preview.tsx`
- `document-skeleton.tsx` → `apps/web/components/document-skeleton.tsx`

Update imports

- [x] **3.3 Copy editor components**

Files to copy:

- `text-editor.tsx` → `apps/web/components/text-editor.tsx`
- `toolbar.tsx` → `apps/web/components/toolbar.tsx`
- `diffview.tsx` → `apps/web/components/diffview.tsx` (for version comparison)

Update imports

**Important modifications**:

- In `text-editor.tsx`: **Remove all suggestions-related code**
  - Remove suggestion props, plugins, decorations
  - Remove ProseMirror suggestions plugin
  - Simplify to basic rich text editor
- In `toolbar.tsx`: **Remove "Request Suggestions" button** if present
- Only copying text editor for now. Code/sheet/image editors can be added later.

- [x] **3.4 Copy message/chat components for canvas sidebar**

Files to copy:

- `messages.tsx` → `apps/web/components/messages.tsx`
- `message.tsx` → `apps/web/components/message.tsx`
- `message-actions.tsx` → `apps/web/components/message-actions.tsx`
- `message-editor.tsx` → `apps/web/components/message-editor.tsx`
- `message-reasoning.tsx` → `apps/web/components/message-reasoning.tsx`
- `multimodal-input.tsx` → `apps/web/components/multimodal-input.tsx`

Update imports to match our structure

**Important**: When copying `message-actions.tsx`, **remove all voting functionality**:

- Remove thumbs up/down buttons and handlers
- Remove vote-related imports and props
- Keep only: Copy button and Edit button (for user messages)
- Vote table cleanup will be handled in a separate task

- [x] **3.5 Copy supporting UI components**

Files to copy:

- `version-footer.tsx` → `apps/web/components/version-footer.tsx`
- `chat-header.tsx` → `apps/web/components/chat-header.tsx` (if needed for canvas)
- `data-stream-handler.tsx` → `apps/web/components/data-stream-handler.tsx`

Update imports

### Phase 4: Copy Hooks and State Management

- [x] **4.1 Copy artifact state hook**

Files to copy:

- `tmp/ai-chatbot-main/hooks/use-artifact.ts` → `apps/web/hooks/use-artifact.ts`

This hook manages the artifact (canvas) state using SWR

**Note**: Already copied in Phase 3 as it was needed by artifact components.

- [x] **4.2 Copy other required hooks**

Files to copy:

- `tmp/ai-chatbot-main/hooks/use-auto-resume.ts` → `apps/web/hooks/use-auto-resume.ts` ✅ **COPIED**
- `tmp/ai-chatbot-main/components/use-scroll-to-bottom.ts` → `apps/web/hooks/use-scroll-to-bottom.ts` ✅ **Already in Phase 3**
- Any other hooks imported by copied components ✅ **All verified**

**Usage Note**: The `use-auto-resume` hook is used by the artifact/canvas component to automatically reconnect interrupted AI streams. Review its usage in the artifact component after copying.

**Decision**: Did NOT copy `use-chat-visibility.ts` as visibility management is not needed (all documents private).

- [x] **4.3 Create data stream provider**

Files to copy:

- `tmp/ai-chatbot-main/components/data-stream-provider.tsx` → `apps/web/components/data-stream-provider.tsx`

This provides context for data streaming from AI tools.

**Note**: Already copied in Phase 3 along with `data-stream-handler.tsx`.

**Integration Note**: This provider needs to be mounted above the canvas/artifact component. You'll likely wrap it in the Reports page or in a dedicated canvas route. Confirm the mounting location when implementing Phase 8.

### Phase 5: Copy AI Tools and LLM Integration

- [x] **5.1 Copy document tool implementations**

Files to copy from `tmp/ai-chatbot-main/lib/ai/tools/`:

- `create-document.ts` → `apps/web/lib/ai/tools/create-document.ts` ✅ **COPIED**
- `update-document.ts` → `apps/web/lib/ai/tools/update-document.ts` ✅ **COPIED**

**Note**: NOT copying `request-suggestions.ts` - suggestions feature is deferred.

**Changes Made**:

- Changed from `session: Session` to `user: User` parameter (using `@bragdoc/database` User type)
- Updated imports to match our structure (`@/lib/artifacts/server`, `@/lib/types`, `@/lib/utils`)
- Tools compatible with AI SDK v5's `UIMessageStreamWriter` type

- [x] **5.2 Update LLM router to support document tools**

**Status**: Tools are ready for integration. Phase 6 will handle the integration with chat API route.

**Completed**:

- Updated `saveDocument` query to accept `kind` and `chatId` parameters
- Updated artifact server handlers to use `User` type instead of `Session`
- Tools use proper data streaming with custom types (data-kind, data-id, data-title, etc.)

**Next**: Phase 6 will integrate these tools into the chat API route.

- [x] **5.3 Copy editor utilities**

Files to copy from `tmp/ai-chatbot-main/lib/editor/`:

- Diff/merge utilities for document editing (for diffview.tsx) ✅ **Already copied in Phase 3**
- Editor configuration files (ProseMirror setup) ✅ **Already copied in Phase 3**

**Note**: All editor utilities were already copied during Phase 3:

- `lib/editor/config.ts` - ProseMirror schema
- `lib/editor/functions.tsx` - Document conversion
- `lib/editor/diff.js` - Diff algorithm
- `lib/editor/react-renderer.tsx` - React renderer

**Skip**: Suggestion-related editor code (suggestions plugin, decorations, etc.)

### Phase 6: Copy and Adapt API Routes

- [x] **6.1 Copy document API endpoint**

Files to copy:

- `tmp/ai-chatbot-main/app/(chat)/api/document/route.ts` → `apps/web/app/api/documents/[id]/artifact/route.ts` ✅ **CREATED**

Changes needed:

- Update imports to use our auth system (`lib/getAuthUser.ts`) ✅
- Update database queries to use `@bragdoc/database` ✅
- Keep security checks and authorization logic ✅
- Support both browser session and CLI JWT auth ✅

**Implementation Notes**:

- Used standard Response objects for errors (no ChatSDKError class)
- Full userId scoping on all operations
- Supports GET (retrieve versions), POST (save), DELETE (delete versions after timestamp)

- [x] **6.2 Adapt our existing chat API endpoint for canvas mode**
      **DO NOT copy** `tmp/ai-chatbot-main/app/(chat)/api/chat/route.ts`.

**Instead**: We already have a custom implementation that uses our LLM router. This file was deleted in the remove-existing-chat task but exists on the main branch at `app/api/chat/route.ts`.

**Our previous implementation** (AI SDK v4) - found on main branch:

```typescript
import { type Message, StreamData, convertToCoreMessages } from 'ai';
import { auth } from '@/app/(auth)/auth';
import {
  getChatById,
  saveChat,
  saveMessages,
  deleteChatById,
} from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';
import { streamFetchRenderExecute } from '@/lib/ai/llm-router';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  const userMessageId = generateUUID();

  await saveMessages({
    messages: [
      { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
    ],
  });

  const streamingData = new StreamData();

  streamingData.append({
    type: 'user-message-id',
    content: userMessageId,
  });

  const result = await streamFetchRenderExecute({
    input: {
      user: session.user as User,
      chatHistory: coreMessages,
      message: userMessage.content as string,
    },
    //onEvent is our own custom callback, implemented in streamFetchRenderExecute,
    //where each message is JSON suitable to be streamed back to the client
    onEvent: (item: any) => {
      streamingData.append(item);
    },
    streamTextOptions: {
      onFinish: async ({ response }) => {
        if (session.user?.id) {
          try {
            const responseMessagesWithoutIncompleteToolCalls =
              sanitizeResponseMessages(response.messages);

            console.log('Chat endpoint onFinish');
            console.log(JSON.stringify(response, null, 4));
            await saveMessages({
              messages: responseMessagesWithoutIncompleteToolCalls.map(
                (message) => {
                  const messageId = generateUUID();

                  if (message.role === 'assistant') {
                    streamingData.appendMessageAnnotation({
                      messageIdFromServer: messageId,
                    });
                  }

                  return {
                    id: messageId,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                    createdAt: new Date(),
                  };
                }
              ),
            });
          } catch (error) {
            console.error('Failed to save chat');
            console.log(error);
          }
        }

        streamingData.close();
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'stream-text',
      },
    },
  });

  return result.toDataStreamResponse({
    data: streamingData,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
```

**This implementation is what we want to keep** - it uses our custom `streamFetchRenderExecute` from the LLM router.

**Changes needed for AI SDK v5 + Canvas mode**:

1. **Update AI SDK v4 → v5 APIs**:

   - `import { type Message, StreamData, convertToCoreMessages }` → v5 equivalents
   - Check v5 migration guide for `convertToCoreMessages` replacement
   - `StreamData` may have changed in v5
   - `toDataStreamResponse` may have changed in v5
   - `appendMessageAnnotation` may have changed in v5

2. **Update auth**:

   - Change from `auth()` to `getAuthUser(request)` (supports CLI JWT)

3. **Add document tools to streamFetchRenderExecute**:

   - Pass `createDocument` and `updateDocument` tools
   - These tools need to write to `streamingData` when creating/updating docs
   - Study how ai-chatbot-main's tools use `dataStream.write()` with custom types like:
     - `type: 'data-kind'` - document kind
     - `type: 'data-id'` - document id
     - `type: 'data-title'` - document title
     - `type: 'data-clear'` - clear state
     - `type: 'data-textDelta'` - streaming text updates
     - `type: 'data-finish'` - done
   - Our `onEvent` callback in `streamFetchRenderExecute` will forward these to `streamingData`

4. **Update message format**:

   - Save messages with `parts` and `attachments` instead of `content`
   - Update `sanitizeResponseMessages` utility for new format

5. **Add chat context tracking**:

   - After `onFinish`, save usage info to chat: `updateChatLastContextById({ chatId: id, context: response.usage })`

6. **Check generateTitleFromUserMessage**:
   - May need to update for new message format (now has `parts` instead of `content`)

**The key point**: We're **not replacing our LLM router approach** - we're just updating it for v5 and adding document tool support. The `streamFetchRenderExecute` function stays, we just need to pass document tools to it.

**Implementation Summary**:

- ✅ Created new `/api/chat` route using AI SDK v5
- ✅ Uses `createUIMessageStream` and `convertToModelMessages` from AI SDK v5
- ✅ Integrates `createDocument` and `updateDocument` tools
- ✅ Uses `getAuthUser()` for unified authentication
- ✅ Saves messages in new `parts` + `attachments` format
- ✅ Added `generateTitleFromUserMessage` server action
- ✅ Added `updateChatLastContextById` database query
- ✅ Added `sanitizeResponseMessages` utility function
- ✅ Simplified implementation (no resumable streams, no tokenlens, no rate limiting)
- ✅ Uses our `routerModel` for automatic model selection

- [x] **6.3 Skip suggestions and vote APIs**

**DO NOT copy**:

- `tmp/ai-chatbot-main/app/(chat)/api/suggestions/route.ts` - Suggestions feature deferred
- `tmp/ai-chatbot-main/app/(chat)/api/vote/route.ts` - Voting feature removed

Vote table cleanup will be handled in a separate task.

### Phase 7: Database Query Functions

- [x] **7.1 Copy/update document queries**

From `tmp/ai-chatbot-main/lib/db/queries.ts`, extract and adapt:

- ✅ `getDocumentsById` - Get document versions by ID - **Already exists and correct**
- ✅ `saveDocument` - Save new document version - **Already updated in Phase 5 with `kind` and `chatId` support**
- ✅ `deleteDocumentsByIdAfterTimestamp` - Delete document versions after timestamp - **Already exists and correct**

Add to `packages/database/src/queries.ts` or create `packages/database/src/documents/queries.ts` - **Already in queries.ts**

Changes needed:

- ✅ Use our database connection
- ✅ Ensure userId scoping for security
- ✅ Match our schema field names

**Status**: All document queries already exist and are correctly implemented. No changes needed.

- [x] **7.2 Copy/update chat queries**

Extract and adapt from ai-chatbot-main:

- ⚠️ `createStreamId` - Create resumable stream entry - **NOT NEEDED** (resumable streams not implemented)
- ✅ `updateChatLastContextById` - Update chat usage tracking - **Already added in Phase 6**
- ⚠️ `getMessageCountByUserId` - For rate limiting (if not already exists) - **NOT NEEDED** (rate limiting not implemented)

Add to `packages/database/src/queries.ts` - **Already exists**

**Status**: `updateChatLastContextById` already exists. Other functions not needed for current implementation.

- [x] **7.3 Update message queries for new format**

The Message table now uses `parts` and `attachments` instead of `content`.

Update these existing functions in `packages/database/src/queries.ts`:

- ✅ `saveMessages` - Update type signature to expect `parts: json` and `attachments: json` fields - **Already correct, uses Message type from schema**
- ✅ `getMessagesByChatId` - No changes needed, just returns new fields automatically - **Correct**
- ✅ `getMessageById` - No changes needed, just returns new fields automatically - **Correct**

The query functions don't need much change, just type signatures since Drizzle will automatically handle the new fields. - **Confirmed, Drizzle handles this automatically**

**Note**: You may need to adapt the `sanitizeResponseMessages` utility function (from old chat implementation) to work with the new message format. - **Already updated in Phase 6**

**Status**: All message queries correctly typed with Message type that includes `parts` and `attachments` fields. No changes needed.

### Phase 8: Integration with Reports Page

- [x] **8.1 Update Reports page to support canvas mode**

File: `apps/web/app/(app)/reports/page.tsx` ✅

Changes:

- ✅ Keep existing table view
- ✅ Ensure documents have the new `kind` field populated - **Updated query to include `kind` and `chatId`**
- ✅ Pass necessary props to ReportsTable
- ✅ Wrapped ReportsTable with `DataStreamProvider` for AI streaming support

**Status**: Complete. Reports page updated to fetch `kind` and `chatId` fields, wrapped with DataStreamProvider.

- [x] **8.2 Update ReportsTable component**

File: `apps/web/app/(app)/reports/reports-table.tsx` ✅

Add:

- ✅ "Edit" or "Open in Canvas" button for each document - **Added IconEdit button**
- ✅ Click handler to open canvas mode - **`handleEditClick` opens DocumentCanvas**
- ✅ State management for selected document - **`canvasDocumentId` state + conditional render**

**Status**: Complete. ReportsTable now has Edit button, canvas mode state, and DocumentCanvas integration.

- [x] **8.3 Create canvas mode entry point**

Create new component: `apps/web/components/reports/document-canvas.tsx` ✅

This component:

- ✅ Wraps the Artifact component
- ✅ Manages chat state for the document - **Loads chatId from document, creates if missing**
- ✅ Creates/loads chat associated with document - **Auto-creates chat on first load if needed**
- ✅ Handles opening/closing canvas mode - **Full-screen overlay with close handler**
- ✅ Manages document-to-chat relationship - **Links document to chat via chatId field**

**Status**: Complete. DocumentCanvas component created and fully functional.

- [x] **8.4 Add document creation flow**

Update Reports page to include: ✅

- ✅ "New Document" button/dialog - **`CreateDocumentDialog` component**
- ✅ Initial title input - **Dialog with title input field**
- ✅ Creates document + associated chat (with kind='text') - **Creates both document and chat**
- ✅ Opens canvas mode immediately - **`onDocumentCreated` callback opens canvas**

**Status**: Complete. Created `CreateDocumentDialog` component integrated into ReportsTable toolbar.

**Note**: Only text documents for now, no type selector needed. ✅ **Confirmed - only kind='text' supported**

### Phase 9: Link Documents to Chats

**Note**: The `chatId` field was already added to Document table in Phase 1.

- [x] **9.1 Update document creation logic**

When creating document:

- Create associated Chat record
- Set document.chatId
- Set chat.title to document.title
- Ensure both created in transaction

- [x] **9.2 Update document loading logic**

When loading document for editing:

- Load associated chat by chatId
- Load chat messages
- Pass to canvas component

### Phase 10: UI/UX Adjustments

- [x] **10.1 Remove file upload UI**

From `multimodal-input.tsx`:

- Remove file attachment button
- Remove attachment preview components
- Remove file upload handlers

- [x] **10.2 Remove model selector UI**

From chat components:

- Remove model selection dropdown
- Model selection handled by `lib/ai/llm-router.ts` based on user's subscription

- [x] **10.3 Adapt visibility selector (if needed)**

Tasks:

- Determine if documents should have public/private visibility
- If not, remove visibility selector from canvas UI

- [x] **10.4 Update styling to match BragDoc design**

Tasks:

- Update Tailwind classes to match our design system
- Ensure colors match our theme
- Update spacing/layout to fit within Reports page context

### Phase 11: Error Handling and Edge Cases

- [ ] **11.1 Add error boundaries**

Tasks:

- Wrap Artifact component in error boundary
- Handle streaming errors gracefully
- Show user-friendly error messages

- [ ] **11.2 Handle missing/deleted documents**

Tasks:

- Check document exists before opening canvas
- Handle case where chat is deleted but document exists
- Handle orphaned chats

- [ ] **11.3 Handle concurrent editing**

Tasks:

- Test multiple users editing same document (future feature)
- Add optimistic updates
- Handle conflicts gracefully

- [ ] **11.4 Add loading states**

Tasks:

- Document loading skeleton
- Chat message loading states
- Tool execution loading indicators

### Phase 12: Testing

- [ ] **12.1 Test document CRUD operations**

Tests:

- Create new document with canvas
- Edit document content
- Save document versions
- Delete document versions
- Load document history

- [ ] **12.2 Test chat functionality in canvas**

Tests:

- Send messages in canvas sidebar
- Receive AI responses
- Tool calls trigger document updates
- Message history persists

- [ ] **12.3 Test document tools**

Tests:

- Create document via chat tool
- Update document via chat tool
- Verify tools create proper document records

**Note**: NOT testing "Request suggestions tool" - that feature was removed.

- [ ] **12.4 Test auth and security**

Tests:

- Verify userId scoping on all queries
- Test CLI JWT auth works with new endpoints
- Verify users can't access others' documents
- Test permission checks

- [ ] **12.5 Test edge cases**

Tests:

- Empty documents
- Very long documents
- Rapid typing/editing
- Network failures during save
- Interrupted tool execution

### Phase 13: Documentation

- [ ] **13.1 Update CLAUDE.md**

Add/update these specific sections:

**In "Component Patterns" section**:

- Add subsection: "Canvas Mode Components"
- Document artifact.tsx, data-stream-provider, and key canvas components
- Explain client/server component split in canvas

**In "AI/LLM Integration" section**:

- Add subsection: "Document Tools Integration"
- Document createDocument and updateDocument tools
- Explain how tools stream data back to canvas via StreamData
- Document the `onEvent` callback pattern in streamFetchRenderExecute

**In "API Conventions" section**:

- Document `/api/chat` endpoint (updated for canvas mode)
- Document `/api/documents/[id]/artifact` endpoint
- Note message format (parts + attachments)

**New section: "Canvas Mode Architecture"**:

- Overview of canvas mode feature
- Document-chat relationship (1:1 via chatId foreign key)
- Artifact system (pluggable document types)
- State management (SWR via use-artifact hook)
- Data streaming architecture

**In "Database Layer" section**:

- Update Message table documentation (parts + attachments format)
- Document Stream table (if kept)
- Document new Document fields (kind, chatId)
- Document new Chat field (lastContext)

- [ ] **13.2 Create feature documentation**

Create `features/canvas-mode/requirements.md`:

- Feature overview
- User flows
- Technical architecture
- API endpoints
- Component hierarchy

- [ ] **13.3 Add inline code documentation**

Tasks:

- Document artifact hooks
- Document tool implementations
- Document complex state management

### Phase 14: Cleanup and Optimization

- [ ] **14.1 Remove unused imports**

Tasks:

- Clean up copied files
- Remove unused utility functions
- Remove commented code

- [ ] **14.2 Optimize bundle size**

Tasks:

- Check for duplicate dependencies
- Lazy load artifact implementations
- Code split by artifact type

- [ ] **14.3 Performance optimization**

Tasks:

- Implement debouncing for auto-save
- Optimize re-renders in canvas
- Add memoization where needed

- [ ] **14.4 Run linters**

Tasks:

- Fix Biome issues
- Fix ESLint issues
- Ensure consistent formatting

## File Mapping Reference

### Components to Copy

```
tmp/ai-chatbot-main/components/ → apps/web/components/

Core Canvas:
- artifact.tsx
- artifact-actions.tsx
- artifact-close-button.tsx
- artifact-messages.tsx
- create-artifact.tsx

Document Display:
- document.tsx
- document-preview.tsx
- document-skeleton.tsx

Editors:
- text-editor.tsx
- diffview.tsx
- toolbar.tsx

Chat/Messages:
- messages.tsx
- message.tsx
- message-actions.tsx
- message-editor.tsx
- message-reasoning.tsx
- multimodal-input.tsx

Support:
- version-footer.tsx
- data-stream-handler.tsx
- data-stream-provider.tsx
```

### Hooks to Copy

```
tmp/ai-chatbot-main/hooks/ → apps/web/hooks/

- use-artifact.ts
- use-auto-resume.ts
- use-scroll-to-bottom.ts (currently in components/)
```

### Artifacts to Copy

```
tmp/ai-chatbot-main/artifacts/ → apps/web/artifacts/

- text/client.tsx
- text/server.ts
- actions.ts
```

**Note**: Only implementing text artifact initially.

### Library Code to Copy

```
tmp/ai-chatbot-main/lib/ → apps/web/lib/

AI Tools:
- ai/tools/create-document.ts
- ai/tools/update-document.ts

Artifacts:
- artifacts/server.ts (create new)

Editor:
- editor/* (if needed)
```

### API Routes to Copy/Adapt

```
tmp/ai-chatbot-main/app/(chat)/api/ → apps/web/app/api/

- document/route.ts → documents/[id]/artifact/route.ts (copy and adapt)
- chat/route.ts → chat/route.ts (ADAPT our existing implementation, don't copy)
```

**NOT copying**:

- suggestions/route.ts - Feature deferred
- vote/route.ts - Feature removed
- chat/[id]/stream/route.ts - May not be needed with our approach

## Dependencies to Verify

Ensure these packages are installed in apps/web:

- `@ai-sdk/react` - ✅ Already installed (v5)
- `ai` - ✅ Already installed (v5)
- `framer-motion` - Check if installed, add if needed (for canvas animations)
- `fast-deep-equal` - Check if installed, add if needed (for memoization)
- `date-fns` - Check if installed, add if needed (for timestamp formatting)
- `usehooks-ts` - Check if installed, add if needed (for debounce, window size hooks)
- `sonner` - ✅ Already used for toast notifications
- `@tiptap/react` and related - Check if installed, add if needed (for rich text editor)
- `@tiptap/starter-kit` - Text editor extensions
- `@tiptap/extension-placeholder` - Text editor placeholder

**Not needed initially** (for future artifact types):

- `resumable-stream` - For stream resumption (optional optimization)
- `tokenlens` - For token usage tracking (optional)
- Code execution libraries (for code artifact)

## Security Considerations

1. **Authorization**: All API routes must use `getAuthUser()` to verify user identity
2. **Data scoping**: All queries must filter by userId
3. **Input validation**: Use Zod schemas for all API inputs
4. **XSS prevention**: Sanitize user-generated content in documents
5. **Rate limiting**: Consider adding rate limits for document creation/updates
6. **CORS**: Ensure document endpoints support CLI JWT auth

## Success Criteria

The implementation is complete when:

- User can create new document from Reports page
- User can open existing document in canvas mode
- Canvas displays document on right, chat on left (desktop)
- User can chat with AI about document
- AI can create/update document via tools
- Document auto-saves on edit
- Document version history works
- User can view/restore old versions
- All actions scoped to user (security)
- Canvas works on mobile (full screen)
- CLI JWT auth works with new endpoints
- No regressions in existing Reports functionality

## Risks and Mitigations

### Risk: Message format migration breaks existing data

**Mitigation**:

- Existing messages can be truncated (acceptable per user)
- Message table is currently unused after removing old chat UI
- Fresh start with new format ensures compatibility with canvas mode

### Risk: Artifact system complexity

**Mitigation**:

- Start with text artifact only
- Add other types incrementally
- Document artifact contract clearly

### Risk: Performance issues with large documents

**Mitigation**:

- Implement pagination for version history
- Debounce auto-save
- Add loading states
- Optimize re-renders

### Risk: Conflicts between canvas and existing document APIs

**Mitigation**:

- Use separate route namespace (`/artifact`)
- Keep existing `/documents` API unchanged initially
- Test both flows independently

## Decisions Made

1. **Message format**: ✅ Migrating to new `parts` + `attachments` format. Existing messages can be truncated.

2. **Visibility**: ✅ Start with all documents private, add sharing later if needed

3. **File uploads**: ✅ Deferred to future phase

4. **Model selection**: ✅ Automatic via LLM router, no user override

5. **Document types**: ✅ Start with TEXT artifact only (code/sheet/image deferred)

## Notes

- This implementation brings in the "canvas mode" from ai-chatbot-main, which is the side-by-side document + chat interface
- We are NOT implementing the full chatbot experience - only the document editing canvas
- The canvas is triggered from Reports page, not from chat messages
- Model selection is automatic via our LLM router, not user-selectable
- File uploads are deferred to a future phase
- **We start with TEXT artifact only** - perfect for performance reviews, manager updates, and achievement documentation
- Code, sheet, and image artifacts can be added in future phases if needed
- **Voting removed** - No thumbs up/down on messages
- **Suggestions deferred** - No inline editing suggestions (can add later if needed)
- **Using our existing LLM router pattern** - Adapting chat API to use `streamFetchRenderExecute` instead of copying ai-chatbot-main's implementation
