# CLI Architecture

## Overview

`@bragdoc/cli` is a standalone Node.js command-line tool that analyzes local Git repositories and syncs achievements with the BragDoc web application.

## Package Structure

```
packages/cli/src/
├── index.ts                 # CLI entry point (Commander.js)
├── commands/
│   ├── auth.ts             # login, logout, status
│   ├── projects.ts         # add, list, update, enable, disable, remove
│   ├── extract.ts          # Extract achievements from Git commits
│   ├── standup.ts          # enable, disable, wip, status
│   ├── llm.ts              # show, set (LLM provider configuration)
│   ├── cache.ts            # list, clear
│   ├── data.ts             # fetch, clear (sync data from web app)
│   └── wip.ts              # Extract WIP from uncommitted changes
├── api/
│   └── client.ts           # Authenticated API client
├── config/
│   ├── types.ts            # Configuration type definitions
│   ├── index.ts            # CRUD operations for config file
│   └── paths.ts            # ~/.bragdoc paths
├── git/
│   ├── operations.ts       # Git command wrappers (execSync)
│   └── types.ts            # Git data types
├── utils/
│   ├── logger.ts           # Winston logger
│   ├── device.ts           # Device information
│   └── ...
└── ai/                     # Local AI integration (Ollama support)
```

## Configuration File

**Location:** `~/.bragdoc/config.yml`

```yaml
auth:
  token: 'eyJhbGciOiJIUzI1NiJ9...'
  expiresAt: 1735689600000

projects:
  - path: /Users/ed/Code/my-project
    name: My Project
    enabled: true
    branchWhitelist:  # Optional: specify branches to extract from
      - main
      - develop
    maxCommits: 300
    cronSchedule: '0 18 * * *'
    id: 'uuid-from-web-app'
    standupId: 'uuid'

standups:
  - id: 'standup-uuid'
    cronSchedule: '35 9 * * 1-5'

llm:
  provider: 'openai'  # openai, anthropic, google, deepseek, ollama, openai-compatible
  openai:
    apiKey: 'sk-...'
    model: 'gpt-4o'
  anthropic:
    apiKey: 'sk-ant-...'
    model: 'claude-3-5-sonnet-20241022'
  ollama:
    model: 'llama3.2'
    baseUrl: 'http://localhost:11434'

settings:
  defaultMaxCommits: 300
  maxCommitsPerBatch: 10
  cacheEnabled: true
  dataCacheTimeout: 5  # minutes
  apiBaseUrl: 'https://www.bragdoc.ai'
```

## Commands

### Authentication
```bash
bragdoc login        # OAuth via browser, saves JWT token
bragdoc logout       # Remove auth token
bragdoc auth status  # Check authentication status
```

### Project Management
```bash
bragdoc init                      # Quick setup (alias for repos add)
bragdoc projects add              # Add current directory as project
bragdoc projects list             # List all configured projects
bragdoc projects update <path>    # Update project settings
bragdoc projects enable <path>    # Enable extraction for project
bragdoc projects disable <path>   # Disable extraction for project
bragdoc projects remove <path>    # Remove project from config
```

#### Branch Whitelist Configuration

Control which Git branches are processed during extraction by configuring a branch whitelist per project:

```bash
# Configure whitelist when adding a project
bragdoc projects add --branch-whitelist "main,develop"

# Update whitelist for existing project
bragdoc projects update /path/to/project --branch-whitelist "main,production"

# Clear whitelist to allow all branches
bragdoc projects update /path/to/project --branch-whitelist ""
```

**Branch Whitelist Validation Behavior:**

- **No whitelist configured:** All branches are allowed (default behavior)
- **Whitelist configured:** Only commits from specified branches are extracted
- **Branch not in whitelist:** Extraction fails with clear error message and remediation steps
- **Empty whitelist:** Clears the restriction and allows all branches again

Example behavior during extraction:

```
$ bragdoc extract --max 10

Checking branch: feature-xyz
Error: Branch 'feature-xyz' is not in the whitelist for this project
Configured whitelist: main, develop
To extract from other branches, update the whitelist:
  bragdoc projects update . --branch-whitelist "main,develop,feature-xyz"
```

The whitelist is stored in the configuration file and applies only to the specific project it's configured for.

## Connector Architecture

The CLI uses a pluggable connector architecture to support multiple data sources (Git, GitHub, Jira, etc.) without modifying core CLI logic. This enables extensibility while maintaining clean separation of concerns.

### Overview

A **connector** is a standardized interface for extracting achievement data from a source system. Each connector implementation handles the specifics of its source (Git operations, API calls, data transformation) and returns data in a unified format.

**Key Benefits:**
- **Pluggable Design**: Add new sources without modifying core CLI
- **Type Safety**: TypeScript ensures all connectors implement required interface
- **Unified Data Format**: All sources produce ConnectorData with consistent fields
- **Multi-Source Support**: Extract from multiple sources per project
- **Isolated Caching**: Each source manages its own cache independently

### Connector Interface

**File:** `packages/cli/src/connectors/types.ts`

```typescript
// Configuration passed to initialize a connector
interface ConnectorConfig {
  type: 'git' | 'github' | 'jira';  // Connector type
  sourceId: string;                  // Unique source identifier (UUID)
  projectId: string;                 // Associated project
  gitPath?: string;                  // For Git: path to repository
  branchWhitelist?: string[];        // For Git: branches to extract from
  [key: string]: any;               // Type-specific config
}

// Unified data format from any source
interface ConnectorData {
  id: string;                        // Source-specific unique ID
  title: string;                     // Achievement title
  description?: string;              // Optional description
  author?: string;                   // Who made this contribution
  timestamp: Date;                   // When it happened
  raw: any;                          // Original source data
  isCached?: boolean;               // Whether from cache
}

// Connector data with CLI context
interface ConnectorItem extends ConnectorData {
  sourceId: string;                  // Links to source
  projectId: string;                 // Links to project
  type: string;                      // Connector type ('git', etc.)
}

// Main connector interface
interface Connector {
  type: string;                      // Getter returning connector type
  initialize(config: ConnectorConfig): Promise<void>;  // Setup
  fetch(options?: {                  // Fetch data
    since?: Date;
    until?: Date;
    limit?: number;
    skipCache?: boolean;
  }): Promise<ConnectorData[]>;
  validate(): Promise<boolean>;      // Verify source exists/accessible
  clearCache(): Promise<void>;       // Clear source-specific cache
}
```

### GitConnector Implementation

**File:** `packages/cli/src/connectors/git-connector.ts`

The GitConnector wraps existing Git operations and maintains all current functionality:

```typescript
class GitConnector implements Connector {
  private config: ConnectorConfig | null = null;
  private cache: CommitCache | null = null;

  get type(): string {
    return 'git';
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    // Validate type is 'git'
    // Store config and sourceId
    // Initialize CommitCache with sourceId
  }

  async fetch(options?: FetchOptions): Promise<ConnectorData[]> {
    // Call existing git operations
    // Transform commits to ConnectorData format
    // Apply branch whitelisting
    // Return unified data array
  }

  async validate(): Promise<boolean> {
    // Check repository exists at gitPath
    // Verify accessible
  }

  async clearCache(): Promise<void> {
    // Call cache.clear(sourceId)
  }
}
```

**Key Points:**
- Maintains 100% backward compatibility with existing Git extraction
- Uses CommitCache with sourceId-based keys
- Supports branch whitelisting from source config
- Integrates with batch processing pipeline

### ConnectorRegistry

**File:** `packages/cli/src/connectors/registry.ts`

The registry provides pluggable discovery and initialization of connectors:

```typescript
class ConnectorRegistry {
  private connectors: Map<string, Connector> = new Map();

  register(type: string, connector: Connector): void {
    // Store connector by type
  }

  get(type: string): Connector {
    // Retrieve connector, throw if not registered
  }

  has(type: string): boolean {
    // Check if type registered
  }

  types(): string[] {
    // Return all registered types
  }
}

// Singleton instance
export const connectorRegistry = new ConnectorRegistry();

// Initialize all connectors on startup
export function initializeConnectors(): void {
  connectorRegistry.register('git', new GitConnector());
  // Future: register GitHub, Jira connectors
}
```

### How to Implement a New Connector

To add a new data source (e.g., GitHub):

1. **Create connector class** implementing `Connector` interface
   ```typescript
   // packages/cli/src/connectors/github-connector.ts
   export class GitHubConnector implements Connector {
     get type(): string { return 'github'; }
     async initialize(config: ConnectorConfig): Promise<void> { /* ... */ }
     async fetch(options?: FetchOptions): Promise<ConnectorData[]> { /* ... */ }
     async validate(): Promise<boolean> { /* ... */ }
     async clearCache(): Promise<void> { /* ... */ }
   }
   ```

2. **Register in ConnectorRegistry**
   ```typescript
   // In initializeConnectors()
   connectorRegistry.register('github', new GitHubConnector());
   ```

3. **Test connector** with unit tests and integration tests

4. **Document configuration** in CLI setup guides

The extract command automatically discovers and uses the connector via the registry.

## Source Synchronization

The CLI maintains a local cache of sources fetched from the API.

### SourcesCache

**File:** `packages/cli/src/cache/sources.ts`

Caches source definitions locally to avoid repeated API calls:

```yaml
# ~/.bragdoc/cache/data/sources.yml
version: 1
lastSynced: '2025-01-15T10:30:00Z'
sources:
  - id: 'uuid-1'
    userId: 'user-uuid'
    projectId: 'project-uuid'
    name: 'My Git Repo'
    type: 'git'
    config:
      gitPath: /Users/ed/projects/my-repo
      branchWhitelist: ['main']
    isArchived: false
```

**Synchronization Strategy:**
- On each extract: Sync sources from `GET /api/sources?projectId=xxx`
- If API unavailable: Use cached sources with staleness warning
- If cache > 7 days old: Log warning about potential stale data
- Auto-rebuilt: Cache is repopulated on next successful sync

### Achievement Extraction
```bash
bragdoc extract                   # Extract from all enabled projects
bragdoc extract --since 7d        # Extract from last 7 days
bragdoc extract --max 50          # Limit to 50 commits
bragdoc extract --all             # Extract all commits (ignore cache)
```

**Achievement Source Classification:**

When the CLI extracts achievements from Git commits, they are saved with:
- `source='commit'`: Indicates the achievement came from Git commit extraction
- `impactSource='llm'`: Indicates the impact/significance score was estimated by the LLM during extraction

The distinction between `source` and `impactSource`:
- **source**: Where the achievement came from (extraction method: 'commit', 'manual', or 'llm')
- **impactSource**: How the impact score was calculated ('user' if manually set, 'llm' if AI-estimated)

This allows the system to:
- Track which achievements came from actual commits vs. manual entry
- Filter achievements by their source in the UI and analytics
- Preserve information about impact estimation method separately from achievement creation method

### Standup Automation
```bash
bragdoc standup enable            # Enable standup automation
bragdoc standup disable           # Disable standup automation
bragdoc standup wip               # Extract WIP from uncommitted changes
bragdoc standup status            # Show standup configuration
```

### LLM Configuration
```bash
bragdoc llm show                  # Show current LLM configuration
bragdoc llm set openai            # Set provider to OpenAI
bragdoc llm set anthropic         # Set provider to Anthropic
bragdoc llm set ollama llama3.2   # Set to local Ollama model
```

### Cache Management
```bash
bragdoc cache list                # List cached commits
bragdoc cache clear               # Clear commit cache
```

### Data Sync
```bash
bragdoc data fetch                # Fetch achievements/projects from web app
bragdoc data clear                # Clear local data cache
```

### WIP Extraction
```bash
bragdoc wip                       # Extract achievements from uncommitted changes
```

## Git Operations

**File:** `packages/cli/src/git/operations.ts`

### Repository Info
```typescript
export function getRepositoryInfo(path = '.'): RepositoryInfo {
  const remoteUrl = execSync('git config --get remote.origin.url', { cwd: path })
    .toString()
    .trim();

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: path })
    .toString()
    .trim();

  return { remoteUrl, currentBranch, path };
}
```

### Commit History
```typescript
export function getCommitsSince(
  since: string,
  maxCommits: number,
  path = '.'
): Commit[] {
  const format = '--format=%H%x00%an%x00%ae%x00%at%x00%s%x00%b%x00';
  const cmd = `git log ${format} --since="${since}" --max-count=${maxCommits}`;
  
  const output = execSync(cmd, { cwd: path }).toString();
  return parseCommits(output);
}
```

## API Client

**File:** `packages/cli/src/api/client.ts`

### Create Client
```typescript
export async function createApiClient(): Promise<ApiClient> {
  const config = await readConfig();
  
  if (!config.auth?.token) {
    throw new Error('Not authenticated. Run `bragdoc login` first.');
  }

  return {
    async get(path: string) {
      return fetch(`${config.settings.apiBaseUrl}${path}`, {
        headers: {
          'Authorization': `Bearer ${config.auth.token}`,
          'Content-Type': 'application/json',
        },
      });
    },
    async post(path: string, body: any) {
      return fetch(`${config.settings.apiBaseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    },
    // ... put, delete methods
  };
}
```

## Scheduled Extraction

### Unix/Mac (crontab)
```bash
# Automatically installed via `bragdoc projects add`
0 18 * * * cd /Users/ed/Code/my-project && bragdoc extract
```

### Windows (Task Scheduler)
```bash
schtasks /create /tn "BragDoc Extract - My Project" /tr "bragdoc extract" /sc daily /st 18:00
```

## Caching

### CommitCache

**Location:** `~/.bragdoc/cache/commits/{sourceId}.txt`

The commit cache tracks which commits have been processed to avoid redundant extraction:

```
abc123def456789
def456ghi789012
ghi789jkl012345
```

**Key Features:**
- **Source-scoped**: One cache file per source (using sourceId UUID)
- **Simple format**: One commit hash per line for easy inspection
- **Fast lookup**: Boolean check for cached commits
- **Per-source isolation**: Multiple sources don't interfere with each other
- **Automatic rebuild**: Old repo-name format files ignored, cache rebuilt on first extract

**Usage:**
```typescript
const cache = new CommitCache();
await cache.add(sourceId, [commitHash1, commitHash2]);

if (await cache.has(sourceId, commitHash1)) {
  // Already processed
}

const all = await cache.list(sourceId);
await cache.clear(sourceId);  // Clear specific source
await cache.clear();          // Clear all sources
```

### SourcesCache

**Location:** `~/.bragdoc/cache/data/sources.yml`

Caches source definitions from API to avoid repeated calls. See Source Synchronization section above.

**Migration Note:** The cache format changed from repo-name based (`my-project.json`) to sourceId based (`{uuid}.txt`). Old cache files are ignored, and the cache is automatically rebuilt on the next extract.

## Logging

**File:** `packages/cli/src/utils/logger.ts`

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: '~/.bragdoc/logs/bragdoc.log' }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});
```

---

**Last Updated:** 2025-10-21
**Package Version:** See packages/cli/package.json
**npm Package:** @bragdoc/cli
