#!/bin/bash

set -euo pipefail

# Script to create a GitHub issue and initialize a task directory
# Can also convert an existing task directory to a GitHub issue
# Usage: ./create-issue.sh <title> [description] [existing-task-dir]
# If existing-task-dir is provided, converts that directory to a GitHub issue

if [ $# -lt 1 ]; then
  echo "Usage: $0 <title> [description] [existing-task-dir]"
  echo ""
  echo "Arguments:"
  echo "  title                Issue title"
  echo "  description          Issue description (optional)"
  echo "  existing-task-dir    Path to existing task directory to convert (optional)"
  echo ""
  echo "Examples:"
  echo "  $0 'Add dark mode toggle'"
  echo "  $0 'Add dark mode toggle' 'Implement dark/light theme switcher' ./tasks/dark-mode"
  echo "  $0 'Fix authentication bug' '' ./tasks/existing-task"
  exit 1
fi

TITLE="$1"
DESCRIPTION="${2:-}"
EXISTING_TASK_DIR="${3:-}"

# Default repository (can be overridden)
OWNER="edspencer"
REPO="bragdoc-ai"
REPO_FULL="$OWNER/$REPO"

echo "Creating GitHub issue..."

# Build gh issue create command
if [ -n "$DESCRIPTION" ]; then
  ISSUE_URL=$(gh issue create \
    --repo "$REPO_FULL" \
    --title "$TITLE" \
    --body "$DESCRIPTION" 2>/dev/null)
else
  ISSUE_URL=$(gh issue create \
    --repo "$REPO_FULL" \
    --title "$TITLE" 2>/dev/null)
fi

if [ -z "$ISSUE_URL" ]; then
  echo "Error: Failed to create GitHub issue"
  exit 1
fi

echo "✓ GitHub issue created: $ISSUE_URL"

# Extract issue number from URL
if [[ $ISSUE_URL =~ /issues/([0-9]+)$ ]]; then
  ISSUE_NUM="${BASH_REMATCH[1]}"
else
  echo "Error: Could not extract issue number from URL: $ISSUE_URL"
  exit 1
fi

# Determine task directory name
TASK_NAME=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/-$//')
TASK_DIR="tasks/${ISSUE_NUM}-${TASK_NAME}"

# Handle existing task directory conversion
if [ -n "$EXISTING_TASK_DIR" ]; then
  if [ ! -d "$EXISTING_TASK_DIR" ]; then
    echo "Error: Existing task directory not found: $EXISTING_TASK_DIR"
    exit 1
  fi

  echo "Converting existing task directory..."

  # Check if task directory already exists with the new name
  if [ -d "$TASK_DIR" ]; then
    echo "Error: Task directory already exists: $TASK_DIR"
    exit 1
  fi

  # Move existing directory to new location
  mv "$EXISTING_TASK_DIR" "$TASK_DIR"
  echo "✓ Renamed $EXISTING_TASK_DIR to $TASK_DIR"
else
  # Create new task directory
  mkdir -p "$TASK_DIR"
  echo "✓ Created task directory: $TASK_DIR"
fi

# Check if task files exist and push them
echo ""
echo "Checking for task files to sync..."

HAS_FILES=0
if [ -f "$TASK_DIR/SPEC.md" ] || [ -f "$TASK_DIR/PLAN.md" ] || \
   [ -f "$TASK_DIR/TEST_PLAN.md" ] || [ -f "$TASK_DIR/COMMIT_MESSAGE.md" ]; then
  HAS_FILES=1
fi

if [ $HAS_FILES -eq 1 ]; then
  echo "Syncing task files to GitHub issue..."

  # Use the push.sh script to sync all files
  PUSH_SCRIPT="$(dirname "$0")/push.sh"
  if [ -x "$PUSH_SCRIPT" ]; then
    "$PUSH_SCRIPT" "$ISSUE_NUM" "$TASK_DIR"
  else
    echo "Warning: Could not find push.sh script to sync files"
  fi
else
  echo "No task files found to sync (create SPEC.md, PLAN.md, etc. to sync them)"
fi

echo ""
echo "========================================="
echo "✅ Task setup complete!"
echo "========================================="
echo "Issue: $ISSUE_URL"
echo "Task Directory: $TASK_DIR"
echo "Task Number: $ISSUE_NUM"
echo ""
echo "Next steps:"
echo "1. Create SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md in $TASK_DIR"
echo "2. Run 'push.sh $ISSUE_NUM $TASK_DIR' to sync files to GitHub"
echo "3. Run '/write-spec' or other commands to begin work"
