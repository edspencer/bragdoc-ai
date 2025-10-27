#!/bin/bash
# scripts/create-test-repo.sh
# Creates a deterministic test repository for BragDoc CLI integration tests

set -e

REPO_DIR="${1:-/tmp/bragdoc-test-repo}"

echo "Creating test repository at: $REPO_DIR"

# Clean and create fresh repo
rm -rf "$REPO_DIR"
mkdir -p "$REPO_DIR"
cd "$REPO_DIR"

# Initialize with deterministic config
git init -b main
git config user.name "Test User"
git config user.email "test@bragdoc.ai"
git config commit.gpgsign false

# Add dummy remote URL (required by CLI)
git remote add origin https://github.com/test/test-repo.git

echo "  - Commit 1: Initial README"
# Commit 1: Initial small commit (~10 lines)
cat > README.md <<'EOF'
# Test Repository

This is a test repository for BragDoc extraction testing.

## Purpose

This repository contains various commit types to test extraction:
- Small commits (1-2 files)
- Medium commits (5-10 files)
- Large commits (20+ files)
EOF
git add README.md
GIT_AUTHOR_DATE="2024-01-01T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-01T10:00:00Z" \
git commit -m "Initial commit"

echo "  - Commit 2: Add hello function"
# Commit 2: Small feature addition (~5 lines)
mkdir -p src
cat > src/index.ts <<'EOF'
export function hello() {
  return "Hello, world!";
}
EOF
git add src/index.ts
GIT_AUTHOR_DATE="2024-01-02T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-02T10:00:00Z" \
git commit -m "Add hello function"

echo "  - Commit 3: Add 5 utility modules"
# Commit 3: Medium commit (5 files, ~50 total lines, multi-line message)
for i in {1..5}; do
  cat > src/module$i.ts <<EOF
export function func$i() {
  return $i;
}
EOF
done
git add src/module*.ts
GIT_AUTHOR_DATE="2024-01-03T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-03T10:00:00Z" \
git commit -m "Add utility modules

This commit adds 5 utility modules for various functions.
Each module provides a simple function."

echo "  - Commit 4: Add 25 React components"
# Commit 4: Large commit (25 files, ~500+ lines, should trigger truncation)
mkdir -p src/components
for i in {1..25}; do
  cat > src/components/Component$i.tsx <<EOF
import React from 'react';

export function Component$i() {
  return <div>Component $i</div>;
}
EOF
done
git add src/components/
GIT_AUTHOR_DATE="2024-01-04T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-04T10:00:00Z" \
git commit -m "Add 25 React components"

echo "  - Commit 5: Add package-lock.json"
# Commit 5: Lock file (should be filtered from diffs)
cat > package-lock.json <<'EOF'
{
  "name": "test-repo",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {}
}
EOF
git add package-lock.json
GIT_AUTHOR_DATE="2024-01-05T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-05T10:00:00Z" \
git commit -m "Add package-lock.json"

echo "  - Commit 6: Add compiled bundle"
# Commit 6: Dist files (should be filtered)
mkdir -p dist
cat > dist/bundle.js <<'EOF'
// Compiled bundle
console.log("production build");
EOF
git add dist/
GIT_AUTHOR_DATE="2024-01-06T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-06T10:00:00Z" \
git commit -m "Add compiled bundle"

echo "  - Commit 7: Enhance hello function"
# Commit 7: Source file changes (should be prioritized)
cat > src/index.ts <<'EOF'
export function hello(name: string) {
  return `Hello, ${name}!`;
}

export function goodbye(name: string) {
  return `Goodbye, ${name}!`;
}
EOF
git add src/index.ts
GIT_AUTHOR_DATE="2024-01-07T10:00:00Z" \
GIT_COMMITTER_DATE="2024-01-07T10:00:00Z" \
git commit -m "Enhance hello function and add goodbye"

echo ""
echo "✓ Test repository created at $REPO_DIR"
echo "  - 7 commits created with deterministic timestamps"
echo "  - Commit hashes should be identical across runs"
