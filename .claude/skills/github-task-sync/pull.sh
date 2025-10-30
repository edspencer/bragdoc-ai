#!/bin/bash

set -euo pipefail

# Script to pull task documentation files from a GitHub issue to local task directory
# Usage: ./pull.sh <issue-url-or-number> [task-directory]
# Pulls SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md from issue comments

if [ $# -lt 1 ]; then
  echo "Usage: $0 <issue-url-or-number> [task-directory]"
  echo ""
  echo "Arguments:"
  echo "  issue-url-or-number  GitHub issue URL or issue number"
  echo "  task-directory       Directory to write files to (default: current directory)"
  echo ""
  echo "Examples:"
  echo "  $0 188"
  echo "  $0 https://github.com/edspencer/bragdoc-ai/issues/188 ./tasks/188-account-deletion"
  exit 1
fi

ISSUE_INPUT="$1"
TASK_DIR="${2:-.}"

# Normalize the issue URL/number
if [[ $ISSUE_INPUT =~ ^https?://github\.com/ ]]; then
  ISSUE_URL="$ISSUE_INPUT"
else
  ISSUE_URL="https://github.com/edspencer/bragdoc-ai/issues/$ISSUE_INPUT"
fi

# Parse the URL to extract owner, repo, and issue number
if [[ $ISSUE_URL =~ github\.com/([^/]+)/([^/]+)/issues/([0-9]+) ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
  ISSUE_NUM="${BASH_REMATCH[3]}"
else
  echo "Error: Invalid GitHub issue URL"
  echo "Expected format: https://github.com/owner/repo/issues/NUMBER"
  exit 1
fi

REPO_FULL="$OWNER/$REPO"

# Create task directory if it doesn't exist
mkdir -p "$TASK_DIR"

echo "📥 Pulling task files from GitHub issue #$ISSUE_NUM in $REPO_FULL"
echo ""

# Function to pull a file from GitHub
pull_file() {
  local file=$1
  local marker=$2
  local file_path="$TASK_DIR/$file"

  echo "Pulling $file..."

  # Fetch the comment with the matching marker and extract the content
  comment_body=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
    --jq ".[] | select(.body | contains(\"$marker\")) | .body" 2>/dev/null || echo "")

  if [ -z "$comment_body" ]; then
    echo "  ⏭️  Skipping $file (not found on issue)"
    return
  fi

  # Extract the content between the markdown code fences
  extracted=$(echo "$comment_body" | sed -n '/```markdown/,/```/p' | sed '1d;$d')

  if [ -z "$extracted" ]; then
    echo "  ⚠️  Warning: Could not extract content from $file comment"
    return
  fi

  # Write to file
  echo "$extracted" > "$file_path"
  echo "  ✓ Pulled to $file"
}

# Pull all four files
pull_file "SPEC.md" "SPEC_MARKER"
pull_file "PLAN.md" "PLAN_MARKER"
pull_file "TEST_PLAN.md" "TEST_PLAN_MARKER"
pull_file "COMMIT_MESSAGE.md" "COMMIT_MESSAGE_MARKER"

echo ""
echo "✅ Pull complete!"
echo "Task directory: $TASK_DIR"
