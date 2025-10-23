# BragDoc CLI Tool Guide

The BragDoc CLI tool is a powerful command-line interface that automatically extracts achievements from your local Git repositories. This guide covers everything you need to know about installing, configuring, and using the CLI effectively.

## Table of Contents

1. [Installation](#installation)
2. [Authentication](#authentication)
3. [Repository Management](#repository-management)
4. [Extracting Achievements](#extracting-achievements)
5. [Configuration](#configuration)
6. [Cache Management](#cache-management)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- **Node.js**: Version 18 or higher
- **Git**: Installed and accessible from command line
- **BragDoc Account**: Sign up at [bragdoc.ai](https://www.bragdoc.ai)

### Install Globally

The recommended way to install the CLI is globally:

```bash
npm install -g @bragdoc/cli
```

Or with pnpm:

```bash
pnpm add -g @bragdoc/cli
```

Or with yarn:

```bash
yarn global add @bragdoc/cli
```

### Verify Installation

Check that the CLI is installed correctly:

```bash
bragdoc --version
```

You should see the version number (e.g., `1.0.0`).

### Local Development Installation

If you're working on a specific project, you can install the CLI as a dev dependency:

```bash
npm install --save-dev @bragdoc/cli
```

Then use it with npx:

```bash
npx bragdoc extract
```

## Authentication

Before using the CLI, you need to authenticate with your BragDoc account.

### Login

Authenticate your CLI:

```bash
bragdoc login
```

**What happens:**
1. The CLI starts a local server on port 5556
2. Your default web browser opens to the BragDoc authentication page
3. You log in (if not already logged in)
4. You confirm CLI access
5. The browser sends an authentication token to the CLI
6. The CLI saves the token securely to `~/.bragdoc/config.yml`
7. Success message displays in your terminal

**Token Security:**
- Tokens are long-lived (30 days)
- Stored securely in your home directory
- Include device information for tracking
- Can be revoked from the web interface

### Check Authentication Status

Verify you're logged in:

```bash
bragdoc auth status
```

Output shows:
- Whether you're authenticated
- Token expiration date
- Associated email address

### Logout

Remove your authentication token:

```bash
bragdoc logout
```

This removes the token from your configuration file. You can also revoke CLI access from the BragDoc web interface under Settings > Security.

## Repository Management

The CLI tracks which Git repositories you want to extract achievements from. You can add, list, update, and remove repositories.

### Add a Repository

Navigate to a Git repository and add it:

```bash
cd /path/to/your/project
bragdoc repos add
```

**Interactive prompts:**
- Friendly name for the repository (optional, defaults to repository name)
- Maximum commits to track (default: 300)

**With options:**

```bash
bragdoc repos add --name "My Project" --max-commits 500
```

**What gets saved:**
- Repository path
- Friendly name
- Whether it's enabled for extraction
- Maximum commits to track
- Linked project ID (synced with web app)

### List Repositories

See all configured repositories:

```bash
bragdoc repos list
```

**Output example:**
```
✓ Web Platform (/Users/you/projects/web-app) [max: 500 commits]
✓ Mobile App (/Users/you/projects/mobile) [max: 300 commits]
⨯ Side Project (/Users/you/experiments/side-project) [disabled] [max: 100 commits]
```

Legend:
- `✓` = Enabled (included in `extract all`)
- `⨯` = Disabled (skipped in `extract all`)

### Update Repository Settings

Modify settings for a repository:

```bash
cd /path/to/repository
bragdoc repos update --max-commits 1000
```

Or specify by path:

```bash
bragdoc repos update /path/to/repository --max-commits 1000
```

### Enable/Disable Repositories

Temporarily disable a repository without removing it:

```bash
bragdoc repos disable /path/to/repository
```

Re-enable it:

```bash
bragdoc repos enable /path/to/repository
```

Disabled repositories are skipped when running `bragdoc extract all`.

### Remove a Repository

Remove a repository from tracking:

```bash
cd /path/to/repository
bragdoc repos remove
```

Or specify by path:

```bash
bragdoc repos remove /path/to/repository
```

**Note**: This only removes the repository from your CLI configuration. It does not delete any achievements that have already been extracted.

## Extracting Achievements

The core feature of the CLI is extracting achievements from Git commits.

### Basic Extraction

Extract from the current repository:

```bash
cd /path/to/repository
bragdoc extract
```

**What happens:**
1. CLI reads Git commit history (default: last 30 days)
2. Filters out commits already processed (using cache)
3. Batches commits (max 100 per batch)
4. Sends commit messages to BragDoc API
5. AI analyzes commits and extracts achievements
6. Achievements are saved to your account
7. Commit hashes are cached to prevent re-processing

### Extract from All Repositories

Process all enabled repositories:

```bash
bragdoc extract all
```

The CLI will:
- Loop through all enabled repositories
- Extract achievements from each
- Show progress for each repository
- Display summary at the end

### Time Range Options

Control how far back to scan:

```bash
# Last week
bragdoc extract --time-range 1w

# Last 3 months
bragdoc extract --time-range 3m

# Last year
bragdoc extract --time-range 1y

# Custom date range
bragdoc extract --time-range 2024-01-01:2024-12-31
```

**Time range formats:**
- `Xd` = X days (e.g., `7d`, `14d`)
- `Xw` = X weeks (e.g., `1w`, `2w`)
- `Xm` = X months (e.g., `1m`, `3m`, `6m`)
- `Xy` = X years (e.g., `1y`)
- `YYYY-MM-DD:YYYY-MM-DD` = Specific date range

### Full History Extraction

Extract all commits (ignores time limits):

```bash
bragdoc extract --full-history
```

**Warning**: For large repositories, this can take a long time and may hit API rate limits. Use with caution.

### Branch-Specific Extraction

Extract only from the current branch:

```bash
bragdoc extract --branch
```

Or specify a branch:

```bash
bragdoc extract --branch main
bragdoc extract --branch feature/new-feature
```

### Dry Run

See what commits would be processed without actually extracting:

```bash
bragdoc extract --dry-run
```

This is useful for:
- Checking how many commits will be processed
- Verifying time range settings
- Testing configuration changes

### Skip Cache

Process commits even if they've been cached:

```bash
bragdoc extract --no-cache
```

**Note**: This still writes new commits to the cache after processing. Use `bragdoc cache clear` to fully reset the cache.

### Force Re-extraction

Clear cache and re-extract everything:

```bash
bragdoc cache clear
bragdoc extract --full-history
```

## Configuration

The CLI stores configuration in `~/.bragdoc/config.yml`. You can view and edit this configuration.

### Configuration File Structure

```yaml
# Authentication
auth:
  token: "eyJhbGc..."              # JWT token
  expiresAt: 1735689600           # Unix timestamp

# Repositories
repositories:
  - path: "/Users/you/projects/web-app"
    name: "Web Platform"
    enabled: true
    maxCommits: 500
    projectId: "uuid-from-web-app"

  - path: "/Users/you/projects/mobile"
    name: "Mobile App"
    enabled: true
    maxCommits: 300
    projectId: "uuid-from-web-app"

# Global Settings
settings:
  defaultTimeRange: "30d"         # Default extraction window
  maxCommitsPerBatch: 100         # Commits per API request
  defaultMaxCommits: 300          # Default max if not specified
  cacheEnabled: true              # Enable commit caching
  apiBaseUrl: "https://www.bragdoc.ai"
```

### View Configuration

Display current configuration:

```bash
bragdoc config view
```

**Output**: Pretty-printed configuration with sensitive values (tokens) masked.

### Edit Configuration

Open the configuration file in your default editor:

```bash
bragdoc config edit
```

### Set Configuration Values

Update specific settings:

```bash
# Change default time range
bragdoc config set settings.defaultTimeRange "7d"

# Change batch size
bragdoc config set settings.maxCommitsPerBatch 50

# Change default max commits
bragdoc config set settings.defaultMaxCommits 500
```

### Configuration File Location

- **Default**: `~/.bragdoc/config.yml`
- **Permissions**: 600 (readable/writable only by you)
- **Directory Permissions**: 700 (accessible only by you)

The CLI automatically creates this file with secure permissions on first login.

## Cache Management

The CLI caches processed commit hashes to avoid re-extracting achievements from the same commits.

### Cache Structure

```
~/.bragdoc/
├── config.yml
└── cache/
    └── commits/
        ├── web-app.txt
        ├── mobile-app.txt
        └── side-project.txt
```

Each repository has its own cache file containing one commit hash per line.

### List Cached Commits

View cached commits for current repository:

```bash
cd /path/to/repository
bragdoc cache list
```

View for specific repository:

```bash
bragdoc cache list --repo "Web Platform"
```

**Output**: List of commit hashes that have been processed.

### Clear Cache

Clear cache for current repository:

```bash
cd /path/to/repository
bragdoc cache clear
```

Clear cache for specific repository:

```bash
bragdoc cache clear --repo "Web Platform"
```

Clear all caches:

```bash
bragdoc cache clear --all
```

**When to clear cache:**
- You want to re-extract achievements (e.g., after improving extraction logic)
- You accidentally processed the wrong commits
- You want to start fresh

## Advanced Usage

### Custom Configuration File

Use a different configuration file:

```bash
bragdoc --config /path/to/custom-config.yml extract
```

### Repository Auto-Discovery

Scan a directory tree for Git repositories:

```bash
bragdoc repos scan ~/projects
```

The CLI will:
1. Recursively search for Git repositories
2. List all found repositories
3. Prompt you to add each one
4. Configure settings for added repositories

### Filtered Extraction

Extract from specific repository by name:

```bash
bragdoc extract --repo "Web Platform"
```

Extract from specific path:

```bash
bragdoc extract --repo-path /path/to/repository
```

### Combining Options

Options can be combined:

```bash
# Extract last 3 months from main branch, skipping cache
bragdoc extract --time-range 3m --branch main --no-cache

# Dry run with full history
bragdoc extract --full-history --dry-run

# Extract from specific repo with custom time range
bragdoc extract --repo "Web Platform" --time-range 1m
```

### Environment Variables

Override settings with environment variables:

```bash
# Use different API base URL
BRAGDOC_API_URL=https://staging.bragdoc.ai bragdoc extract

# Set custom config location
BRAGDOC_CONFIG=~/my-config.yml bragdoc extract
```

## Troubleshooting

### Common Issues

#### "Not a git repository"

**Problem**: You're not in a Git repository directory.

**Solution**: Navigate to a Git repository or specify a path:

```bash
cd /path/to/repository
bragdoc extract
```

#### "Authentication required"

**Problem**: You're not logged in or your token expired.

**Solution**: Log in again:

```bash
bragdoc login
```

#### "Repository not found in configuration"

**Problem**: The current repository hasn't been added.

**Solution**: Add the repository:

```bash
bragdoc repos add
```

#### "API rate limit exceeded"

**Problem**: You've made too many requests in a short time.

**Solution**: Wait a few minutes and try again. Consider reducing `maxCommitsPerBatch` in your configuration.

#### No achievements extracted

**Possible causes:**
1. **All commits already cached**: Check with `bragdoc cache list`
2. **No commits in time range**: Try `--full-history` or wider time range
3. **Commit messages don't indicate achievements**: Review your commit messages

**Solutions:**
```bash
# Check cache
bragdoc cache list

# Try wider time range
bragdoc extract --time-range 6m

# Try full history
bragdoc extract --full-history

# Clear cache and retry
bragdoc cache clear
bragdoc extract
```

### Debugging

#### Verbose Output

Enable detailed logging:

```bash
bragdoc extract --verbose
```

Or set environment variable:

```bash
DEBUG=bragdoc:* bragdoc extract
```

#### Check Configuration

Verify your configuration is correct:

```bash
bragdoc config view
```

#### Check Authentication

Verify you're authenticated:

```bash
bragdoc auth status
```

#### Test API Connection

Verify the API is accessible:

```bash
bragdoc config test-connection
```

### Getting Help

#### Command Help

Get help for any command:

```bash
bragdoc --help
bragdoc extract --help
bragdoc repos --help
```

#### Version Information

Check your CLI version:

```bash
bragdoc --version
```

#### Support

If you're still having issues:
1. Check the **[FAQ](./faq.md)** for solutions
2. Review logs in your terminal
3. Contact support at hello@bragdoc.ai

Include in your support request:
- CLI version (`bragdoc --version`)
- Operating system
- Node.js version (`node --version`)
- Error messages (full output)
- Steps to reproduce

## Best Practices

### Regular Extraction

Run extraction regularly to keep your achievements up-to-date:

```bash
# Weekly extraction
bragdoc extract all
```

Consider setting up a cron job or scheduled task:

```bash
# Add to crontab (runs every Monday at 9 AM)
0 9 * * 1 /usr/local/bin/bragdoc extract all
```

### Organize Repositories

Use clear, descriptive names for repositories:

```bash
bragdoc repos add --name "Company XYZ - Backend API"
bragdoc repos add --name "Client ABC - Mobile App"
```

### Configure Sensible Limits

Set appropriate max commits based on repository size:

- **Small projects**: 100-300 commits
- **Medium projects**: 300-500 commits
- **Large projects**: 500-1000 commits
- **Very active projects**: 1000+ commits (use with caution)

### Use Descriptive Commit Messages

The CLI extracts achievements from commit messages. Write clear, descriptive messages:

**Good:**
```
Add user authentication with OAuth support

Implemented email/password and Google OAuth authentication.
Added JWT token management and session handling.
Includes password reset flow and email verification.
```

**Less helpful:**
```
fix stuff
update code
wip
```

### Review Extracted Achievements

After extraction:
1. Go to the web interface
2. Review extracted achievements
3. Edit titles and descriptions for clarity
4. Link to appropriate projects and companies
5. Add impact metrics where relevant

### Backup Your Configuration

Your configuration file contains important settings:

```bash
# Backup configuration
cp ~/.bragdoc/config.yml ~/.bragdoc/config.yml.backup

# Restore if needed
cp ~/.bragdoc/config.yml.backup ~/.bragdoc/config.yml
```

## Reference

### Complete Command List

```bash
# Authentication
bragdoc login                                    # Log in to BragDoc
bragdoc logout                                   # Log out
bragdoc auth status                              # Check auth status

# Repository Management
bragdoc repos add [path]                         # Add repository
bragdoc repos list                               # List repositories
bragdoc repos update [path] --max-commits N      # Update settings
bragdoc repos remove [path]                      # Remove repository
bragdoc repos enable [path]                      # Enable repository
bragdoc repos disable [path]                     # Disable repository
bragdoc repos scan <directory>                   # Find repositories

# Extraction
bragdoc extract                                  # Extract from current repo
bragdoc extract all                              # Extract from all repos
bragdoc extract --time-range <range>             # Specify time range
bragdoc extract --branch [name]                  # Extract from branch
bragdoc extract --full-history                   # Extract all commits
bragdoc extract --dry-run                        # Preview without extracting
bragdoc extract --no-cache                       # Skip cache check
bragdoc extract --repo <name>                    # Extract from specific repo
bragdoc extract --repo-path <path>               # Extract from specific path

# Cache Management
bragdoc cache list                               # List cached commits
bragdoc cache list --repo <name>                 # List for specific repo
bragdoc cache clear                              # Clear current repo cache
bragdoc cache clear --repo <name>                # Clear specific repo cache
bragdoc cache clear --all                        # Clear all caches

# Configuration
bragdoc config view                              # View configuration
bragdoc config edit                              # Edit configuration file
bragdoc config set <key> <value>                 # Set configuration value

# Help & Information
bragdoc --help                                   # General help
bragdoc <command> --help                         # Command-specific help
bragdoc --version                                # Show version
```

---

**Next Steps**: Learn about **[Web Features](./web-features.md)** or read **[Workflows & Best Practices](./workflows.md)** for effective usage patterns.
