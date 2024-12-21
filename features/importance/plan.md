# Achievement Impact Feature Implementation Plan

## 1. Database Changes
- [ ] Update `lib/db/schema.ts`:
  ```typescript
  impact: integer('impact')
    .check(sql`impact >= 1 AND impact <= 3`)
    .default(2),
  impactSource: varchar('impact_source', { 
    enum: ['user', 'llm'] 
  }),
  impactUpdatedAt: timestamp('impact_updated_at'),
  ```
- [ ] Generate and run migration using Drizzle. Use pnpm db:push to push changes
- [ ] Add indexes for impact and impactSource fields for efficient filtering

## 2. UI Component Changes

### Create Impact Rating Component
- [ ] Create `components/ui/impact-rating.tsx`:
  - Three-star rating component
  - Props: `value`, `onChange`, `source`, `readOnly`
  - Hover tooltips for each star level: "Low Impact", "Medium Impact", "High Impact"
  - Visual distinction for LLM vs user scores (different color or icon)
  - Immediate update on click with optimistic UI update
  - Accessible keyboard navigation and ARIA labels

### Update Achievement Card
- [ ] Add ImpactRating to `components/achievement-card.tsx`:
  ```typescript
  <ImpactRating 
    value={achievement.impact} 
    source={achievement.impactSource}
    onChange={handleImpactChange}
  />
  ```
- [ ] Add tooltip showing last update time and source
- [ ] Style LLM-scored achievements differently
- [ ] Add loading state for optimistic updates

### Update Achievement Form
- [ ] Add ImpactRating to `components/achievement-form.tsx`
- [ ] Add "Reset to LLM Score" button with confirmation dialog
- [ ] Add impact source indicator with tooltip explanation
- [ ] Ensure form validation includes impact field

## 3. API Changes

### Update Achievement Type
- [ ] Update `types.ts` with new fields:
  ```typescript
  interface Achievement {
    // ...existing fields
    impact: number
    impactSource: 'user' | 'llm'
    impactUpdatedAt: Date
  }
  ```
- [ ] Add Zod validation schema for impact fields

### Update Achievement Mutations
- [ ] Update `lib/db/queries.ts` with impact fields
- [ ] Update achievement update API handler
- [ ] Add optimistic updates in UI
- [ ] Add error handling for invalid impact values
- [ ] Ensure impactUpdatedAt is set on every impact change

## 4. LLM Integration

### Update Chat Processing
- [ ] Modify `lib/ai/process-chat.ts`:
  - Add impact scoring to achievement extraction
  - Include company/project context in scoring
  - Default new achievements to medium impact
  - Add error handling for LLM scoring failures
  - Add retry logic for failed scoring attempts

### Add Braintrust Eval
- [ ] Create `evals/impact-scoring/eval.ts`:
  - Test cases for different achievement types
  - Validate consistency of scoring
  - Check handling of company/project context
  - Test edge cases (empty context, long text)

## 5. Testing

### Unit Tests
- [ ] Test ImpactRating component:
  - Click behavior
  - Keyboard navigation
  - Accessibility
  - Tooltips
- [ ] Test impact validation
- [ ] Test API updates
- [ ] Test LLM scoring
- [ ] Test error states and edge cases

### Integration Tests
- [ ] Test end-to-end achievement updates
- [ ] Test LLM scoring with context
- [ ] Test optimistic updates
- [ ] Test error recovery
- [ ] Test performance with large datasets

## 6. Documentation

### Update API Docs
- [ ] Document impact fields in API schema
- [ ] Add examples of impact scoring
- [ ] Document error cases and handling

### Update UI Docs
- [ ] Document ImpactRating component
- [ ] Add usage examples
- [ ] Document accessibility features

## 7. Deployment

### Database Migration
- [ ] Review migration plan
- [ ] Test migration on staging
- [ ] Schedule production migration
- [ ] Prepare rollback plan

### Feature Release
- [ ] Deploy to staging
- [ ] Test all scenarios
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Set up alerts for error rates

## 8. Post-Launch

### Monitoring
- [ ] Add metrics for impact score distribution
- [ ] Track user vs LLM scoring patterns
- [ ] Monitor performance impact
- [ ] Track error rates and types
- [ ] Monitor database query performance

### User Education
- [ ] Add tooltips explaining impact levels
- [ ] Update help documentation
- [ ] Consider adding onboarding tooltip
- [ ] Create user guide for impact scoring
