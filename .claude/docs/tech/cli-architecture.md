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

### Achievement Extraction
```bash
bragdoc extract                   # Extract from all enabled projects
bragdoc extract --since 7d        # Extract from last 7 days
bragdoc extract --max 50          # Limit to 50 commits
bragdoc extract --all             # Extract all commits (ignore cache)
```

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

**Location:** `~/.bragdoc/cache/commits/<project-id>.json`

```json
{
  "lastSync": 1735689600000,
  "commits": {
    "abc123...": true,
    "def456...": true
  }
}
```

Prevents reprocessing of already-extracted commits.

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
