# Task: Remove existing chat and document editor UI from apps/web

## Background

The apps/web application is a fork of what can be found in ./tmp/ai-chatbot-main (which is a fresh git clone of an example repo from Vercel that has a Chat bot inside a Next JS application).

In an upcoming task, I will bring in the canvas-style document editor from ./tmp/ai-chatbot-main into apps/web. This canvas-style editor features a **chat UI side-by-side with an editable document** - it's a combined interface, not separate features.

## What to Remove

### 1. Chat Pages and Routes
Remove the existing /chat endpoints and pages:
- `app/(app)/chat/*` - All chat pages and routes
- Any standalone chat interface

### 2. Document Editor UI (Block Components)
Remove the existing document editing interface, including:
- All `block*.tsx` components (block.tsx, block-messages.tsx, block-actions.tsx, etc.)
- Document editor components like Editor, Toolbar, DiffView, etc.
- The multimodal input and messaging components (MultimodalInput, Messages, message.tsx, etc.)
- Any other components that are part of the current document/chat editing interface

These will be replaced by the new canvas-style editor in the upcoming task.

### 3. API Endpoints
Remove chat-related API endpoints:
- `/api/chat/route.ts`
- `/api/history/route.ts`
- `/api/vote/route.ts`

### 4. Related Hooks and Utilities
Remove hooks and utilities related to the chat/document editor UI:
- `use-chat-visibility.ts`
- `use-block-stream.tsx`
- Any other hooks specific to the current chat/document interface

### 5. Welcome Page Demo
Remove the chat demo from the welcome page:
- The ChatDemo component

## What to Preserve

### Database Schema
**DO NOT remove or modify any database tables, schemas, or queries.** The existing database schema (including chat, message, vote tables) will be used by the new canvas-style editor. Keep all of:
- Database schema definitions in `packages/database/src/schema.ts`
- All query functions in `packages/database/src/queries.ts`
- All database-related code

### AI/LLM Code
Do not remove the contents of `apps/web/lib/ai` - these utilities will be reused.

### Other Features
Preserve all other application features:
- Achievements tracking
- Projects management
- Companies management
- Reports/documents generation (the API endpoints, not the editor UI)
- Dashboard
- Account settings
- All other non-chat, non-editor functionality

## Review Flags

If existing components are being used on existing Next JS pages (beyond the chat and document editor), flag those pages for review before deletion.

## Summary

The goal is to remove the current chat interface and document editor UI to make room for importing a new canvas-style editor that combines both features. The database layer remains intact as it will be reused by the new implementation.
