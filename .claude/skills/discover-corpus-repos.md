# Discover Corpus Repositories

Automatically discover representative OSS repositories for the BragDoc extraction test corpus.

## Overview

This skill discovers 20 repositories per category (100 total) across 5 categories that represent the diversity of real-world development workflows. The discovered repos provide a test corpus for validating bragdoc's achievement extraction quality.

## Categories

### 1. Monorepos (`monorepos`)
Large repositories with multiple projects/packages managed together.

**Discovery Signals:**
- Has `packages/`, `apps/`, `libs/`, or `modules/` directory structure
- Uses workspaces (pnpm, yarn, npm, lerna, nx, turborepo)
- Multiple distinct projects in one repository

**Example Repos:** facebook/react, vercel/next.js, microsoft/TypeScript

### 2. Squash-Merge Heavy (`squash-merge`)
Repositories that predominantly use squash merging, resulting in clean linear history.

**Discovery Signals:**
- Linear git history on main branch
- PR-based workflow with squash merge setting
- One commit per PR pattern
- Clean commit messages matching PR titles

**Example Repos:** rust-lang/rust, kubernetes/kubernetes

### 3. Conventional Commits (`conventional-commits`)
Repositories strictly following the Conventional Commits specification.

**Discovery Signals:**
- Commits follow `type(scope): description` pattern
- Types: feat, fix, docs, style, refactor, test, chore
- Often has commitlint configuration
- CHANGELOG generated from commits

**Example Repos:** angular/angular, vuejs/vue

### 4. High Activity (`high-activity`)
Repositories with frequent commits from many contributors.

**Discovery Signals:**
- 50+ commits per week average
- 20+ active contributors per month
- Rapid PR turnover
- Multiple branches in active development

**Example Repos:** torvalds/linux, kubernetes/kubernetes

### 5. Small Team (`small-team`)
Quality repositories maintained by 1-5 developers.

**Discovery Signals:**
- 1-5 contributors with >90% of commits
- Consistent development over 1+ years
- Stars indicate quality despite small team
- Good documentation and releases

**Example Repos:** sindresorhus/* projects, tj/commander.js

## Execution Steps

### Step 1: Research Repositories

Use web search to find candidates for each category:

```
WebSearch: "best JavaScript monorepos github 2025"
WebSearch: "popular TypeScript repositories squash merge workflow"
WebSearch: "conventional commits repositories examples"
WebSearch: "most active open source repositories github"
WebSearch: "small team high quality github repositories"
```

### Step 2: Validate Candidates via GitHub API

For each candidate repository, validate using the GitHub CLI:

```bash
# Get repository metadata
gh repo view {owner}/{repo} --json name,owner,url,stargazerCount,primaryLanguage,defaultBranchRef

# Get recent commits to analyze patterns
gh api repos/{owner}/{repo}/commits --jq '.[0:30] | .[] | {sha: .sha[0:7], message: .commit.message | split("\n")[0], author: .author.login}'

# Get contributor count
gh api repos/{owner}/{repo}/contributors --jq 'length'

# Check for monorepo indicators
gh api repos/{owner}/{repo}/contents --jq '.[] | select(.type == "dir") | .name' | grep -E '^(packages|apps|libs|modules)$'

# Check commit frequency (commits in last 30 days)
gh api "repos/{owner}/{repo}/commits?since=$(date -v-30d +%Y-%m-%dT%H:%M:%SZ)" --jq 'length'
```

### Step 3: Analyze Merge Strategy

Determine the merge strategy by analyzing commit patterns:

```bash
# Look for merge commits (indicates merge strategy)
gh api repos/{owner}/{repo}/commits --jq '[.[] | select(.parents | length > 1)] | length'

# Check if commits match PR title pattern (squash indicator)
# Squash merges typically have commits like: "Feature name (#123)"
gh api repos/{owner}/{repo}/commits --jq '.[0:20] | [.[] | .commit.message | split("\n")[0] | test("\\(#[0-9]+\\)$")] | map(select(. == true)) | length'
```

### Step 4: Identify Test Author

Select a prolific contributor as the test author:

```bash
# Get top contributors
gh api repos/{owner}/{repo}/contributors --jq '.[0:5] | .[] | {login: .login, contributions: .contributions}'
```

### Step 5: Build Manifest

Create the manifest with all discovered repositories:

```json
{
  "version": "1.0",
  "generatedAt": "2025-01-20T00:00:00Z",
  "categories": {
    "monorepos": {
      "description": "Large repositories with multiple projects/packages",
      "repos": [
        {
          "url": "https://github.com/owner/repo",
          "slug": "owner-repo",
          "language": "TypeScript",
          "stars": 50000,
          "mergeStrategy": "squash",
          "commitFrequency": "high",
          "contributorCount": 500,
          "testAuthor": "username",
          "notes": "Brief description of why this repo was selected"
        }
      ]
    }
  }
}
```

## Validation Criteria

Each repository must meet these criteria:

1. **Public Access**: Repository must be public
2. **Sufficient History**: At least 500 commits total
3. **Recent Activity**: Commits within last 6 months
4. **Clear Signals**: Demonstrates category characteristics clearly
5. **Language Diversity**: Mix of JS/TS, Python, Go, Rust, Java across corpus

## Output

Results are saved to `corpus/repos-manifest.json` with:
- 20 repositories per category (100 total)
- Full metadata for each repository
- Category descriptions and selection rationale

## Commit Frequency Classification

- **high**: 50+ commits/week
- **medium**: 10-50 commits/week
- **low**: <10 commits/week

## Merge Strategy Classification

- **squash**: >70% of PRs are squash-merged
- **merge**: >70% of PRs are regular merge commits
- **rebase**: Linear history without merge commits
- **mixed**: No dominant strategy

## Language Targets

Aim for language diversity across the corpus:
- JavaScript/TypeScript: 30-40%
- Python: 15-20%
- Go: 10-15%
- Rust: 10-15%
- Java/Kotlin: 10-15%
- Other: 10-15%

## Usage

```bash
# Invoke via Claude Code
/discover-corpus-repos

# Or via Claude CLI
claude -p "run /discover-corpus-repos"
```

## Notes

- This skill uses web search and the `gh` CLI tool
- Ensure `gh` is authenticated: `gh auth status`
- Discovery process may take several minutes due to API rate limits
- Re-running will regenerate the manifest with fresh data
