# CLI Tool Requirements

## Overview
The bragdoc CLI tool enables users to extract achievements from their local git repositories, automatically creating brag entries from commit messages and pull request descriptions. This allows users to maintain their brag document even when working with private repositories that can't be accessed via the GitHub API.

## Package Structure
```
@bragdoc/cli/
├── src/
│   ├── commands/           # Command implementations
│   ├── git/               # Git interaction utilities
│   ├── config/            # Configuration management
│   └── api/               # API client for bragdoc.ai
├── package.json
└── README.md
```

## NPM Package Strategy
- Main CLI Package: `@bragdoc/cli`
- API Client Package: `@bragdoc/api-client` (separate package for programmatic API access)
- Shared Types Package: `@bragdoc/types` (shared TypeScript types between packages)

## Core Features
### Git Integration
- Extract commits from local git repositories
- Support for multiple git user identities (name/email)
- Branch-specific extraction (`-b` flag)
- Configurable time range for commit history
- Deduplication of previously processed commits
- Support for extracting PR descriptions (when available)

### Achievement Processing
- Batch processing of commits to minimize API calls
- Local caching of processed commits
- Progress indicators for long-running operations
- Rate limiting for API calls
- Error handling and retry logic

### Configuration
#### .bragdoc Configuration File
```typescript
interface BragdocConfig {
  gitIdentities: {
    name?: string;
    email: string;
  }[];
  timeFrame: {
    start?: Date;
    end?: Date;
    maxDays?: number;
  };
  cacheDir?: string;
  maxCommitsPerBatch?: number;
}
```

#### CLI Options
- `--branch, -b`: Extract from current branch only
- `--time-range`: Specify time range (e.g., "1w", "3m", "1y")
- `--identity`: Specify git identity to filter by
- `--no-cache`: Skip cache check
- `--dry-run`: Show what would be extracted without sending to API

## Authentication
### Browser-Based Authentication Flow
1. When user runs `bragdoc auth login`:
   - Generate a unique state token
   - Open browser to `https://bragdoc.ai/cli-auth?state={state}`
   - Start local HTTP server on ephemeral port to receive callback
   - After user authenticates in browser, receive and store session token

2. Web Authentication Flow:
   - User logs in via NextAuth if not already authenticated
   - After successful auth, redirect to CLI callback URL
   - CLI stores session securely in system keychain

3. Session Management:
   - Sessions stored securely in system keychain
   - Support for environment variable override (for CI/CD)
   - Automatic session refresh when needed

### Required API Endpoints
```typescript
// CLI Authentication endpoints
POST /api/cli/auth/session
  - Exchange callback data for session token
  - Protected by state parameter to prevent CSRF

POST /api/cli/auth/refresh
  - Refresh expired session
  - Requires valid session token

POST /api/cli/auth/revoke
  - Revoke CLI access
  - Invalidate session

// Achievement extraction endpoints
POST /api/cli/achievements/batch
  - Submit multiple commits for processing
  - Rate limited
  - Supports deduplication
  - Returns processing status

GET /api/cli/achievements/status
  - Check processing status of batch
  - Returns processed achievements
```

### Security Considerations
- Implement PKCE (Proof Key for Code Exchange) flow
- Use system keychain for session storage
- Support for multiple authenticated sessions
- Automatic session refresh
- Rate limiting per user
- Proper scope limitations for CLI sessions

## Technical Implementation
### Git Commit Processing
- Use nodegit or simple-git for repository access
- Store commit hashes in local cache to prevent duplicates
- Implement smart batching to handle large commit histories

### API Integration
- Authentication via session token stored in system keychain
- Batch API calls to minimize requests
- Handle rate limiting and retries
- Cache successful submissions

### Performance Considerations
- Implement commit batching (default max: 100 commits per API call)
- Local caching of processed commits
- Configurable rate limiting
- Progress bars for long-running operations

## Installation & Usage
```bash
# Global installation
npm install -g @bragdoc/cli

# Local installation
npm install --save-dev @bragdoc/cli

# Usage
bragdoc extract              # Extract from current repo
bragdoc extract -b          # Extract from current branch (default?)
bragdoc config add-identity # Add git identity
```

## Error Handling
- Clear error messages for common issues:
  - Missing session token
  - Invalid git repository
  - Network failures
  - Rate limiting
- Logging levels (error, warn, info, debug)
- Option to output errors in JSON format

## Security
- Sessions stored securely in user's home directory
- No sensitive data cached locally
- Support for environment variable configuration
- Option to disable telemetry

## Future Considerations
- Support for additional VCS systems (Mercurial, SVN)
- Integration with CI/CD pipelines
- Team-wide configuration sharing
- Custom achievement templates
- Offline mode with sync
