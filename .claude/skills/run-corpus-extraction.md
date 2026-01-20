# Run Corpus Extraction

Run `bragdoc extract` against corpus repositories to test achievement extraction quality.

## Overview

This skill extracts achievements from corpus repositories defined in `corpus/repos-manifest.json`. For each repository, it:

1. Clones the repo (shallow clone, cached in `.corpus-cache/`)
2. Identifies the test author from the manifest
3. Extracts achievements from the author's last 500 commits
4. Saves extraction output to `corpus/snapshots/{repo-slug}/{timestamp}.json`

## Usage

```bash
# Run extraction for all repos
/run-corpus-extraction

# Run extraction for a single repo
/run-corpus-extraction facebook-react

# Run extraction for a category
/run-corpus-extraction --category monorepos

# Run extraction with custom commit limit
/run-corpus-extraction --max-commits 100 facebook-react
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `[repo-slug]` | Specific repo slug to extract (e.g., `facebook-react`) | All repos |
| `--category <name>` | Extract only repos in this category | All categories |
| `--max-commits <n>` | Maximum commits to extract per author | 500 |
| `--force` | Re-clone repos even if cached | false |
| `--dry-run` | Show what would be extracted without running | false |

## Execution Steps

### Step 1: Load Manifest

Read the repos manifest from `corpus/repos-manifest.json`:

```typescript
const manifest = JSON.parse(fs.readFileSync('corpus/repos-manifest.json', 'utf-8'));
```

### Step 2: Filter Repos

Apply filtering based on arguments:

```typescript
// Get all repos from manifest
function getRepos(manifest, options) {
  let repos = [];

  for (const [category, data] of Object.entries(manifest.categories)) {
    if (options.category && category !== options.category) continue;

    for (const repo of data.repos) {
      if (options.repoSlug && repo.slug !== options.repoSlug) continue;
      repos.push({ ...repo, category });
    }
  }

  return repos;
}
```

### Step 3: Clone or Use Cached Repository

For each repo, clone to cache directory if not already present:

```bash
# Create cache directory
mkdir -p .corpus-cache

# Check if repo is already cached
if [ ! -d ".corpus-cache/${REPO_SLUG}" ]; then
  # Shallow clone with limited history (enough for 500 commits from any author)
  git clone --depth 2000 --single-branch "${REPO_URL}" ".corpus-cache/${REPO_SLUG}"
else
  # Update existing clone
  cd ".corpus-cache/${REPO_SLUG}" && git fetch --depth 2000 && cd -
fi
```

### Step 4: Identify Test Author Commits

The test author is specified in the manifest. Get their commits:

```bash
cd ".corpus-cache/${REPO_SLUG}"

# Get commits by test author (up to max-commits limit)
# Use email pattern matching since GitHub usernames map to commit emails
git log --author="${TEST_AUTHOR}" --format="%H%x00%an%x00%ae%x00%at%x00%s%x00%b%x1e" -n ${MAX_COMMITS} > /tmp/commits.txt
```

If the manifest's `testAuthor` has fewer than 100 commits in the last 12 months, dynamically find the most prolific author:

```bash
# Find most prolific author in last 12 months with minimum 100 commits
git log --since="12 months ago" --format="%ae" | sort | uniq -c | sort -rn | head -20
```

### Step 5: Extract Achievements

Use the CLI's local LLM extraction to process commits. Since this is offline testing (no API), we'll use the prompt rendering and execution directly:

```typescript
import { renderExecute } from '@bragdoc/cli/src/ai/extract-commit-achievements';

const achievements = await renderExecute({
  commits: parsedCommits,
  repository: {
    name: repoSlug,
    path: `.corpus-cache/${repoSlug}`,
    remoteUrl: repoUrl,
  },
  companies: [], // Empty for corpus testing
  projects: [], // Empty for corpus testing
  user: {
    id: 'corpus-test',
    name: testAuthor,
    email: `${testAuthor}@users.noreply.github.com`,
  },
});
```

### Step 6: Save Snapshot

Save the extraction results to a snapshot file:

```typescript
const snapshot = {
  version: "1.0",
  extractedAt: new Date().toISOString(),
  repo: {
    url: repoUrl,
    slug: repoSlug,
    category: category,
  },
  author: {
    name: authorName,
    email: authorEmail,
    commitCount: commits.length,
  },
  extraction: {
    achievementCount: achievements.length,
    achievements: achievements.map(a => ({
      title: a.title,
      summary: a.summary || '',
      impact: a.impact,
      eventStart: a.eventStart?.toISOString() || null,
      eventEnd: a.eventEnd?.toISOString() || null,
      eventDuration: a.eventDuration,
      source: 'git',
      sourceIds: [a.commitHash].filter(Boolean),
    })),
  },
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const snapshotPath = `corpus/snapshots/${repoSlug}/${timestamp}.json`;

fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
```

### Step 7: Update Manifest

After successful extraction, update the manifest with snapshot reference:

```typescript
// Add to manifest.json snapshots array
manifest.snapshots.push({
  id: `${repoSlug}-${timestamp}`,
  repo: repoSlug,
  category: category,
  snapshotPath: snapshotPath,
  extractedAt: timestamp,
  achievementCount: achievements.length,
  commitCount: commits.length,
});
```

## Error Handling

The skill handles failures gracefully:

1. **Clone failures**: Log error, skip to next repo
2. **No commits found**: Log warning, skip to next repo
3. **LLM extraction failures**: Log error with details, continue to next repo
4. **File system errors**: Log error, attempt to continue

All errors are collected and reported at the end:

```typescript
const errors = [];

for (const repo of repos) {
  try {
    await extractRepo(repo);
  } catch (error) {
    errors.push({
      repo: repo.slug,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    console.error(`Failed to extract ${repo.slug}: ${error.message}`);
    continue; // Continue to next repo
  }
}

// Report summary at end
if (errors.length > 0) {
  console.log(`\nCompleted with ${errors.length} errors:`);
  errors.forEach(e => console.log(`  - ${e.repo}: ${e.error}`));
}
```

## Snapshot Schema

Each snapshot follows this schema:

```json
{
  "version": "1.0",
  "extractedAt": "2025-01-20T00:00:00Z",
  "repo": {
    "url": "https://github.com/facebook/react",
    "slug": "facebook-react",
    "category": "monorepos"
  },
  "author": {
    "name": "Dan Abramov",
    "email": "gaearon@users.noreply.github.com",
    "commitCount": 500
  },
  "extraction": {
    "achievementCount": 47,
    "achievements": [
      {
        "title": "Implemented concurrent rendering mode for React fiber reconciler",
        "summary": "Added support for concurrent rendering which allows React to pause and resume work...",
        "impact": 8,
        "eventStart": "2023-06-15T00:00:00Z",
        "eventEnd": null,
        "eventDuration": "month",
        "source": "git",
        "sourceIds": ["abc123def"]
      }
    ]
  }
}
```

## Cache Management

The `.corpus-cache/` directory stores cloned repositories. To manage disk space:

```bash
# Check cache size
du -sh .corpus-cache/

# Clear entire cache
rm -rf .corpus-cache/

# Clear specific repo
rm -rf .corpus-cache/facebook-react
```

The cache is gitignored and should not be committed.

## Environment Requirements

- **Git**: For cloning repositories
- **LLM API Key**: One of OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY
- **Node.js**: For running the extraction

Ensure your LLM provider is configured before running:

```bash
# Check current configuration
bragdoc llm show

# Set provider if needed
bragdoc llm set openai
```

## Example Output

```
$ /run-corpus-extraction --category monorepos --max-commits 100

Loading manifest from corpus/repos-manifest.json...
Found 20 repos in category 'monorepos'

[1/20] facebook-react
  Cloning https://github.com/facebook/react...
  Identifying commits by gaearon...
  Found 100 commits
  Extracting achievements...
  Extracted 12 achievements
  Saved to corpus/snapshots/facebook-react/2025-01-20T10-30-00-000Z.json

[2/20] vercel-nextjs
  Using cached repo at .corpus-cache/vercel-nextjs
  Identifying commits by timneutkens...
  Found 100 commits
  Extracting achievements...
  Extracted 8 achievements
  Saved to corpus/snapshots/vercel-nextjs/2025-01-20T10-32-15-000Z.json

...

Extraction complete!
  Total repos: 20
  Successful: 18
  Failed: 2
  Total achievements: 156

Failures:
  - lerna-lerna: No commits found for author JamesHenry
  - yarnpkg-berry: Clone failed (repository not accessible)
```

## Notes

- Extraction uses your configured LLM provider (OpenAI, Anthropic, etc.)
- Large repos may take several minutes to clone initially
- Snapshots do NOT include embedding vectors (for smaller file size)
- The skill can be interrupted and resumed - cached repos persist
- Rate limits may apply depending on your LLM provider
