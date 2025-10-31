#!/bin/bash

set -euo pipefail

# Script to sync task documentation (SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE) to a GitHub issue
# Usage: ./sync-to-github.sh <issue-url-or-number> [task-directory]
# Examples:
#   ./sync-to-github.sh https://github.com/owner/repo/issues/188 /path/to/tasks/account-deletion
#   ./sync-to-github.sh 188 /path/to/tasks/account-deletion

if [ $# -lt 1 ]; then
  echo "Usage: $0 <issue-url-or-number> [task-directory]"
  echo ""
  echo "Arguments:"
  echo "  issue-url-or-number  GitHub issue URL or issue number"
  echo "  task-directory       Directory containing SPEC.md, PLAN.md, etc. (default: current directory)"
  echo ""
  echo "Examples:"
  echo "  $0 https://github.com/owner/repo/issues/188"
  echo "  $0 188 ./tasks/account-deletion"
  exit 1
fi

ISSUE_INPUT="$1"
TASK_DIR="${2:-.}"

# Normalize the issue URL/number
if [[ $ISSUE_INPUT =~ ^https?://github\.com/ ]]; then
  ISSUE_URL="$ISSUE_INPUT"
else
  # Assume it's just a number, try to infer from current directory
  # Or default to edspencer/bragdoc-ai (update as needed)
  ISSUE_URL="https://github.com/edspencer/bragdoc-ai/issues/$ISSUE_INPUT"
fi

# Parse the URL to extract owner, repo, and issue number
# Expected format: https://github.com/owner/repo/issues/NUMBER
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

echo "📤 Syncing task files to GitHub issue #$ISSUE_NUM in $REPO_FULL"
echo ""

# Function to sync a file to GitHub
sync_file() {
  local file=$1
  local marker=$2
  local title=$3
  local file_path="$TASK_DIR/$file"

  if [ ! -f "$file_path" ]; then
    echo "⏭️  Skipping $file (not found)"
    return
  fi

  echo "Processing $file..."

  # Read file content
  local content=$(cat "$file_path")

  # Check if comment with this marker already exists
  local existing_comment_id=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
    --jq ".[] | select(.body | contains(\"<!-- ${marker}_MARKER -->\")) | .id" 2>/dev/null || echo "")

  local body

  if [ -n "$existing_comment_id" ]; then
    # Fetch existing comment body to preserve summary/status
    echo "  ↻ Fetching existing comment (ID: $existing_comment_id)..."
    local existing_body=$(gh api repos/$REPO_FULL/issues/comments/$existing_comment_id --jq '.body' 2>/dev/null || echo "")

    if [ -n "$existing_body" ]; then
      # Check if there's a <details> tag in the existing body
      if echo "$existing_body" | grep -q "<details>"; then
        # Extract everything before the <details> tag (this is the summary/status section)
        # Use sed to get everything up to but not including the <details> line
        local summary_section=$(echo "$existing_body" | sed '/<details>/,$d')
      else
        # No <details> tag, use the whole body as summary (minus marker if present)
        local summary_section=$(echo "$existing_body")
      fi

      # Check if there's a summary section (more than just the marker comment)
      if echo "$summary_section" | grep -q -v "^<!-- ${marker}_MARKER -->$" && [ -n "$(echo "$summary_section" | sed '/^[[:space:]]*$/d' | tail -n +2)" ]; then
        # Preserve the summary section and add updated content
        body="$summary_section

<details>
<summary>📋 $title</summary>

\`\`\`markdown
$content
\`\`\`

</details>"
      else
        # No meaningful summary, use simple body
        body="<!-- ${marker}_MARKER -->

<details>
<summary>📋 $title</summary>

\`\`\`markdown
$content
\`\`\`

</details>"
      fi
    else
      # Couldn't fetch existing body, use simple body
      body="<!-- ${marker}_MARKER -->

<details>
<summary>📋 $title</summary>

\`\`\`markdown
$content
\`\`\`

</details>"
    fi

    # Update existing comment
    echo "  ↻ Updating existing comment (preserving summary)..."
    local temp_body_file=$(mktemp)
    echo "$body" > "$temp_body_file"
    gh api repos/$REPO_FULL/issues/comments/$existing_comment_id \
      -X PATCH \
      -F body=@"$temp_body_file" > /dev/null
    rm "$temp_body_file"
    echo "  ✓ Updated"
  else
    # Create new comment with simple body (no existing summary to preserve)
    body="<!-- ${marker}_MARKER -->

<details>
<summary>📋 $title</summary>

\`\`\`markdown
$content
\`\`\`

</details>"

    echo "  + Creating new comment..."
    local temp_body_file=$(mktemp)
    echo "$body" > "$temp_body_file"
    gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
      -X POST \
      -F body=@"$temp_body_file" > /dev/null
    rm "$temp_body_file"
    echo "  ✓ Created"
  fi

  echo ""
}

# Sync all four files
sync_file "SPEC.md" "SPEC" "Specification"
sync_file "PLAN.md" "PLAN" "Implementation Plan"
sync_file "TEST_PLAN.md" "TEST_PLAN" "Test Plan"
sync_file "COMMIT_MESSAGE.md" "COMMIT_MESSAGE" "Commit Message"

echo "✅ Sync complete!"
echo "View the issue: $ISSUE_URL"
