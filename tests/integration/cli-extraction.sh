#!/bin/bash
# CLI Integration Test: Extraction Detail Levels
#
# This script tests the BragDoc CLI's extraction functionality across all detail levels.
# It creates a deterministic test repository, runs extraction with each detail level,
# and compares the output against baseline snapshots.
#
# Usage:
#   ./cli-extraction.sh              # Run tests and compare against snapshots
#   UPDATE_SNAPSHOTS=1 ./cli-extraction.sh  # Update baseline snapshots

set -e

# Test configuration
TEST_REPO_DIR="/tmp/bragdoc-test-repo-$$"
OUTPUT_DIR="/tmp/bragdoc-test-output-$$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if BragDoc config exists (should only run in CI or with config moved aside)
BRAGDOC_CONFIG_PATH="$HOME/.bragdoc/config.yml"

if [ -f "$BRAGDOC_CONFIG_PATH" ]; then
  echo "❌ ERROR: Found existing BragDoc config at $BRAGDOC_CONFIG_PATH"
  echo ""
  echo "This integration test will overwrite your BragDoc configuration."
  echo "To protect your config, please move it aside temporarily:"
  echo ""
  echo "  mv $BRAGDOC_CONFIG_PATH ${BRAGDOC_CONFIG_PATH}.bak"
  echo ""
  echo "Then run the test again. Restore it afterward with:"
  echo ""
  echo "  mv ${BRAGDOC_CONFIG_PATH}.bak $BRAGDOC_CONFIG_PATH"
  echo ""
  exit 1
fi

# Cleanup function
cleanup() {
  echo -e "${BLUE}Cleaning up test artifacts...${NC}"
  rm -rf "$TEST_REPO_DIR" "$OUTPUT_DIR"

  # Remove test config (we verified no config existed before running)
  rm -f "$BRAGDOC_CONFIG_PATH"
}
trap cleanup EXIT

# Print section header
print_section() {
  echo ""
  echo -e "${BLUE}===================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}===================================================${NC}"
  echo ""
}

# Print success message
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Print error message
print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Print warning message
print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Step 1: Create test repository
print_section "Step 1: Creating Test Repository"
echo "Generating deterministic test repository at: $TEST_REPO_DIR"
"$PROJECT_ROOT/scripts/create-test-repo.sh" "$TEST_REPO_DIR"
print_success "Test repository created"

# Step 2: Build CLI
print_section "Step 2: Building CLI"
echo "Building CLI package..."
cd "$PROJECT_ROOT/packages/cli"
pnpm build > /dev/null 2>&1
print_success "CLI built successfully"

# Step 3: Set up dummy auth for testing
print_section "Step 3: Setting Up Test Environment"
echo "Creating dummy auth token for CLI..."

# Create a temporary bragdoc config directory for testing
BRAGDOC_CONFIG_HOME="$HOME/.bragdoc"
mkdir -p "$BRAGDOC_CONFIG_HOME"

# Create a dummy auth token (not actually used in dry-run, but required by CLI)
# Token expires in year 2100 so it won't expire during tests
cat > "$BRAGDOC_CONFIG_HOME/config.yml" <<EOF
auth:
  token: dummy-test-token-for-integration-tests
  expiresAt: 4102444800000
settings:
  apiBaseUrl: https://www.bragdoc.ai
EOF

print_success "Test environment configured"

# Step 4: Initialize test repository
print_section "Step 4: Initializing Project"
echo "Setting up BragDoc in test repository (non-interactive mode)..."
cd "$TEST_REPO_DIR"

# Use the built CLI directly
CLI_PATH="$PROJECT_ROOT/packages/cli/dist/index.js"

# Set a dummy API key for testing (not actually used in dry-run mode)
export OPENAI_API_KEY="sk-test-dummy-key-for-integration-tests"

# Initialize with non-interactive flags
node "$CLI_PATH" init \
  --name "Test Repo" \
  --detail-level standard \
  --no-schedule \
  --skip-llm-config \
  --skip-api-sync \
  --branch-whitelist "" > /dev/null 2>&1

# Debug: Show config after init
echo "DEBUG: Config after init:"
cat "$BRAGDOC_CONFIG_HOME/config.yml"
echo "END DEBUG"

print_success "Project initialized"

# Step 5: Run extractions with different detail levels
print_section "Step 5: Running Extractions"
echo "Extracting achievements with all detail levels..."

for level in minimal standard detailed comprehensive; do
  echo "  - Extracting with $level detail level..."

  # Run extraction and capture output
  node "$CLI_PATH" extract \
    --dry-run \
    --detail-level "$level" \
    --max-commits 10 > "$OUTPUT_DIR/output-$level.txt" 2>&1 || true

  # Normalize output for snapshot comparison
  cat "$OUTPUT_DIR/output-$level.txt" | \
    "$SCRIPT_DIR/normalize-output.sh" "$TEST_REPO_DIR" > \
    "$OUTPUT_DIR/output-$level-normalized.txt"

  print_success "$level extraction complete"
done

# Step 6: Compare against snapshots or update them
if [ "${UPDATE_SNAPSHOTS}" != "1" ]; then
  print_section "Step 6: Comparing Against Snapshots"
  echo "Verifying output matches expected baselines..."

  ALL_PASSED=true

  for level in minimal standard detailed comprehensive; do
    SNAPSHOT="$PROJECT_ROOT/tests/snapshots/extraction-$level.txt"
    OUTPUT="$OUTPUT_DIR/output-$level-normalized.txt"

    if [ ! -f "$SNAPSHOT" ]; then
      print_error "Snapshot not found: $SNAPSHOT"
      echo "💡 Run with UPDATE_SNAPSHOTS=1 to create initial snapshots"
      exit 1
    fi

    if ! diff -u "$SNAPSHOT" "$OUTPUT" > "$OUTPUT_DIR/diff-$level.txt" 2>&1; then
      print_error "Output differs from snapshot for $level"
      echo "Diff:"
      cat "$OUTPUT_DIR/diff-$level.txt"
      ALL_PASSED=false
    else
      print_success "$level matches snapshot"
    fi
  done

  if [ "$ALL_PASSED" = false ]; then
    echo ""
    print_error "Some snapshots did not match"
    echo "To update snapshots if changes are intentional, run:"
    echo "  UPDATE_SNAPSHOTS=1 ./tests/integration/cli-extraction.sh"
    exit 1
  fi
else
  print_section "Step 6: Updating Snapshots"
  echo "Saving new baseline snapshots..."

  for level in minimal standard detailed comprehensive; do
    cp "$OUTPUT_DIR/output-$level-normalized.txt" \
       "$PROJECT_ROOT/tests/snapshots/extraction-$level.txt"
    print_success "Updated snapshot for $level"
  done

  print_warning "Snapshots updated - review changes before committing!"
fi

# Step 7: Verify structural differences between levels
print_section "Step 7: Verifying Detail Level Differences"
echo "Checking that detail levels produce expected output structure..."

VERIFICATION_FAILED=false

# Minimal: should NOT have "File Statistics" or "Code Changes"
echo "  Checking minimal level..."
if grep -q "File Statistics:" "$OUTPUT_DIR/output-minimal.txt"; then
  print_error "Minimal should not have File Statistics"
  VERIFICATION_FAILED=true
else
  print_success "Minimal has no stats (correct)"
fi

if grep -q "Code Changes:" "$OUTPUT_DIR/output-minimal.txt"; then
  print_error "Minimal should not have Code Changes"
  VERIFICATION_FAILED=true
else
  print_success "Minimal has no diffs (correct)"
fi

# Standard: should have "File Statistics" but NOT "Code Changes"
echo "  Checking standard level..."
if ! grep -q "File Statistics:" "$OUTPUT_DIR/output-standard.txt"; then
  print_error "Standard should have File Statistics"
  VERIFICATION_FAILED=true
else
  print_success "Standard has stats (correct)"
fi

if grep -q "Code Changes:" "$OUTPUT_DIR/output-standard.txt"; then
  print_error "Standard should not have Code Changes"
  VERIFICATION_FAILED=true
else
  print_success "Standard has no diffs (correct)"
fi

# Detailed: should have both "File Statistics" and "Code Changes"
echo "  Checking detailed level..."
if ! grep -q "File Statistics:" "$OUTPUT_DIR/output-detailed.txt"; then
  print_error "Detailed should have File Statistics"
  VERIFICATION_FAILED=true
else
  print_success "Detailed has stats (correct)"
fi

if ! grep -q "Code Changes:" "$OUTPUT_DIR/output-detailed.txt"; then
  print_error "Detailed should have Code Changes"
  VERIFICATION_FAILED=true
else
  print_success "Detailed has diffs (correct)"
fi

# Comprehensive: should have both and more content than detailed
echo "  Checking comprehensive level..."
if ! grep -q "File Statistics:" "$OUTPUT_DIR/output-comprehensive.txt"; then
  print_error "Comprehensive should have File Statistics"
  VERIFICATION_FAILED=true
else
  print_success "Comprehensive has stats (correct)"
fi

if ! grep -q "Code Changes:" "$OUTPUT_DIR/output-comprehensive.txt"; then
  print_error "Comprehensive should have Code Changes"
  VERIFICATION_FAILED=true
else
  print_success "Comprehensive has diffs (correct)"
fi

# Compare comprehensive vs detailed (comprehensive should have >= content)
COMPREHENSIVE_SIZE=$(wc -c < "$OUTPUT_DIR/output-comprehensive.txt")
DETAILED_SIZE=$(wc -c < "$OUTPUT_DIR/output-detailed.txt")

if [ "$COMPREHENSIVE_SIZE" -lt "$DETAILED_SIZE" ]; then
  print_error "Comprehensive should have at least as much content as detailed"
  echo "  Comprehensive: $COMPREHENSIVE_SIZE bytes"
  echo "  Detailed: $DETAILED_SIZE bytes"
  VERIFICATION_FAILED=true
else
  print_success "Comprehensive has more content than detailed (correct)"
fi

if [ "$VERIFICATION_FAILED" = true ]; then
  echo ""
  print_error "Detail level verification failed"
  exit 1
fi

# Final summary
print_section "Test Summary"
print_success "All extraction integration tests passed!"
echo ""
echo "Detail levels tested:"
echo "  - minimal:       ✓ Messages only"
echo "  - standard:      ✓ Messages + stats"
echo "  - detailed:      ✓ Messages + stats + limited diffs"
echo "  - comprehensive: ✓ Messages + stats + extensive diffs"
echo ""

if [ "${UPDATE_SNAPSHOTS}" = "1" ]; then
  print_warning "Remember to review and commit the updated snapshots!"
fi
