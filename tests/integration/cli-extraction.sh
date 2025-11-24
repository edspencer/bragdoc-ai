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

  # Remove marker files
  rm -f /tmp/bragdoc-test-project-id.txt /tmp/bragdoc-test-repo-path.txt

  # Stop mock API server if running
  if [ ! -z "$MOCK_API_PID" ]; then
    kill $MOCK_API_PID 2>/dev/null || true
  fi
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

# Step 3: Start mock API server
print_section "Step 3: Starting Mock API Server"
echo "Starting mock API server for testing..."

MOCK_API_PORT=3456
export TEST_REPO_DIR="$TEST_REPO_DIR"
export MOCK_API_PORT="$MOCK_API_PORT"

node "$SCRIPT_DIR/mock-api-server.js" > /dev/null 2>&1 &
MOCK_API_PID=$!

# Wait for server to start
sleep 1

if ! kill -0 $MOCK_API_PID 2>/dev/null; then
  print_error "Failed to start mock API server"
  exit 1
fi

print_success "Mock API server started on port $MOCK_API_PORT"

# Step 4: Set up dummy auth for testing
print_section "Step 4: Setting Up Test Environment"
echo "Creating dummy auth token for CLI..."

# Create a temporary bragdoc config directory for testing
BRAGDOC_CONFIG_HOME="$HOME/.bragdoc"
mkdir -p "$BRAGDOC_CONFIG_HOME"

# Create a dummy auth token (not actually used in dry-run, but required by CLI)
# Token expires in year 2100 so it won't expire during tests
# Point API to mock server
cat > "$BRAGDOC_CONFIG_HOME/config.yml" <<EOF
auth:
  token: dummy-test-token-for-integration-tests
  expiresAt: 4102444800000
settings:
  apiBaseUrl: http://localhost:$MOCK_API_PORT
EOF

print_success "Test environment configured"

# Step 5: Initialize test repository
print_section "Step 5: Initializing Project"
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

# Update config to add LLM settings (required by extract command)
# The init command creates a config, we need to add the LLM API key to it
# Extract the project ID for the mock API server
PROJECT_ID=$(grep "^\s*id:" "$BRAGDOC_CONFIG_PATH" | head -1 | sed 's/.*id: *//')
export TEST_PROJECT_ID="$PROJECT_ID"

# Write marker files for mock API server to read
echo "$PROJECT_ID" > /tmp/bragdoc-test-project-id.txt
echo "$TEST_REPO_DIR" > /tmp/bragdoc-test-repo-path.txt

# Read the current config and add LLM API key
# We use sed to insert the apiKey line after the model line in the openai section
# Note: Use different sed syntax for macOS vs Linux
# Detect OS using uname which is more reliable than $OSTYPE
if [ "$(uname)" = "Darwin" ]; then
  # macOS requires empty string after -i
  SED_INPLACE_FLAG="-i ''"
else
  # Linux doesn't use empty string
  SED_INPLACE_FLAG="-i"
fi

if grep -q "openai:" "$BRAGDOC_CONFIG_PATH"; then
  # Add apiKey after the model line
  eval "sed $SED_INPLACE_FLAG '/model: gpt-4o/a\\
    apiKey: sk-test-dummy-key
' \"$BRAGDOC_CONFIG_PATH\""
else
  # If no openai section, add it under llm section
  eval "sed $SED_INPLACE_FLAG '/llm:/a\\
  provider: openai\\
  openai:\\
    model: gpt-4o\\
    apiKey: sk-test-dummy-key
' \"$BRAGDOC_CONFIG_PATH\""
fi

# Update API base URL to point to mock server
eval "sed $SED_INPLACE_FLAG 's|apiBaseUrl:.*|apiBaseUrl: http://localhost:$MOCK_API_PORT|' \"$BRAGDOC_CONFIG_PATH\""

print_success "Project initialized"

# Step 6: Run extractions with different detail levels
print_section "Step 6: Running Extractions"
echo "Extracting achievements with all detail levels..."

for level in minimal standard detailed comprehensive; do
  echo "  - Extracting with $level detail level..."

  # Run extraction and capture output
  node "$CLI_PATH" extract \
    --dry-run \
    --detail-level "$level" \
    --max 10 > "$OUTPUT_DIR/output-$level.txt" 2>&1 || true

  # Normalize output for snapshot comparison
  cat "$OUTPUT_DIR/output-$level.txt" | \
    "$SCRIPT_DIR/normalize-output.sh" "$TEST_REPO_DIR" > \
    "$OUTPUT_DIR/output-$level-normalized.txt"

  print_success "$level extraction complete"
done

# Step 7: Compare against snapshots or update them
if [ "${UPDATE_SNAPSHOTS}" != "1" ]; then
  print_section "Step 7: Comparing Against Snapshots"
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
  print_section "Step 7: Updating Snapshots"
  echo "Saving new baseline snapshots..."

  for level in minimal standard detailed comprehensive; do
    cp "$OUTPUT_DIR/output-$level-normalized.txt" \
       "$PROJECT_ROOT/tests/snapshots/extraction-$level.txt"
    print_success "Updated snapshot for $level"
  done

  print_warning "Snapshots updated - review changes before committing!"
fi

# Step 8: Verify structural differences between levels
print_section "Step 8: Verifying Detail Level Differences"
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
