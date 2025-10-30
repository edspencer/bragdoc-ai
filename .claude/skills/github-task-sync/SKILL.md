---
name: github-task-sync
description: Upload and read task documentation (SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE) from GitHub issues
---

# GitHub Task Sync Skill

Manage task documentation files directly on GitHub issues instead of storing them in the filesystem. This skill provides two complementary tools:

## sync-to-github.sh

Upload task documentation files to a GitHub issue as collapsible comments.

**Usage:**
```bash
./sync-to-github.sh <issue-url-or-number> [task-directory]
```

**Arguments:**
- `issue-url-or-number` - Full GitHub URL (e.g., `https://github.com/owner/repo/issues/188`) or just the issue number (e.g., `188`)
- `task-directory` - Directory containing SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md (optional, defaults to current directory)

**Examples:**
```bash
# Using full URL
./sync-to-github.sh https://github.com/edspencer/bragdoc-ai/issues/188 ./tasks/account-deletion

# Using just the issue number
./sync-to-github.sh 188 ./tasks/account-deletion

# Using current directory
./sync-to-github.sh 188
```

**What it does:**
- Uploads SPEC.md, PLAN.md, TEST_PLAN.md, and COMMIT_MESSAGE.md as separate collapsible comments on the issue
- Each file type gets a unique marker so it can be updated independently
- If a comment for that file type already exists, it updates it instead of creating a duplicate
- Each file is wrapped in a `<details>` section that starts collapsed

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

## read-issue-file.sh

Read a task documentation file from a GitHub issue and output it to stdout.

**Usage:**
```bash
./read-issue-file.sh <issue-url-or-number> <file-type>
```

**Arguments:**
- `issue-url-or-number` - Full GitHub URL or just the issue number
- `file-type` - One of: `SPEC`, `PLAN`, `TEST_PLAN`, `COMMIT_MESSAGE`

**Examples:**
```bash
# Using full URL
./read-issue-file.sh https://github.com/edspencer/bragdoc-ai/issues/188 SPEC

# Using just the issue number
./read-issue-file.sh 188 PLAN

# Piping to a file
./read-issue-file.sh 188 TEST_PLAN > my-test-plan.md

# Using with other tools
./read-issue-file.sh 188 SPEC | head -20
```

**Output:**
Pure file content sent to stdout (great for piping or redirecting)

## Workflow

1. **Create/update task files** (SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md) in your task directory
2. **Sync to GitHub** - Run `sync-to-github.sh` to upload them to an issue
3. **Read back anytime** - Use `read-issue-file.sh` to retrieve files from the issue
4. **Update on GitHub** - Files stay as the source of truth on the issue, not in your filesystem

## Benefits

- ✅ Keeps filesystem clean (no huge markdown files checked into git)
- ✅ Centralized documentation on the GitHub issue
- ✅ Easy to update - just rerun `sync-to-github.sh`
- ✅ Retrieve files anytime with `read-issue-file.sh`
- ✅ Each file type has its own comment (can be updated independently)
- ✅ Collapsible sections keep large files organized

## Setup

The scripts are located at:
- `.claude/skills/github-task-sync/sync-to-github.sh`
- `.claude/skills/github-task-sync/read-issue-file.sh`

**Option 1: Use with full path**
```bash
/Users/ed/Code/brag-ai/.claude/skills/github-task-sync/sync-to-github.sh 188 ./tasks/account-deletion
```

**Option 2: Add to PATH** (add to your `.bashrc` or `.zshrc`)
```bash
export PATH="$PATH:/Users/ed/Code/brag-ai/.claude/skills/github-task-sync"
```

Then use directly:
```bash
sync-to-github.sh 188 ./tasks/account-deletion
read-issue-file.sh 188 SPEC
```

**Option 3: Create aliases** (add to your `.bashrc` or `.zshrc`)
```bash
alias sync-issue="/Users/ed/Code/brag-ai/.claude/skills/github-task-sync/sync-to-github.sh"
alias read-issue="/Users/ed/Code/brag-ai/.claude/skills/github-task-sync/read-issue-file.sh"
```

Then use:
```bash
sync-issue 188 ./tasks/account-deletion
read-issue 188 SPEC
```

## Requirements

- `gh` CLI installed and authenticated
- Bash shell
- Read/write access to the GitHub repository
