#!/bin/bash
# Normalize extraction output for snapshot comparison
#
# Usage: cat output.txt | ./normalize-output.sh /path/to/repo > normalized.txt
#
# This script normalizes CLI extraction output by:
# - Replacing 7-character commit hashes with "HASH"
# - Replacing dates (MM/DD/YYYY and YYYY-MM-DD) with "DATE"
# - Replacing timestamps (HH:MM:SS) with "TIME"
# - Replacing absolute paths with "REPO"

REPO_PATH="${1:-}"

if [ -z "$REPO_PATH" ]; then
  echo "Error: Repository path required" >&2
  echo "Usage: $0 /path/to/repo < input.txt" >&2
  exit 1
fi

# Apply all normalizations in order
# Note: Path normalization must happen BEFORE specific repo path replacement
sed -e 's/[0-9a-f]\{7\}/HASH/g' \
    -e 's/[0-9]\{1,2\}\/[0-9]\{1,2\}\/[0-9]\{4\}/DATE/g' \
    -e 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}/DATE/g' \
    -e 's/[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}/TIME/g' \
    -e 's|/private/tmp/[^ ]*|REPO|g' \
    -e 's|/tmp/[^ ]*|REPO|g' \
    -e "s|$REPO_PATH|REPO|g"
