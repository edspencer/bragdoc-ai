import type { ExtractionConfig } from './types';

/**
 * Preset configurations for extraction detail levels
 */
export const EXTRACTION_PRESETS: Record<string, ExtractionConfig> = {
  minimal: {
    includeStats: false,
    includeDiff: false,
  },
  standard: {
    includeStats: true,
    includeDiff: false,
    excludeDiffPatterns: [
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ],
  },
  detailed: {
    includeStats: true,
    includeDiff: true,
    maxDiffLinesPerCommit: 1000,
    maxDiffLinesPerFile: 200,
    maxFilesInDiff: 30,
    excludeDiffPatterns: [
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'dist/**',
      'build/**',
      '.next/**',
    ],
    prioritizeDiffPatterns: ['src/**', 'lib/**', 'packages/**'],
  },
  comprehensive: {
    includeStats: true,
    includeDiff: true,
    maxDiffLinesPerCommit: 2000,
    maxDiffLinesPerFile: 500,
    maxFilesInDiff: 50,
    excludeDiffPatterns: [
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'dist/**',
      'build/**',
      '.next/**',
      'node_modules/**',
      'coverage/**',
    ],
    prioritizeDiffPatterns: ['src/**', 'lib/**', 'packages/**', 'apps/**'],
  },
};

/**
 * Resolve extraction configuration from preset and overrides
 * Priority: explicit overrides > preset > defaults
 */
export function resolveExtractionConfig(
  config?: ExtractionConfig,
): Required<Omit<ExtractionConfig, 'detailLevel'>> {
  // Use default if no config provided
  const effectiveConfig = config ?? { detailLevel: 'standard' };

  // Start with preset if specified
  const preset = effectiveConfig.detailLevel
    ? EXTRACTION_PRESETS[effectiveConfig.detailLevel]
    : EXTRACTION_PRESETS.standard;

  // Merge with explicit overrides
  return {
    includeStats: effectiveConfig.includeStats ?? preset.includeStats ?? false,
    includeDiff: effectiveConfig.includeDiff ?? preset.includeDiff ?? false,
    maxDiffLinesPerCommit:
      effectiveConfig.maxDiffLinesPerCommit ??
      preset.maxDiffLinesPerCommit ??
      500,
    maxDiffLinesPerFile:
      effectiveConfig.maxDiffLinesPerFile ?? preset.maxDiffLinesPerFile ?? 100,
    maxFilesInDiff:
      effectiveConfig.maxFilesInDiff ?? preset.maxFilesInDiff ?? 20,
    excludeDiffPatterns:
      effectiveConfig.excludeDiffPatterns ?? preset.excludeDiffPatterns ?? [],
    prioritizeDiffPatterns:
      effectiveConfig.prioritizeDiffPatterns ??
      preset.prioritizeDiffPatterns ??
      [],
  };
}
