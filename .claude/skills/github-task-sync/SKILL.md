---
name: github-task-sync
description: Manage task documentation by syncing between local task directories and GitHub issues
---

# GitHub Task Sync Skill

Seamlessly manage task documentation by syncing between local task directories and GitHub issues. All task documentation (SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE) lives both locally and on GitHub, with easy push/pull synchronization.

## Overview

This skill provides a complete workflow for managing tasks:

1. **Create** a new GitHub issue with `create-issue.sh`
2. **Push** local task files to GitHub with `push.sh` or `push-file.sh`
3. **Pull** task files from GitHub with `pull.sh` or `pull-file.sh`
4. **Read** task files from GitHub to stdout with `read-issue-file.sh`
5. **Log** work progress with `log-entry.sh` (creates AI Work Log comment with timestamped entries)

## Quick Start

```bash
# Create a new GitHub issue and task directory
./create-issue.sh "Add dark mode toggle" "Implement dark/light theme switcher"

# Work on files locally (SPEC.md, PLAN.md, etc.)

# Push all files to GitHub
./push.sh 188 ./tasks/188-add-dark-mode-toggle

# Or pull the latest from GitHub (automatically creates task directory from issue title)
./pull.sh 188
```

## Scripts

There are 7 scripts in this skill:

1. **create-issue.sh** - Create GitHub issue and initialize task directory
2. **push.sh** - Push all task files to GitHub
3. **push-file.sh** - Push single task file with status summary
4. **pull.sh** - Pull all task files from GitHub
5. **pull-file.sh** - Pull single task file from GitHub
6. **read-issue-file.sh** - Read task file from GitHub to stdout
7. **log-entry.sh** - Add timestamped entry to AI Work Log

### create-issue.sh

Create a new GitHub issue and initialize a task directory. Can also convert existing task directories to GitHub issues. Automatically applies GitHub labels based on issue context.

**Usage:**
```bash
./create-issue.sh <title> [description] [existing-task-dir] [labels]
```

**Arguments:**
- `title` - GitHub issue title
- `description` - Issue description (optional)
- `existing-task-dir` - Path to existing task directory to convert (optional)
- `labels` - Comma-separated labels to apply (optional, e.g., "UI,bug" or "CLI,feature")

**Available labels:**
- `UI` - User interface related issues
- `CLI` - Command-line interface related issues
- `bug` - Bug fixes and issue resolutions
- `feature` - New features and enhancements

**Examples:**
```bash
# Create new issue with title only
./create-issue.sh "Add dark mode toggle"

# Create new issue with title, description, and labels
./create-issue.sh "Add dark mode toggle" "Implement dark/light theme switcher in settings" "" "UI,feature"

# Convert existing task directory to GitHub issue with labels
./create-issue.sh "Fix login button styling" "" ./tasks/login-styling "UI,bug"

# Create issue with description and labels (no existing task dir)
./create-issue.sh "Add date filter to extract" "Filter commits by date range" "" "CLI,feature"
```

**What it does:**
1. Analyzes issue content to determine appropriate labels (optional)
2. Creates a new GitHub issue with the provided title, description, and labels
3. Creates local task directory named `{issue-number}-{title-slug}/`
4. If task files exist, automatically syncs them to GitHub
5. Outputs issue URL and task directory path

**Output:**
```
Creating GitHub issue...
Applying labels: UI,feature
✓ GitHub issue created: https://github.com/edspencer/bragdoc-ai/issues/189
✓ Created task directory: tasks/189-add-dark-mode-toggle

✅ Task setup complete!
Issue: https://github.com/edspencer/bragdoc-ai/issues/189
Task Directory: tasks/189-add-dark-mode-toggle
Task Number: 189
```

### push.sh

Push all task documentation files (SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md) to a GitHub issue as collapsible comments.

**Usage:**
```bash
./push.sh <issue-url-or-number> [task-directory]
```

**Arguments:**
- `issue-url-or-number` - Full GitHub URL or just the issue number
- `task-directory` - Directory containing task files (optional, defaults to current directory)

**Examples:**
```bash
# Using issue number
./push.sh 188 ./tasks/188-account-deletion

# Using full URL
./push.sh https://github.com/edspencer/bragdoc-ai/issues/188 ./tasks/188-account-deletion

# Using current directory
./push.sh 188
```

**What it does:**
- Uploads all four task file types as separate collapsible comments
- Each file type gets a unique marker so it can be updated independently
- Creates new comments or updates existing ones
- Each file wrapped in `<details>` section that starts collapsed

**Output:**
```
📤 Syncing task files to GitHub issue #188 in edspencer/bragdoc-ai

Processing SPEC.md...
  + Creating new comment...
  ✓ Created

Processing PLAN.md...
  ↻ Updating existing comment (ID: 123456789)...
  ✓ Updated

...
✅ Sync complete!
View the issue: https://github.com/edspencer/bragdoc-ai/issues/188
```

### push-file.sh

Update a single task file comment on a GitHub issue with a status summary and file content.

**Usage:**
```bash
./push-file.sh <issue-url-or-number> <file-type> <status-file> <content-file>
```

**Arguments:**
- `issue-url-or-number` - GitHub issue URL or issue number
- `file-type` - One of: `SPEC`, `PLAN`, `TEST_PLAN`, `COMMIT_MESSAGE`
- `status-file` - File containing status summary (2 paragraphs + optional bullets)
- `content-file` - File containing the full file content

**Examples:**
```bash
# Update SPEC with status and content
./push-file.sh 188 SPEC SPEC-STATUS.md SPEC.md

# Update PLAN after review
./push-file.sh 188 PLAN plan-status.txt PLAN.md
```

**Status File Format:**
The status file should contain a 2-paragraph summary describing the document state:

```markdown
**Status:** [Draft | Complete | Review Needed | etc.]

This is the first paragraph explaining the current state of the document.
It should describe what has been completed, what's pending, or any key status information.

This is the second paragraph providing additional context or details about the document state.

- Key point 1 (optional)
- Key point 2 (optional)
```

**What it does:**
- Creates or updates a single comment for the specified file type
- Combines the status summary with the file content in a collapsible section
- Each file type has a unique marker for independent updates

**Output:**
```
↻ Updating SPEC comment on issue #188 (ID: 123456789)...
✓ Updated successfully

View the issue: https://github.com/edspencer/bragdoc-ai/issues/188
```

### pull.sh

Pull all task documentation files from a GitHub issue to a local task directory. **Automatically determines the task directory name** from the issue title.

**Usage:**
```bash
./pull.sh <issue-url-or-number>
```

**Arguments:**
- `issue-url-or-number` - GitHub issue URL or issue number

**Examples:**
```bash
# Pull using issue number
./pull.sh 188

# Pull using full URL
./pull.sh https://github.com/edspencer/bragdoc-ai/issues/188
```

**What it does:**
1. Fetches the issue title from GitHub
2. Converts the title to a URL-safe slug
3. Creates task directory as `tasks/{issue-number}-{title-slug}/`
4. Fetches all four task files from GitHub issue comments
5. Extracts content from collapsible sections
6. Writes each to local file (SPEC.md, PLAN.md, etc.)

**Output:**
```
📥 Fetching issue #188 from edspencer/bragdoc-ai...
📥 Pulling task files from GitHub issue #188: "Account deletion and data export"
📁 Task directory: tasks/188-account-deletion-and-data-export

Pulling SPEC.md...
  ✓ Pulled to SPEC.md

Pulling PLAN.md...
  ✓ Pulled to PLAN.md

...
✅ Pull complete!
Task directory: tasks/188-account-deletion-and-data-export
```

### pull-file.sh

Pull a single task file from a GitHub issue to a local file.

**Usage:**
```bash
./pull-file.sh <issue-url-or-number> <file-type> [output-file]
```

**Arguments:**
- `issue-url-or-number` - GitHub issue URL or issue number
- `file-type` - One of: `SPEC`, `PLAN`, `TEST_PLAN`, `COMMIT_MESSAGE`
- `output-file` - File to write to (default: `{file-type}.md` in current directory)

**Examples:**
```bash
# Pull SPEC to SPEC.md
./pull-file.sh 188 SPEC

# Pull PLAN to specific file
./pull-file.sh 188 PLAN ./my-plan.md

# Pull and pipe to stdout
./pull-file.sh 188 SPEC | head -20
```

**Output:**
Pure file content (great for piping or redirecting)

### read-issue-file.sh

Read a task file from a GitHub issue and output to stdout. Useful for debugging, piping, or quick content inspection.

**Usage:**
```bash
./read-issue-file.sh <issue-url-or-number> <file-type>
```

**Arguments:**
- `issue-url-or-number` - GitHub issue URL or issue number
- `file-type` - One of: `SPEC`, `PLAN`, `TEST_PLAN`, `COMMIT_MESSAGE`

**Examples:**
```bash
# Read SPEC to stdout
./read-issue-file.sh 188 SPEC

# Pipe to file
./read-issue-file.sh 188 PLAN > my-plan.md

# View first 20 lines
./read-issue-file.sh 188 SPEC | head -20
```

**Output:**
Pure file content sent to stdout

### log-entry.sh

Add timestamped entries to a task's AI Work Log on a GitHub issue. Creates or updates a running log of work progress throughout the task lifecycle.

**Usage:**
```bash
./log-entry.sh <issue-url-or-number> <entry-text>
```

**Arguments:**
- `issue-url-or-number` - GitHub issue URL or issue number
- `entry-text` - Description of work being done (e.g., "Started writing spec")

**Examples:**
```bash
# Log that spec writing started
./log-entry.sh 188 "Started writing spec"

# Log that plan writing finished
./log-entry.sh 188 "Finished writing plan"

# Use full URL
./log-entry.sh https://github.com/edspencer/bragdoc-ai/issues/190 "Started implementation"
```

**What it does:**
- Creates a new "AI Work Log" comment on the issue if it doesn't exist
- Appends timestamped entries to the work log (one per line with format: `- YYYY-MM-DD HH:MM:SS: entry-text`)
- Each entry is timestamped and represents a work milestone
- Useful for tracking progress through spec writing, planning, implementation, testing, and completion

**Output:**
```
↻ Adding entry to work log on issue #188...
✓ Entry added

View the issue: https://github.com/edspencer/bragdoc-ai/issues/188
```

## Task Directory Structure

When using `create-issue.sh`, directories are automatically named with the issue number:

```
tasks/
├── 188-account-deletion/
│   ├── SPEC.md                   (Specification)
│   ├── PLAN.md                   (Implementation plan)
│   ├── TEST_PLAN.md              (Test scenarios)
│   └── COMMIT_MESSAGE.md         (Git commit message)
├── 189-add-dark-mode/
│   └── [similar structure]
└── archive/
    └── [completed tasks]
```

**Naming Convention:** `{issue-number}-{task-name-slug}`

The issue number in the directory name provides direct reference to the GitHub issue.

## Workflow

### Creating a New Task

```bash
# 1. Create GitHub issue and task directory
./create-issue.sh "Add authentication" "Implement magic link authentication"

# 2. Log that work is starting
./log-entry.sh 190 "Started writing spec"

# 3. Work on files locally
# - Create SPEC.md
# - Create PLAN.md
# - Create TEST_PLAN.md
# - Create COMMIT_MESSAGE.md

# 4. Push files to GitHub
./push.sh 190 ./tasks/190-add-authentication

# 5. Log work progress
./log-entry.sh 190 "Finished writing spec"
./log-entry.sh 190 "Started writing plan"

# 6. Continue development...
# When you update files, push again
./push.sh 190 ./tasks/190-add-authentication
./log-entry.sh 190 "Finished writing plan"
./log-entry.sh 190 "Started implementation"
```

### Converting Existing Tasks to GitHub Issues

If you have an existing task directory without a GitHub issue:

```bash
# 1. Create GitHub issue from existing directory
./create-issue.sh "My feature" "Description" ./tasks/my-feature

# 2. Files are automatically synced to GitHub
# Task directory renamed to: tasks/191-my-feature
```

### Syncing During Work

**Push workflow** (local → GitHub):
```bash
# Log that you're starting work
./log-entry.sh 188 "Started writing code"

# Update single file on GitHub with status
./push-file.sh 188 SPEC SPEC-STATUS.md SPEC.md

# Update all files on GitHub
./push.sh 188 ./tasks/188-account-deletion

# Log when work is complete
./log-entry.sh 188 "Finished writing code"
```

**Pull workflow** (GitHub → local):
```bash
# Pull all files from GitHub
./pull.sh 188 ./tasks/188-account-deletion

# Pull single file from GitHub
./pull-file.sh 188 PLAN

# Log that you pulled latest
./log-entry.sh 188 "Pulled latest files from GitHub"
```

### Task Completion

When finishing a task (via `/finish` command):

1. All work is complete and tested
2. Run `push.sh` one final time to sync latest versions
3. Task directory is archived from `tasks/` to `tasks/archive/`
4. GitHub issue remains as permanent record

## Key Features

- ✅ **Bidirectional sync** - Push changes to GitHub or pull from GitHub
- ✅ **Selective updates** - Push/pull individual files or all at once
- ✅ **Status tracking** - Each file can have a 2-paragraph status summary
- ✅ **Collapsible display** - Large files stay organized on GitHub
- ✅ **AI Work Log** - Timestamped activity log tracking progress (spec writing, planning, implementation, etc.)
- ✅ **Issue creation** - Automatically initialize task structure
- ✅ **Directory conversion** - Convert existing tasks to GitHub issues
- ✅ **No git commits** - Task files never committed (in `.gitignore`)
- ✅ **GitHub-centric** - Documentation source of truth lives on GitHub

## Requirements

- `gh` CLI installed and authenticated
- Bash shell
- Read/write access to the GitHub repository

## Integration with Other Commands

**With `/write-spec`:**
- Creates SPEC.md locally
- Agent calls `push-file.sh` to sync status + content to GitHub

**With `/write-plan`:**
- Creates PLAN.md locally
- Agent calls `push-file.sh` to sync to GitHub

**With `/finish`:**
- Calls `push.sh` to sync all files to GitHub as final step
- Task archived and GitHub issue contains complete documentation

## Setup & Configuration

All scripts reference the default repository `edspencer/bragdoc-ai`. To use with a different repository, modify the `OWNER` and `REPO` variables in the scripts or pass full GitHub URLs.

**Using with different repository:**
```bash
# Use full URL instead of issue number
./push.sh "https://github.com/myorg/myrepo/issues/42" ./tasks/42-myfeature
```
