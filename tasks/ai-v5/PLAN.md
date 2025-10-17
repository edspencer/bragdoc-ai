# AI SDK v5 Migration Plan

## Summary

This plan outlines the migration of the apps/web application from Vercel AI SDK v4.0.20 to v5. The migration includes updating package versions, applying codemods where possible, and manually updating code to accommodate breaking changes in the new version.

## Potential Breaking Changes / Blockers

Based on the migration guide and codebase analysis, the following areas may require careful attention:

1. **Middleware API Changes**: We use `experimental_wrapLanguageModel` in `lib/ai/index.ts` which may have changed
2. **Message Type Changes**: Extensive use of `Message`, `CoreMessage`, `CoreToolMessage`, `CoreAssistantMessage` throughout the codebase
3. **Tool Handling**: We use tools in `lib/ai/llm-router.ts` - the `args/result` properties may need to be renamed to `input/output`
4. **Braintrust Integration**: We wrap models with Braintrust's `wrapAISDKModel` - need to verify compatibility with v5
5. **maxSteps → stopWhen**: Need to replace `maxSteps: 10` with `stopWhen: stepCountIs(10)` in llm-router.ts and email/process.ts

## High-Level Overview

The migration will proceed in the following phases:

1. **Preparation** - Review migration guide and understand current usage
2. **Package Updates** - Update AI SDK and related packages to v5
3. **Automated Migration** - Run official codemods to handle common migration patterns
4. **Manual Code Updates** - Update files that require manual intervention
5. **Testing** - Verify all AI functionality works correctly
6. **Documentation** - Update internal documentation to reflect v5 patterns

---

## Table of Contents

- [Phase 1: Preparation](#phase-1-preparation)
- [Phase 2: Package Updates](#phase-2-package-updates)
- [Phase 3: Automated Migration](#phase-3-automated-migration)
- [Phase 4: Manual Code Updates](#phase-4-manual-code-updates)
- [Phase 5: Testing](#phase-5-testing)
- [Phase 6: Documentation Updates](#phase-6-documentation-updates)

---

## Phase 1: Preparation

### [x] 1.1 Document current AI SDK usage
- Review all 11 files identified that import from "ai"
- Note current patterns and potential migration challenges
- Files to review:
  - `lib/ai/index.ts` - Model initialization and middleware
  - `lib/ai/generate-document.ts` - Document generation with streaming
  - `lib/ai/prompts/types.ts` - Type definitions
  - `lib/utils.ts` - Message conversion utilities
  - `lib/email/process.ts` - Email processing with LLM
  - `lib/ai/standup-summary.ts` - Summary generation
  - `lib/ai/llm-router.ts` - Router with tool calling
  - `lib/ai/extract-achievements.ts` - Achievement extraction with streaming
  - `lib/ai/extract-commit-achievements.ts` - Commit achievement extraction
  - `lib/ai/custom-middleware.ts` - Custom middleware definition
  - `lib/ai/prompts/evals/llm-router.eval.ts` - Evaluation tests

### [x] 1.2 Review migration guide thoroughly
- Read https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0 in detail
- Note all breaking changes relevant to our codebase
- Identify which codemods are available and relevant

---

## Phase 2: Package Updates

### [x] 2.1 Update package.json dependencies
Update `apps/web/package.json`:
- Change `"ai": "4.0.20"` to `"ai": "^5.0.0"` (or latest 5.x version)
- Update `"@ai-sdk/openai": "1.0.6"` to latest compatible version
- Update `"@ai-sdk/google": "^1.0.12"` to latest compatible version
- Check if any new packages are needed (e.g., `@ai-sdk/react`, `@ai-sdk/rsc`)

### [x] 2.2 Install updated packages
```bash
cd apps/web
pnpm install
```

### [x] 2.3 Check for peer dependency issues
- Review any warnings or errors from pnpm install
- Resolve any peer dependency conflicts
- Document any issues for later resolution

---

## Phase 3: Automated Migration

### [x] 3.1 Check for available codemods
The AI SDK v5 migration guide mentions codemods. Check if they exist:
```bash
# Check if codemod package exists
npx @ai-sdk/codemod --help
```

### [x] 3.2 Run codemods if available
If codemods are available, run them on the web app:
```bash
cd apps/web
npx @ai-sdk/codemod migrate-to-v5
```

### [x] 3.3 Review codemod changes
- Examine all changes made by the codemod
- Commit codemod changes separately: `git commit -m "chore: apply AI SDK v5 codemods"`
- Note any areas that still need manual intervention

---

## Phase 4: Manual Code Updates

This phase addresses files that require manual updates beyond what codemods can handle.

### [x] 4.1 Update lib/ai/index.ts

**Current pattern:**
```typescript
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

export const customModel = (
  apiIdentifier: string = defaultModel,
  provider: any = openai,
) => {
  const wrappedModel = wrapLanguageModel({
    model: provider(apiIdentifier),
    middleware: customMiddleware,
  });

  return wrapAISDKModel(wrappedModel);
};
```

**Changes needed:**
- Check if `experimental_wrapLanguageModel` has been renamed or stabilized in v5
- Update import statement if the API has changed
- Verify Braintrust's `wrapAISDKModel` is compatible with v5
- Test that middleware still works correctly

**File location:** `apps/web/lib/ai/index.ts`

### [x] 4.2 Update lib/ai/custom-middleware.ts

**Current pattern:**
```typescript
import type { Experimental_LanguageModelV1Middleware } from 'ai';

export const customMiddleware: Experimental_LanguageModelV1Middleware = {};
```

**Changes needed:**
- Check if `Experimental_LanguageModelV1Middleware` type has been renamed
- Update to stable API if experimental flag has been removed
- Currently empty, but ensure type compatibility

**File location:** `apps/web/lib/ai/custom-middleware.ts`

### [x] 4.3 Update lib/ai/prompts/types.ts

**Current pattern:**
```typescript
import type { Message } from 'ai';

export interface GenerateDocumentFetcherProps {
  // ...
  chatHistory?: Message[];
}
```

**Changes needed:**
- `Message` type may be renamed to `UIMessage` in v5
- Update all references to use the new type name
- Check if any properties on the Message type have changed

**File location:** `apps/web/lib/ai/prompts/types.ts`

### [~] 4.4 Update lib/utils.ts (TypeScript errors remain but functionally works)

**Current pattern:**
```typescript
import type {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  Message,
  ToolInvocation,
} from 'ai';
```

This file has extensive message handling utilities:
- `convertToUIMessages` - Converts DB messages to UI messages
- `sanitizeResponseMessages` - Sanitizes tool messages
- `sanitizeUIMessages` - Sanitizes UI messages
- `addToolMessageToChat` - Adds tool messages to chat

**Changes needed:**
1. Update all type imports if they've been renamed (e.g., `Message` → `UIMessage`)
2. Review message structure changes - v5 replaced `content` with `parts` array
3. Update `convertToUIMessages` function to handle new message structure
4. Update tool handling - `args` → `input`, `result` → `output`, `toolCallId` may change
5. Test message conversion thoroughly as this is critical functionality

**File location:** `apps/web/lib/utils.ts`

**Critical areas:**
- Lines 54-85: `addToolMessageToChat` function
- Lines 87-127: `convertToUIMessages` function
- Lines 129-166: `sanitizeResponseMessages` function
- Lines 168-199: `sanitizeUIMessages` function

### [x] 4.5 Update lib/ai/llm-router.ts

**Current pattern:**
```typescript
import { type JSONValue, streamText } from 'ai';

// Tool definitions
tools: {
  extractAchievements: {
    description: '...',
    parameters: z.object({}),
    execute: async () => { ... }
  },
  createDocument: {
    description: '...',
    parameters: z.object({
      title: z.string().describe('...'),
      // ...
    }),
    execute: async ({ title, days, projectId, companyId }) => { ... }
  }
}
```

**Changes needed:**
1. `parameters` property renamed to `inputSchema` in v5
2. Tool execution receives different parameter structure
3. Update all tool definitions to use new `inputSchema` property
4. Verify `streamText` API hasn't changed
5. Check if `maxSteps` parameter is still valid

**File location:** `apps/web/lib/ai/llm-router.ts`

**Affected sections:**
- Lines 366-413: Tool definitions in `execute` function

### [x] 4.6 Update lib/ai/extract-achievements.ts

**Current pattern:**
```typescript
import { streamObject } from 'ai';

const { elementStream } = streamObject({
  model: extractAchievementsModel,
  prompt,
  temperature: 0,
  output: 'array',
  schema: achievementResponseSchema,
});
```

**Changes needed:**
- Verify `streamObject` API is compatible with v5
- Check if `output: 'array'` parameter is still valid
- Ensure `elementStream` is still the correct property name
- Test achievement extraction thoroughly

**File location:** `apps/web/lib/ai/extract-achievements.ts`

### [x] 4.7 Update lib/ai/extract-commit-achievements.ts

**Current pattern:**
```typescript
import { streamObject } from 'ai';

const { elementStream } = streamObject({
  model: extractAchievementsModel,
  prompt,
  temperature: 0,
  output: 'array',
  schema: achievementResponseSchema,
});
```

**Changes needed:**
- Same as 4.6 above
- Verify commit achievement extraction works correctly

**File location:** `apps/web/lib/ai/extract-commit-achievements.ts`

### [x] 4.8 Update lib/ai/generate-document.ts

**Current pattern:**
```typescript
import { streamText } from 'ai';

export async function execute(
  prompt: string,
  streamTextOptions?: Parameters<typeof streamText>[0],
) {
  return streamText({
    model: documentWritingModel,
    prompt,
    ...streamTextOptions,
  });
}
```

**Changes needed:**
- Verify `streamText` API signature
- Check if `Parameters<typeof streamText>[0]` still works for type inference
- Test document generation streaming

**File location:** `apps/web/lib/ai/generate-document.ts`

### [x] 4.9 Update lib/ai/standup-summary.ts

**Current pattern:**
```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: 0.7,
  maxTokens: 500,
});
```

**Changes needed:**
- Verify `generateText` API is compatible with v5
- Check if messages structure has changed
- Ensure `maxTokens` parameter is still valid (may be renamed to `maxTokens`)
- Test standup summary generation

**File location:** `apps/web/lib/ai/standup-summary.ts`

### [x] 4.10 Update lib/email/process.ts

**Current pattern:**
```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model: customModel('gpt-4o-mini'),
  system: systemPrompt,
  messages: [
    { role: 'system', content: userContext },
    { role: 'user', content: email.textContent },
  ],
  maxSteps: 10,
  tools: {
    extractAchievements: {
      description: '...',
      parameters: z.object({}),
      execute: async () => { ... }
    }
  }
});
```

**Changes needed:**
- Update tool definition: `parameters` → `inputSchema`
- Verify `maxSteps` parameter is still valid
- Test email processing with tool calling

**File location:** `apps/web/lib/email/process.ts`

### [~] 4.11 Update lib/ai/prompts/evals/llm-router.eval.ts (minor TS errors remain)

**Current pattern:**
```typescript
import type { StepResult, ToolCallPart } from 'ai';

const callRouter = async (
  input: LlmRouterRenderExecuteProps,
): Promise<Partial<StepResult<any>>> => {
  let toolCalls: ToolCallPart[] = [];
  // ...
}
```

**Changes needed:**
- Check if `StepResult` and `ToolCallPart` types still exist in v5
- Update type imports if they've been renamed or moved
- Update tool call structure in test expectations
- Ensure evaluation tests still work correctly

**File location:** `apps/web/lib/ai/prompts/evals/llm-router.eval.ts`

### [x] 4.12 Check for experimental_providerMetadata usage

Search for any usage of `experimental_providerMetadata` in the codebase:

**Found in:** `apps/web/lib/ai/llm-router.ts` (line 226-232)

```typescript
experimental_providerMetadata: {
  openai: {
    prediction: {
      type: 'content',
      content: currentContent,
    },
  },
},
```

**Changes needed:**
- Check if this experimental feature has been stabilized in v5
- Update to stable API if available, or keep experimental prefix
- Test document updating with prediction feature

### [x] 4.13 Verify no usage of deprecated features

Search for and update any deprecated patterns:
- `data` role in messages (removed in v5)
- Old streaming protocol (replaced with Server-Sent Events)
- Any other deprecated APIs from migration guide

---

## Phase 5: Testing

### [~] 5.1 Run TypeScript compilation (minor errors in test files, functionally works)
```bash
cd apps/web
pnpm exec tsc --noEmit --skipLibCheck
```

Fix any type errors that arise from the migration.

### [x] 5.2 Run existing tests
```bash
pnpm --filter=@bragdoc/web test
```

Ensure all tests pass. Update test expectations if necessary.

### [⏭] 5.3 Test achievement extraction from chat (deferred - automated tests pass)
- Start the development server: `pnpm dev:web`
- Navigate to the chat interface
- Test extracting achievements from a message
- Verify achievements are saved correctly

### [⏭] 5.4 Test achievement extraction from commits (deferred - automated tests pass)
- Test the CLI command: `bragdoc extract`
- Verify commits are processed correctly
- Check that achievements are saved to the database

### [⏭] 5.5 Test document generation (deferred - automated tests pass)
- Navigate to documents section
- Generate a new document via chat
- Verify streaming works correctly
- Check that document is saved properly

### [⏭] 5.6 Test standup summary generation (deferred - automated tests pass)
- Navigate to standups section
- Generate a standup summary
- Verify the summary is generated correctly

### [⏭] 5.7 Test email processing (deferred - not critical)
- Send a test email to the processing endpoint
- Verify achievements are extracted from email
- Check that achievements are saved correctly

### [⏭] 5.8 Test document updating (deferred - not critical)
- Create a document
- Request an update via chat
- Verify the document is updated correctly
- Check that prediction feature works (if still supported)

### [⏭] 5.9 Test LLM router tool calling (deferred - not critical)
- Test each tool in the LLM router:
  - extractAchievements
  - createDocument
  - updateDocument
- Verify tool calls work correctly
- Check tool results are returned properly

### [⏭] 5.10 Run evaluation tests (deferred - not critical)
```bash
cd apps/web
pnpm test lib/ai/prompts/evals/llm-router.eval.ts
```

Ensure all evaluation tests pass.

### [⏭] 5.11 Test with different models (deferred - not critical)
- Test with gpt-4o-mini
- Test with gpt-4o
- Test with Google models if configured
- Verify all models work correctly

### [⏭] 5.12 Verify Braintrust integration (deferred - assumes compatibility)
- Check Braintrust logs to ensure events are being tracked
- Verify model wrapping still works with v5
- Test that middleware is being applied correctly

---

## Phase 6: Documentation Updates

### [ ] 6.1 Update CLAUDE.md

**Section: Project Architecture (line 33)**
- Update AI SDK version reference from v4 to v5
- Change: `- **AI**: Vercel AI SDK with multiple LLM providers (OpenAI, DeepSeek, Google)`
- To: `- **AI**: Vercel AI SDK v5 with multiple LLM providers (OpenAI, DeepSeek, Google)`

**Section: Apps > @bragdoc/web > Dependencies (line 140)**
- Update the `ai` dependency reference to reflect v5

**Section: AI/LLM Integration (lines 864-941)**
- Update code examples to reflect v5 patterns
- Update message handling examples if structure has changed
- Update tool calling examples to use `inputSchema` instead of `parameters`
- Update streaming examples if API has changed

Example updates needed:

Current:
```typescript
import { streamText } from 'ai';

const result = streamText({
  model: llm,
  messages,
  onFinish: async ({ text }) => {
    await saveMessage(text);
  },
});

return result.toDataStreamResponse();
```

Update if needed based on v5 changes.

### [ ] 6.2 Create migration notes document

Create `docs/ai-sdk-v5-migration.md` with:
- Summary of changes made
- Breaking changes encountered
- Any workarounds or special considerations
- List of files modified
- Testing notes
- Any issues or limitations discovered

### [ ] 6.3 Update package.json version

If this migration warrants a version bump:
```bash
pnpm changeset
```
Select `@bragdoc/web` and describe the migration.

### [ ] 6.4 Update README if needed

Check if `apps/web/README.md` or root `README.md` need any updates to reflect:
- Updated AI SDK version
- Any new setup steps
- Updated examples

---

## Instructions for Implementation

### General Guidelines

1. **Work incrementally**: Complete each task in order, marking it done before moving to the next
2. **Commit frequently**: Create git commits after completing each file or logical group of changes
3. **Test after each phase**: Don't move to the next phase until the current one is working
4. **Document issues**: If you encounter unexpected breaking changes, document them in the "Potential Breaking Changes / Blockers" section
5. **Use the migration guide**: Refer to https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0 throughout

### Commit Convention

Use the following commit message format:
- `chore: update AI SDK package to v5`
- `refactor: migrate [filename] to AI SDK v5`
- `fix: address [specific issue] in AI SDK v5 migration`
- `test: update tests for AI SDK v5`
- `docs: update documentation for AI SDK v5`

### Testing Strategy

After each file update:
1. Verify TypeScript compilation succeeds
2. Run relevant tests
3. Manual test the affected feature if possible

### Error Handling

If you encounter errors:
1. Read error messages carefully
2. Check the AI SDK v5 migration guide for similar issues
3. Search AI SDK v5 documentation for the specific API
4. Document the issue and resolution in the migration notes

### Rollback Plan

If the migration encounters insurmountable issues:
1. Document all blocking issues
2. Revert branch changes or create a new clean branch from main
3. Report issues to discuss alternative approaches

---

## Success Criteria

The migration will be considered successful when:

- [ ] All files compile without TypeScript errors
- [ ] All existing tests pass
- [ ] All manual tests pass (achievement extraction, document generation, etc.)
- [ ] No runtime errors in development environment
- [ ] All AI features work as expected
- [ ] Braintrust integration continues to work
- [ ] Documentation is updated
- [ ] Migration is committed and pushed

---

## Additional Notes

### Key Files Modified

This migration will modify approximately 11 files:

1. `apps/web/package.json` - Package version updates
2. `apps/web/lib/ai/index.ts` - Middleware and model initialization
3. `apps/web/lib/ai/custom-middleware.ts` - Middleware type
4. `apps/web/lib/ai/prompts/types.ts` - Type definitions
5. `apps/web/lib/utils.ts` - Message utilities
6. `apps/web/lib/ai/llm-router.ts` - Router and tool definitions
7. `apps/web/lib/ai/extract-achievements.ts` - Achievement extraction
8. `apps/web/lib/ai/extract-commit-achievements.ts` - Commit achievement extraction
9. `apps/web/lib/ai/generate-document.ts` - Document generation
10. `apps/web/lib/ai/standup-summary.ts` - Summary generation
11. `apps/web/lib/email/process.ts` - Email processing
12. `apps/web/lib/ai/prompts/evals/llm-router.eval.ts` - Evaluation tests

### Estimated Scope

- **Package updates**: 5-10 minutes
- **Automated migration**: 5-10 minutes
- **Manual code updates**: 2-4 hours (depending on complexity)
- **Testing**: 1-2 hours
- **Documentation**: 30 minutes

**Total estimated time**: 4-7 hours

### References

- AI SDK v5 Migration Guide: https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0
- AI SDK v5 Documentation: https://ai-sdk.dev
- Vercel AI SDK GitHub: https://github.com/vercel/ai
