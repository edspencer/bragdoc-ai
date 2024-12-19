# Brag to Achievement Rename: Implementation Plan

## Phase 1: Database Schema Changes
**Estimated time: 2-3 hours**

1. Create new migration file `lib/db/migrations/[timestamp]_rename_brag_to_achievement.sql`:
   - Rename `brags` table to `achievements`
   - Update foreign key constraints
   - Update indexes
   - Add rollback statements

2. Update schema definitions in `lib/db/schema.ts`:
   - Rename `brags` table definition to `achievements`
   - Update related table references
   - Update type exports

3. Update database queries in `lib/db/queries.ts`:
   - Update table references
   - Rename query functions
   - Update return types

## Phase 2: Core Type Updates
**Estimated time: 2-3 hours**

1. Create type mapping file `lib/types/achievement.ts`:
   - Define Achievement interface
   - Move types from old location
   - Add type aliases for backward compatibility

2. Update core utility files:
   - `lib/ai/extract.ts`
   - `lib/ai/prompts.ts`
   - `lib/llm-utils.ts`

3. Update test utilities:
   - `test/setup.ts`
   - `test/dataset.test.ts`

## Phase 3: Component Updates
**Estimated time: 3-4 hours**

1. Rename and update components:
   - `components/brag.tsx` → `components/achievement.tsx`
   - Update component props and types
   - Update internal variable names

2. Update marketing components:
   - Review and update as needed:
     - `components/marketing/salient/*.tsx`
     - Keep user-facing "brag" terminology

3. Update GitHub integration:
   - `components/github/RepositorySelector.tsx`
   - Update achievement extraction logic

## Phase 4: API and Route Updates
**Estimated time: 2-3 hours**

1. Update API routes:
   - `app/api/chat/route.ts`
   - Update handler function names
   - Update request/response types

2. Update app routes:
   - `app/(app)/achievements/page.tsx`
   - Update page components
   - Update data fetching logic

## Phase 5: AI/LLM Updates
**Estimated time: 2-3 hours**

1. Update AI prompts and extractors:
   - Review and update prompts in `lib/ai/prompts.ts`
   - Update extraction logic in `lib/ai/extract.ts`
   - Maintain user-facing "brag" terminology

2. Update Braintrust evals:
   - Update eval files in `evals/single-brag/`
   - Update eval files in `evals/context-brag/`
   - Update types and datasets

## Phase 6: Testing
**Estimated time: 3-4 hours**

1. Update test files:
   - `test/companies/queries.test.ts`
   - Add migration tests
   - Update existing test cases

2. Add new tests:
   - Achievement creation/update/delete
   - API endpoint tests
   - Component render tests

3. Run full test suite:
   - Fix any failing tests
   - Update test data and fixtures

## Phase 7: Documentation
**Estimated time: 2-3 hours**

1. Update API documentation:
   - Update endpoint descriptions
   - Update request/response examples

2. Update README and other docs:
   - Update technical references
   - Maintain branding terminology

## Execution Order

1. **Day 1 (6-7 hours)**:
   - Complete Phase 1 (Database Schema)
   - Complete Phase 2 (Core Types)
   - Begin Phase 3 (Components)

2. **Day 2 (6-7 hours)**:
   - Complete Phase 3 (Components)
   - Complete Phase 4 (API/Routes)
   - Complete Phase 5 (AI/LLM)

3. **Day 3 (5-6 hours)**:
   - Complete Phase 6 (Testing)
   - Complete Phase 7 (Documentation)
   - Final testing and verification

## Verification Steps

After each phase:
1. Run the test suite
2. Manual testing of affected components
3. Code review
4. Update progress in this plan

## Rollback Plan

1. **Database**:
   - Keep rollback SQL in migration file
   - Test rollback procedure before deploying

2. **Code**:
   - Create a feature branch
   - Maintain type aliases for compatibility
   - Keep deployment reversible

## Notes

- Total estimated time: 17-20 hours
- Break work into multiple PRs by phase
- Keep commits atomic and well-documented
- Use feature flags if needed for gradual rollout
- Maintain backward compatibility during transition
