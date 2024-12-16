# GitHub Integration Implementation Plan

## Overview
Implement GitHub integration to extract achievements from user's repositories, focusing on commit messages and pull request descriptions.

## Database Schema Updates 

### 1. GitHub Repository Table 
```sql
GitHubRepository {
    id: uuid PRIMARY KEY
    userId: uuid REFERENCES User(id)
    name: varchar(256)
    fullName: varchar(512)  // owner/repo format
    description: text
    private: boolean
    lastSynced: timestamp
    createdAt: timestamp
    updatedAt: timestamp
}
```

### 2. GitHub Pull Request Table 
```sql
GitHubPullRequest {
    id: uuid PRIMARY KEY
    repositoryId: uuid REFERENCES GitHubRepository(id)
    prNumber: integer
    title: varchar(512)
    description: text
    state: varchar(32)  // open, closed, merged
    createdAt: timestamp
    updatedAt: timestamp
    mergedAt: timestamp
    bragId: uuid REFERENCES Brag(id)  // null until processed into a brag
}
```

## Implementation Progress

### Authentication & GitHub Integration
✅ Extended NextAuth types to support GitHub access token
- Added proper type definitions for User and Session
- Implemented token handling in auth callbacks
- Fixed TypeScript errors in GitHub integration components

### Next Steps
1. Implement repository selection UI
2. Store selected repositories in GitHubRepository table
3. Implement periodic sync of commit messages and PR descriptions
4. Add achievement extraction from GitHub data

## Next Steps

1. GitHub API Integration 
   - Set up GitHub API client with proper typing 
   - Implement repository listing and selection 
   - Add PR fetching functionality 
   - Handle pagination and rate limiting 

2. UI Components 
   - Create repository selection modal 
   - Add repository list view 
   - Implement repository sync status indicators 
   - Add PR viewing interface 

3. Background Jobs
   - Implement periodic repository sync
   - Add PR processing to extract achievements
   - Set up webhook handling for real-time updates

4. Brag Generation
   - Create AI prompt templates for PR analysis
   - Implement PR to Brag conversion logic
   - Add manual review/edit capability

## Testing Plan
1. Unit Tests
   - GitHub API client methods
   - Database operations
   - PR processing logic

2. Integration Tests
   - Repository sync flow
   - PR to Brag conversion
   - Webhook handling

3. UI Tests
   - Repository selection flow
   - Sync status updates
   - Error handling

## Security Considerations
- Secure storage of GitHub access tokens
- Proper scope handling for GitHub OAuth
- Rate limiting for API calls
- Access control for private repositories

## Rollout Plan
1. Alpha Testing
   - Internal testing with team repositories
   - Validate PR processing accuracy
   - Monitor API usage and rate limits

2. Beta Release
   - Limited user group testing
   - Gather feedback on UI/UX
   - Monitor system performance

3. General Release
   - Full feature rollout
   - Documentation updates
   - User guides and tutorials

## Completed Tasks 
1. Database Schema
   - Added GitHubRepository and GitHubPullRequest tables to schema.ts
   - Generated migration (0007_premium_barracuda.sql)
   - Applied migration to database

2. GitHub API Integration
   - Created GitHubClient class with TypeScript types
   - Implemented repository listing with pagination
   - Added PR fetching functionality
   - Added proper error handling and rate limit awareness

3. UI Components
   - Created RepositorySelector component using Shadcn UI
   - Implemented GitHub settings page
   - Added repository list view with sync status
   - Added PR viewing interface