#!/bin/bash
set -e

# This script creates a schema-only Neon database branch for testing.
#
# It creates a fresh branch with the parent's schema but no data, waits for
# the endpoint to be ready, and outputs the branch ID and connection string
# for use in subsequent steps.

# Check required environment variables
if [ -z "$NEON_API_KEY" ]; then
  echo "Error: NEON_API_KEY environment variable is not set"
  exit 1
fi

if [ -z "$NEON_PROJECT_ID" ]; then
  echo "Error: NEON_PROJECT_ID environment variable is not set"
  exit 1
fi

# Generate unique branch name using GitHub run info or timestamp
if [ -n "$GITHUB_RUN_ID" ]; then
  BRANCH_NAME="test-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT:-1}"
else
  BRANCH_NAME="test-$(date +%s)"
fi

echo "Creating schema-only branch: $BRANCH_NAME"

# Create schema-only branch (no data from parent)
RESPONSE=$(curl -s -X POST "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"branch\": {\"name\": \"$BRANCH_NAME\", \"init_source\": \"schema-only\"}, \"endpoints\": [{\"type\": \"read_write\"}]}")

# Extract branch ID
BRANCH_ID=$(echo "$RESPONSE" | jq -r '.branch.id')

if [ "$BRANCH_ID" == "null" ] || [ -z "$BRANCH_ID" ]; then
  echo "ERROR: Failed to create branch"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "Branch created: $BRANCH_ID"

# Wait for endpoint to be ready (max 60 seconds)
echo "Waiting for endpoint to be ready..."
for i in {1..60}; do
  sleep 2

  # Get connection string
  CONNECTION_RESPONSE=$(curl -s "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${BRANCH_ID}&role_name=default&database_name=verceldb" \
    -H "Authorization: Bearer ${NEON_API_KEY}")

  CONNECTION_STRING=$(echo "$CONNECTION_RESPONSE" | jq -r '.uri')

  if [ "$CONNECTION_STRING" != "null" ] && [ -n "$CONNECTION_STRING" ]; then
    echo "Endpoint is ready"
    break
  fi

  if [ $i -eq 60 ]; then
    echo "ERROR: Timeout waiting for endpoint to be ready"
    echo "$CONNECTION_RESPONSE" | jq '.'
    exit 1
  fi

  echo "Waiting for endpoint to be ready... ($i/60)"
done

# Output results
echo "branch_id=$BRANCH_ID"
echo "connection_string=$CONNECTION_STRING"
echo "Successfully created test database with schema only"

# For GitHub Actions, write to GITHUB_OUTPUT
if [ -n "$GITHUB_OUTPUT" ]; then
  echo "branch_id=$BRANCH_ID" >> "$GITHUB_OUTPUT"
  echo "connection_string=$CONNECTION_STRING" >> "$GITHUB_OUTPUT"
fi
