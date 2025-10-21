import {
  splitDiffByFile,
  prioritizeDiffBlocks,
  limitDiffSize,
} from './diff-parsing';

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

describe('prioritizeDiffBlocks', () => {
  const mockConfig = {
    includeStats: true,
    includeDiff: true,
    maxDiffLinesPerCommit: 1000,
    maxDiffLinesPerFile: 200,
    maxFilesInDiff: 30,
    excludeDiffPatterns: ['package-lock.json', 'yarn.lock', 'dist/*'],
    prioritizeDiffPatterns: ['src/*', 'lib/*'],
  };

  test('should filter out excluded patterns', () => {
    const blocks = [
      { path: 'src/file.ts', diff: 'some diff' },
      { path: 'package-lock.json', diff: 'lock diff' },
      { path: 'dist/bundle.js', diff: 'bundle diff' },
    ];

    const result = prioritizeDiffBlocks(blocks, mockConfig);

    expect(result).toHaveLength(1); // Only src/file.ts remains after filtering
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

    // Priority files come first (src/* and lib/* patterns)
    expect(result[0].path).toBe('src/core.ts');
    expect(result[1].path).toBe('lib/util.ts');
    // Non-priority files come after
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
    const blocks = [{ path: 'long.ts', diff: longDiff }];

    const result = limitDiffSize(blocks, mockConfig);

    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0].isTruncated).toBe(true);
    expect(result.diffs[0].diff).toContain('(20 more lines)');
    expect(result.truncated).toBe(true);
  });

  test('should stop adding files when commit limit reached', () => {
    const blocks = Array(10)
      .fill(null)
      .map((_, i) => ({
        path: `file${i}.ts`,
        diff: Array(15).fill('line').join('\n'), // 15 lines each
      }));

    const result = limitDiffSize(blocks, mockConfig);

    // 100 line limit / 15 lines per file = ~6 files, but should stop before exceeding
    expect(result.diffs.length).toBeLessThan(blocks.length);
    expect(result.truncated).toBe(true);
  });

  test('should respect file count limit', () => {
    const blocks = Array(10)
      .fill(null)
      .map((_, i) => ({
        path: `file${i}.ts`,
        diff: 'small diff', // Each under all limits
      }));

    const result = limitDiffSize(blocks, mockConfig);

    expect(result.diffs).toHaveLength(5); // maxFilesInDiff
    expect(result.truncated).toBe(true);
  });

  test('should not truncate when under all limits', () => {
    const blocks = [{ path: 'small.ts', diff: 'small\ndiff\nhere' }];

    const result = limitDiffSize(blocks, mockConfig);

    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0].isTruncated).toBe(false);
    expect(result.truncated).toBe(false);
  });
});
