#!/bin/bash
# Generate Corpus Snapshot
#
# Extracts achievements from a corpus repository and saves them as a snapshot
# for regression testing. This script clones the repo (if not cached), identifies
# commits by the test author, and runs bragdoc extraction in dry-run mode.
#
# Usage:
#   ./corpus/scripts/generate-snapshot.sh <repo-slug>
#   ./corpus/scripts/generate-snapshot.sh colinhacks-zod
#   ./corpus/scripts/generate-snapshot.sh --force facebook-react  # Force re-clone
#
# Environment:
#   OPENAI_API_KEY (or other LLM key) - Required for extraction

set -e

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORPUS_DIR="$PROJECT_ROOT/corpus"
CACHE_DIR="$PROJECT_ROOT/.corpus-cache"
MANIFEST_FILE="$CORPUS_DIR/repos-manifest.json"
SNAPSHOTS_DIR="$CORPUS_DIR/snapshots"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
FORCE_CLONE=false
MAX_COMMITS=500
CLONE_DEPTH=2000

# Print functions
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Usage help
usage() {
  echo "Usage: $0 [OPTIONS] <repo-slug>"
  echo ""
  echo "Generate a corpus snapshot for a repository defined in repos-manifest.json"
  echo ""
  echo "Arguments:"
  echo "  repo-slug       Repository slug (e.g., colinhacks-zod, facebook-react)"
  echo ""
  echo "Options:"
  echo "  --force         Force re-clone even if cached"
  echo "  --max-commits   Maximum commits to analyze (default: $MAX_COMMITS)"
  echo "  --help          Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 colinhacks-zod"
  echo "  $0 --force facebook-react"
  echo "  $0 --max-commits 100 vercel-nextjs"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_CLONE=true
      shift
      ;;
    --max-commits)
      MAX_COMMITS="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    -*)
      print_error "Unknown option: $1"
      usage
      exit 1
      ;;
    *)
      REPO_SLUG="$1"
      shift
      ;;
  esac
done

# Validate repo slug argument
if [ -z "$REPO_SLUG" ]; then
  print_error "Repository slug is required"
  usage
  exit 1
fi

# Check manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
  print_error "Manifest file not found: $MANIFEST_FILE"
  exit 1
fi

# Find repo in manifest using jq
print_info "Looking up repository: $REPO_SLUG"

# Check if jq is available
if ! command -v jq &> /dev/null; then
  print_error "jq is required but not installed. Install with: brew install jq"
  exit 1
fi

# Extract repo info from manifest - search all categories and include category name
# Use jq -c to output compact JSON (one line per match) then take first match
REPO_INFO=$(jq -c --arg slug "$REPO_SLUG" '
  .categories | to_entries[] |
  .key as $category |
  .value.repos[] |
  select(.slug == $slug) |
  . + {category: $category}
' "$MANIFEST_FILE" 2>/dev/null | head -1 || echo "")

if [ -z "$REPO_INFO" ] || [ "$REPO_INFO" == "null" ]; then
  print_error "Repository not found in manifest: $REPO_SLUG"
  echo ""
  echo "Available repositories:"
  jq -r '.categories | to_entries[] | .value.repos[].slug' "$MANIFEST_FILE" | sort | head -20
  echo "... (use jq to see full list)"
  exit 1
fi

# Parse repo info
REPO_URL=$(echo "$REPO_INFO" | jq -r '.url')
REPO_CATEGORY=$(echo "$REPO_INFO" | jq -r '.category')
TEST_AUTHOR=$(echo "$REPO_INFO" | jq -r '.testAuthor')
MERGE_STRATEGY=$(echo "$REPO_INFO" | jq -r '.mergeStrategy')
LANGUAGE=$(echo "$REPO_INFO" | jq -r '.language')

print_info "Found repository:"
print_info "  URL: $REPO_URL"
print_info "  Category: $REPO_CATEGORY"
print_info "  Test Author: $TEST_AUTHOR"
print_info "  Merge Strategy: $MERGE_STRATEGY"
print_info "  Language: $LANGUAGE"

# Create cache directory
mkdir -p "$CACHE_DIR"

# Clone or use cached repository
REPO_PATH="$CACHE_DIR/$REPO_SLUG"

if [ -d "$REPO_PATH" ] && [ "$FORCE_CLONE" = false ]; then
  print_info "Using cached repository at: $REPO_PATH"

  # Update the cache with fetch
  print_info "Fetching latest changes..."
  cd "$REPO_PATH"
  git fetch --depth "$CLONE_DEPTH" origin 2>/dev/null || print_warning "Fetch failed, using existing cache"
  cd - > /dev/null
else
  if [ -d "$REPO_PATH" ]; then
    print_info "Removing existing cache (--force specified)"
    rm -rf "$REPO_PATH"
  fi

  print_info "Cloning repository (shallow clone, depth=$CLONE_DEPTH)..."
  git clone --depth "$CLONE_DEPTH" --single-branch "$REPO_URL" "$REPO_PATH"
  print_success "Repository cloned"
fi

# Change to repo directory
cd "$REPO_PATH"

# Get the default branch
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
print_info "Default branch: $DEFAULT_BRANCH"

# Find commits by test author
print_info "Finding commits by author: $TEST_AUTHOR"

# Try exact author match first
AUTHOR_COMMITS=$(git log --author="$TEST_AUTHOR" --format="%H" -n "$MAX_COMMITS" 2>/dev/null | wc -l | tr -d ' ')

if [ "$AUTHOR_COMMITS" -lt 10 ]; then
  print_warning "Only $AUTHOR_COMMITS commits found for author '$TEST_AUTHOR'"

  # Find most prolific author as fallback
  print_info "Finding most prolific author in last 12 months..."
  PROLIFIC_AUTHOR=$(git log --since="12 months ago" --format="%an" 2>/dev/null | sort | uniq -c | sort -rn | head -1 | awk '{$1=""; print $0}' | xargs)

  if [ -n "$PROLIFIC_AUTHOR" ]; then
    PROLIFIC_COUNT=$(git log --since="12 months ago" --author="$PROLIFIC_AUTHOR" --format="%H" 2>/dev/null | wc -l | tr -d ' ')
    print_info "Most prolific author: $PROLIFIC_AUTHOR ($PROLIFIC_COUNT commits in last 12 months)"

    if [ "$PROLIFIC_COUNT" -gt "$AUTHOR_COMMITS" ]; then
      print_warning "Using prolific author instead of test author"
      TEST_AUTHOR="$PROLIFIC_AUTHOR"
      AUTHOR_COMMITS="$PROLIFIC_COUNT"
    fi
  fi
fi

print_info "Found $AUTHOR_COMMITS commits by '$TEST_AUTHOR'"

if [ "$AUTHOR_COMMITS" -eq 0 ]; then
  print_error "No commits found for any author. Repository may be empty or too shallow."
  exit 1
fi

# Get author email
AUTHOR_EMAIL=$(git log --author="$TEST_AUTHOR" --format="%ae" -n 1 2>/dev/null || echo "unknown@example.com")
print_info "Author email: $AUTHOR_EMAIL"

# Get pinned commit (latest commit we're analyzing)
PINNED_COMMIT=$(git log --author="$TEST_AUTHOR" --format="%H" -n 1 2>/dev/null)
print_info "Pinned commit: $PINNED_COMMIT"

# Create snapshot directory structure
SNAPSHOT_DIR="$SNAPSHOTS_DIR/$REPO_CATEGORY/$REPO_SLUG"
mkdir -p "$SNAPSHOT_DIR"

# Generate timestamp for snapshot
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
SNAPSHOT_FILE="$SNAPSHOT_DIR/$TIMESTAMP.json"

# Get commit data as JSON
print_info "Extracting commit data..."

# Build commit JSON using git log with proper escaping
# Use a unique delimiter that won't appear in commit messages
DELIM="__BRAGDOC_FIELD_SEP__"
RECORD_DELIM="__BRAGDOC_RECORD_SEP__"

COMMITS_JSON=$(git log --author="$TEST_AUTHOR" \
  --format="${DELIM}%H${DELIM}%h${DELIM}%s${DELIM}%an${DELIM}%ae${DELIM}%aI${RECORD_DELIM}" \
  -n "$MAX_COMMITS" 2>/dev/null | \
  awk -v FS="$DELIM" -v RS="$RECORD_DELIM" '
  BEGIN { first = 1 ; print "[" }
  NF >= 6 {
    # Skip empty lines
    if ($2 == "") next

    if (!first) print ","
    first = 0

    # Extract fields (they start at $2 because $1 is empty before first delimiter)
    hash = $2
    shortHash = $3
    subject = $4
    authorName = $5
    authorEmail = $6
    date = $7

    # Escape JSON special characters in subject
    gsub(/\\/, "\\\\", subject)
    gsub(/"/, "\\\"", subject)
    gsub(/\t/, "\\t", subject)
    gsub(/\r/, "\\r", subject)
    gsub(/\n/, "\\n", subject)

    # Also escape author name
    gsub(/\\/, "\\\\", authorName)
    gsub(/"/, "\\\"", authorName)

    printf "{\"hash\":\"%s\",\"shortHash\":\"%s\",\"subject\":\"%s\",\"authorName\":\"%s\",\"authorEmail\":\"%s\",\"date\":\"%s\"}", hash, shortHash, subject, authorName, authorEmail, date
  }
  END { print "\n]" }
  ')

ACTUAL_COMMIT_COUNT=$(echo "$COMMITS_JSON" | jq 'length')
print_info "Extracted $ACTUAL_COMMIT_COUNT commits"

# Write temporary files for extraction script
TEMP_COMMITS_FILE=$(mktemp)
TEMP_REPO_INFO_FILE=$(mktemp)

# Save commits to temp file
echo "$COMMITS_JSON" > "$TEMP_COMMITS_FILE"

# Create repo info JSON for extraction script
jq -n \
  --arg url "$REPO_URL" \
  --arg slug "$REPO_SLUG" \
  --arg category "$REPO_CATEGORY" \
  --arg language "$LANGUAGE" \
  --arg mergeStrategy "$MERGE_STRATEGY" \
  --arg path "$REPO_PATH" \
  '{
    url: $url,
    slug: $slug,
    category: $category,
    language: $language,
    mergeStrategy: $mergeStrategy,
    path: $path
  }' > "$TEMP_REPO_INFO_FILE"

# Run LLM extraction if API key is available
print_info "Running LLM extraction..."

EXTRACTION_SCRIPT="$SCRIPT_DIR/extract-achievements.ts"
if [ -f "$EXTRACTION_SCRIPT" ]; then
  # Run extraction script and capture output
  # Use tsx instead of ts-node for better ESM/JSX support
  # Redirect stderr to a temp file, stdout to another
  TEMP_STDOUT=$(mktemp)
  TEMP_STDERR=$(mktemp)
  cd "$PROJECT_ROOT" && npx tsx "$EXTRACTION_SCRIPT" "$TEMP_COMMITS_FILE" "$TEMP_REPO_INFO_FILE" > "$TEMP_STDOUT" 2> "$TEMP_STDERR"
  EXTRACTION_EXIT_CODE=$?
  cd - > /dev/null

  # Show progress messages from stderr (but filter npm warnings)
  grep -v "^npm warn" "$TEMP_STDERR" | while read -r line; do
    echo "  $line"
  done

  # Read JSON from stdout
  EXTRACTION_JSON=$(cat "$TEMP_STDOUT")

  # Clean up temp files
  rm -f "$TEMP_STDOUT" "$TEMP_STDERR"

  # Verify we got valid JSON
  if [ -z "$EXTRACTION_JSON" ]; then
    print_warning "Extraction script produced no output"
    EXTRACTION_JSON=$(jq -n '{
      achievementCount: 0,
      achievements: [],
      status: "error",
      note: "Extraction script produced no output"
    }')
  elif ! echo "$EXTRACTION_JSON" | jq . > /dev/null 2>&1; then
    print_warning "Extraction output is not valid JSON"
    print_warning "Raw output: $EXTRACTION_JSON"
    EXTRACTION_JSON=$(jq -n '{
      achievementCount: 0,
      achievements: [],
      status: "error",
      note: "Extraction script output could not be parsed as JSON"
    }')
  fi

  # Process extraction results
  EXTRACTION_STATUS=$(echo "$EXTRACTION_JSON" | jq -r '.status')
  ACHIEVEMENT_COUNT=$(echo "$EXTRACTION_JSON" | jq -r '.achievementCount')

  if [ "$EXTRACTION_STATUS" = "complete" ]; then
    print_success "Extraction complete: $ACHIEVEMENT_COUNT achievement(s) extracted"
  elif [ "$EXTRACTION_STATUS" = "skipped" ]; then
    print_warning "Extraction skipped: No LLM API key configured"
    print_info "Set OPENAI_API_KEY (or other provider key) to enable extraction"
  else
    print_warning "Extraction status: $EXTRACTION_STATUS"
  fi
else
  print_warning "Extraction script not found: $EXTRACTION_SCRIPT"
  EXTRACTION_JSON=$(jq -n '{
    achievementCount: 0,
    achievements: [],
    status: "pending_extraction",
    note: "Extraction script not found"
  }')
fi

# Clean up temp files
rm -f "$TEMP_COMMITS_FILE" "$TEMP_REPO_INFO_FILE"

print_info "Creating snapshot..."

# Build the snapshot JSON with extraction results
SNAPSHOT_JSON=$(jq -n \
  --arg version "1.0" \
  --arg extractedAt "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg repoUrl "$REPO_URL" \
  --arg repoSlug "$REPO_SLUG" \
  --arg category "$REPO_CATEGORY" \
  --arg authorName "$TEST_AUTHOR" \
  --arg authorEmail "$AUTHOR_EMAIL" \
  --argjson commitCount "$ACTUAL_COMMIT_COUNT" \
  --arg pinnedCommit "$PINNED_COMMIT" \
  --arg mergeStrategy "$MERGE_STRATEGY" \
  --arg language "$LANGUAGE" \
  --argjson commits "$COMMITS_JSON" \
  --argjson extraction "$EXTRACTION_JSON" \
  '{
    version: $version,
    extractedAt: $extractedAt,
    repo: {
      url: $repoUrl,
      slug: $repoSlug,
      category: $category,
      language: $language,
      mergeStrategy: $mergeStrategy
    },
    author: {
      name: $authorName,
      email: $authorEmail,
      commitCount: $commitCount
    },
    pinnedCommit: $pinnedCommit,
    commits: $commits,
    extraction: $extraction
  }')

# Write snapshot file
echo "$SNAPSHOT_JSON" > "$SNAPSHOT_FILE"
print_success "Snapshot saved to: $SNAPSHOT_FILE"

# Update corpus manifest
print_info "Updating corpus manifest..."
MANIFEST_PATH="$CORPUS_DIR/manifest.json"

# Get achievement count from extraction results
MANIFEST_ACHIEVEMENT_COUNT=$(echo "$EXTRACTION_JSON" | jq -r '.achievementCount // 0')

# Add snapshot entry to manifest
UPDATED_MANIFEST=$(jq \
  --arg id "${REPO_SLUG}-${TIMESTAMP}" \
  --arg repo "$REPO_SLUG" \
  --arg category "$REPO_CATEGORY" \
  --arg path "snapshots/$REPO_CATEGORY/$REPO_SLUG/$TIMESTAMP.json" \
  --arg extractedAt "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --argjson commitCount "$ACTUAL_COMMIT_COUNT" \
  --argjson achievementCount "$MANIFEST_ACHIEVEMENT_COUNT" \
  '.snapshots += [{
    id: $id,
    repo: $repo,
    category: $category,
    snapshotPath: $path,
    extractedAt: $extractedAt,
    commitCount: $commitCount,
    achievementCount: $achievementCount
  }]' "$MANIFEST_PATH")

echo "$UPDATED_MANIFEST" > "$MANIFEST_PATH"
print_success "Manifest updated"

# Get extraction status for summary
EXTRACTION_STATUS=$(echo "$EXTRACTION_JSON" | jq -r '.status // "unknown"')
EXTRACTION_NOTE=$(echo "$EXTRACTION_JSON" | jq -r '.note // ""')

# Print summary
echo ""
echo "========================================"
echo "Snapshot Generation Complete"
echo "========================================"
echo ""
echo "Repository:     $REPO_SLUG"
echo "Category:       $REPO_CATEGORY"
echo "Author:         $TEST_AUTHOR"
echo "Commits:        $ACTUAL_COMMIT_COUNT"
echo "Achievements:   $MANIFEST_ACHIEVEMENT_COUNT"
echo "Extraction:     $EXTRACTION_STATUS"
echo "Pinned At:      ${PINNED_COMMIT:0:8}"
echo "Snapshot:       $SNAPSHOT_FILE"

if [ -n "$EXTRACTION_NOTE" ] && [ "$EXTRACTION_NOTE" != "null" ]; then
  echo ""
  echo "Note: $EXTRACTION_NOTE"
fi

echo ""
if [ "$EXTRACTION_STATUS" = "complete" ]; then
  echo "Next steps:"
  echo "  1. Review extracted achievements in the snapshot"
  echo "  2. Use compare-achievements.ts for regression testing"
elif [ "$EXTRACTION_STATUS" = "skipped" ]; then
  echo "Next steps:"
  echo "  1. Set an LLM API key (e.g., OPENAI_API_KEY) and re-run"
  echo "  2. Or use this snapshot as a commit-metadata baseline"
else
  echo "Next steps:"
  echo "  1. Check extraction errors and re-run"
  echo "  2. Use compare-achievements.ts for regression testing"
fi
echo ""
