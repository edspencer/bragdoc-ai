#!/bin/bash
set -e

# This script deletes a Neon database branch.
#
# Usage: delete-neon-test-branch.sh BRANCH_ID

# Check required arguments
if [ -z "$1" ]; then
  echo "Error: Branch ID required"
  echo "Usage: delete-neon-test-branch.sh BRANCH_ID"
  exit 1
fi

BRANCH_ID="$1"

# Check required environment variables
if [ -z "$NEON_API_KEY" ]; then
  echo "Error: NEON_API_KEY environment variable is not set"
  exit 1
fi

if [ -z "$NEON_PROJECT_ID" ]; then
  echo "Error: NEON_PROJECT_ID environment variable is not set"
  exit 1
fi

echo "Deleting Neon branch: $BRANCH_ID"

# Delete the branch
curl -X DELETE "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}" \
  -H "Authorization: Bearer ${NEON_API_KEY}"

echo "Deleted test branch: $BRANCH_ID"
