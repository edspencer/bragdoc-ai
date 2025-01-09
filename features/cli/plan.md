# Implementation Plan: Repository Management

## Phase 1: Config File Management

### 1. Core Configuration Module
Location: `cli/src/config/index.ts`

1. Create base configuration types:
```typescript
interface Repository {
  path: string;
  name?: string;
  enabled: boolean;
  maxCommits?: number;
}

interface BragdocConfig {
  auth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  repositories: Repository[];
  settings: {
    defaultTimeRange: string;
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
  };
}
```

2. Implement core configuration functions:
```typescript
// Get config directory path
function getConfigDir(): string;

// Ensure config directory exists with correct permissions
async function ensureConfigDir(): Promise<void>;

// Load config, creating default if doesn't exist
async function loadConfig(): Promise<BragdocConfig>;

// Save config with correct permissions
async function saveConfig(config: BragdocConfig): Promise<void>;
```

### 2. Repository Management Commands
Location: `cli/src/commands/repos.ts`

1. Implement base command:
```typescript
program
  .command('repos')
  .description('Manage repositories for bragdoc')
  .addCommand(/* list command */)
  .addCommand(/* add command */)
  .addCommand(/* remove command */)
  .addCommand(/* update command */)
  .addCommand(/* enable command */)
  .addCommand(/* disable command */);
```

2. Implement subcommands:
   - `repos list`: Display all repositories
   - `repos add`: Add new repository
   - `repos remove`: Remove repository
   - `repos update`: Update repository settings
   - `repos enable/disable`: Toggle repository state

### 3. Repository Validation
Location: `cli/src/utils/git.ts`

1. Implement validation functions:
```typescript
// Check if path is a git repository
async function isGitRepository(path: string): Promise<boolean>;

// Validate repository path exists and is accessible
async function validateRepository(path: string): Promise<void>;
```

## Phase 2: Command Implementation Details

### 1. `repos list` Command
```typescript
async function listRepos() {
  const config = await loadConfig();
  
  // Format and display repositories
  config.repositories.forEach(repo => {
    const status = repo.enabled ? '✓' : '⨯';
    const maxCommits = repo.maxCommits || config.settings.defaultMaxCommits;
    console.log(`${status} ${repo.name || ''} (${repo.path}) [max: ${maxCommits}]`);
  });
}
```

### 2. `repos add` Command
```typescript
async function addRepo(path: string, options: { name?: string; maxCommits?: number }) {
  const config = await loadConfig();
  
  // Validate path is a git repository
  await validateRepository(path);
  
  // Check for duplicates
  if (config.repositories.some(r => r.path === path)) {
    throw new Error('Repository already exists in config');
  }
  
  // Add repository
  config.repositories.push({
    path,
    name: options.name,
    enabled: true,
    maxCommits: options.maxCommits,
  });
  
  await saveConfig(config);
  console.log(`Added repository: ${path}`);
}
```

### 3. `repos remove` Command
```typescript
async function removeRepo(path: string) {
  const config = await loadConfig();
  
  const index = config.repositories.findIndex(r => r.path === path);
  if (index === -1) {
    throw new Error('Repository not found in config');
  }
  
  config.repositories.splice(index, 1);
  await saveConfig(config);
  console.log(`Removed repository: ${path}`);
}
```

### 4. `repos update` Command
```typescript
async function updateRepo(path: string, options: { name?: string; maxCommits?: number }) {
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.path === path);
  if (!repo) {
    throw new Error('Repository not found in config');
  }
  
  // Update repository settings
  if (options.name) repo.name = options.name;
  if (options.maxCommits) repo.maxCommits = options.maxCommits;
  
  await saveConfig(config);
  console.log(`Updated repository: ${path}`);
}
```

## Phase 3: Error Handling and User Experience

### 1. First-time Setup
```typescript
async function initializeConfig() {
  const configDir = getConfigDir();
  
  if (!await exists(configDir)) {
    console.log('Creating bragdoc configuration directory...');
    await ensureConfigDir();
  }
  
  const config = await loadConfig();
  if (!config.repositories.length) {
    // Check if current directory is a git repo
    if (await isGitRepository(process.cwd())) {
      console.log('Current directory is a git repository. Would you like to add it? (Y/n)');
      // Handle user input...
    }
  }
}
```

### 2. Error Messages
- Config file not found: "Creating new configuration file at ~/.bragdoc/config.yml"
- Invalid repository path: "Error: Path is not a git repository: {path}"
- Permission issues: "Error: Unable to access repository at {path}. Check permissions."
- Duplicate repository: "Repository already exists in configuration"

### 3. User Feedback
- Show spinner for long operations
- Clear success/error messages
- Confirmation prompts for destructive operations
- Color-coded output for better visibility

## Implementation Order

1. Core Configuration Module
   - Basic config types
   - File operations
   - Default config creation

2. Repository Validation
   - Git repository checking
   - Path validation
   - Permission checking

3. Basic Commands
   - `repos list`
   - `repos add`
   - `repos remove`

4. Advanced Commands
   - `repos update`
   - `repos enable/disable`

5. Error Handling & UX
   - First-time setup
   - User feedback
   - Error messages

6. Testing
   - Unit tests for config operations
   - Integration tests for commands
   - Error case testing
