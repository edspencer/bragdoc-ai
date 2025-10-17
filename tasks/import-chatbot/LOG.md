# Import Canvas-Mode Document Editor - Implementation Log

## Phase 1: Database Schema Updates (COMPLETED)

### Decisions Made:
- ✅ Message table migrated to new format with `parts` and `attachments`
- ✅ Document table updated with `kind` field (enum: text, code, image, sheet)
- ✅ Document table updated with `chatId` field for linking to chats
- ✅ Chat table updated with `lastContext` field for usage tracking
- ✅ Stream table added for resumable streams
- ✅ AppUsage type definition added

### Database Migrations:
- ✅ Migration generated: `0012_nifty_charles_xavier.sql`
- ✅ Migration applied successfully

---

## Phase 2: Copy Artifact System Foundation (COMPLETED)

### Summary:
Successfully copied and adapted the artifact system foundation for text artifacts only.

### Key Observations:
1. The ai-chatbot-main uses a plugin-based artifact system where each artifact type (text, code, sheet, image) is registered in a handler registry
2. The `createDocumentHandler` function provides a standard interface for artifact types
3. Text artifact uses ProseMirror-based rich text editor
4. Suggestions feature was integrated but removed per plan

### Files Created:
- ✅ `apps/web/lib/artifacts/actions.ts` - Simplified placeholder (no suggestions)
- ✅ `apps/web/lib/artifacts/server.ts` - Document handler registry and factory (text only)
- ✅ `apps/web/lib/types.ts` - Type definitions for ChatMessage, CustomUIDataTypes, etc.
- ✅ `apps/web/lib/ai/prompts.ts` - Updated with `updateDocumentPrompt` function
- ✅ `apps/web/artifacts/text/client.tsx` - Text artifact client (without suggestions)
- ✅ `apps/web/artifacts/text/server.ts` - Text artifact server handler (using our LLM router)
- ✅ `apps/web/components/icons.tsx` - Added ClockRewind icon

### Decisions Made:
1. Removed all suggestions-related code from text artifact
2. Used our existing `documentWritingModel` from `lib/ai/index.ts` instead of a provider
3. Simplified actions - removed "Request Suggestions" toolbar button
4. Left metadata empty in text artifact (no suggestions to track)

---

## Issues & Resolutions:
(None yet)

---

## Deviations from Plan:
(None yet)

---

## Phase 3: Copy Core UI Components (COMPLETED)

### Summary:
Successfully copied and adapted all UI components for canvas mode - artifact display, documents, editors, messages, and supporting components. All voting functionality removed as planned.

### Files Created:

**Task 3.1: Artifact Display Components (COMPLETED)**
- ✅ `apps/web/hooks/use-artifact.ts` - Artifact state management via SWR
- ✅ `apps/web/components/create-artifact.tsx` - Artifact class definition
- ✅ `apps/web/components/artifact-close-button.tsx` - Close button component
- ✅ `apps/web/components/artifact-actions.tsx` - Action buttons for artifact toolbar
- ✅ `apps/web/components/artifact-messages.tsx` - Messages display in canvas sidebar
- ✅ `apps/web/components/artifact.tsx` - Main canvas container (only text artifact)
- ✅ `apps/web/hooks/use-scroll-to-bottom.tsx` - Auto-scroll hook for messages
- ✅ `apps/web/hooks/use-messages.tsx` - Message state hook

**Task 3.2: Document Components (COMPLETED)**
- ✅ `apps/web/components/document-skeleton.tsx` - Loading skeletons
- ✅ `apps/web/components/document.tsx` - Document tool result/call display
- ✅ `apps/web/components/document-preview.tsx` - Inline document preview

**Task 3.3: Editor Components (COMPLETED)**
- ✅ `apps/web/lib/editor/config.ts` - ProseMirror schema and transaction handling
- ✅ `apps/web/lib/editor/functions.tsx` - Document/content conversion (no suggestions)
- ✅ `apps/web/lib/editor/diff.js` - Diff algorithm for version comparison
- ✅ `apps/web/lib/editor/react-renderer.tsx` - React component renderer
- ✅ `apps/web/components/text-editor.tsx` - ProseMirror text editor (no suggestions)
- ✅ `apps/web/components/toolbar.tsx` - Floating toolbar for artifacts
- ✅ `apps/web/components/diffview.tsx` - Diff view for version comparison

### Decisions Made:
1. Removed all voting functionality from message components (no Vote type)
2. Removed visibility selector and model selector props (not needed for our use case)
3. Only imported text artifact (code/sheet/image deferred to future)
4. Simplified document-preview to only support text artifact
5. Updated all imports to use our `@/` aliases and `@bragdoc/database`

**Task 3.4: Message/Chat Components (COMPLETED)**
- ✅ `apps/web/components/elements/message.tsx` - Message element component
- ✅ `apps/web/components/elements/response.tsx` - Response rendering
- ✅ `apps/web/components/elements/tool.tsx` - Tool result display
- ✅ `apps/web/components/elements/reasoning.tsx` - Reasoning display
- ✅ `apps/web/components/elements/actions.tsx` - Action buttons
- ✅ `apps/web/components/message.tsx` - PreviewMessage and ThinkingMessage (no voting)
- ✅ `apps/web/components/message-actions.tsx` - Message actions (voting removed)
- ✅ `apps/web/components/message-editor.tsx` - Message editing
- ✅ `apps/web/components/message-reasoning.tsx` - Reasoning display wrapper
- ✅ `apps/web/components/multimodal-input.tsx` - Chat input component
- ✅ `apps/web/components/preview-attachment.tsx` - Attachment preview
- ✅ `apps/web/components/weather.tsx` - Weather tool result

**Task 3.5: Supporting Components (COMPLETED)**
- ✅ `apps/web/components/version-footer.tsx` - Version navigation footer
- ✅ `apps/web/components/data-stream-handler.tsx` - AI streaming data handler
- ✅ `apps/web/components/data-stream-provider.tsx` - AI streaming context provider

### Dependencies Identified:
- `prosemirror-*` packages (model, state, view, inputrules, schema-basic, schema-list, markdown, example-setup)
- `framer-motion` - Already installed ✓
- `fast-deep-equal` - Need to check
- `date-fns` - Need to check
- `usehooks-ts` - Need to check
- `diff-match-patch` - For diffview
- `classnames` (cx) - Need to check
- `streamdown` - For markdown rendering

---

## Phase 4: Copy Hooks and State Management (COMPLETED)

### Summary:
Successfully verified and completed hook setup for canvas mode. Most hooks were already copied during Phase 3, only needed to add `use-auto-resume.ts`.

### Files Created/Verified:
- ✅ `apps/web/hooks/use-artifact.ts` - Already copied in Phase 3
- ✅ `apps/web/hooks/use-auto-resume.ts` - **NEW** - Stream resumption hook
- ✅ `apps/web/hooks/use-scroll-to-bottom.tsx` - Already copied in Phase 3
- ✅ `apps/web/hooks/use-messages.tsx` - Already copied in Phase 3
- ✅ `apps/web/hooks/use-mobile.tsx` - Already exists (shadcn hook)
- ✅ `apps/web/components/data-stream-provider.tsx` - Already copied in Phase 3
- ✅ `apps/web/components/data-stream-handler.tsx` - Already copied in Phase 3

### Key Observations:
1. Most hooks were already copied during Phase 3 as they were needed by the components
2. `use-auto-resume.ts` is used by the artifact component to automatically reconnect interrupted AI streams
3. Data stream provider was already set up in Phase 3 with proper context and types
4. `use-chat-visibility.ts` was NOT copied as visibility selector is not needed for our use case

### Decisions Made:
1. Did NOT copy `use-chat-visibility.ts` - visibility management not needed (all documents private)
2. Used existing `use-mobile.tsx` hook instead of copying the one from ai-chatbot-main (functionally identical)
3. Verified all hook imports in canvas components are satisfied

---

## Phase 5: Copy AI Tools and LLM Integration (COMPLETED)

### Summary:
Successfully copied and adapted AI document tools for canvas mode. Updated artifact handlers and database queries to support the new `kind` field for artifact types.

### Files Created:
- ✅ `apps/web/lib/ai/tools/create-document.ts` - Tool for creating documents via AI
- ✅ `apps/web/lib/ai/tools/update-document.ts` - Tool for updating documents via AI

### Files Modified:
- ✅ `apps/web/lib/artifacts/server.ts` - Changed to use `User` from `@bragdoc/database` instead of `next-auth`
- ✅ `packages/database/src/queries.ts` - Updated `saveDocument` to accept `kind` and `chatId` parameters

### Editor Utilities:
- ✅ Already copied in Phase 3:
  - `apps/web/lib/editor/config.ts` - ProseMirror schema configuration
  - `apps/web/lib/editor/functions.tsx` - Document conversion utilities
  - `apps/web/lib/editor/diff.js` - Diff algorithm
  - `apps/web/lib/editor/react-renderer.tsx` - React renderer

### Key Observations:
1. Document tools use `UIMessageStreamWriter` to stream data back to the client
2. Tools write special data types to stream: `data-kind`, `data-id`, `data-title`, `data-clear`, `data-textDelta`, `data-finish`
3. Document handlers are retrieved from registry based on artifact `kind`
4. Our database has both `kind` (artifact type) and `type` (document type) fields

### Decisions Made:
1. Changed tool parameters from `session: Session` to `user: User` to match our auth system
2. Made `kind` parameter optional in `saveDocument` with default of 'text'
3. Added `chatId` parameter to `saveDocument` for linking documents to chats
4. Kept existing `llm-router.ts` document tool implementations unchanged (they'll still work with optional `kind`)
5. Did NOT copy `request-suggestions.ts` - suggestions feature deferred

### Integration Notes:
- These tools will be integrated with our LLM router in Phase 6
- The tools are compatible with our existing `streamFetchRenderExecute` pattern
- Data streaming uses AI SDK v5's `UIMessageStreamWriter` type

---

## Phase 6: Copy and Adapt API Routes (COMPLETED)

### Summary:
Successfully created API routes for canvas mode with AI SDK v5 integration. Created document artifact endpoint and chat API route with document tool support.

### Files Created:
- ✅ `apps/web/app/api/documents/[id]/artifact/route.ts` - Document artifact API (GET, POST, DELETE)
- ✅ `apps/web/app/api/chat/route.ts` - Chat API with AI SDK v5 and document tools (POST, DELETE)
- ✅ `apps/web/app/(app)/chat/actions.ts` - Server action for generating chat titles
- ✅ `apps/web/lib/utils.ts` - Added `sanitizeResponseMessages` and `sanitizeText` utilities

### Files Modified:
- ✅ `packages/database/src/queries.ts` - Added `updateChatLastContextById` function
- ✅ `packages/database/src/index.ts` - Exported `updateChatLastContextById`

### Key Features:
1. **Document Artifact API** (`/api/documents/[id]/artifact`):
   - GET: Retrieve document versions by ID
   - POST: Save new document version with kind and content
   - DELETE: Delete document versions after timestamp
   - Uses `getAuthUser()` for unified auth (session + JWT)
   - Full userId scoping for security

2. **Chat API** (`/api/chat`):
   - POST: Stream chat responses with document tool integration
   - DELETE: Delete chat by ID
   - Uses AI SDK v5's `createUIMessageStream` and `convertToModelMessages`
   - Integrates `createDocument` and `updateDocument` tools
   - Saves messages in new `parts` + `attachments` format
   - Tracks chat usage with `updateChatLastContextById`

### Key Observations:
1. Used simplified error handling with standard Response objects (no ChatSDKError class)
2. Chat API uses `createUIMessageStream` from AI SDK v5 for proper streaming
3. Document tools are passed to `streamText` and integrated seamlessly
4. Message format conversion: old `content` field → new `parts` array
5. Chat title generation uses AI to create concise titles from first message

### Decisions Made:
1. **Did NOT use resumable streams** - Optional feature, not needed for initial implementation
2. **Did NOT use tokenlens** - Token tracking can be added later if needed
3. **Simplified from ai-chatbot-main's implementation** - Removed rate limiting, model selection, visibility (not needed for our use case)
4. **Used our `routerModel`** - Automatic model selection via LLM router
5. **Skipped suggestions and vote APIs** - Features removed/deferred per plan

### Integration Notes:
- Chat API is ready for canvas mode integration
- Document tools stream properly via `dataStream.write()`
- Message saving uses new schema format (parts/attachments)
- Ready for Phase 7 (database query functions) and Phase 8 (Reports integration)

---

## Phase 7: Database Query Functions (COMPLETED)

### Summary:
Verified that all database query functions are correctly implemented and typed for the new schema. No changes needed - all functions were already updated in previous phases.

### Verification Results:

**Task 7.1: Document Queries** ✅
- `getDocumentsById` - ✅ Correctly returns all document versions by ID
- `saveDocument` - ✅ Already supports `kind` and `chatId` parameters (updated in Phase 5)
- `deleteDocumentsByIdAfterTimestamp` - ✅ Correctly deletes document versions after timestamp
- All queries properly scope by userId for security

**Task 7.2: Chat Queries** ✅
- `updateChatLastContextById` - ✅ Already exists (added in Phase 6)
- `createStreamId` - ⚠️ NOT NEEDED (resumable streams not implemented)
- `getMessageCountByUserId` - ⚠️ NOT NEEDED (rate limiting not implemented)

**Task 7.3: Message Queries** ✅
- `saveMessages` - ✅ Correctly typed with `Message` type containing `parts` and `attachments`
- `getMessagesByChatId` - ✅ Returns all fields including new `parts` and `attachments`
- `getMessageById` - ✅ Returns all fields including new `parts` and `attachments`

### Key Observations:
1. Message type (`InferSelectModel<typeof message>`) automatically includes `parts` and `attachments` from schema
2. Drizzle ORM handles field mapping automatically, no manual changes needed to query functions
3. `saveDocument` was already updated in Phase 5 to support `kind` and `chatId` parameters
4. `updateChatLastContextById` was added in Phase 6 for usage tracking

### Decisions Made:
1. **Did NOT add `createStreamId`** - Resumable streams feature not implemented in Phase 6
2. **Did NOT add `getMessageCountByUserId`** - Rate limiting not implemented in Phase 6
3. **No query function changes needed** - Type system automatically handles new schema fields

### Files Verified:
- ✅ `packages/database/src/queries.ts` - All query functions correct
- ✅ `packages/database/src/schema.ts` - Message type has `parts` and `attachments` fields
- ✅ `packages/database/src/index.ts` - All functions properly exported

---

## Phase 8: Integration with Reports Page (COMPLETED)

### Summary:
Successfully integrated canvas mode into the Reports page. Users can now create documents and open them in canvas mode for AI-assisted editing with side-by-side chat and document view.

### Files Created:

**Task 8.1: Canvas Mode Entry Point** ✅
- ✅ `apps/web/components/reports/document-canvas.tsx` - Canvas mode wrapper component
  - Manages canvas state (open/close)
  - Loads document and associated chat
  - Creates chat if document doesn't have one
  - Passes artifact data to Artifact component
  - Shows loading state while initializing

**Task 8.2: Document Creation Flow** ✅
- ✅ `apps/web/components/reports/create-document-dialog.tsx` - Document creation dialog
  - Dialog for creating new documents
  - Creates document with kind='text'
  - Creates associated chat
  - Opens document in canvas mode immediately
  - Integrates with Reports page toolbar

### Files Modified:

**Task 8.3: Reports Page** ✅
- ✅ `apps/web/app/(app)/reports/page.tsx`
  - Updated document query to include `kind` and `chatId` fields
  - Wrapped ReportsTable with `DataStreamProvider` for AI streaming support
  - Passes document metadata to table component

**Task 8.4: ReportsTable Component** ✅
- ✅ `apps/web/app/(app)/reports/reports-table.tsx`
  - Added "Edit" button (IconEdit) to each document row
  - Added canvas mode state (`canvasDocumentId`)
  - Integrated `DocumentCanvas` component for canvas mode
  - Integrated `CreateDocumentDialog` for new document creation
  - Added handlers for opening/closing canvas mode
  - Refreshes documents when canvas closes to show updates

### Key Features:
1. **Canvas Mode Integration**:
   - Click "Edit" button on any document to open in canvas mode
   - Full-screen canvas with side-by-side document editor and chat
   - Close button returns to Reports table
   - Auto-refreshes documents after closing canvas

2. **Document Creation**:
   - "New Document" button opens creation dialog
   - User enters document title
   - System creates:
     - New document with kind='text'
     - Associated chat for AI assistance
     - Initial user message to start conversation
   - Document opens in canvas mode immediately

3. **Document-Chat Relationship**:
   - Each document linked to chat via `chatId` foreign key
   - Chat created automatically if document doesn't have one
   - Messages preserved across canvas sessions
   - Chat history persists with document

### Key Observations:
1. DataStreamProvider required at page level for AI streaming in canvas mode
2. Document loading checks for existing chatId, creates chat if missing
3. Canvas mode is full-screen overlay (z-50) with fixed positioning
4. Router refresh after canvas close ensures table shows updated documents
5. Existing Weekly/Monthly/Custom report buttons preserved alongside new canvas flow

### Decisions Made:
1. **Canvas mode as overlay** - Full-screen fixed div instead of route navigation
2. **Automatic chat creation** - Creates chat on first edit if not exists
3. **Immediate canvas open** - New documents open in canvas mode after creation
4. **Preserved existing flows** - Keep Weekly/Monthly/Custom report creation alongside canvas mode
5. **Text artifacts only** - Only kind='text' supported initially (code/sheet/image deferred)

### Integration Complete:
- ✅ Reports page fully supports canvas mode
- ✅ Document creation creates canvas-ready documents
- ✅ Edit button opens existing documents in canvas mode
- ✅ Canvas mode has full AI chat + document editing capabilities
- ✅ DataStreamProvider enables AI tool streaming
- ✅ Document versions tracked via artifact API

---

## Phase 9: Link Documents to Chats (COMPLETED)

### Summary:
Successfully implemented atomic document-chat creation using database transactions and updated document loading to properly handle chat relationships.

### Files Created:

**Task 9.1: Document Creation with Transaction** ✅
- ✅ `apps/web/app/(app)/reports/actions.ts` - Server actions for atomic document+chat operations
  - `createDocumentWithChat()` - Creates document + chat + initial message in single transaction
  - `linkDocumentToChat()` - Links existing document to chat (for backwards compatibility)
  - Uses database transactions to ensure atomicity
  - Generates proper chat title from initial message
  - Revalidates reports page after creation

### Files Modified:

**Task 9.1: Update Document Creation** ✅
- ✅ `apps/web/components/reports/create-document-dialog.tsx`
  - Updated to use `createDocumentWithChat` server action
  - Removed multiple API calls in favor of single atomic operation
  - Simplified error handling with transaction-based approach
  - No more orphaned chats if document creation fails

**Task 9.2: Update Document Loading** ✅
- ✅ `apps/web/components/reports/document-canvas.tsx`
  - Enhanced chat loading logic with proper error handling
  - Added backwards compatibility for documents without chatId
  - Creates chat atomically if missing (for old documents)
  - Generates proper chat title using server action
  - Shows error toast and closes canvas on failure
  - Links document to chat after chat creation

### Key Features:

1. **Atomic Document Creation**:
   - Single transaction creates: chat → initial message → document
   - If any operation fails, entire transaction rolls back
   - No orphaned chats or documents
   - Consistent database state guaranteed

2. **Chat-Document Relationship**:
   - Every new document has a chatId from creation
   - Document.chatId foreign key references Chat.id
   - Chat title generated from initial user message
   - Initial message preserved in chat history

3. **Backwards Compatibility**:
   - DocumentCanvas handles old documents without chatId
   - Creates chat on-demand if missing
   - Links document to chat after creation
   - Maintains functionality for pre-Phase 9 documents

4. **Error Handling**:
   - Transaction rollback on any failure
   - User-friendly error messages
   - Graceful canvas close on load errors
   - Proper error logging for debugging

### Key Observations:

1. Database transactions ensure atomic operations (all-or-nothing)
2. Server actions provide better error handling than API routes for this use case
3. Chat title generation uses AI to create concise, relevant titles
4. Initial message sets context for AI assistance
5. Foreign key relationship maintains referential integrity

### Decisions Made:

1. **Use server actions instead of API routes** - Better for multi-step operations with transactions
2. **Create initial message in transaction** - Ensures chat always has context
3. **Generate chat title from message** - More relevant than using document title directly
4. **Maintain backwards compatibility** - Handle old documents without chatId gracefully
5. **Revalidate path after creation** - Ensures UI shows new document immediately

### Integration Complete:

- ✅ Document creation is now atomic (transaction-based)
- ✅ Chat and document always created together
- ✅ Chat title generated from initial user message
- ✅ Initial message provides context for AI
- ✅ Document loading handles missing chatId gracefully
- ✅ Error handling improved across the flow
- ✅ Backwards compatibility maintained for old documents

### Testing Notes:

- ✅ CLI tests passed (6/6 test suites, 54/55 tests)
- ⚠️ Web tests failed (7 test suites, 58/67 tests passed)
- Test failures are due to test database not having Phase 1 schema migrations applied
- Failing tests are for old `/api/documents` endpoints (not new canvas mode)
- Test database expects `kind` column added in Phase 1 but test DB not migrated
- Canvas mode functionality is separate from failing tests
- **Action Required**: Test database needs schema migration before running full test suite

---

## Phase 10: UI/UX Adjustments (PARTIALLY COMPLETED)

### Summary:
Successfully removed file upload UI, model selector UI, and visibility selector from canvas mode. Simplified multimodal input to focus on text-based document editing with automatic model selection via LLM router.

### Files Modified:

**Task 10.1: Remove File Upload UI** ✅
- ✅ `apps/web/components/multimodal-input.tsx`
  - Removed file input element and file input ref
  - Removed upload queue state
  - Removed `uploadFile` and `handleFileChange` functions
  - Removed `AttachmentsButton` component
  - Removed attachment preview rendering
  - Removed attachment-related props from component signature
  - Updated `submitForm` to only send text messages (no attachments)

**Task 10.2: Remove Model Selector UI** ✅
- ✅ `apps/web/components/multimodal-input.tsx`
  - Removed `ModelSelectorCompact` component
  - Removed model-related props (selectedModelId, onModelChange)
  - Removed model selection dropdown from toolbar
  - Added comment: "Model selection handled automatically by LLM router"
  - Removed related imports (saveChatModelAsCookie, chatModels, myProvider, SelectItem, Trigger, PromptInputModelSelect, etc.)

**Task 10.3: Remove Visibility Selector** ✅
- ✅ `apps/web/components/multimodal-input.tsx`
  - Removed `selectedVisibilityType` prop
  - Removed `VisibilityType` import
  - Removed `SuggestedActions` component (file doesn't exist in our codebase)
  - Simplified component signature

- ✅ `apps/web/components/artifact.tsx`
  - Removed `attachments` and `setAttachments` props from PureArtifact
  - Removed `Attachment` type import
  - Removed attachment-related props from MultimodalInput call
  - Removed `selectedVisibilityType` prop from MultimodalInput call
  - All documents are private by default (no visibility controls needed)

### Key Features:

1. **Simplified Input**:
   - Text-only input (no file uploads)
   - No attachment previews or upload queues
   - Cleaner, simpler UI focused on document editing
   - Removed 200+ lines of attachment-related code

2. **Automatic Model Selection**:
   - No user-facing model selector
   - Model selection handled by LLM router based on user subscription
   - Consistent model usage across all canvas interactions
   - Removed 80+ lines of model selector code

3. **Private Documents**:
   - No visibility selector (all documents private)
   - Removed suggested actions (not relevant for document editing)
   - Simplified component props and state
   - Cleaner component architecture

### Key Observations:

1. File upload feature removed completely - not needed for document editing use case
2. Model selection automated - aligns with existing LLM router pattern
3. Visibility selector removed - all documents are private in current implementation
4. SuggestedActions component was never copied from ai-chatbot-main
5. Removed ~300 lines of code from multimodal-input.tsx
6. Simplified component interfaces throughout

### Decisions Made:

1. **No file upload** - Document editing doesn't require file attachments
2. **Automatic model selection** - Keeps UX simple, consistent with existing app patterns
3. **All documents private** - No sharing/visibility controls needed initially
4. **No suggested actions** - Not relevant for document editing workflow
5. **Task 10.4 deferred** - Styling adjustments can be done in a separate phase after testing

### Testing Notes:

- ✅ All 67 web tests pass
- ✅ CLI tests pass (6/6 suites, 54/55 tests)
- ✅ No regressions detected
- Component imports and types properly updated
- Removed unused imports and cleaned up code

### Integration Complete:

- ✅ File upload UI completely removed
- ✅ Model selector UI completely removed
- ✅ Visibility selector removed (all docs private)
- ✅ Multimodal input simplified for document editing
- ✅ Artifact component updated accordingly
- ✅ All tests passing

### Task 10.4 Status:

**NOT COMPLETED** - Styling adjustments deferred:
- Current styling already matches BragDoc design system
- Using existing Tailwind theme and color scheme
- Canvas mode styling inherited from ai-chatbot-main
- Can be refined in future iterations based on user feedback

---

## Updated Guidance from User:
- User confirmed Phase 1 is complete
- User confirmed Phase 2 is complete
- User confirmed Phase 3 is complete
- User confirmed Phase 4 is complete
- User confirmed Phase 5 is complete
- User confirmed Phase 6 is complete
- User confirmed Phase 7 is complete
- User confirmed Phase 8 is complete
- User confirmed Phase 9 is complete
- Just completed Phase 10 (tasks 10.1-10.3, deferred 10.4)
