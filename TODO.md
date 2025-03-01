# TODO List

### Marketing pages

- [ ] Restore HowIntegrations component
- [ ] Restore BragDocExamples component
- [ ] Restore FeaturesDesktop component (SecondaryFeatures.tsx - hidden screenshots)

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

### General Tasks

- [ ] GDPR Compliance
- [ ] https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0305#onupdate-functionality-for-postgresql-mysql-and-sqlite

### Email Integration

- [ ] Set up email response system
- [ ] Create email templates for different types of notifications

### Reminder System

- [ ] Implement reminder scheduling service
- [ ] Create reminder logic based on user preferences
- [ ] Set up notification triggers for long periods of inactivity

### Document Generation

- [ ] Enhance document templates for different time periods
- [ ] Add user-specific document formatting (e.g. a system prompt)
- [ ] Implement project-based filtering for documents

### LLM Tools

- [ ] Automatically prepend achievements to LLM context (perhaps only up to 100 achievements)
- [ ] Automatically expose all userPreferences for the user with the LLM context
- [ ] getAchievements tool? - vector search on achievements
- [ ] saveUserPreferences tool - should be called whenever the user says things like "Always arrange this (weekly report) into sections by project"

### API Docs

- [x] Create an OpenAPI spec for the API (swagger.json created via RepoPrompt sending content of all route.ts files to LLM and asking for a swagger spec)
- [ ] Need to automate this process of extracting OpenAPI spec
- [ ] Need to set up hosting (github pages ideally). Ideally can serve a static swagger API docs UI on github pages. CNAME docs.bragdoc.ai to it

### NPM CLI

- [ ] Add support for NPM CLI

### Achievements UI & API

- [x] Implement Achievements UI - similar CRUD options as we have for Companies and Projects
- [x] Implement Achievements API - similar to Companies and Projects
- [x] Jest tests for Achievements API

### Bugs

- [ ] What happens when a project or company is deleted but it's referenced in an achievement?
- [ ] Counts in bottom left nav don't update when things are added/deleted
- [ ] Next Auth account linking doesn't work
- [ ] LLM-generated testimonials are lies and should be removed
- [ ] When we create an Achievement linked to a Project but the Company was not provided, use the Project's Company ID

## Tech Debt

- [x] updateSchema in app/api/achievements/[id]/route.ts should not exist - use drizzle type
- [ ] Add route tests for app/api/user/route.ts
- [ ] Integrate the empty-state component into Chat UI
- [ ] Revisit projects/companies welcome card - don't want people actually adding projects/companies there (chat/action-buttons.tsx)
- [ ] Do we even use components/welcome/animated-text?
- [ ] Add test for getUserById in lib/db/queries.ts

### UI/UX Improvements

- [ ] New/Edit Achievement modal is tall - need to make it scrollable for shorter screen heights
- [ ] Add email preferences configuration
- [ ] Stream Achievements into the UI one by one instead of all as a response from extractAchievements
- [ ] Ability to delete many achievements at once?

## Testing Infrastructure

- [ ] Add support for React component testing
  - [ ] Configure Jest to support both Node and jsdom environments
  - [ ] Set up proper test file organization (.node.test.ts vs .test.tsx)

## Conversation Examples & Testing

### Example Conversations

- [ ] Create example conversations for:
  - [ ] Single achievement logging (e.g., "I just finished project X")
  - [ ] Batch achievement logging (e.g., "Here's what I did last week...")
  - [ ] Performance review document generation
  - [ ] Weekly update for manager
  - [ ] Monthly update for skip-level manager
  - [ ] Handling blockers and challenges
  - [ ] Cross-company career progression

### LLM Prompt Engineering

- [ ] Design prompts for:
  - [x] Extracting brag-worthy achievements from casual conversation
  - [x] Categorizing achievements by impact level
  - [ ] Generating different document styles (formal review vs casual update)
  - [ ] Asking follow-up questions to gather missing context

### Evals

- [ ] Create evals cases for:
  - [ ] Different writing styles and verbosity levels
  - [ ] Multiple achievements in single message
  - [ ] Ambiguous time periods
  - [ ] Missing context that requires follow-up
  - [ ] Cross-referencing previous achievements
  - [ ] Different document formats and lengths
  - [ ] Multi-language support
