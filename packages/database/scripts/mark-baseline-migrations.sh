#!/bin/bash
set -e

# This script marks baseline migrations as applied in Neon schema-only branches.
#
# When using Neon's schema-only branching, the database has the complete schema
# but the __drizzle_migrations table is empty. This script identifies which
# migrations were present in the parent branch (via git) and marks them as
# applied, so Drizzle only runs new migrations from the current branch.

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL environment variable is not set"
  exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/../src/migrations/meta"
JOURNAL_FILE="$MIGRATIONS_DIR/_journal.json"

# Check if journal file exists
if [ ! -f "$JOURNAL_FILE" ]; then
  echo "Error: Migration journal not found at $JOURNAL_FILE"
  exit 1
fi

# Find the merge base with main branch (or origin/main if local main doesn't exist)
MAIN_BRANCH="main"
if git show-ref --verify --quiet refs/heads/main; then
  echo "Using refs/heads/main"
  MERGE_BASE=$(git merge-base HEAD main)
  MAIN_REF="main"
elif git show-ref --verify --quiet refs/remotes/origin/main; then
  echo "Using refs/remotes/origin/main"
  MERGE_BASE=$(git merge-base HEAD origin/main)
  MAIN_REF="origin/main"
else
  echo "Error: Could not find main branch (neither refs/heads/main nor refs/remotes/origin/main exist)"
  echo "Available branches:"
  git branch -a
  exit 1
fi

echo "Merge base with $MAIN_REF: $MERGE_BASE"
echo "Current HEAD: $(git rev-parse HEAD)"

# Check if we're on main (merge base equals HEAD)
if [ "$MERGE_BASE" == "$(git rev-parse HEAD)" ]; then
  echo "Currently on main branch - no new migrations to run"
  # Still mark all migrations as baseline since schema exists
fi

# Get the journal file content at the merge base
BASELINE_JOURNAL=$(git show "$MERGE_BASE:packages/database/src/migrations/meta/_journal.json" 2>/dev/null || echo '{"entries":[]}')

# Parse baseline migrations using jq
BASELINE_MIGRATIONS=$(echo "$BASELINE_JOURNAL" | jq -r '.entries[] | "\(.tag)|\(.when)"')

if [ -z "$BASELINE_MIGRATIONS" ]; then
  echo "No baseline migrations found - this appears to be a fresh database"
  exit 0
fi

# Count baseline migrations
BASELINE_COUNT=$(echo "$BASELINE_MIGRATIONS" | wc -l | tr -d ' ')
echo "Found $BASELINE_COUNT baseline migrations to mark as applied"

# Build SQL INSERT statement
SQL="INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES"
FIRST=true

while IFS='|' read -r tag timestamp; do
  if [ "$FIRST" = true ]; then
    SQL="$SQL ('$tag', $timestamp)"
    FIRST=false
  else
    SQL="$SQL, ('$tag', $timestamp)"
  fi
done <<< "$BASELINE_MIGRATIONS"

SQL="$SQL ON CONFLICT DO NOTHING;"

# Execute SQL
echo "Marking baseline migrations as applied..."
psql "$POSTGRES_URL" -c "$SQL"

echo "✅ Successfully marked $BASELINE_COUNT baseline migrations as applied"
