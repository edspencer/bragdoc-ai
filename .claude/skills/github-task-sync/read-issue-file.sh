#!/bin/bash

set -euo pipefail

# Script to read task documentation files from a GitHub issue comment
# Usage: ./read-issue-file.sh <issue-url-or-number> <file-type>
# File types: SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE
# Output: File contents to stdout

if [ $# -lt 2 ]; then
  echo "Usage: $0 <issue-url-or-number> <file-type>"
  echo ""
  echo "Arguments:"
  echo "  issue-url-or-number  GitHub issue URL or issue number"
  echo "  file-type            One of: SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE"
  echo ""
  echo "Examples:"
  echo "  $0 https://github.com/owner/repo/issues/188 SPEC"
  echo "  $0 188 PLAN"
  exit 1
fi

ISSUE_INPUT="$1"
FILE_TYPE="$2"

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

# Fetch the comment with the matching marker and extract the content
# Use startswith to match the exact marker (not substrings like PLAN_MARKER vs TEST_PLAN_MARKER)
comment_body=$(gh api repos/$REPO_FULL/issues/$ISSUE_NUM/comments \
  --jq ".[] | select(.body | startswith(\"<!-- $MARKER -->\")) | .body" 2>/dev/null || echo "")

if [ -z "$comment_body" ]; then
  echo "Error: Could not find $FILE_TYPE comment on issue #$ISSUE_NUM" >&2
  exit 1
fi

# Extract the content between the markdown code fences
# Handle both plain markdown blocks and those wrapped in <details> tags
if echo "$comment_body" | grep -q '<details>'; then
  # For content in <details>, extract from ```markdown to </details>, then remove first line and last 2 lines
  extracted=$(echo "$comment_body" | sed -n '/```markdown/,/<\/details>/p' | sed '1d' | sed '$d' | sed '$d')
else
  # For unwrapped content, extract between ```markdown and the LAST ``` (to handle nested code blocks)
  extracted=$(echo "$comment_body" | awk '/```markdown/{flag=1; next} /^```$/ && flag{exit} flag')
fi

if [ -z "$extracted" ]; then
  echo "Error: Could not extract content from $FILE_TYPE comment" >&2
  exit 1
fi

# Output to stdout
echo "$extracted"
