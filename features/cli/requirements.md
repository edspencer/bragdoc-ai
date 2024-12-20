# Requirements for Bragdoc CLI & API Client

## Overview

The `bragdoc` CLI tool enables users to extract achievements from their local git repositories and push them to the bragdoc.ai service. This includes private repositories or environments where direct GitHub API access isn’t possible. The tool will:

- Identify and parse commits from the user’s local git repo.
- Optionally extract pull request details (if accessible locally).
- Send the collected commit data to bragdoc.ai for achievement extraction.
- Provide a smooth authentication flow and handle session tokens securely.
- Allow users to configure identities, time ranges, and other extraction parameters.

A companion API client library will also be released to npm to allow programmatic interaction with bragdoc.ai (e.g., integrating into custom CI/CD pipelines).

## NPM Package Strategy & Naming

- **CLI Package**: `@bragdoc/cli`
  - Globally installed CLI tool exposed under the `bragdoc` command.
  - Provides all the features for local git extraction and uploading commits.
- **API Client Package**: `@bragdoc/api-client`
  - A wrapper around the bragdoc.ai API endpoints.
  - Includes authentication management, batch submission, and status checking.
- **Shared Types Package**: `@bragdoc/types`
  - Shared TypeScript interfaces and types used by `@bragdoc/cli` and `@bragdoc/api-client`.

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
│   ├── api/              # API client integration using @bragdoc/api-client
│   └── utils/            # Utility modules (caching, logging)
├── package.json
└── README.md
```

## Core Features

### Git Integration
- Detect whether the current directory is within a git repository. If not, display a clear error (`"Not a git repository. Please navigate to a valid repo and retry."`) and exit.
- Extract commits from:
  - Current HEAD by default.
  - Full history or a time-limited history based on config or CLI flags.
  - A specific branch if specified by `--branch, -b`.
- Handle large repositories gracefully:
  - By default, limit extraction to recent commits (e.g., last 30 days or a configurable default).
  - Provide CLI options (`--time-range`, `--full-history`) to override this limit.

### Achievement Processing
- Batch processing of commits to minimize API calls (default max: 100 commits per batch).
- Deduplicate previously processed commits using a local cache of processed commit hashes.
- If a user wants to reprocess commits (e.g., after updating extraction logic), provide a `--force` or `--clear-cache` option to ignore cached entries.
- `--dry-run` option to show which commits would be processed without actually sending data to the API.

### Configuration

#### Configuration Precedence
- Command-line flags override `.bragdoc` configuration settings.
- `.bragdoc` configuration overrides built-in defaults.
- Document these precedence rules in the README.

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
}
```

#### CLI Options
- `--branch, -b`: Extract from the current branch only (overrides `defaultBranchOnly` setting).
- `--time-range`: Specify time range (e.g., "1w", "3m", "1y"). Overrides config `timeFrame`.
- `--identity`: Specify git identity to filter by. If provided, overrides `.bragdoc` identities.
- `--no-cache`: Skip checking cache; still writes new entries to cache after processing.
- `--dry-run`: Show commits that would be processed without sending them.
- `--full-history`: Disable time-based extraction limits and process the entire repo history.
- `--force` or `--clear-cache`: Clear cached commit hashes and reprocess them.

## Authentication

### Workflow
1. `bragdoc auth login`:
   - Opens the browser to `https://bragdoc.ai/cli-auth?state={state}`.
   - CLI starts a local HTTP server to receive callback.
   - On successful login, CLI stores session token securely using the system keychain.
   
2. `bragdoc auth logout` or `bragdoc auth revoke`:
   - Revokes CLI access and removes local session token.
   
3. Environments without a system keychain (e.g., headless CI):
   - Environment variable fallback for storing tokens.
   - Document best practices for secure token handling in CI.

4. Sessions:
   - Automatically refreshed as needed.
   - Support for multiple authenticated sessions if needed.

### Required API Endpoints
```typescript
POST /api/cli/auth/session    // Exchange callback data for session token
POST /api/cli/auth/refresh    // Refresh expired session
POST /api/cli/auth/revoke     // Revoke CLI session

POST /api/cli/achievements/batch   // Submit multiple commits for processing
GET  /api/cli/achievements/status  // Check processing status of a batch
```

## Security Considerations
- Implement PKCE (Proof Key for Code Exchange) flow.
- Store sessions in system keychain or secure environment variable.
- Rate limit API calls.
- Sensitive data should never be written to disk in plaintext.

## API Integration
- Use `@bragdoc/api-client` for all API interactions.
- Handle partial successes/failures from the API:
  - Retry failed batches with exponential backoff.
  - If non-recoverable, print a clear error and indicate which commits failed.
- Display progress indicators for large operations.

## Caching & Deduplication
- Maintain a local cache of processed commit hashes in `cacheDir`.
- On subsequent runs, skip previously processed commits by default.
- Allow `--force` or `--clear-cache` to reprocess them.

## Logging & Error Handling
- `--debug` flag for verbose logging.
- Clear error messages for:
  - Not a git repository.
  - Missing or invalid session token.
  - Network or rate limit issues.
- JSON-formatted errors on request for machine-readable output.

## Example Workflows

### Initial Setup & Extraction
```bash
bragdoc auth login       # Opens browser for authentication
bragdoc extract          # Extract from current repo (default: last 30 days)
```

### Specific Branch & Time Range
```bash
bragdoc extract -b --time-range "1w"
```

### Full History Without Cache
```bash
bragdoc extract --full-history --no-cache
```

### Reprocessing Commits
```bash
bragdoc extract --force   # Clears cache and reprocesses all recent commits
```

## Future Considerations
- Support other VCS systems (e.g., Mercurial, SVN).
- Integrations with CI/CD pipelines (document environment variable auth flows).
- Team-wide configuration or shared config files.
- Custom achievement templates.
- Offline mode with later synchronization.

---

This updated requirements document addresses previous feedback by clarifying configuration precedence, default behaviors, caching logic, authentication flows, error handling, and logging. It also refines the npm package strategy and naming conventions for easier adoption by software engineers.