#!/bin/bash

set -euo pipefail

# Script to update a single task file comment on a GitHub issue with status and content
# Usage: ./update-issue-file.sh <issue-url-or-number> <file-type> <status-file> <content-file>
# File types: SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE
# The status file should contain a 2-paragraph summary with optional bullet points

if [ $# -lt 4 ]; then
  echo "Usage: $0 <issue-url-or-number> <file-type> <status-file> <content-file>"
  echo ""
  echo "Arguments:"
  echo "  issue-url-or-number  GitHub issue URL or issue number"
  echo "  file-type            One of: SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE"
  echo "  status-file          File containing status summary (2 paragraphs + optional bullets)"
  echo "  content-file         File containing the full content to display"
  echo ""
  echo "Examples:"
  echo "  $0 188 SPEC SPEC-STATUS.md SPEC.md"
  echo "  $0 https://github.com/owner/repo/issues/188 PLAN plan-status.txt PLAN.md"
  exit 1
fi

ISSUE_INPUT="$1"
FILE_TYPE="$2"
STATUS_FILE="$3"
CONTENT_FILE="$4"

# Validate file type
case "$FILE_TYPE" in
  SPEC|PLAN|TEST_PLAN|COMMIT_MESSAGE)
    ;;
  *)
    echo "Error: Invalid file type '$FILE_TYPE'"
    echo "Valid types: SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE"
    exit 1
    ;;
esac

# Validate files exist
if [ ! -f "$STATUS_FILE" ]; then
  echo "Error: Status file not found: $STATUS_FILE"
  exit 1
fi

if [ ! -f "$CONTENT_FILE" ]; then
  echo "Error: Content file not found: $CONTENT_FILE"
  exit 1
fi

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
MARKER="${FILE_TYPE}_MARKER"

# Read status and content
status_content=$(cat "$STATUS_FILE")
file_content=$(cat "$CONTENT_FILE")

# Extract status value from first line (e.g., "**Status:** Complete")
status_line=$(echo "$status_content" | head -1)
status_value=$(echo "$status_line" | sed 's/.*\*\*Status:\*\* *//' | sed 's/\*\*//')

# Remove the first line (status line) from status_content to avoid duplication
remaining_content=$(echo "$status_content" | tail -n +2)

# Create the title from file type
case "$FILE_TYPE" in
  SPEC)
    title="Specification"
    ;;
  PLAN)
    title="Implementation Plan"
    ;;
  TEST_PLAN)
    title="Test Plan"
    ;;
  COMMIT_MESSAGE)
    title="Commit Message"
    ;;
esac

# Create body with marker, heading with status, and collapsible section
body="<!-- ${MARKER} -->

## $title: $status_value

$remaining_content

<details>
<summary>📋 $title</summary>

\`\`\`markdown
$file_content
\`\`\`

</details>"

# Check if comment with this marker already exists
# Use exact marker match including HTML comment tags to avoid matching TEST_PLAN_MARKER when looking for PLAN_MARKER
existing_comment_id=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
  --jq ".[] | select(.body | contains(\"<!-- ${MARKER} -->\")) | .id" 2>/dev/null || echo "")

if [ -n "$existing_comment_id" ]; then
  # Update existing comment
  echo "↻ Updating $FILE_TYPE comment on issue #$ISSUE_NUM (ID: $existing_comment_id)..."
  # Use a temporary file to avoid shell escaping issues with large bodies
  temp_body_file=$(mktemp)
  echo "$body" > "$temp_body_file"
  gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments/$existing_comment_id \
    -X PATCH \
    -F body=@"$temp_body_file" > /dev/null
  rm "$temp_body_file"
  echo "✓ Updated successfully"
else
  # Create new comment
  echo "+ Creating new $FILE_TYPE comment on issue #$ISSUE_NUM..."
  # Use a temporary file to avoid shell escaping issues with large bodies
  temp_body_file=$(mktemp)
  echo "$body" > "$temp_body_file"
  gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
    -X POST \
    -F body=@"$temp_body_file" > /dev/null
  rm "$temp_body_file"
  echo "✓ Created successfully"
fi

echo ""
echo "View the issue: $ISSUE_URL"
