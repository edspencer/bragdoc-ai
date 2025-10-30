#!/bin/bash

set -euo pipefail

# Script to add an entry to a task's work log on a GitHub issue
# Usage: ./log-entry.sh <issue-url-or-number> <entry-text>
# Creates or updates a WORK_LOG comment with timestamped entries

if [ $# -lt 2 ]; then
  echo "Usage: $0 <issue-url-or-number> <entry-text>"
  echo ""
  echo "Arguments:"
  echo "  issue-url-or-number  GitHub issue URL or issue number"
  echo "  entry-text           Text describing the work (e.g., 'Started writing spec')"
  echo ""
  echo "Examples:"
  echo "  $0 188 'Started writing spec'"
  echo "  $0 190 'Finished writing plan'"
  exit 1
fi

ISSUE_INPUT="$1"
ENTRY_TEXT="$2"

# Default repository (can be overridden)
OWNER="edspencer"
REPO="bragdoc-ai"
REPO_FULL="$OWNER/$REPO"

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
MARKER="WORK_LOG_MARKER"

# Get current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if WORK_LOG comment already exists
existing_comment_id=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
  --jq ".[] | select(.body | contains(\"<!-- ${MARKER} -->\")) | .id" 2>/dev/null || echo "")

if [ -n "$existing_comment_id" ]; then
  # Get existing comment body
  existing_body=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments/$existing_comment_id \
    --jq '.body' 2>/dev/null)

  # Append new entry (insert before closing of last list item or at end)
  # Format: - TIMESTAMP: entry-text
  new_entry="- $TIMESTAMP: $ENTRY_TEXT"

  # Insert new entry before the last closing detail tag if it exists, or just append
  if [[ $existing_body == *"</details>"* ]]; then
    new_body="${existing_body%</details>*}$new_entry

</details>"
  else
    new_body="$existing_body

$new_entry"
  fi

  # Update existing comment
  echo "↻ Adding entry to work log on issue #$ISSUE_NUM..."
  temp_body_file=$(mktemp)
  echo "$new_body" > "$temp_body_file"
  gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments/$existing_comment_id \
    -X PATCH \
    -F body=@"$temp_body_file" > /dev/null
  rm "$temp_body_file"
  echo "✓ Entry added"
else
  # Create new WORK_LOG comment
  echo "+ Creating work log on issue #$ISSUE_NUM..."

  new_entry="- $TIMESTAMP: $ENTRY_TEXT"

  body="<!-- ${MARKER} -->

## AI Work Log

$new_entry"

  temp_body_file=$(mktemp)
  echo "$body" > "$temp_body_file"
  gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
    -X POST \
    -F body=@"$temp_body_file" > /dev/null
  rm "$temp_body_file"
  echo "✓ Work log created"
fi

echo ""
echo "View the issue: $ISSUE_URL"
