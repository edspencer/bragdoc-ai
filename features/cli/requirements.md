# Requirements for Bragdoc CLI

## Overview

The `bragdoc` CLI tool enables users to extract achievements from their local git repositories and push them to the bragdoc.ai service. This includes private repositories or environments where direct GitHub API access isn't possible. The tool will:

- Identify and parse commits from the user's local git repo
- Extract pull request details when available locally
- Send the collected commit data to bragdoc.ai for achievement extraction
- Provide a smooth authentication flow and handle session tokens securely
- Allow users to configure identities, time ranges, and other extraction parameters

## NPM Package Strategy & Naming

- **CLI Package**: `@bragdoc/cli`
  - Globally installed CLI tool exposed under the `bragdoc` command
  - Provides all the features for local git extraction and uploading commits

### Global Installation & Usage
```bash
npm install -g @bragdoc/cli
bragdoc extract
```

Alternatively, for local dev environments:
```bash
npm install --save-dev @bragdoc/cli
npx bragdoc extract
```

## Package Structure

```
@bragdoc/cli/
├── src/
│   ├── commands/         # Command implementations (extract, auth, etc.)
│   ├── git/              # Git interaction utilities
│   ├── config/           # Configuration management and .bragdoc file handling
│   └── utils/            # Utility modules (caching, logging)
├── package.json
└── README.md
```

## Core Features

### Git Integration
- Detect whether the current directory is within a git repository. If not, display a clear error (`"Not a git repository. Please navigate to a valid repo and retry."`) and exit
- Extract commits from:
  - Current HEAD by default
  - Full history or a time-limited history based on config or CLI flags
  - A specific branch if specified by `--branch, -b`
- Handle large repositories gracefully:
  - By default, limit extraction to recent commits (e.g., last 30 days or a configurable default)
  - Provide CLI options (`--time-range`, `--full-history`) to override this limit

### Achievement Processing
- Batch processing of commits to minimize API calls (default max: 100 commits per batch)
- Deduplicate previously processed commits using a local cache of processed commit hashes
- If a user wants to reprocess commits (e.g., after updating extraction logic), provide a `--force` or `--clear-cache` option to ignore cached entries
- `--dry-run` option to show which commits would be processed without actually sending data to the API

### Configuration

#### Configuration Precedence
- Command-line flags override `.bragdoc` configuration settings
- `.bragdoc` configuration overrides built-in defaults
- Document these precedence rules in the README

#### .bragdoc Configuration File
```typescript
interface BragdocConfig {
  gitIdentities?: {
    name?: string;
    email: string;
  }[];
  timeFrame?: {
    start?: Date;
    end?: Date;
    maxDays?: number; // default extraction window
  };
  cacheDir?: string;  // default: ~/.bragdoc/cache
  maxCommitsPerBatch?: number; // default: 100
  defaultBranchOnly?: boolean; // if true, `bragdoc extract` uses current branch by default
  repositories?: {
    path: string;
    name?: string;
    enabled?: boolean;
    maxCommits?: number;
  }[];
}
```

#### CLI Options
- `--branch, -b`: Extract from the current branch only (overrides `defaultBranchOnly` setting)
- `--time-range`: Specify time range (e.g., "1w", "3m", "1y"). Overrides config `timeFrame`
- `--identity`: Specify git identity to filter by. If provided, overrides `.bragdoc` identities
- `--no-cache`: Skip checking cache; still writes new entries to cache after processing
- `--dry-run`: Show commits that would be processed without sending them
- `--full-history`: Disable time-based extraction limits and process the entire repo history

### Configuration Management

#### Directory Structure
```
~/.bragdoc/
├── config.yml          # Main configuration file
└── cache/             # Directory for storing cache files
    └── commits/       # Cached commit hashes by repository
```

#### Configuration File Format
```yaml
# ~/.bragdoc/config.yml

# Authentication
auth:
  token: string        # CLI authentication token
  expires_at: number   # Unix timestamp for expiration

# Repository Management
repositories:
  - path: "/Users/username/projects/repo1"
    name: "Project 1"  # Optional friendly name
    enabled: true      # Whether to include in 'extract all'
    maxCommits: 500    # Maximum commits to extract (overrides global setting)
    
  - path: "/Users/username/work/repo2"
    name: "Work Project"
    enabled: true
    maxCommits: 1000   # Larger history for work project
    
  - path: "/Users/username/experiments/repo3"
    name: "Side Project"
    enabled: false     # Temporarily disabled
    maxCommits: 100    # Smaller history for side project

# Global Settings
settings:
  defaultTimeRange: "30d"  # Default time range for extractions
  maxCommitsPerBatch: 100  # How many commits to send in each API request
  defaultMaxCommits: 300   # Default max commits if not specified per repository
  cacheEnabled: true
```

#### Repository Management Commands

1. **List Repositories**:
   ```bash
   bragdoc repos list
   # Output:
   # ✓ Project 1 (/Users/username/projects/repo1) [max: 500]
   # ✓ Work Project (/Users/username/work/repo2) [max: 1000]
   # ⨯ Side Project (/Users/username/experiments/repo3) [disabled] [max: 100]
   ```

2. **Add Repository**:
   ```bash
   bragdoc repos add [path] --name "Project Name" --max-commits 500
   # Adds current directory if path not specified
   # Uses defaultMaxCommits from settings if --max-commits not specified
   ```

3. **Update Repository Settings**:
   ```bash
   bragdoc repos update [path] --max-commits 1000
   # Updates settings for specified repository
   ```

4. **Remove Repository**:
   ```bash
   bragdoc repos remove [path]
   # Removes current directory if path not specified
   ```

5. **Enable/Disable Repository**:
   ```bash
   bragdoc repos enable [path]
   bragdoc repos disable [path]
   ```

#### Extract Commands

1. **Extract from Current Repository**:
   ```bash
   bragdoc extract
   # Extracts from current directory if it's a git repository
   ```

2. **Extract from All Enabled Repositories**:
   ```bash
   bragdoc extract all
   # Extracts from all enabled repositories in config.yml
   ```

3. **Extract with Repository Filter**:
   ```bash
   bragdoc extract --repo "Project 1"  # Extract from specific repository by name
   bragdoc extract --repo-path "/path/to/repo"  # Extract from specific path
   ```

#### Repository Auto-Discovery

1. **Scan for Repositories**:
   ```bash
   bragdoc repos scan [root_directory]
   # Scans directory tree for git repositories
   # Prompts user to add discovered repositories
   ```

2. **Auto-add Current Repository**:
   - When running `bragdoc extract` in a new repository
   - Prompt user to add to config if not already present
   - Option to always add new repositories: `--auto-add`

#### Configuration File Management

1. **Edit Configuration**:
   ```bash
   bragdoc config edit
   # Opens config.yml in system default editor
   ```

2. **View Configuration**:
   ```bash
   bragdoc config view
   # Displays current configuration (with sensitive values masked)
   ```

3. **Set Configuration Values**:
   ```bash
   bragdoc config set settings.defaultTimeRange "7d"
   bragdoc config set settings.maxCommitsPerBatch 50
   ```

#### Security Considerations

1. **File Permissions**:
   - `~/.bragdoc` directory: 700 (drwx------)
   - `config.yml`: 600 (-rw-------)
   - Ensure secure creation of new files

2. **Token Storage**:
   - Tokens stored in YAML with appropriate file permissions
   - Consider encrypting tokens at rest (optional future improvement)

3. **Repository Validation**:
   - Validate repository paths exist and are git repositories
   - Validate user has read access to repositories
   - Handle broken symlinks and invalid paths gracefully

### Authentication & Security

#### CLI Authentication Flow

1. **Browser Authentication**:
   - When user runs `bragdoc login`, CLI opens default browser
   - Browser loads `/cli-auth` page with state parameter
   - If user not logged in, redirects to normal login flow
   - After authentication, page shows success message
   - Token automatically sent to CLI via local callback server

2. **Token Management**:
   ```yaml
   # ~/.bragdoc/config.yml
   auth:
     token: string        # CLI authentication token
     expires_at: number   # Unix timestamp for expiration
   ```

3. **CLI Auth Commands**:
   ```bash
   # Login via browser
   bragdoc login
   
   # Check auth status
   bragdoc auth status
   
   # Logout/remove token
   bragdoc logout
   ```

4. **Token Revocation**:
   - Users can revoke CLI access from web UI
   - Lists all active CLI tokens with device names
   - Shows last used timestamp for each token

#### Security Considerations

1. **Token Security**:
   - Use long-lived (30 day) revocable tokens
   - Store tokens securely in config file
   - Track device information for each token
   - Never log or display tokens

2. **State Validation**:
   - Generate cryptographically secure state parameter
   - Validate state in callback to prevent CSRF
   - Use short-lived state tokens (5 minute max)

3. **Error Handling**:
   - Clear error messages for auth failures
   - Graceful handling of browser/network issues
   - Clear guidance for re-authentication
   - Timeout after 5 minutes if browser flow not completed

## Future Improvements

### API Client Package
- Create a separate `@bragdoc/api-client` package
- Provide a TypeScript wrapper around the bragdoc.ai API endpoints
- Include authentication management, batch submission, and status checking
- Enable programmatic interaction with bragdoc.ai (e.g., for CI/CD pipelines)