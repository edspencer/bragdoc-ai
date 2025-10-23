# Test Plan: Enhanced Git Commit Extraction

## Overview

This test plan covers all aspects of the enhanced git commit extraction feature, including configuration resolution, git operations, diff parsing, size limiting, and integration with the full extraction pipeline.

## Test Environment Setup

### Prerequisites

- A test git repository with various types of commits:
  - Small commits (1-2 files, <50 lines changed)
  - Medium commits (5-10 files, 100-500 lines changed)
  - Large commits (20+ files, 1000+ lines changed)
  - Commits with binary files
  - Commits in different directories (src/, lib/, dist/, etc.)
  - Lock file changes (package-lock.json, etc.)

### Test Repository Creation

Create a test repository with the following structure:

```bash
cd /tmp
mkdir bragdoc-test-extraction
cd bragdoc-test-extraction
git init
git config user.name "Test User"
git config user.email "test@example.com"

# Create initial structure
mkdir -p src/lib src/utils dist
echo "console.log('hello');" > src/index.ts
echo "export const util = () => {};" > src/utils/helper.ts
echo "export const lib = () => {};" > src/lib/core.ts
git add .
git commit -m "Initial commit with basic structure"

# Create a medium-sized commit
for i in {1..5}; do
  echo "export function func$i() { return $i; }" > src/lib/module$i.ts
done
git add .
git commit -m "Add 5 new modules with utility functions"

# Create a large commit
for i in {1..25}; do
  cat > src/file$i.ts <<EOF
// This is file $i with lots of content
export class Class$i {
  private value: number = $i;

  constructor() {
    console.log('Initializing Class$i');
  }

  public getValue(): number {
    return this.value;
  }

  public setValue(val: number): void {
    this.value = val;
  }
}
EOF
done
git add .
git commit -m "Add 25 new class files for comprehensive testing"

# Create a lock file commit
echo '{"dependencies": {}}' > package-lock.json
git add .
git commit -m "Add package-lock.json"

# Create a dist/ commit
echo "compiled.js" > dist/bundle.js
git add .
git commit -m "Add compiled bundle"
```

## Unit Tests

### 1. Configuration Resolution Tests

#### 1.1 Test `resolveExtractionConfig()` with Presets

**Location**: `/Users/ed/Code/brag-ai/packages/cli/src/config/extraction-presets.test.ts` (new file)

```typescript
import { resolveExtractionConfig, EXTRACTION_PRESETS } from './extraction-presets';

describe('resolveExtractionConfig', () => {
  test('minimal preset should disable stats and diffs', () => {
    const config = resolveExtractionConfig({ detailLevel: 'minimal' });
    expect(config.includeStats).toBe(false);
    expect(config.includeDiff).toBe(false);
  });

  test('standard preset should enable stats, disable diffs', () => {
    const config = resolveExtractionConfig({ detailLevel: 'standard' });
    expect(config.includeStats).toBe(true);
    expect(config.includeDiff).toBe(false);
    expect(config.excludeDiffPatterns).toContain('*.lock');
  });

  test('detailed preset should enable both stats and diffs', () => {
    const config = resolveExtractionConfig({ detailLevel: 'detailed' });
    expect(config.includeStats).toBe(true);
    expect(config.includeDiff).toBe(true);
    expect(config.maxDiffLinesPerCommit).toBe(1000);
    expect(config.maxDiffLinesPerFile).toBe(200);
    expect(config.maxFilesInDiff).toBe(30);
  });

  test('comprehensive preset should have highest limits', () => {
    const config = resolveExtractionConfig({ detailLevel: 'comprehensive' });
    expect(config.maxDiffLinesPerCommit).toBe(2000);
    expect(config.maxDiffLinesPerFile).toBe(500);
    expect(config.maxFilesInDiff).toBe(50);
  });

  test('explicit overrides should take precedence over preset', () => {
    const config = resolveExtractionConfig({
      detailLevel: 'minimal',
      includeStats: true, // Override preset
    });
    expect(config.includeStats).toBe(true);
    expect(config.includeDiff).toBe(false);
  });

  test('fine-grained overrides should work', () => {
    const config = resolveExtractionConfig({
      detailLevel: 'detailed',
      maxDiffLinesPerCommit: 500, // Override preset default of 1000
    });
    expect(config.maxDiffLinesPerCommit).toBe(500);
    expect(config.maxDiffLinesPerFile).toBe(200); // From preset
  });

  test('default should be standard level when no config provided', () => {
    const config = resolveExtractionConfig();
    expect(config.includeStats).toBe(true);
    expect(config.includeDiff).toBe(false);
  });
});
```

#### Test Tasks:
- [ ] Create test file and implement all test cases above
- [ ] Run tests: `pnpm test extraction-presets.test.ts`
- [ ] Verify all tests pass

### 2. Diff Parsing Tests

#### 2.1 Test `splitDiffByFile()`

**Location**: `/Users/ed/Code/brag-ai/packages/cli/src/git/diff-parsing.test.ts` (new file)

```typescript
import { splitDiffByFile, prioritizeDiffBlocks, limitDiffSize } from './diff-parsing';

describe('splitDiffByFile', () => {
  test('should split multi-file diff into separate blocks', () => {
    const diffOutput = `diff --git a/file1.ts b/file1.ts
index abc123..def456 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,3 +1,4 @@
+import { something } from 'somewhere';
 export const func1 = () => {
   return 'hello';
 };
diff --git a/file2.ts b/file2.ts
index ghi789..jkl012 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1 +1,2 @@
 export const func2 = () => {};
+export const func3 = () => {};`;

    const blocks = splitDiffByFile(diffOutput);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].path).toBe('file1.ts');
    expect(blocks[1].path).toBe('file2.ts');
    expect(blocks[0].diff).toContain('import { something }');
    expect(blocks[1].diff).toContain('export const func3');
  });

  test('should handle single file diff', () => {
    const diffOutput = `diff --git a/single.ts b/single.ts
index abc..def 100644
--- a/single.ts
+++ b/single.ts
@@ -1 +1,2 @@
 const x = 1;
+const y = 2;`;

    const blocks = splitDiffByFile(diffOutput);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].path).toBe('single.ts');
  });

  test('should handle empty diff', () => {
    const blocks = splitDiffByFile('');
    expect(blocks).toHaveLength(0);
  });
});
```

#### 2.2 Test `prioritizeDiffBlocks()`

```typescript
describe('prioritizeDiffBlocks', () => {
  const mockConfig = {
    includeStats: true,
    includeDiff: true,
    maxDiffLinesPerCommit: 1000,
    maxDiffLinesPerFile: 200,
    maxFilesInDiff: 30,
    excludeDiffPatterns: ['*.lock', 'dist/**'],
    prioritizeDiffPatterns: ['src/**', 'lib/**'],
  };

  test('should filter out excluded patterns', () => {
    const blocks = [
      { path: 'src/file.ts', diff: 'some diff' },
      { path: 'package-lock.json', diff: 'lock diff' },
      { path: 'dist/bundle.js', diff: 'bundle diff' },
    ];

    const result = prioritizeDiffBlocks(blocks, mockConfig);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('src/file.ts');
  });

  test('should prioritize matching patterns first', () => {
    const blocks = [
      { path: 'README.md', diff: 'readme diff' },
      { path: 'src/core.ts', diff: 'core diff' },
      { path: 'tests/test.ts', diff: 'test diff' },
      { path: 'lib/util.ts', diff: 'util diff' },
    ];

    const result = prioritizeDiffBlocks(blocks, mockConfig);

    expect(result[0].path).toBe('src/core.ts');
    expect(result[1].path).toBe('lib/util.ts');
    expect(result[2].path).toBe('README.md');
    expect(result[3].path).toBe('tests/test.ts');
  });

  test('should handle no patterns', () => {
    const blocks = [
      { path: 'file1.ts', diff: 'diff1' },
      { path: 'file2.ts', diff: 'diff2' },
    ];

    const result = prioritizeDiffBlocks(blocks, {
      ...mockConfig,
      excludeDiffPatterns: [],
      prioritizeDiffPatterns: [],
    });

    expect(result).toHaveLength(2);
  });
});
```

#### 2.3 Test `limitDiffSize()`

```typescript
describe('limitDiffSize', () => {
  const mockConfig = {
    includeStats: true,
    includeDiff: true,
    maxDiffLinesPerCommit: 100,
    maxDiffLinesPerFile: 30,
    maxFilesInDiff: 5,
    excludeDiffPatterns: [],
    prioritizeDiffPatterns: [],
  };

  test('should truncate files exceeding per-file limit', () => {
    const longDiff = Array(50).fill('line').join('\n');
    const blocks = [
      { path: 'long.ts', diff: longDiff },
    ];

    const result = limitDiffSize(blocks, mockConfig);

    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0].isTruncated).toBe(true);
    expect(result.diffs[0].diff).toContain('(20 more lines)');
    expect(result.truncated).toBe(true);
  });

  test('should stop adding files when commit limit reached', () => {
    const blocks = Array(10).fill(null).map((_, i) => ({
      path: `file${i}.ts`,
      diff: Array(15).fill('line').join('\n'), // 15 lines each
    }));

    const result = limitDiffSize(blocks, mockConfig);

    // 100 line limit / 15 lines per file = ~6 files, but should stop before exceeding
    expect(result.diffs.length).toBeLessThan(blocks.length);
    expect(result.truncated).toBe(true);
  });

  test('should respect file count limit', () => {
    const blocks = Array(10).fill(null).map((_, i) => ({
      path: `file${i}.ts`,
      diff: 'small diff', // Each under all limits
    }));

    const result = limitDiffSize(blocks, mockConfig);

    expect(result.diffs).toHaveLength(5); // maxFilesInDiff
    expect(result.truncated).toBe(true);
  });

  test('should not truncate when under all limits', () => {
    const blocks = [
      { path: 'small.ts', diff: 'small\ndiff\nhere' },
    ];

    const result = limitDiffSize(blocks, mockConfig);

    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0].isTruncated).toBe(false);
    expect(result.truncated).toBe(false);
  });
});
```

#### Test Tasks:
- [ ] Create test file and implement all test cases above
- [ ] Run tests: `pnpm test diff-parsing.test.ts`
- [ ] Verify all tests pass

### 3. Git Operations Tests

#### 3.1 Test `parseNumstat()`

**Location**: `/Users/ed/Code/brag-ai/packages/cli/src/git/operations.test.ts` (update existing file or create new)

```typescript
// Note: parseNumstat is not exported, so we'll test it through enhanceCommitsWithStats
// Or we can export it for testing purposes

describe('parseNumstat', () => {
  test('should parse standard numstat output', () => {
    const output = `10\t5\tsrc/file1.ts
20\t15\tsrc/file2.ts
0\t10\tsrc/file3.ts`;

    // Test through a wrapper or export the function
    const stats = parseNumstat(output);

    expect(stats).toHaveLength(3);
    expect(stats[0]).toEqual({ path: 'src/file1.ts', additions: 10, deletions: 5 });
    expect(stats[1]).toEqual({ path: 'src/file2.ts', additions: 20, deletions: 15 });
    expect(stats[2]).toEqual({ path: 'src/file3.ts', additions: 0, deletions: 10 });
  });

  test('should handle binary files', () => {
    const output = `-\t-\timage.png
10\t5\tsrc/file.ts`;

    const stats = parseNumstat(output);

    expect(stats).toHaveLength(2);
    expect(stats[0]).toEqual({ path: 'image.png', additions: 0, deletions: 0 });
    expect(stats[1]).toEqual({ path: 'src/file.ts', additions: 10, deletions: 5 });
  });

  test('should handle empty output', () => {
    const stats = parseNumstat('');
    expect(stats).toHaveLength(0);
  });
});
```

#### Test Tasks:
- [ ] Export `parseNumstat()` for testing or create a test wrapper
- [ ] Implement test cases above
- [ ] Run tests: `pnpm test operations.test.ts`
- [ ] Verify all tests pass

## Integration Tests

### 4. Enhanced Collection Integration Tests

#### 4.1 Test `collectGitCommitsEnhanced()` with Real Repository

**Location**: `/Users/ed/Code/brag-ai/packages/cli/src/git/operations.integration.test.ts` (new file)

```typescript
import { collectGitCommitsEnhanced } from './operations';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('collectGitCommitsEnhanced (integration)', () => {
  let testRepoPath: string;

  beforeAll(() => {
    // Create test repository
    testRepoPath = '/tmp/bragdoc-test-extraction-' + Date.now();
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize and create test commits
    execSync('git init', { cwd: testRepoPath });
    execSync('git config user.name "Test User"', { cwd: testRepoPath });
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath });

    // Create initial commit
    fs.writeFileSync(path.join(testRepoPath, 'file1.ts'), 'console.log("hello");');
    execSync('git add .', { cwd: testRepoPath });
    execSync('git commit -m "Initial commit"', { cwd: testRepoPath });

    // Create a commit with multiple files
    for (let i = 2; i <= 5; i++) {
      fs.writeFileSync(
        path.join(testRepoPath, `file${i}.ts`),
        `export const func${i} = () => ${i};`
      );
    }
    execSync('git add .', { cwd: testRepoPath });
    execSync('git commit -m "Add multiple files"', { cwd: testRepoPath });
  });

  afterAll(() => {
    // Clean up test repository
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  test('minimal level should not include stats or diffs', () => {
    process.chdir(testRepoPath);
    const commits = collectGitCommitsEnhanced('main', 10, 'test-repo', {
      detailLevel: 'minimal',
    });

    expect(commits.length).toBeGreaterThan(0);
    commits.forEach(commit => {
      expect(commit.stats).toBeUndefined();
      expect(commit.diff).toBeUndefined();
    });
  });

  test('standard level should include stats but not diffs', () => {
    process.chdir(testRepoPath);
    const commits = collectGitCommitsEnhanced('main', 10, 'test-repo', {
      detailLevel: 'standard',
    });

    expect(commits.length).toBeGreaterThan(0);
    commits.forEach(commit => {
      expect(commit.stats).toBeDefined();
      expect(commit.stats!.length).toBeGreaterThan(0);
      expect(commit.diff).toBeUndefined();
    });
  });

  test('detailed level should include both stats and diffs', () => {
    process.chdir(testRepoPath);
    const commits = collectGitCommitsEnhanced('main', 10, 'test-repo', {
      detailLevel: 'detailed',
    });

    expect(commits.length).toBeGreaterThan(0);
    commits.forEach(commit => {
      expect(commit.stats).toBeDefined();
      expect(commit.diff).toBeDefined();
    });
  });

  test('should respect exclude patterns', () => {
    // Add a lock file commit
    process.chdir(testRepoPath);
    fs.writeFileSync(path.join(testRepoPath, 'package-lock.json'), '{}');
    execSync('git add .', { cwd: testRepoPath });
    execSync('git commit -m "Add lock file"', { cwd: testRepoPath });

    const commits = collectGitCommitsEnhanced('main', 1, 'test-repo', {
      includeDiff: true,
      excludeDiffPatterns: ['*.lock', 'package-lock.json'],
    });

    const lockCommit = commits.find(c => c.message.includes('lock file'));
    if (lockCommit?.diff) {
      const lockFileDiff = lockCommit.diff.find(d => d.path === 'package-lock.json');
      expect(lockFileDiff).toBeUndefined();
    }
  });
});
```

#### Test Tasks:
- [ ] Create integration test file
- [ ] Implement test cases above
- [ ] Run tests: `pnpm test operations.integration.test.ts`
- [ ] Verify all tests pass

### 5. Extract Command Integration Tests

#### 5.1 Test CLI Options and Configuration Resolution

**Test manually** (automated CLI testing is complex):

```bash
# Setup: Create test config and repository
cd /tmp/bragdoc-test-extraction

# Test 1: Minimal level via CLI
bragdoc extract --detail-level minimal --dry-run
# Expected: No stats or diffs in output

# Test 2: Standard level via CLI
bragdoc extract --detail-level standard --dry-run
# Expected: File statistics shown, no diffs

# Test 3: Detailed level via CLI
bragdoc extract --detail-level detailed --dry-run
# Expected: Both stats and diffs shown, with size limits applied

# Test 4: Comprehensive level via CLI
bragdoc extract --detail-level comprehensive --dry-run
# Expected: Stats and extensive diffs shown

# Test 5: Fine-grained control via CLI
bragdoc extract --include-stats --dry-run
# Expected: Stats shown, no diffs

# Test 6: Both flags via CLI
bragdoc extract --include-stats --include-diff --dry-run
# Expected: Both stats and diffs shown

# Test 7: Config file default
# Edit ~/.bragdoc/config.yml to set defaultExtraction.detailLevel: 'detailed'
bragdoc extract --dry-run
# Expected: Should use detailed level from config

# Test 8: CLI override of config
# With config still set to 'detailed'
bragdoc extract --detail-level minimal --dry-run
# Expected: Should use minimal despite config saying detailed

# Test 9: Project-specific config
# Edit ~/.bragdoc/config.yml to add extraction config to a project
bragdoc extract --dry-run
# Expected: Should use project-specific config
```

#### Test Tasks:
- [ ] Run all manual CLI tests above
- [ ] Verify output matches expectations for each test
- [ ] Document any issues found

### 6. Prompt Component Tests

#### 6.1 Test Component Rendering

**Location**: `/Users/ed/Code/brag-ai/packages/cli/src/ai/prompts/elements.test.tsx` (new file)

```typescript
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FileStats, Diff, Commit } from './elements';
import type { Commit as CommitType } from './types';
import type { FileStats as FileStatsType, FileDiff } from '../../git/types';

describe('FileStats component', () => {
  test('should render file statistics', () => {
    const stats: FileStatsType[] = [
      { path: 'src/file1.ts', additions: 10, deletions: 5 },
      { path: 'src/file2.ts', additions: 20, deletions: 15 },
    ];

    const html = renderToString(<FileStats stats={stats} />);

    expect(html).toContain('src/file1.ts');
    expect(html).toContain('10');
    expect(html).toContain('5');
    expect(html).toContain('src/file2.ts');
  });

  test('should return null for empty stats', () => {
    const html = renderToString(<FileStats stats={[]} />);
    expect(html).toBe('');
  });

  test('should return null for undefined stats', () => {
    const html = renderToString(<FileStats stats={undefined} />);
    expect(html).toBe('');
  });
});

describe('Diff component', () => {
  test('should render file diffs', () => {
    const diffs: FileDiff[] = [
      { path: 'src/file.ts', diff: '+added line\n-removed line', isTruncated: false },
    ];

    const html = renderToString(<Diff diffs={diffs} />);

    expect(html).toContain('src/file.ts');
    expect(html).toContain('+added line');
  });

  test('should indicate truncation', () => {
    const diffs: FileDiff[] = [
      { path: 'large.ts', diff: 'some diff', isTruncated: true },
    ];

    const html = renderToString(<Diff diffs={diffs} truncated={true} />);

    expect(html).toContain('truncated');
  });
});

describe('Commit component', () => {
  test('should render commit with enhanced data', () => {
    const commit: CommitType = {
      hash: 'abc123',
      message: 'Test commit',
      author: { name: 'Test User', email: 'test@example.com' },
      date: '2024-01-01',
      stats: [{ path: 'file.ts', additions: 5, deletions: 2 }],
      diff: [{ path: 'file.ts', diff: '+new line', isTruncated: false }],
    };

    const html = renderToString(<Commit commit={commit} />);

    expect(html).toContain('Test commit');
    expect(html).toContain('abc123');
    expect(html).toContain('file.ts');
  });
});
```

#### Test Tasks:
- [ ] Install react-dom if not already present
- [ ] Create test file and implement test cases
- [ ] Run tests: `pnpm test elements.test.tsx`
- [ ] Verify all tests pass

### 7. End-to-End Extraction Test

#### 7.1 Full Pipeline Test with Enhanced Data

**Manual test** using the test repository created earlier:

```bash
# Ensure test repository exists and has commits
cd /tmp/bragdoc-test-extraction

# Initialize with BragDoc (requires actual authentication)
bragdoc init

# Run extraction with different levels and verify achievements
bragdoc extract --detail-level minimal --batch-size 2
# Note achievements extracted

bragdoc extract --detail-level standard --batch-size 2
# Compare achievements - should be more detailed with file stats

bragdoc extract --detail-level detailed --batch-size 2
# Compare achievements - should be even more detailed with code changes

# Check the achievements in the web UI or via API
# Verify that achievements include:
# - More specific technical details with higher detail levels
# - Mentions of specific files changed
# - Code-level details when diffs are included
```

#### Test Tasks:
- [ ] Run full extraction with each detail level
- [ ] Compare the quality and detail of extracted achievements
- [ ] Verify that detailed/comprehensive levels produce more specific achievements
- [ ] Document any issues or improvements needed

## Performance Tests

### 8. Performance Benchmarks

#### 8.1 Measure Extraction Time by Detail Level

```bash
# Test with a large repository (e.g., BragDoc itself)
cd /Users/ed/Code/brag-ai

# Benchmark minimal level
time bragdoc extract --detail-level minimal --max-commits 50 --dry-run

# Benchmark standard level
time bragdoc extract --detail-level standard --max-commits 50 --dry-run

# Benchmark detailed level
time bragdoc extract --detail-level detailed --max-commits 50 --dry-run

# Benchmark comprehensive level
time bragdoc extract --detail-level comprehensive --max-commits 50 --dry-run
```

#### Expected Results:
- Minimal: Fastest (baseline)
- Standard: 10-20% slower (adding numstat calls)
- Detailed: 30-50% slower (adding limited diffs)
- Comprehensive: 50-100% slower (adding extensive diffs)

#### Test Tasks:
- [ ] Run performance benchmarks on a real repository
- [ ] Document timing results for each detail level
- [ ] Verify that performance scales reasonably with detail level

## Regression Tests

### 9. Backward Compatibility Tests

#### 9.1 Ensure Existing Functionality Still Works

```bash
# Test that extract command works without new options
bragdoc extract --max-commits 10 --dry-run

# Test with existing config files (no extraction config)
# Verify default 'standard' level is used

# Test that cached commits still work
bragdoc extract --max-commits 10
# Run again - should skip cached commits

# Test that batching still works
bragdoc extract --batch-size 5 --max-commits 20
```

#### Test Tasks:
- [ ] Run all existing extract command variations
- [ ] Verify no breaking changes to existing functionality
- [ ] Verify cache still works correctly
- [ ] Verify batching still works correctly

## Test Summary

### Required Test Coverage

- [ ] All unit tests passing (config, diff parsing, git operations)
- [ ] Integration tests passing (enhanced collection, full pipeline)
- [ ] Manual CLI tests completed successfully
- [ ] Performance benchmarks documented
- [ ] Regression tests passing (backward compatibility)
- [ ] End-to-end test showing improved achievement quality

### Success Criteria

1. All automated tests pass with 100% success rate
2. Manual CLI tests demonstrate correct behavior for all detail levels
3. Configuration resolution follows the correct priority chain
4. Diff size limiting prevents excessive LLM context
5. Pattern matching (exclusion/prioritization) works correctly
6. Performance degradation is acceptable (< 2x slower for comprehensive vs minimal)
7. Backward compatibility is maintained (no breaking changes)
8. Achievement quality improves noticeably with higher detail levels

### Known Limitations

- Integration tests require git to be installed and configured
- End-to-end tests require actual BragDoc authentication
- Performance tests results will vary by repository size and commit complexity
- Component rendering tests require React environment setup
