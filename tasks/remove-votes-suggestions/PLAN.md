# Plan: Remove Votes and Suggestions from BragDoc

## Summary

This plan outlines the steps to completely remove all references to votes and suggestions from the BragDoc codebase. These features are no longer used and should be cleaned up from the database schema, query functions, type exports, and API documentation.

## High-Level Overview

The removal process involves:
1. Removing database table definitions from schema.ts
2. Removing database query functions from queries.ts
3. Removing exports from index.ts
4. Removing API documentation from swagger.json
5. Updating CLAUDE.md documentation

**Note**: This plan explicitly does NOT include generating migrations or migrating the database. The database migration will be handled separately.

## Table of Contents

- [Phase 1: Database Schema Cleanup](#phase-1-database-schema-cleanup)
- [Phase 2: Query Functions Cleanup](#phase-2-query-functions-cleanup)
- [Phase 3: Public API Cleanup](#phase-3-public-api-cleanup)
- [Phase 4: API Documentation Cleanup](#phase-4-api-documentation-cleanup)
- [Phase 5: CLAUDE.md Updates](#phase-5-claudemd-updates)

---

## Phase 1: Database Schema Cleanup

**Location**: `packages/database/src/schema.ts`

This phase removes the `vote` and `suggestion` table definitions and their associated type exports from the database schema.

### Tasks

- [x] **1.1** Remove the `vote` table definition (lines 199-217)
  - The vote table has a composite primary key on `chatId` and `messageId`
  - It has foreign keys to both `chat.id` and `message.id`
  - Located at: `packages/database/src/schema.ts:199-217`

- [x] **1.2** Remove the `Vote` type export (line 217)
  - This is immediately after the vote table definition
  - Export statement: `export type Vote = InferSelectModel<typeof vote>;`
  - Located at: `packages/database/src/schema.ts:217`

- [x] **1.3** Remove the `suggestion` table definition (lines 253-277)
  - The suggestion table has a composite primary key on `id`, `documentId`, and `documentCreatedAt`
  - It has a foreign key to `user.id`
  - Located at: `packages/database/src/schema.ts:253-277`

- [x] **1.4** Remove the `Suggestion` type export (line 277)
  - This is immediately after the suggestion table definition
  - Export statement: `export type Suggestion = InferSelectModel<typeof suggestion>;`
  - Located at: `packages/database/src/schema.ts:277`

---

## Phase 2: Query Functions Cleanup

**Location**: `packages/database/src/queries.ts`

This phase removes all query functions that interact with the vote and suggestion tables, as well as the imports for these tables.

### Tasks

- [x] **2.1** Remove vote and suggestion imports (lines 18-34)
  - Remove `vote` from the import statement (line 27)
  - Remove `suggestion` from the import statement (line 24)
  - Remove `type Suggestion` from the import statement (line 23)
  - The import block is located at: `packages/database/src/queries.ts:18-34`

- [x] **2.2** Update `deleteChatById` function to remove vote deletion (lines 102-115)
  - The function currently deletes votes before deleting messages
  - Remove line 107: `await dbInstance.delete(vote).where(eq(vote.chatId, id));`
  - The function should only delete messages and then the chat
  - Located at: `packages/database/src/queries.ts:102-115`

- [x] **2.3** Remove `voteMessage` function (lines 177-210)
  - This function creates or updates a vote on a message
  - Function signature: `export async function voteMessage({ chatId, messageId, type }: { chatId: string; messageId: string; type: 'up' | 'down' }, dbInstance = defaultDb)`
  - Entirely remove this function
  - Located at: `packages/database/src/queries.ts:177-210`

- [x] **2.4** Remove `getVotesByChatId` function (lines 212-222)
  - This function retrieves all votes for a given chat
  - Function signature: `export async function getVotesByChatId({ id }: { id: string }, dbInstance = defaultDb)`
  - Entirely remove this function
  - Located at: `packages/database/src/queries.ts:212-222`

- [x] **2.5** Update `deleteDocumentsByIdAfterTimestamp` function to remove suggestion deletion (lines 346-367)
  - The function currently deletes suggestions before deleting documents
  - Remove lines 352-358 (the suggestion deletion block):
    ```typescript
    await dbInstance
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );
    ```
  - The function should only delete documents
  - Located at: `packages/database/src/queries.ts:346-367`

- [x] **2.6** Remove `saveSuggestions` function (lines 369-379)
  - This function bulk inserts suggestions
  - Function signature: `export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }, dbInstance = defaultDb)`
  - Entirely remove this function
  - Located at: `packages/database/src/queries.ts:369-379`

- [x] **2.7** Remove `getSuggestionsByDocumentId` function (lines 381-394)
  - This function retrieves all suggestions for a given document
  - Function signature: `export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }, dbInstance = defaultDb)`
  - Entirely remove this function
  - Located at: `packages/database/src/queries.ts:381-394`

---

## Phase 3: Public API Cleanup

**Location**: `packages/database/src/index.ts`

This phase removes the exports of vote and suggestion functions from the database package's public API.

### Tasks

- [x] **3.1** Remove `voteMessage` export (line 40)
  - Located in the re-export block at: `packages/database/src/index.ts:30-69`
  - Remove the line: `voteMessage,`

- [x] **3.2** Remove `getVotesByChatId` export (line 41)
  - Located in the re-export block at: `packages/database/src/index.ts:30-69`
  - Remove the line: `getVotesByChatId,`

- [x] **3.3** Remove `saveSuggestions` export (line 48)
  - Located in the re-export block at: `packages/database/src/index.ts:30-69`
  - Remove the line: `saveSuggestions,`

- [x] **3.4** Remove `getSuggestionsByDocumentId` export (line 49)
  - Located in the re-export block at: `packages/database/src/index.ts:30-69`
  - Remove the line: `getSuggestionsByDocumentId,`

---

## Phase 4: API Documentation Cleanup

**Location**: `apps/web/swagger.json`

This phase removes the API endpoint documentation and schema definitions for votes and suggestions from the OpenAPI/Swagger documentation.

### Tasks

- [x] **4.1** Remove `/api/vote` endpoint documentation (lines 15-101)
  - This documents both GET and PATCH methods for voting
  - Remove the entire `/api/vote` path object from the `paths` section
  - Located at: `apps/web/swagger.json:15-101`

- [x] **4.2** Remove `/api/suggestions` endpoint documentation (lines 1047-1086)
  - This documents the GET method for retrieving suggestions
  - Remove the entire `/api/suggestions` path object from the `paths` section
  - Located at: `apps/web/swagger.json:1047-1086`

- [x] **4.3** Remove `Vote` schema definition (lines 1127-1141)
  - This defines the Vote object schema in the components section
  - Remove the entire `Vote` schema object from `components.schemas`
  - Located at: `apps/web/swagger.json:1127-1141`

- [x] **4.4** Remove `Suggestion` schema definition (lines 1484-1506)
  - This defines the Suggestion object schema in the components section
  - Remove the entire `Suggestion` schema object from `components.schemas`
  - Located at: `apps/web/swagger.json:1484-1506`

---

## Phase 5: CLAUDE.md Updates

**Location**: `CLAUDE.md`

This phase updates the project documentation to reflect the removal of votes and suggestions.

### Tasks

- [x] **5.1** Review CLAUDE.md for any mentions of votes or suggestions
  - Search for any references to these features in the documentation
  - Remove or update any sections that mention these features
  - No specific changes are anticipated, but a review is necessary

- [x] **5.2** Update the "Business tables" section if needed
  - Located at: `CLAUDE.md` (Database Layer > Schema Organization)
  - Currently lists: `achievement`, `project`, `company`, `userMessage`
  - Ensure votes and suggestions are not mentioned in this or similar sections

---

## Instructions for Implementation

### Before You Start

1. **Read this entire plan** to understand the scope and dependencies between tasks
2. **Do NOT generate database migrations** - this is explicitly out of scope
3. **Update this plan document** as you complete each task by marking checkboxes
4. **Work in order** - complete Phase 1 before Phase 2, etc.

### As You Work

1. **Mark tasks as complete** by changing `- [ ]` to `- [x]` as you finish each task
2. **Test after each phase** by running `pnpm build` to ensure no TypeScript errors
3. **Commit frequently** using conventional commit messages (e.g., `refactor: remove vote table from schema`)

### Code Conventions to Follow

Per CLAUDE.md conventions:
- Use TypeScript with strict mode
- Maintain existing import organization (external, then internal)
- Preserve error handling patterns in existing functions
- Keep consistent indentation and formatting

### After Completion

1. Run `pnpm build` to ensure the entire monorepo builds successfully
2. Run `pnpm lint` to ensure code quality standards are met
3. Run `pnpm test` to ensure no tests are broken (though none are expected to reference votes/suggestions)
4. Create a git commit with message: `refactor: remove votes and suggestions from codebase`

### Important Notes

- **DO NOT** generate database migrations or modify the database
- **DO NOT** remove any code not explicitly mentioned in this plan
- **DO** verify that no other code references the removed functions (TypeScript will help with this)
- **DO** ask for clarification if you encounter unexpected dependencies

### Expected Outcome

After completing this plan:
- The `vote` and `suggestion` tables will no longer be defined in the schema
- All query functions for votes and suggestions will be removed
- No public exports will reference votes or suggestions
- API documentation will not reference votes or suggestions
- The codebase will build successfully with no TypeScript errors
- The database will remain unchanged (migrations are handled separately)
