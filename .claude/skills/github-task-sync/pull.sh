#!/bin/bash

set -euo pipefail

# Script to pull task documentation files from a GitHub issue to local task directory
# Usage: ./pull.sh <issue-url-or-number>
# Pulls SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md from issue comments
# Automatically creates directory as tasks/{issue-number}-{title-slug}

if [ $# -lt 1 ]; then
  echo "Usage: $0 <issue-url-or-number>"
  echo ""
  echo "Arguments:"
  echo "  issue-url-or-number  GitHub issue URL or issue number"
  echo ""
  echo "Examples:"
  echo "  $0 188"
  echo "  $0 https://github.com/edspencer/bragdoc-ai/issues/188"
  echo ""
  echo "The script will automatically create a directory named:"
  echo "  tasks/{issue-number}-{title-slug}"
  exit 1
fi

ISSUE_INPUT="$1"

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

# Fetch the issue title from GitHub
echo "📥 Fetching issue #$ISSUE_NUM from $REPO_FULL..."
ISSUE_TITLE=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM --jq '.title')

if [ -z "$ISSUE_TITLE" ]; then
  echo "Error: Could not fetch issue title"
  exit 1
fi

# Convert title to URL-safe slug
# - Convert to lowercase
# - Replace spaces and special characters with dashes
# - Remove consecutive dashes
# - Trim leading/trailing dashes
SLUG=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

# Create task directory as tasks/{issue-number}-{slug}
TASK_DIR="tasks/$ISSUE_NUM-$SLUG"
mkdir -p "$TASK_DIR"

echo "📥 Pulling task files from GitHub issue #$ISSUE_NUM: \"$ISSUE_TITLE\""
echo "📁 Task directory: $TASK_DIR"
echo ""

# Function to pull a file from GitHub
pull_file() {
  local file=$1
  local marker=$2
  local file_path="$TASK_DIR/$file"

  echo "Pulling $file..."

  # Fetch the comment with the matching marker and extract the content
  # Use startswith to match the exact marker (not substrings like PLAN_MARKER vs TEST_PLAN_MARKER)
  comment_body=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
    --jq ".[] | select(.body | startswith(\"<!-- $marker -->\")) | .body" 2>/dev/null || echo "")

  if [ -z "$comment_body" ]; then
    echo "  ⏭️  Skipping $file (not found on issue)"
    return
  fi

  # Extract the content between the markdown code fences
  # Handle both plain markdown blocks and those wrapped in <details> tags
  if echo "$comment_body" | grep -q '<details>'; then
    # For content in <details>, extract from ```markdown to </details>, then remove first line and last 2 lines
    extracted=$(echo "$comment_body" | sed -n '/```markdown/,/<\/details>/p' | sed '1d' | sed '$d' | sed '$d')
  else
    # For unwrapped content, extract between ```markdown and the LAST ``` (to handle nested code blocks)
    # This is trickier - we need to find the matching closing fence
    # For now, use a simple approach: extract from ```markdown to end, then find the last ``` and trim from there
    extracted=$(echo "$comment_body" | awk '/```markdown/{flag=1; next} /^```$/ && flag{exit} flag')
  fi

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
