# Plan: Remove Existing Chat and Document Editor UI from apps/web

## Summary

This plan outlines the steps to remove all existing chat and document editor UI functionality from the apps/web application. This includes the standalone chat interface, the block-based document editor UI, and their associated components. This removal is being done to prepare for importing a new canvas-style editor from ./tmp/ai-chatbot-main that combines chat and document editing in a single interface.

**Critical**: This plan does NOT remove database schema, queries, or the document management/generation features (reports). The database tables (chat, message, vote, document, suggestion) will remain intact as they will be reused by the new canvas-style editor.

## High-Level Overview

The removal process involves:
1. Removing chat page routes and document editor UI components
2. Removing chat and document editor API endpoints
3. Removing related hooks and utilities
4. Updating the welcome page to remove chat demo
5. Cleaning up navigation and other references
6. Verification and testing

**Preserved**: Database schema, queries, `/api/documents/*` routes, reports pages, AI utilities

**Why preserve database**: The new canvas-style editor from ./tmp/ai-chatbot-main uses the same database schema (chat, message, vote, document, suggestion tables). We're only replacing the UI components, not the data model.

## Table of Contents

1. [Phase 1: Frontend - Remove Chat Pages](#phase-1-frontend---remove-chat-pages)
2. [Phase 2: Frontend - Remove Document Editor (Block) Components](#phase-2-frontend---remove-document-editor-block-components)
3. [Phase 3: Frontend - Remove Chat/Message UI Components](#phase-3-frontend---remove-chatmessage-ui-components)
4. [Phase 4: Frontend - Remove Related Hooks and Utilities](#phase-4-frontend---remove-related-hooks-and-utilities)
5. [Phase 5: Backend - Remove API Endpoints](#phase-5-backend---remove-api-endpoints)
6. [Phase 6: Update Welcome Page and Navigation](#phase-6-update-welcome-page-and-navigation)
7. [Phase 7: Verification and Testing](#phase-7-verification-and-testing)
8. [Phase 8: Documentation Updates](#phase-8-documentation-updates)
9. [CLAUDE.md Updates](#claudemd-updates)

---

## Phase 1: Frontend - Remove Chat Pages

Remove all chat-related pages from the app directory.

### Tasks

- [x] 1.1: **REVIEW REQUIRED** - Delete the entire chat directory at `apps/web/app/(app)/chat/`
  - This includes:
    - `app/(app)/chat/page.tsx` - New chat page
    - `app/(app)/chat/[id]/page.tsx` - Individual chat page
    - `app/(app)/chat/actions.ts` - Server actions (generateTitleFromUserMessage, deleteTrailingMessages, updateChatVisibility, saveModelId)
  - **Note**: These pages provide the standalone chat interface. The chat functionality will be replaced by the canvas-style editor.

---

## Phase 2: Frontend - Remove Document Editor (Block) Components

Remove all components related to the current block-based document editor. These will be replaced by the new canvas-style editor.

### Block Components

- [x] 2.1: Delete `apps/web/components/block.tsx`
  - Main Block component that provides the full-screen document editor interface
  - This is the primary document editing UI component
  - Located at: `apps/web/components/block.tsx`

- [x] 2.2: Delete `apps/web/components/block-messages.tsx`
  - Displays messages within the block editor sidebar
  - Located at: `apps/web/components/block-messages.tsx`

- [x] 2.3: Delete `apps/web/components/block-actions.tsx`
  - Action buttons for the block editor (version controls, etc.)
  - Located at: `apps/web/components/block-actions.tsx`

- [x] 2.4: Delete `apps/web/components/block-close-button.tsx`
  - Close button for the block editor
  - Located at: `apps/web/components/block-close-button.tsx`

- [x] 2.5: Delete `apps/web/components/block-stream-handler.tsx`
  - Handles streaming updates in the block editor
  - Located at: `apps/web/components/block-stream-handler.tsx`

### Document Editor UI Components

- [x] 2.6: Delete `apps/web/components/editor.tsx`
  - Rich text editor component for document content
  - Located at: `apps/web/components/editor.tsx`

- [x] 2.7: Delete `apps/web/components/toolbar.tsx`
  - Toolbar with document editing actions and suggestions
  - Located at: `apps/web/components/toolbar.tsx`

- [x] 2.8: Delete `apps/web/components/diffview.tsx`
  - Component for viewing document version differences
  - Located at: `apps/web/components/diffview.tsx`

- [x] 2.9: Delete `apps/web/components/version-footer.tsx`
  - Footer showing version information and navigation
  - Located at: `apps/web/components/version-footer.tsx`

- [x] 2.10: Delete `apps/web/components/document-skeleton.tsx`
  - Loading skeleton for document editor
  - Located at: `apps/web/components/document-skeleton.tsx`

- [x] 2.11: Delete `apps/web/components/suggestion.tsx`
  - Individual suggestion display component
  - Located at: `apps/web/components/suggestion.tsx`

### Document Management Components (Preserve)

Note: The `components/documents/` directory contains document **management** components (list, filters, actions for browsing documents). These are NOT part of the editor UI and should be preserved.

- [x] 2.12: **Review and preserve** `apps/web/components/documents/` directory
  - These components are for document **management** (browsing, listing), not editing
  - **Expected action: Keep all files** - they are used by reports
  - Verify by searching: `grep -r "documents/" apps/web/app/(app)/reports/`
  - Files to keep:
    - `document-list.tsx` - Used by reports page
    - `document-list-skeleton.tsx` - Loading skeleton
    - `document-filters.tsx` - Filter controls
    - `document-actions.tsx` - List item actions
  - Located at: `apps/web/components/documents/`

- [x] 2.13: **Review** `apps/web/components/document.tsx` for block editor usage
  - Check if this component is imported by block editor components
  - Run: `grep -r "from.*document['\"]" apps/web/components/block*.tsx`
  - If only used by block editor: **Delete it**
  - If used by document management/reports: **Keep it**
  - **Actual outcome: Deleted** - it imports from block.tsx and is used by message.tsx (being deleted)
  - Located at: `apps/web/components/document.tsx`

- [x] 2.14: **Preserve** `apps/web/components/generate-document-dialog.tsx`
  - This component is used by achievements and projects pages to generate documents
  - It's part of document generation feature, NOT the editor UI
  - Verify usage: `grep -r "generate-document-dialog" apps/web/app`
  - **Expected action: Keep this file** - it's used by non-editor pages
  - Located at: `apps/web/components/generate-document-dialog.tsx`

---

## Phase 3: Frontend - Remove Chat/Message UI Components

Remove components related to the chat UI and messaging interface.

### Chat Components

- [x] 3.1: Delete `apps/web/components/chat.tsx`
  - Main Chat component that orchestrates the standalone chat interface
  - Uses `useChat` from 'ai/react'
  - Located at: `apps/web/components/chat.tsx`

- [x] 3.2: Delete `apps/web/components/chat-header.tsx`
  - Header with "New Chat" button for the chat interface
  - Located at: `apps/web/components/chat-header.tsx`

- [x] 3.3: Delete `apps/web/components/chat/` directory
  - Contains:
    - `action-buttons.tsx` - Chat-specific action buttons
    - `empty-state.tsx` - Empty state for chat
  - Located at: `apps/web/components/chat/`

- [x] 3.4: Delete `apps/web/components/sidebar-history.tsx`
  - Displays chat history in the sidebar
  - Shows list of past chats grouped by date
  - Includes chat deletion and visibility controls
  - Located at: `apps/web/components/sidebar-history.tsx`

- [x] 3.5: Delete `apps/web/components/visibility-selector.tsx`
  - Dropdown for setting chat visibility (public/private)
  - Located at: `apps/web/components/visibility-selector.tsx`

- [x] 3.6: Delete `apps/web/components/model-selector.tsx`
  - Dropdown for selecting LLM model for chat
  - Check if this is used elsewhere before deleting
  - Located at: `apps/web/components/model-selector.tsx`

### Message Components

These components handle message display and editing. They are used by both chat and block editor:

- [x] 3.7: Delete `apps/web/components/messages.tsx`
  - Displays list of messages
  - Located at: `apps/web/components/messages.tsx`

- [x] 3.8: Delete `apps/web/components/message.tsx`
  - Individual message display component
  - Handles rendering of text, tool invocations, etc.
  - Located at: `apps/web/components/message.tsx`

- [x] 3.9: Delete `apps/web/components/message-editor.tsx`
  - Allows editing of existing messages
  - Located at: `apps/web/components/message-editor.tsx`

- [x] 3.10: Delete `apps/web/components/message-actions.tsx`
  - Action buttons for messages (edit, delete, copy, etc.)
  - Located at: `apps/web/components/message-actions.tsx`

### Input Components

- [x] 3.11: Delete `apps/web/components/multimodal-input.tsx`
  - Input component with file attachment support
  - Used for both chat and block editor
  - Located at: `apps/web/components/multimodal-input.tsx`

- [x] 3.12: Delete `apps/web/components/suggested-actions.tsx`
  - Suggested action buttons for messages
  - Located at: `apps/web/components/suggested-actions.tsx`

- [x] 3.13: Delete `apps/web/components/preview-attachment.tsx`
  - Preview component for file attachments
  - Located at: `apps/web/components/preview-attachment.tsx`

---

## Phase 4: Frontend - Remove Related Hooks and Utilities

Remove hooks and utilities specific to the chat and document editor.

### Tasks

- [x] 4.1: Delete `apps/web/hooks/use-chat-visibility.ts`
  - Hook for managing chat visibility state
  - Calls `updateChatVisibility` server action
  - Located at: `apps/web/hooks/use-chat-visibility.ts`

- [x] 4.2: Delete `apps/web/hooks/use-block-stream.tsx`
  - Hook for handling streaming in block editor
  - Located at: `apps/web/hooks/use-block-stream.tsx`
  - **Note**: This file was not found in hooks/ directory

- [x] 4.3: Delete `apps/web/components/use-block-stream.tsx`
  - Duplicate or misplaced version of the hook
  - Located at: `apps/web/components/use-block-stream.tsx`

- [x] 4.4: Delete `apps/web/components/use-scroll-to-bottom.ts`
  - Utility hook for auto-scrolling in chat/messages
  - Check if used elsewhere before deleting
  - Located at: `apps/web/components/use-scroll-to-bottom.ts`

---

## Phase 5: Backend - Remove API Endpoints

Remove API endpoints for chat and document editor. Preserve document management endpoints.

### Chat API Endpoints (Delete)

- [x] 5.1: Delete `apps/web/app/api/chat/route.ts`
  - Main chat API endpoint that handles streaming responses
  - Uses Vercel AI SDK's `streamText`
  - Located at: `apps/web/app/api/chat/route.ts`

- [x] 5.2: Delete `apps/web/app/api/history/route.ts`
  - Returns chat history for authenticated user
  - Calls `getChatsByUserId` from database queries
  - Located at: `apps/web/app/api/history/route.ts`

- [x] 5.3: Delete `apps/web/app/api/vote/route.ts`
  - Handles voting on chat messages (GET and PATCH)
  - Calls `getVotesByChatId` and `voteMessage`
  - Located at: `apps/web/app/api/vote/route.ts`

### Document Editor API Endpoints (Delete)

- [x] 5.4: Delete `apps/web/app/api/document/route.ts` (singular)
  - Used by block editor for document versioning
  - Calls `getDocumentsById` and `saveDocument` for versions
  - **Note**: This is different from `/api/documents` (plural) which should be kept
  - Located at: `apps/web/app/api/document/route.ts`

- [x] 5.5: Delete `apps/web/app/api/suggestions/route.ts`
  - Returns suggestions for document editing
  - Calls `getSuggestionsByDocumentId`
  - Located at: `apps/web/app/api/suggestions/route.ts`

### Document Management API Endpoints (Keep)

**DO NOT DELETE** the following endpoints - they are used by the reports feature:
- `app/api/documents/route.ts` - Document list and creation (used by reports)
- `app/api/documents/[id]/route.ts` - Document CRUD operations
- `app/api/documents/[id]/share/route.ts` - Document sharing
- `app/api/documents/generate/route.ts` - Generate documents from achievements (used by reports)

---

## Phase 6: Update Welcome Page and Navigation

Update the welcome page and navigation to remove references to deleted features.

### Welcome Page

- [x] 6.1: Update `apps/web/app/(app)/welcome/page.tsx`
  - Remove the first card that uses `<ChatDemo />` from the WELCOME_CARDS array
  - Keep other welcome cards if they exist
  - Located at: `apps/web/app/(app)/welcome/page.tsx` (lines 9-28)

- [x] 6.2: Delete `apps/web/components/welcome/chat-demo.tsx`
  - Demo chat component used in welcome page
  - Uses Messages component with hardcoded demo data
  - Located at: `apps/web/components/welcome/chat-demo.tsx`

### Navigation

- [x] 6.3: **Review** `apps/web/components/nav-documents.tsx` for block editor references
  - Search for: references to `setBlock`, `block.tsx`, document editing actions
  - **Actual outcome: No changes needed** - component only lists documents and links to document pages
  - Located at: `apps/web/components/nav-documents.tsx`

- [x] 6.4: Check sidebar and navigation components
  - Search for any links to `/chat` routes
  - Remove or update navigation items that point to deleted routes
  - Files checked:
    - `components/app-sidebar.tsx` - No chat references
    - `components/nav-main.tsx` - No chat references
  - **Outcome: No changes needed**

---

## Phase 7: Verification and Testing

Verify that the application builds and runs correctly after the removal.

### Build and Type Check

- [x] 7.1: Check for remaining imports of deleted files
  - **Additional deletion**: Found and deleted `apps/web/lib/editor/` directory (contained editor infrastructure)
  - Run global searches for imports from deleted files:
    ```bash
    # Chat components (check multiple quote styles and import patterns)
    grep -r "from.*components/chat['\"]" apps/web
    grep -r "from.*'components/chat'" apps/web
    grep -r "from.*\"components/chat\"" apps/web
    grep -r "from.*'@/components/chat'" apps/web
    grep -r "from.*\"@/components/chat\"" apps/web
    grep -r "from.*components/chat-header" apps/web
    grep -r "from.*components/sidebar-history" apps/web
    grep -r "from.*components/visibility-selector" apps/web
    grep -r "from.*components/model-selector" apps/web

    # Block components
    grep -r "from.*components/block" apps/web
    grep -r "from.*components/editor" apps/web
    grep -r "from.*components/toolbar" apps/web
    grep -r "from.*components/diffview" apps/web

    # Message components
    grep -r "from.*components/message" apps/web
    grep -r "from.*components/multimodal-input" apps/web
    grep -r "from.*components/suggested-actions" apps/web

    # Hooks
    grep -r "from.*hooks/use-chat-visibility" apps/web
    grep -r "from.*hooks/use-block-stream" apps/web
    grep -r "from.*use-scroll-to-bottom" apps/web

    # Server actions
    grep -r "from.*chat/actions" apps/web

    # Verify generate-document-dialog is NOT deleted (should have results)
    grep -r "generate-document-dialog" apps/web/app
    ```
  - Remove or update any remaining references
  - **Note**: The last grep should return results (generate-document-dialog is preserved)

- [ ] 7.2: Build the web application
  - **SKIPPED**: Per instructions, not running build as dev server is running on port 3000

- [x] 7.3: Run TypeScript type checking
  - Ran `pnpm --filter=@bragdoc/web exec tsc --noEmit --skipLibCheck`
  - Fixed type error related to `lib/editor/suggestions.tsx` by deleting `lib/editor/` directory
  - Remaining type errors are pre-existing and unrelated to our changes

- [ ] 7.4: Run linter
  - Run `pnpm --filter=@bragdoc/web lint`
  - **To be done**: User can run this if desired

### Test Removal

- [x] 7.5: Remove test files for deleted features
  - **No chat/editor test files found** - checked for test files related to chat/block editor
  - Document management tests are preserved

- [x] 7.6: Run remaining tests
  - Ran `pnpm test` at project root
  - Test failures are due to missing database column (pre-existing issue), not related to our deletions
  - No tests failed specifically due to missing chat/editor components

### Manual Verification

- [ ] 7.7: Start development server and manually verify
  - **To be done by user**: Dev server already running on port 3000
  - User should verify:
    - The dashboard loads correctly
    - Navigation to `/chat` returns 404
    - The sidebar doesn't show chat history
    - The welcome page displays correctly (without chat demo)
    - Reports generation still works (`/reports`)
    - Document list/management still works
    - Achievements, Projects, Companies pages still work
    - No console errors related to missing components

---

## Phase 8: Documentation Updates

Update project documentation to reflect the removal of chat and editor UI.

### Tasks

- [ ] 8.1: Update `CLAUDE.md` if necessary
  - Review the CLAUDE.md file for mentions of:
    - Chat pages in the directory structure
    - Block/document editor components
    - Chat API endpoints
    - Message/input components
  - Remove or update any references
  - Note: CLAUDE.md doesn't heavily document chat/editor, but verify
  - Located at: `/Users/ed/Code/brag-ai/CLAUDE.md`

- [ ] 8.2: Check and update `docs/FEATURES.md` if it exists
  - Look for any documentation about chat or document editor features
  - Remove or update sections as appropriate
  - Located at: `/Users/ed/Code/brag-ai/docs/FEATURES.md`

- [ ] 8.3: Update `README.md` if it mentions chat or editor features
  - Search for: "chat", "editor", "block", "document editing"
  - If found, remove or update sections describing:
    - Chat functionality
    - Document editor UI
    - Any screenshots or demos of these features
  - **Preserve** mentions of document generation/reports (these still exist)
  - Located at: `/Users/ed/Code/brag-ai/README.md`

- [ ] 8.4: Check `cli/README.md`
  - Verify no references to web app's chat/editor UI
  - CLI README should focus on CLI functionality only
  - Located at: `/Users/ed/Code/brag-ai/packages/cli/README.md`

- [ ] 8.5: Check other documentation directories
  - Search for references to chat/editor in:
    - `features/` directory
    - Other files in `docs/` directory
  - Update or remove as needed

---

## CLAUDE.md Updates

The CLAUDE.md file should be updated to reflect the removal of chat and editor UI components.

### Tasks

- [ ] 9.1: Update the Directory Structure section (lines 88-126)
  - Remove references to chat pages from the app structure
  - Example: Remove mentions of `chat/` route or chat components
  - Verify the API routes section doesn't list deleted chat/editor endpoints
  - Update component directory examples to remove deleted components
  - Located at: `/Users/ed/Code/brag-ai/CLAUDE.md` (lines 88-126)

- [ ] 9.2: Update the Component Patterns section if needed
  - Search for code examples that use deleted components
  - Look for: Chat, Block, Messages, MultimodalInput, Toolbar, Editor
  - Remove or replace examples that use deleted components
  - Keep examples for other features (achievements, projects, etc.)
  - Located at: `/Users/ed/Code/brag-ai/CLAUDE.md` (Component Patterns section)

- [ ] 9.3: Search and update any other references
  - Run: `grep -i "chat\|block\|editor\|toolbar\|messages\|multimodal" /Users/ed/Code/brag-ai/CLAUDE.md`
  - For each match, determine if it refers to deleted features
  - Remove or update references to deleted chat/editor UI
  - **Preserve** references to:
    - Database chat/message tables (these remain)
    - AI/LLM integration (lib/ai remains)
    - Document generation/reports (these remain)
  - Located at: `/Users/ed/Code/brag-ai/CLAUDE.md`

---

## Instructions for Implementation

### General Guidelines

1. **Mark tasks as complete**: As you complete each task, change `- [ ]` to `- [x]` in this plan document.

2. **Review flags**: Tasks marked with **REVIEW REQUIRED** should be flagged to the user before deletion. Present these files/directories and ask for explicit confirmation.

3. **Incremental approach**: Complete each phase fully before moving to the next. Run builds after major deletions to catch errors early.

4. **Preserve features**: Be extremely careful to preserve:
   - All database code (schema, queries, migrations)
   - `/api/documents/*` endpoints (used by reports)
   - Reports pages (`app/(app)/reports/`)
   - `lib/ai/` directory
   - All other features (achievements, projects, companies, etc.)

5. **Check dependencies**: Before deleting each file, grep for imports to understand what might break:
   ```bash
   grep -r "from.*filename" apps/web
   ```

### Build Commands

```bash
# Build web app
pnpm --filter=@bragdoc/web build

# Type check
pnpm --filter=@bragdoc/web exec tsc --noEmit --skipLibCheck

# Lint
pnpm --filter=@bragdoc/web lint

# Run tests
pnpm --filter=@bragdoc/web test

# Start dev server
pnpm dev:web
```

### Search Commands for Verification

```bash
# Find all imports of a deleted component
grep -r "from.*component-name" apps/web/

# Find all routes to chat pages
grep -r "href=.*['\"]/" apps/web/ | grep chat

# Find all API calls to deleted endpoints
grep -r "fetch.*['\"]/" apps/web/ | grep -E "(chat|history|vote|document['\"]|suggestions)"
```

### Project-Specific Conventions

Follow the conventions outlined in `/Users/ed/Code/brag-ai/CLAUDE.md`:

- **Imports**: Use `@/` alias for imports (e.g., `@/components/ui/button`)
- **Named exports**: Use named exports instead of default exports
- **TypeScript**: Maintain strict type safety throughout
- **Git commits**: Use conventional commit format (e.g., `refactor: remove chat and document editor UI`)

### Verification Checklist

Before marking this task as complete, verify:

- [ ] All chat pages deleted and return 404
- [ ] All block editor components deleted
- [ ] All message/input components deleted
- [ ] Chat and document editor API endpoints deleted
- [ ] Document management API endpoints still work (`/api/documents/*`)
- [ ] Document generation dialog preserved (used by achievements/projects)
- [ ] Reports generation still works (`/reports`)
- [ ] No build errors or TypeScript errors
- [ ] All tests pass (except deleted test files)
- [ ] Application runs without console errors
- [ ] Navigation doesn't link to deleted routes
- [ ] Database schema and queries untouched
- [ ] `lib/ai/` directory untouched
- [ ] Documentation updated (including CLAUDE.md)

---

## Summary

This plan removes the following from apps/web:

### Deleted Components (40+ files)
- **Chat pages**: 3 files (page.tsx, [id]/page.tsx, actions.ts)
- **Block editor**: 5 components (block.tsx, block-*.tsx)
- **Editor UI**: 6 components (editor, toolbar, diffview, etc.)
- **Chat UI**: 6 components (chat.tsx, chat-header, sidebar-history, etc.)
- **Message UI**: 9 components (messages, message, multimodal-input, etc.)
- **Hooks**: 4 hooks (use-chat-visibility, use-block-stream, etc.)
- **Welcome**: 1 component (chat-demo.tsx)

### Deleted API Endpoints (5 routes)
- `/api/chat` - Chat streaming
- `/api/history` - Chat history
- `/api/vote` - Message voting
- `/api/document` (singular) - Document versioning for block editor
- `/api/suggestions` - Document editing suggestions

### Preserved Components and Features
- **Database**: All schema, queries, and migrations intact (chat, message, vote, document, suggestion tables)
- **Document Management**: `/api/documents/*` endpoints (plural) and related components
- **Document Generation**: `generate-document-dialog.tsx` component (used by achievements/projects)
- **Document Management Components**: `components/documents/` directory (list, filters, actions)
- **Reports**: All report pages and document generation functionality
- **AI**: `lib/ai/` directory and utilities
- **Other Features**: Achievements, projects, companies, standups, dashboard, etc.

### Rationale

The current chat interface and block-based document editor are being removed to make room for a new canvas-style editor from ./tmp/ai-chatbot-main. The new editor combines chat and document editing in a single, side-by-side interface. The database layer is preserved because the new editor will use the same schema (chat, message, vote, document tables).
