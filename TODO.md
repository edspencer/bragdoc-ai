# TODO List

## Database Enhancements

### Company Support
- [x] Add `company` table
  ```typescript
  company {
    id: uuid
    userId: uuid // owner of this company record
    name: string
    domain: string? // optional for email matching
    role: string // user's role at this company
    startDate: timestamp
    endDate: timestamp?
  }
  ```
- [x] Add company reference to `brag` table
- [x] Add company reference to `document` table

### Project Management
- [ ] Add `project` table
  ```typescript
  project {
    id: uuid
    userId: uuid
    companyId: uuid
    name: string
    description: text?
    startDate: timestamp?
    endDate: timestamp?
  }
  ```
- [ ] Add project reference to `brag` table

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

### Authentication
- [ ] Set up NextAuth.js
  - [ ] Email/password authentication
  - [ ] Google OAuth integration
  - [ ] GitHub OAuth integration
- [ ] Create user database schema
- [ ] Add authentication middleware
- [ ] Implement protected routes
- [ ] Add user session management

### GitHub Integration
- [ ] Set up GitHub OAuth application
- [ ] Implement repository connection
  - [ ] Add repository selection UI
  - [ ] Store repository metadata
- [ ] Create Brag extraction from Git history
  - [ ] Parse commit messages
  - [ ] Extract pull request descriptions
  - [ ] Process issue comments
- [ ] Implement Project creation from repositories
  - [ ] Auto-generate project structure
  - [ ] Map repository timeline to Brags
- [ ] Add premium feature flagging for retro-active scanning

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

### UI/UX Improvements
- [ ] Add company selection in UI
- [ ] Add project management interface
- [ ] Create tag management system
- [ ] Add email preferences configuration
- [ ] Enhance document generation interface with more options

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
