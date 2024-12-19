# TODO List

## Database Enhancements

### Achievement Metadata
- [ ] Add tagging system
  ```typescript
  bragTag {
    bragId: uuid
    tag: string
    primary key (bragId, tag)
  }
  ```
- [ ] Add impact field to `brag` table
- [ ] Add metrics/quantification fields to `brag` table

### User Preferences & Engagement
- [ ] Add `userPreferences` table
  ```typescript
  userPreferences {
    userId: uuid
    emailReminders: boolean
    reminderFrequency: enum ('daily', 'weekly', 'monthly')
    emailIntegrationEnabled: boolean
    lastReminderSent: timestamp?
    lastBragDate: timestamp?
    languagePreference: enum ('en', 'es', 'fr')
  }
  ```

## Feature Implementation 

### Ancillary Pages

- [x] Add "About" page at /about
- [x] Add "Pricing" page at /pricing
- [x] Add "Terms of Service" page at /terms
- [x] Add "Privacy Policy" page at /privacy

### Authentication
- [x] Set up NextAuth.js
  - [x] Email/password authentication
  - [x] Google OAuth integration
  - [-] GitHub OAuth integration (in progress)
    - [x] OAuth app setup
    - [x] Provider configuration
    - [ ] Loading states and error handling
    - [ ] Repository access implementation
- [x] Create user database schema
  - [x] Add OAuth-specific fields
  - [x] Fix table naming conventions
- [x] Add authentication middleware
- [x] Implement protected routes
- [x] Add user session management

### GitHub Integration
- [x] Set up GitHub OAuth
- [x] Store GitHub access token
- [x] Implement repository sync
- [x] Implement PR sync with upsert
- [x] Add repository list view
- [x] Add sync button per repository
- [x] Add last synced timestamp
- [x] Add basic error handling
- [ ] Add loading spinner to sync button
- [ ] Add toast notifications for sync status
- [ ] Add repository search/filter
- [ ] Add pagination (currently limited to 30)
- [ ] Extract achievements from PR descriptions
- [ ] Add automatic tagging based on PR content
- [ ] Create brag entries from significant PRs
- [ ] Add integration tests for GitHub sync
- [ ] Add rate limiting protection

### General Tasks
- [ ] GDPR Compliance

### Email Integration
- [ ] Set up email receiving service
- [ ] Implement email parsing for brag extraction
- [ ] Set up email response system
- [ ] Create email templates for different types of notifications

### Reminder System
- [ ] Implement reminder scheduling service
- [ ] Create reminder logic based on user preferences
- [ ] Set up notification triggers for long periods of inactivity

### Document Generation
- [ ] Enhance document templates for different time periods
- [ ] Add company-specific document formatting
- [ ] Implement project-based filtering for documents

### LLM Tools
- [ ] Automatically prepend brags to LLM context (perhaps only up to 100 brags)
- [ ] Automatically expose all companies and libraries for the user with the LLM context
- [ ] Automatically expose all userPreferences for the user with the LLM context
- [ ] getBrags tool? - vector search on brags
- [ ] saveUserPreferences tool - should be called whenever the user says things like "Always arrange this (weekly report) into sections by project
- [ ] 
- [ ] 

### UI/UX Improvements
- [x] Add company management in UI
- [ ] Add project management interface
- [ ] Create tag management system
- [ ] Add email preferences configuration
- [ ] Enhance document generation interface with more options
- [ ] Stream Brags into the UI one by one instead of all as a response from extractBrags
- [x] Show something in the UI BragAction component before the first one streams in - "Thinking..." or something
- [ ] Fix calendar/date picker components throughout the app
  - Calendar appears behind modal overlays
  - Click events are intercepted by modal overlays
  - Affects all date pickers in modals (project dates, etc.)
  - Need to investigate proper z-index and event handling in shadcn components

## Business Model Implementation
- [ ] Set up Stripe/Link integration
  - [ ] Configure payment processing
  - [ ] Set up subscription plans
  - [ ] Implement usage tracking
- [ ] Implement tiered features
  - [ ] Free tier
    - [ ] Usage limitations
    - [ ] Usage tracking
  - [ ] Mid Account ($3/month, $30/year)
    - [ ] Unlimited Brags/Docs
    - [ ] Remove usage limitations
  - [ ] Pro Account ($9/month, $90/year)
    - [ ] GitHub integration
- [ ] Add subscription management
  - [ ] Upgrade/downgrade flows
  - [ ] Billing history
  - [ ] Payment method management

## Testing Infrastructure
- [ ] Add support for React component testing
  - [ ] Configure Jest to support both Node and jsdom environments
  - [ ] Set up proper test file organization (.node.test.ts vs .test.tsx)
  - [ ] Add examples and documentation for component testing
  - [ ] Ensure proper mocking of Next.js features (router, etc)

## Conversation Examples & Testing

### Example Conversations
- [ ] Create example conversations for:
  - [ ] Single brag logging (e.g., "I just finished project X")
  - [ ] Batch brag logging (e.g., "Here's what I did last week...")
  - [ ] Performance review document generation
  - [ ] Weekly update for manager
  - [ ] Monthly update for skip-level manager
  - [ ] Handling blockers and challenges
  - [ ] Cross-company career progression

### LLM Prompt Engineering
- [ ] Design prompts for:
  - [ ] Extracting brag-worthy achievements from casual conversation
  - [ ] Categorizing achievements by impact level
  - [ ] Identifying quantifiable metrics in achievements
  - [ ] Generating different document styles (formal review vs casual update)
  - [ ] Maintaining consistent tone across interactions
  - [ ] Asking follow-up questions to gather missing context

### Testing & Validation Scenarios
- [ ] Create test cases for:
  - [ ] Different writing styles and verbosity levels
  - [ ] Multiple achievements in single message
  - [ ] Ambiguous time periods
  - [ ] Missing context that requires follow-up
  - [ ] Cross-referencing previous achievements
  - [ ] Different document formats and lengths
  - [ ] Multi-language support

### Mock Data Generation
- [ ] Create realistic mock data for:
  - [ ] User profiles with different career paths
  - [ ] Various company types and roles
  - [ ] Achievement patterns over time
  - [ ] Document templates for different purposes
  - [ ] Email interactions and reminders
  - [ ] Project progression and milestones

## Testing & Validation
- [ ] Add tests for new database models
- [ ] Add tests for email integration
- [ ] Add tests for reminder system
- [ ] Add tests for enhanced document generation
