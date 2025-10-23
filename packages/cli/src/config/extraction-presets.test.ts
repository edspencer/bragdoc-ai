import { resolveExtractionConfig } from './extraction-presets';

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
