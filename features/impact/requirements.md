# Achievement Impact Feature Requirements

## Overview
Add the ability to assign and track impact levels for achievements, enabling users and the LLM to score the relative significance of each accomplishment. This helps users prioritize achievements for different types of performance reviews and documentation.

## Database Schema Changes
Add the following fields to the Achievement table:
```typescript
impact: integer('impact')
  .check(sql`impact >= 1 AND impact <= 3`)
  .default(2),
impactSource: varchar('impact_source', { 
  enum: ['user', 'llm'] 
}),
impactUpdatedAt: timestamp('impact_updated_at'),
```

The impact field uses a 1-3 scale where:
- 1: Low impact - Minor achievements and routine tasks
- 2: Medium impact (default) - Notable achievements that show growth or impact
- 3: High impact - Major achievements with significant impact or recognition

## API Integration
Use existing achievement update endpoint for impact updates:
- `PUT /api/achievements/[id]`
  - Request body includes new fields: `{ impact?: number, impactSource?: 'user' | 'llm' }`
  - Impact updates will be handled as part of regular achievement updates
  - Bulk updates will be handled through background jobs, not requiring a dedicated endpoint

## LLM Integration
### Impact Scoring
- Update existing `/api/chat` endpoint saveAchievements tool to handle impact scoring
- When processing achievements, the LLM should consider:
  - Achievement title and details
  - Company context (if available)
  - Project context (if available)
  - Industry standards and typical career progression
- Add impact scoring to the existing achievement extraction flow
- Add new Braintrust eval to validate impact scoring accuracy

## UI Components
### Achievement Card/List
- Add impact indicator using a 3-star rating - clicking star updates impact immediately.
- Hover over star to see hint at what it means (low, medium, high impact)
- Visual distinction between user-assigned and LLM-assigned scores
- Hover tooltip showing score details and last update time

### Impact Editor
- Add impact field to achievement edit form
- 3-star input for setting impact - label to the right (low, medium, high)
- Clear indication of current score source (user/LLM)
- Option to reset to LLM-generated score

## Filtering & Sorting
- Add impact-based filtering options
- Add impact as a sorting criterion
- Support filtering by score source (user/LLM)

## Performance Considerations
- Implement caching for impact scores
- Batch LLM scoring requests for efficiency
- Rate limit impact update requests

## Migration Plan
1. Add new database fields with NULL as default
2. Deploy schema changes
3. Add API endpoint updates
4. Deploy UI changes
5. Run initial LLM scoring job for existing achievements
6. Enable feature for all users

## Testing Requirements
- Unit tests for impact validation and updates
- Integration tests for API endpoints
- Braintrust eval for LLM scoring accuracy
- UI component tests for impact editor


## Future Enhancements

Work to be completed separately from this feature:

### Background Processing
- Use existing background job system to periodically review achievements
- Group achievements by company/project for more consistent relative scoring
- Never override user-assigned scores