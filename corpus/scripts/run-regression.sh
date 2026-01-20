#!/bin/bash
# Run Corpus Regression Tests
#
# Runs extraction on repos that have existing snapshots and compares
# results against the most recent baseline. This helps detect regressions
# in achievement extraction quality.
#
# Usage:
#   ./corpus/scripts/run-regression.sh                    # Test all repos with snapshots
#   ./corpus/scripts/run-regression.sh --per-category 2   # Test 2 random repos per category
#   ./corpus/scripts/run-regression.sh --repo colinhacks-zod  # Test specific repo
#
# Environment:
#   OPENAI_API_KEY (or other LLM key) - Required for extraction

set -e

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORPUS_DIR="$PROJECT_ROOT/corpus"
MANIFEST_FILE="$CORPUS_DIR/manifest.json"
SNAPSHOTS_DIR="$CORPUS_DIR/snapshots"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
PER_CATEGORY=0  # 0 means all
SPECIFIC_REPO=""
VERBOSE=false

# Print functions
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
  echo -e "${RED}[FAIL]${NC} $1" >&2
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Usage help
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Run regression tests on corpus repositories with existing snapshots"
  echo ""
  echo "Options:"
  echo "  --per-category N   Test N random repos per category (default: all)"
  echo "  --repo <slug>      Test specific repository only"
  echo "  --verbose          Show detailed comparison output"
  echo "  --help             Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0                          # Test all repos with snapshots"
  echo "  $0 --per-category 2         # Test 2 random repos per category"
  echo "  $0 --repo colinhacks-zod    # Test specific repo"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --per-category)
      PER_CATEGORY="$2"
      shift 2
      ;;
    --repo)
      SPECIFIC_REPO="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
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
      print_error "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

# Check manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
  print_error "Manifest file not found: $MANIFEST_FILE"
  exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  print_error "jq is required but not installed. Install with: brew install jq"
  exit 1
fi

# Get snapshots from manifest
print_info "Loading corpus manifest..."
SNAPSHOT_COUNT=$(jq '.snapshots | length' "$MANIFEST_FILE")

if [ "$SNAPSHOT_COUNT" -eq 0 ]; then
  print_warning "No snapshots found in manifest"
  print_info "Run generate-snapshot.sh first to create baseline snapshots"
  exit 0
fi

print_info "Found $SNAPSHOT_COUNT snapshot(s) in manifest"

# Build list of repos to test
REPOS_TO_TEST=""

if [ -n "$SPECIFIC_REPO" ]; then
  # Test specific repo
  REPO_EXISTS=$(jq -r --arg repo "$SPECIFIC_REPO" '.snapshots[] | select(.repo == $repo) | .repo' "$MANIFEST_FILE" | head -1)
  if [ -z "$REPO_EXISTS" ]; then
    print_error "No snapshot found for repo: $SPECIFIC_REPO"
    print_info "Available repos with snapshots:"
    jq -r '.snapshots[].repo' "$MANIFEST_FILE" | sort -u
    exit 1
  fi
  REPOS_TO_TEST="$SPECIFIC_REPO"
elif [ "$PER_CATEGORY" -gt 0 ]; then
  # Get N random repos per category
  print_info "Selecting $PER_CATEGORY random repo(s) per category..."

  # Get unique categories
  CATEGORIES=$(jq -r '.snapshots[].category' "$MANIFEST_FILE" | sort -u)

  for category in $CATEGORIES; do
    # Get repos in this category and shuffle
    CATEGORY_REPOS=$(jq -r --arg cat "$category" '.snapshots[] | select(.category == $cat) | .repo' "$MANIFEST_FILE" | sort -u | shuf | head -n "$PER_CATEGORY")
    for repo in $CATEGORY_REPOS; do
      REPOS_TO_TEST="$REPOS_TO_TEST $repo"
    done
    print_info "  $category: $(echo $CATEGORY_REPOS | wc -w | tr -d ' ') repo(s)"
  done
else
  # Test all repos with snapshots
  REPOS_TO_TEST=$(jq -r '.snapshots[].repo' "$MANIFEST_FILE" | sort -u)
fi

# Count repos
TOTAL_REPOS=$(echo $REPOS_TO_TEST | wc -w | tr -d ' ')
print_info "Testing $TOTAL_REPOS repository(ies)"

# Results tracking
PASSED=0
FAILED=0
SKIPPED=0
RESULTS=""

# Test each repo
CURRENT=0
for repo in $REPOS_TO_TEST; do
  CURRENT=$((CURRENT + 1))
  echo ""
  print_info "[$CURRENT/$TOTAL_REPOS] Testing: $repo"

  # Get most recent snapshot for this repo
  LATEST_SNAPSHOT=$(jq -r --arg repo "$repo" '
    .snapshots | map(select(.repo == $repo)) | sort_by(.extractedAt) | last | .snapshotPath
  ' "$MANIFEST_FILE")

  if [ -z "$LATEST_SNAPSHOT" ] || [ "$LATEST_SNAPSHOT" == "null" ]; then
    print_warning "No snapshot found for $repo, skipping"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  SNAPSHOT_PATH="$CORPUS_DIR/$LATEST_SNAPSHOT"

  if [ ! -f "$SNAPSHOT_PATH" ]; then
    print_warning "Snapshot file not found: $SNAPSHOT_PATH"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Get snapshot info
  BASELINE_COMMIT_COUNT=$(jq '.author.commitCount' "$SNAPSHOT_PATH")
  BASELINE_ACHIEVEMENT_COUNT=$(jq '.extraction.achievementCount' "$SNAPSHOT_PATH")
  BASELINE_STATUS=$(jq -r '.extraction.status // "complete"' "$SNAPSHOT_PATH")

  print_info "  Baseline: $BASELINE_COMMIT_COUNT commits, $BASELINE_ACHIEVEMENT_COUNT achievements (status: $BASELINE_STATUS)"

  # For now, just validate the snapshot exists and is well-formed
  # Full regression testing with LLM extraction will be added when we have the compare utility

  # Validate snapshot structure
  VALIDATION_ERRORS=""

  # Check required fields
  if [ "$(jq 'has("version")' "$SNAPSHOT_PATH")" != "true" ]; then
    VALIDATION_ERRORS="$VALIDATION_ERRORS\n  - Missing 'version' field"
  fi
  if [ "$(jq 'has("repo")' "$SNAPSHOT_PATH")" != "true" ]; then
    VALIDATION_ERRORS="$VALIDATION_ERRORS\n  - Missing 'repo' field"
  fi
  if [ "$(jq 'has("author")' "$SNAPSHOT_PATH")" != "true" ]; then
    VALIDATION_ERRORS="$VALIDATION_ERRORS\n  - Missing 'author' field"
  fi
  if [ "$(jq 'has("commits")' "$SNAPSHOT_PATH")" != "true" ]; then
    VALIDATION_ERRORS="$VALIDATION_ERRORS\n  - Missing 'commits' field"
  fi
  if [ "$(jq 'has("extraction")' "$SNAPSHOT_PATH")" != "true" ]; then
    VALIDATION_ERRORS="$VALIDATION_ERRORS\n  - Missing 'extraction' field"
  fi

  # Check commit count matches
  ACTUAL_COMMITS=$(jq '.commits | length' "$SNAPSHOT_PATH")
  if [ "$ACTUAL_COMMITS" -lt 1 ]; then
    VALIDATION_ERRORS="$VALIDATION_ERRORS\n  - No commits in snapshot"
  fi

  if [ -n "$VALIDATION_ERRORS" ]; then
    print_error "$repo - Snapshot validation failed:$VALIDATION_ERRORS"
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\n${RED}FAIL${NC} $repo - Invalid snapshot"
    continue
  fi

  # If extraction is pending, warn but pass (snapshot is valid)
  if [ "$BASELINE_STATUS" == "pending_extraction" ]; then
    print_warning "$repo - Extraction pending (snapshot valid, no achievements to compare)"
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\n${YELLOW}PASS${NC} $repo - Pending extraction"
    continue
  fi

  # TODO: Add actual regression comparison when compare-achievements.ts is ready
  # For now, just validate the snapshot is well-formed
  print_success "$repo - Snapshot valid ($ACTUAL_COMMITS commits, $BASELINE_ACHIEVEMENT_COUNT achievements)"
  PASSED=$((PASSED + 1))
  RESULTS="$RESULTS\n${GREEN}PASS${NC} $repo"
done

# Print summary
echo ""
echo "========================================"
echo "Regression Test Summary"
echo "========================================"
echo ""
echo -e "Results:$RESULTS"
echo ""
echo "----------------------------------------"
echo "Total:   $TOTAL_REPOS"
echo -e "${GREEN}Passed:  $PASSED${NC}"
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}Failed:  $FAILED${NC}"
else
  echo "Failed:  $FAILED"
fi
if [ "$SKIPPED" -gt 0 ]; then
  echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
else
  echo "Skipped: $SKIPPED"
fi
echo ""

# Exit with error if any tests failed
if [ "$FAILED" -gt 0 ]; then
  print_error "Regression tests failed!"
  exit 1
fi

print_success "All regression tests passed!"
