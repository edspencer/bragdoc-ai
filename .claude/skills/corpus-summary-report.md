# Generate Corpus Summary Report

Aggregate all individual extraction assessment reports into a comprehensive summary showing quality trends and actionable insights.

## Overview

This skill reads all assessment reports from `corpus/reports/` and produces an executive summary at `corpus/reports/summary.md`. The summary includes:

- Overall quality scores by category
- Most common issue types across the corpus
- Repositories with best/worst extraction quality
- Dimension-by-dimension analysis
- Trends if multiple snapshots exist for the same repo
- Actionable recommendations prioritized by impact

## Usage

```bash
# Generate summary from all reports
/corpus-summary-report

# Generate summary with verbose output
/corpus-summary-report --verbose

# Generate summary for a specific category
/corpus-summary-report --category monorepos
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--verbose` | Include detailed per-repo breakdown | false |
| `--category <name>` | Only include repos from this category | All categories |
| `--output <path>` | Custom output path for summary | `corpus/reports/summary.md` |

## Execution Steps

### Step 1: Load Manifest and Discover Reports

Read the corpus manifest and find all assessment reports:

```typescript
const manifest = JSON.parse(fs.readFileSync('corpus/manifest.json', 'utf-8'));

// Get all report entries from manifest
const reportEntries = manifest.reports.filter(r => r.type === 'extraction-assessment');

// Also scan reports directory for any unregistered reports
const reportDirs = fs.readdirSync('corpus/reports', { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

interface ReportData {
  repoSlug: string;
  reportPath: string;
  generatedAt: string;
  overallScore: number;
  dimensionScores: Record<string, number>;
  category: string;
  issues: string[];
  recommendations: string[];
}

const reports: ReportData[] = [];

for (const dir of reportDirs) {
  const reportFiles = fs.readdirSync(`corpus/reports/${dir}`)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // Most recent first

  for (const file of reportFiles) {
    const reportPath = `corpus/reports/${dir}/${file}`;
    const content = fs.readFileSync(reportPath, 'utf-8');
    const parsed = parseReportMarkdown(content);
    reports.push({
      repoSlug: dir,
      reportPath,
      ...parsed
    });
  }
}
```

### Step 2: Parse Report Files

Extract structured data from Markdown reports:

```typescript
interface ParsedReport {
  generatedAt: string;
  overallScore: number;
  dimensionScores: Record<string, number>;
  category: string;
  commitPatterns: {
    squashMergePercent: number;
    largeCommitPercent: number;
    multiFeaturePercent: number;
    poorMessagePercent: number;
  };
  issues: string[];
  recommendations: string[];
  achievementCount: number;
  commitCount: number;
}

function parseReportMarkdown(content: string): ParsedReport {
  const report: ParsedReport = {
    generatedAt: '',
    overallScore: 0,
    dimensionScores: {},
    category: '',
    commitPatterns: {
      squashMergePercent: 0,
      largeCommitPercent: 0,
      multiFeaturePercent: 0,
      poorMessagePercent: 0,
    },
    issues: [],
    recommendations: [],
    achievementCount: 0,
    commitCount: 0,
  };

  // Extract date
  const dateMatch = content.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) report.generatedAt = dateMatch[1];

  // Extract overall score
  const scoreMatch = content.match(/## Overall Quality Score:\s*(\d+)\/10/);
  if (scoreMatch) report.overallScore = parseInt(scoreMatch[1]);

  // Extract category
  const categoryMatch = content.match(/\*\*Category:\*\*\s*(\w+)/);
  if (categoryMatch) report.category = categoryMatch[1];

  // Extract dimension scores
  const dimensionPattern = /### ([\w\s]+) \(Score:\s*(\d+)\/10\)/g;
  let dimMatch;
  while ((dimMatch = dimensionPattern.exec(content)) !== null) {
    const dimName = dimMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
    report.dimensionScores[dimName] = parseInt(dimMatch[2]);
  }

  // Extract commit patterns from table
  const squashMatch = content.match(/Squash Merge Commits\s*\|\s*\d+\s*\|\s*([\d.]+)%/);
  if (squashMatch) report.commitPatterns.squashMergePercent = parseFloat(squashMatch[1]);

  const largeMatch = content.match(/Large Commits.*?\|\s*\d+\s*\|\s*([\d.]+)%/);
  if (largeMatch) report.commitPatterns.largeCommitPercent = parseFloat(largeMatch[1]);

  const multiMatch = content.match(/Multi-feature Commits\s*\|\s*\d+\s*\|\s*([\d.]+)%/);
  if (multiMatch) report.commitPatterns.multiFeaturePercent = parseFloat(multiMatch[1]);

  const poorMatch = content.match(/Poor Message Commits\s*\|\s*\d+\s*\|\s*([\d.]+)%/);
  if (poorMatch) report.commitPatterns.poorMessagePercent = parseFloat(poorMatch[1]);

  // Extract issues from dimension sections
  const issuesPattern = /\*\*Issues Identified:\*\*\n((?:- .+\n?)+)/g;
  let issueMatch;
  while ((issueMatch = issuesPattern.exec(content)) !== null) {
    const issueLines = issueMatch[1].split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => line.substring(2).trim());
    report.issues.push(...issueLines);
  }

  // Extract recommendations
  const recsSection = content.match(/## Recommendations\n\n((?:\d+\..+\n?)+)/);
  if (recsSection) {
    report.recommendations = recsSection[1].split('\n')
      .filter(line => /^\d+\./.test(line))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }

  // Extract counts
  const achieveMatch = content.match(/\*\*Achievements Extracted:\*\*\s*(\d+)/);
  if (achieveMatch) report.achievementCount = parseInt(achieveMatch[1]);

  const commitMatch = content.match(/\*\*Commits Analyzed:\*\*\s*(\d+)/);
  if (commitMatch) report.commitCount = parseInt(commitMatch[1]);

  return report;
}
```

### Step 3: Aggregate Statistics

Calculate aggregate statistics across all reports:

```typescript
interface AggregatedStats {
  totalReports: number;
  totalRepos: number;
  totalAchievements: number;
  totalCommits: number;

  // Overall scores
  averageScore: number;
  medianScore: number;
  scoreDistribution: { excellent: number; good: number; fair: number; poor: number };

  // By category
  categoryStats: Record<string, {
    repoCount: number;
    averageScore: number;
    topIssues: Array<{ issue: string; count: number }>;
  }>;

  // By dimension
  dimensionStats: Record<string, {
    averageScore: number;
    lowestScoreRepo: string;
    highestScoreRepo: string;
  }>;

  // Common issues
  topIssues: Array<{ issue: string; count: number; affectedRepos: string[] }>;

  // Common recommendations
  topRecommendations: Array<{ recommendation: string; count: number }>;

  // Best and worst performers
  topPerformers: Array<{ repo: string; score: number; category: string }>;
  bottomPerformers: Array<{ repo: string; score: number; category: string; topIssue: string }>;

  // Trends (if multiple snapshots)
  trends: Array<{
    repo: string;
    oldestScore: number;
    newestScore: number;
    change: number;
    snapshotCount: number;
  }>;
}

function aggregateStats(reports: ReportData[]): AggregatedStats {
  // Get unique repos (use most recent report for each)
  const repoLatest = new Map<string, ReportData>();
  for (const report of reports) {
    const existing = repoLatest.get(report.repoSlug);
    if (!existing || report.generatedAt > existing.generatedAt) {
      repoLatest.set(report.repoSlug, report);
    }
  }

  const latestReports = Array.from(repoLatest.values());
  const scores = latestReports.map(r => r.overallScore).sort((a, b) => a - b);

  // Score distribution
  const distribution = {
    excellent: latestReports.filter(r => r.overallScore >= 8).length,
    good: latestReports.filter(r => r.overallScore >= 6 && r.overallScore < 8).length,
    fair: latestReports.filter(r => r.overallScore >= 4 && r.overallScore < 6).length,
    poor: latestReports.filter(r => r.overallScore < 4).length,
  };

  // Category stats
  const categoryStats: Record<string, any> = {};
  for (const report of latestReports) {
    if (!categoryStats[report.category]) {
      categoryStats[report.category] = {
        repoCount: 0,
        scores: [],
        issues: [],
      };
    }
    categoryStats[report.category].repoCount++;
    categoryStats[report.category].scores.push(report.overallScore);
    categoryStats[report.category].issues.push(...report.issues);
  }

  // Calculate averages and top issues per category
  for (const [category, data] of Object.entries(categoryStats)) {
    data.averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    data.topIssues = countAndSort(data.issues).slice(0, 3);
    delete data.scores;
    delete data.issues;
  }

  // Dimension stats
  const dimensionStats: Record<string, any> = {};
  const dimensionNames = new Set<string>();
  for (const report of latestReports) {
    for (const dim of Object.keys(report.dimensionScores)) {
      dimensionNames.add(dim);
    }
  }

  for (const dim of dimensionNames) {
    const scores = latestReports
      .filter(r => r.dimensionScores[dim] !== undefined)
      .map(r => ({ repo: r.repoSlug, score: r.dimensionScores[dim] }));

    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => a.score - b.score);
      dimensionStats[dim] = {
        averageScore: scores.reduce((a, b) => a + b.score, 0) / scores.length,
        lowestScoreRepo: sorted[0].repo,
        highestScoreRepo: sorted[sorted.length - 1].repo,
      };
    }
  }

  // Count issues across all reports
  const allIssues: string[] = [];
  const issueToRepos: Record<string, string[]> = {};
  for (const report of latestReports) {
    for (const issue of report.issues) {
      allIssues.push(issue);
      if (!issueToRepos[issue]) issueToRepos[issue] = [];
      issueToRepos[issue].push(report.repoSlug);
    }
  }

  const topIssues = countAndSort(allIssues).slice(0, 10).map(item => ({
    ...item,
    affectedRepos: issueToRepos[item.issue] || [],
  }));

  // Count recommendations
  const allRecs = latestReports.flatMap(r => r.recommendations);
  const topRecommendations = countAndSort(allRecs).slice(0, 10);

  // Top and bottom performers
  const sortedByScore = [...latestReports].sort((a, b) => b.overallScore - a.overallScore);
  const topPerformers = sortedByScore.slice(0, 5).map(r => ({
    repo: r.repoSlug,
    score: r.overallScore,
    category: r.category,
  }));
  const bottomPerformers = sortedByScore.slice(-5).reverse().map(r => ({
    repo: r.repoSlug,
    score: r.overallScore,
    category: r.category,
    topIssue: r.issues[0] || 'No specific issues identified',
  }));

  // Calculate trends for repos with multiple snapshots
  const repoSnapshots = new Map<string, ReportData[]>();
  for (const report of reports) {
    if (!repoSnapshots.has(report.repoSlug)) {
      repoSnapshots.set(report.repoSlug, []);
    }
    repoSnapshots.get(report.repoSlug)!.push(report);
  }

  const trends: AggregatedStats['trends'] = [];
  for (const [repo, snapshots] of repoSnapshots) {
    if (snapshots.length >= 2) {
      const sorted = snapshots.sort((a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );
      trends.push({
        repo,
        oldestScore: sorted[0].overallScore,
        newestScore: sorted[sorted.length - 1].overallScore,
        change: sorted[sorted.length - 1].overallScore - sorted[0].overallScore,
        snapshotCount: sorted.length,
      });
    }
  }

  return {
    totalReports: reports.length,
    totalRepos: latestReports.length,
    totalAchievements: latestReports.reduce((a, r) => a + r.achievementCount, 0),
    totalCommits: latestReports.reduce((a, r) => a + r.commitCount, 0),
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    medianScore: scores[Math.floor(scores.length / 2)],
    scoreDistribution: distribution,
    categoryStats,
    dimensionStats,
    topIssues,
    topRecommendations,
    topPerformers,
    bottomPerformers,
    trends: trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
  };
}

function countAndSort(items: string[]): Array<{ issue: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);
}
```

### Step 4: Generate Summary Report

Create the summary Markdown document:

```typescript
function generateSummary(stats: AggregatedStats, options: { verbose: boolean }): string {
  const timestamp = new Date().toISOString();

  return `# Corpus Extraction Quality Summary

**Generated:** ${timestamp.split('T')[0]}
**Reports Analyzed:** ${stats.totalReports}
**Unique Repositories:** ${stats.totalRepos}
**Total Achievements Extracted:** ${stats.totalAchievements}
**Total Commits Analyzed:** ${stats.totalCommits}

---

## Executive Summary

${getExecutiveSummary(stats)}

---

## Overall Quality Metrics

| Metric | Value |
|--------|-------|
| Average Score | ${stats.averageScore.toFixed(1)}/10 |
| Median Score | ${stats.medianScore}/10 |

### Score Distribution

| Quality Level | Count | Percentage |
|---------------|-------|------------|
| Excellent (8-10) | ${stats.scoreDistribution.excellent} | ${pct(stats.scoreDistribution.excellent, stats.totalRepos)}% |
| Good (6-7) | ${stats.scoreDistribution.good} | ${pct(stats.scoreDistribution.good, stats.totalRepos)}% |
| Fair (4-5) | ${stats.scoreDistribution.fair} | ${pct(stats.scoreDistribution.fair, stats.totalRepos)}% |
| Poor (1-3) | ${stats.scoreDistribution.poor} | ${pct(stats.scoreDistribution.poor, stats.totalRepos)}% |

---

## Quality by Category

| Category | Repos | Avg Score | Top Issue |
|----------|-------|-----------|-----------|
${Object.entries(stats.categoryStats).map(([cat, data]) =>
  `| ${cat} | ${data.repoCount} | ${data.averageScore.toFixed(1)}/10 | ${data.topIssues[0]?.issue || 'N/A'} |`
).join('\n')}

---

## Quality by Dimension

| Dimension | Avg Score | Weakest Repo | Strongest Repo |
|-----------|-----------|--------------|----------------|
${Object.entries(stats.dimensionStats).map(([dim, data]) =>
  `| ${formatDimensionName(dim)} | ${data.averageScore.toFixed(1)}/10 | ${data.lowestScoreRepo} | ${data.highestScoreRepo} |`
).join('\n')}

---

## Top Performers

${stats.topPerformers.map((r, i) =>
  `${i + 1}. **${r.repo}** (${r.category}) - Score: ${r.score}/10`
).join('\n')}

---

## Repos Needing Attention

${stats.bottomPerformers.map((r, i) =>
  `${i + 1}. **${r.repo}** (${r.category}) - Score: ${r.score}/10
   - Primary issue: ${r.topIssue}`
).join('\n\n')}

---

## Most Common Issues

These issues appear most frequently across the corpus and should be prioritized for fixes:

${stats.topIssues.map((item, i) =>
  `${i + 1}. **${item.issue}** (${item.count} occurrences)
   - Affected repos: ${item.affectedRepos.slice(0, 3).join(', ')}${item.affectedRepos.length > 3 ? ` + ${item.affectedRepos.length - 3} more` : ''}`
).join('\n\n')}

---

## Top Recommendations

Based on the corpus analysis, these improvements would have the most impact:

${stats.topRecommendations.map((item, i) =>
  `${i + 1}. ${item.issue} (mentioned ${item.count} times)`
).join('\n')}

---

${stats.trends.length > 0 ? `## Quality Trends

Repositories with multiple assessment snapshots:

| Repository | First Score | Latest Score | Change | Snapshots |
|------------|-------------|--------------|--------|-----------|
${stats.trends.map(t =>
  `| ${t.repo} | ${t.oldestScore}/10 | ${t.newestScore}/10 | ${t.change >= 0 ? '+' : ''}${t.change} | ${t.snapshotCount} |`
).join('\n')}

---

` : ''}## Actionable Insights

${generateActionableInsights(stats)}

---

*Generated by BragDoc Corpus Summary Tool*
*Source: corpus/reports/*
`;
}

function getExecutiveSummary(stats: AggregatedStats): string {
  const avgScore = stats.averageScore;
  let summary = '';

  if (avgScore >= 8) {
    summary = `The corpus shows **excellent** overall extraction quality with an average score of ${avgScore.toFixed(1)}/10. `;
  } else if (avgScore >= 6) {
    summary = `The corpus shows **good** overall extraction quality with an average score of ${avgScore.toFixed(1)}/10, with room for improvement. `;
  } else if (avgScore >= 4) {
    summary = `The corpus shows **fair** extraction quality with an average score of ${avgScore.toFixed(1)}/10, indicating significant areas for improvement. `;
  } else {
    summary = `The corpus shows **poor** extraction quality with an average score of ${avgScore.toFixed(1)}/10, requiring immediate attention. `;
  }

  // Add worst dimension
  const worstDim = Object.entries(stats.dimensionStats)
    .sort(([, a], [, b]) => a.averageScore - b.averageScore)[0];
  if (worstDim) {
    summary += `The weakest area is **${formatDimensionName(worstDim[0])}** (avg ${worstDim[1].averageScore.toFixed(1)}/10). `;
  }

  // Add top issue
  if (stats.topIssues[0]) {
    summary += `The most common issue is: "${stats.topIssues[0].issue}" affecting ${stats.topIssues[0].affectedRepos.length} repositories.`;
  }

  return summary;
}

function generateActionableInsights(stats: AggregatedStats): string {
  const insights: string[] = [];

  // Check for dimension-specific issues
  for (const [dim, data] of Object.entries(stats.dimensionStats)) {
    if (data.averageScore < 5) {
      insights.push(`**${formatDimensionName(dim)} needs systemic improvement** - Average score of ${data.averageScore.toFixed(1)}/10 suggests fundamental issues with how we handle this aspect of extraction.`);
    }
  }

  // Check for category-specific issues
  for (const [cat, data] of Object.entries(stats.categoryStats)) {
    if (data.averageScore < 5) {
      insights.push(`**${cat} repositories underperform** - Consider adding category-specific extraction logic for ${cat} workflow patterns.`);
    }
  }

  // Check for improving/degrading repos
  const improving = stats.trends.filter(t => t.change >= 2);
  const degrading = stats.trends.filter(t => t.change <= -2);

  if (improving.length > 0) {
    insights.push(`**Positive progress observed** - ${improving.length} repo(s) have improved by 2+ points: ${improving.map(t => t.repo).join(', ')}.`);
  }

  if (degrading.length > 0) {
    insights.push(`**Quality regression detected** - ${degrading.length} repo(s) have degraded by 2+ points: ${degrading.map(t => t.repo).join(', ')}. Investigate recent changes.`);
  }

  // General recommendations based on common issues
  if (stats.topIssues.length > 0) {
    const squashIssues = stats.topIssues.filter(i =>
      i.issue.toLowerCase().includes('squash') || i.issue.toLowerCase().includes('compress')
    );
    if (squashIssues.length > 0) {
      insights.push(`**Squash merge handling is a priority** - Multiple issues relate to squash merges. Consider enhancing PR description extraction and multi-feature detection.`);
    }
  }

  if (insights.length === 0) {
    insights.push('No critical insights at this time. Continue monitoring quality metrics with regular assessments.');
  }

  return insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n\n');
}

function formatDimensionName(dim: string): string {
  return dim
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function pct(value: number, total: number): string {
  return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
}
```

### Step 5: Save Summary and Update Manifest

Save the summary report and update the manifest:

```typescript
const outputPath = options.output || 'corpus/reports/summary.md';

// Write summary
fs.writeFileSync(outputPath, summary);

console.log(`Summary report saved to: ${outputPath}`);

// Update manifest
const manifest = JSON.parse(fs.readFileSync('corpus/manifest.json', 'utf-8'));

// Remove previous summary if exists
manifest.reports = manifest.reports.filter(r => r.type !== 'corpus-summary');

// Add new summary entry
manifest.reports.push({
  id: `summary-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  type: 'corpus-summary',
  reportPath: outputPath,
  generatedAt: new Date().toISOString(),
  stats: {
    totalRepos: stats.totalRepos,
    averageScore: stats.averageScore,
    totalAchievements: stats.totalAchievements,
  },
});

fs.writeFileSync('corpus/manifest.json', JSON.stringify(manifest, null, 2));
```

## Output Format

The summary produces a Markdown report at `corpus/reports/summary.md`:

```markdown
# Corpus Extraction Quality Summary

**Generated:** 2025-01-20
**Reports Analyzed:** 45
**Unique Repositories:** 42
**Total Achievements Extracted:** 1,847
**Total Commits Analyzed:** 21,000

---

## Executive Summary

The corpus shows **good** overall extraction quality with an average score of 6.8/10, with room for improvement. The weakest area is **Squash Merge Handling** (avg 5.2/10). The most common issue is: "Multiple achievements hidden inside squash merges" affecting 28 repositories.

---

## Overall Quality Metrics

| Metric | Value |
|--------|-------|
| Average Score | 6.8/10 |
| Median Score | 7/10 |

### Score Distribution

| Quality Level | Count | Percentage |
|---------------|-------|------------|
| Excellent (8-10) | 8 | 19.0% |
| Good (6-7) | 22 | 52.4% |
| Fair (4-5) | 10 | 23.8% |
| Poor (1-3) | 2 | 4.8% |

---

## Quality by Category

| Category | Repos | Avg Score | Top Issue |
|----------|-------|-----------|-----------|
| monorepos | 18 | 6.5/10 | Multiple features compressed in squash |
| squash-merge | 8 | 5.8/10 | PR context not recovered |
| conventional-commits | 6 | 8.2/10 | N/A |
| high-activity | 5 | 6.4/10 | Attribution issues with merge commits |
| small-team | 5 | 7.8/10 | N/A |

---

## Quality by Dimension

| Dimension | Avg Score | Weakest Repo | Strongest Repo |
|-----------|-----------|--------------|----------------|
| Squash Merge Handling | 5.2/10 | facebook-react | sindresorhus-got |
| Large Commit Handling | 6.4/10 | kubernetes-kubernetes | tj-commander |
| Branch Workflow Attribution | 7.1/10 | lerna-lerna | vuejs-vue |
| Achievement Completeness | 7.3/10 | rust-lang-rust | angular-angular |
| Achievement Accuracy | 7.8/10 | torvalds-linux | vercel-next |
| Commit Message Quality Impact | 6.9/10 | mozilla-firefox | conventional-changelog |

...
```

## Error Handling

The skill handles failures gracefully:

1. **No reports found**: Clear message indicating no assessments exist yet
2. **Malformed reports**: Skip and log warning, continue with valid reports
3. **Empty categories**: Handle gracefully in aggregation
4. **File system errors**: Log error, attempt to continue

```typescript
if (reports.length === 0) {
  console.log('No assessment reports found in corpus/reports/');
  console.log('Run /assess-corpus-extraction first to generate reports.');
  process.exit(0);
}

const validReports = reports.filter(r => {
  try {
    return r.overallScore > 0;
  } catch (e) {
    console.warn(`Skipping malformed report: ${r.reportPath}`);
    return false;
  }
});

if (validReports.length === 0) {
  console.error('No valid reports found. Check report format.');
  process.exit(1);
}
```

## Environment Requirements

- **Node.js**: For running the aggregation
- **File System Access**: Read access to `corpus/reports/`

No external API calls are required - this skill only reads and aggregates existing reports.

## Notes

- The summary uses the most recent report for each repository when calculating averages
- Trends are only shown for repos with 2+ assessment snapshots
- Issue counting uses exact string matching - consider normalizing issues for better aggregation
- The skill can be re-run safely - it replaces the previous summary
- Category filtering applies to the final output, not the data collection
