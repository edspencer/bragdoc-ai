---
allowed-tools: Bash, Edit, Glob, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [company-name]
description: Research how a company conducts performance reviews and save findings to companies/
---

# Research Company Performance Reviews

Your task is to research how a specific company conducts employee performance reviews, with a focus on software engineers. Compile findings into a comprehensive document.

## Input

**$1 - Company Name** (required):
The company to research (e.g., "Google", "Meta", "Amazon", "Stripe", "Datadog")

## Research Strategy

Based on successful research patterns, search these sources in order:

### 1. Primary Sources (Most Detailed)

Search these sites which often have insider information:

```
site:jointaro.com [company] performance review
site:teamrora.com [company] performance review
site:promotions.fyi [company] performance review
site:levels.fyi [company] performance review
```

### 2. HR Platform Case Studies

```
site:performyard.com [company] performance management
site:deel.com [company] performance reviews
```

### 3. Employee Forums

```
site:teamblind.com [company] performance review self assessment
site:reddit.com [company] performance review process
[company] performance review Glassdoor
```

### 4. General Searches

```
[company] performance review process format questions
[company] self review exact questions word limit
[company] peer feedback 360 review format
[company] calibration process ratings
[company] performance review [system name] (e.g., GRAD, PSC, Forte, Connect)
```

### 5. Official/Semi-Official Sources

```
[company] engineering blog performance management
[company] HR careers performance review
```

## Information to Gather

For each company, try to find:

### Review System Basics
- **System Name**: What is it called? (e.g., GRAD, PSC, Forte/OLR, Connect)
- **Frequency**: Annual, biannual, quarterly, continuous?
- **Timing**: When does it happen? (months)
- **Eligibility**: Minimum tenure required?

### Self-Review Format
- **Number of Questions**: One open-ended? Multiple specific questions?
- **Exact Question Wording**: The literal text of each prompt (if available)
- **Character/Word Limits**: Hard limits on response length
- **Required Sections/Axes**: What dimensions must be addressed?
- **Supporting Materials**: Are links/evidence required?

### Evaluation Criteria
- **Performance Axes**: What dimensions are engineers rated on?
- **Level Expectations**: How do expectations vary by level?
- **Values/Principles**: Are company values explicitly evaluated?

### Peer Feedback
- **Format**: Start/Stop/Continue? Strengths/Improvements? Open-ended?
- **Number of Reviewers**: How many peers provide feedback?
- **Selection**: Self-selected? Manager-assigned? Both?
- **Word/Character Limits**: Constraints on peer feedback length
- **Anonymity**: Is feedback anonymous or attributed?

### Manager Review
- **Questions Asked**: What managers write about their reports
- **Upward Feedback**: Questions employees answer about their manager

### Calibration Process
- **How it Works**: How are ratings determined across teams?
- **Stack Ranking**: Is there forced distribution?
- **Rating Scale**: What are the actual rating designations?
- **Promotion Process**: How does calibration relate to promotions?

### Practical Tips
- **What High Performers Do**: Advice from coaches/employees
- **Common Mistakes**: What to avoid
- **Documentation Practices**: How to track work throughout the year

## Output Format

Create a document at `companies/[company-slug]/performance-review.md` with this structure:

```markdown
# [Company Name] Performance Review Process

> Last researched: [date]
> Confidence: [High/Medium/Low] based on source quality

## Overview

Brief summary of the review system.

## Review Cycle

- **System Name**:
- **Frequency**:
- **Timing**:
- **Eligibility**:

## Self-Review

### Format
[Description of format - one question vs. multiple, structured vs. free-form]

### Questions
[The actual questions, as close to verbatim as possible]

1. **[Section/Question Name]**
   > "[Exact question wording if available]"
   - Character/word limit: [if known]
   - What to include: [guidance]

### Character/Word Limits
[Specific limits if known]

## Evaluation Axes

How engineers are evaluated:

1. **[Axis Name]** - [Description]
2. **[Axis Name]** - [Description]
...

## Peer Feedback

### Format
[Description]

### Questions
[Actual questions if available]

### Limits
- Number of reviewers:
- Word/character limit:
- Anonymity:

## Manager Assessment

[What managers write, questions they answer]

## Calibration & Ratings

### Process
[How calibration works]

### Rating Scale
[The actual ratings and what they mean]

| Rating | Description | Typical Distribution |
|--------|-------------|---------------------|
| ... | ... | ...% |

## Tips for Success

### What High Performers Do
- [tip]
- [tip]

### Common Mistakes to Avoid
- [mistake]
- [mistake]

## Sources

- [Source 1](url)
- [Source 2](url)
...

## Gaps in Research

[Note any information that couldn't be found]
```

## Execution

1. **Create output directory**: `companies/[company-slug]/`
2. **Run searches systematically**: Follow the search strategy above
3. **Fetch detailed pages**: Use WebFetch on promising results
4. **Compile findings**: Organize into the output format
5. **Note confidence level**: Based on source quality and recency
6. **Document sources**: Include all URLs used
7. **Note gaps**: Be explicit about what couldn't be found

## Quality Standards

- **Prefer specific over vague**: "2,500 characters" is better than "limited"
- **Cite sources**: Every claim should have a source
- **Date sensitivity**: Note if information may be outdated
- **Distinguish fact from advice**: Separate what the company does from what coaches recommend
- **Be honest about gaps**: Note when exact questions aren't publicly available

## Example Companies to Research

Common targets:
- Google (GRAD system)
- Meta (PSC - Performance Summary Cycle)
- Amazon (Forte + OLR)
- Microsoft (Connect)
- Apple (MyPage)
- Netflix (360 feedback, Keeper Test)
- Salesforce (V2MOM)
- Uber (T3 B3)
- LinkedIn
- Stripe
- Airbnb
- Databricks
- Snowflake
- Coinbase
- Block/Square
- Shopify
- Atlassian
- Spotify
- Twitter/X

## Get Started

Research the company specified in $1 and create the performance review document.
