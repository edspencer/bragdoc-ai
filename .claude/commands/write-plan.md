---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write(PLAN.md)
argument-hint: [spec-file]
description: Create a plan to implement a certain specification
---

# Create a plan for implementing a certain specification

Your task is to create a PLAN.md file that outlines the steps required to implement a certain specification.

## Data you have access to

### Spec file (argument 1)

The spec file argument ($1) to understand what we're importing this time. It will provide you will some or all of the following sections of information:

- Task - overall short description of the task
- Background Reading - any additional information you should read to understand the context of the task
- Specific Requirements - any specific requirements for the task

It may contain other information too, which you should pay attention to.

## Your Task

Your task is to use the details in the spec file, read and understand any content it refers to, and ultrathink to create a detailed PLAN.md document in the same directory as the spec file ($1). The PLAN.md document should contain a thorough plan for implementing the specification, following any additional instructions outlined in the spec file.

### Plan requirements

IMPORTANT: Our PLAN.md documents follow very strict plan requirements, as detailed in .claude/docs/processes/plan-rules.md. Read that file very carefully and adhere strictly to its guidance.

**CRITICAL REQUIREMENTS FROM plan-rules.md:**

1. **Documentation Manager Consultation**: After drafting the initial plan but BEFORE using `/check-plan`, you MUST consult the documentation-manager agent to identify which documentation files in `.claude/docs/tech/` and `.claude/docs/user/` need updates. Include their specific guidance in your plan's Documentation section.
2. **Changeset Evaluation**: Determine if a changeset phase is required using the decision framework in `.claude/docs/processes/changeset-management.md`. Include a changeset phase if the plan modifies published packages (e.g., CLI).
3. **GitHub Task Sync**: Include tasks to sync task files to GitHub at appropriate points using the `github-task-sync` skill. Plans should pull latest files from GitHub before starting work and push updates after major phases. See plan-rules.md section "GitHub Task Sync Integration" for complete workflow details.
4. **After-Action Report Phase**: Every plan MUST include a final phase for submitting an after-action report to the process-manager agent. See plan-rules.md for the exact structure required.

### GitHub Task Sync Workflow

Before beginning work, check if a GitHub issue exists for this task:
- If the task directory is named `{issue-number}-{task-name}/`, pull latest files from GitHub using `pull.sh`
- Include sync tasks in the plan for pushing updates after completing major phases
- The `/finish` SlashCommand will handle final sync to GitHub before archiving

After creating the plan files, sync them to GitHub:

1. **Create Status Summary**: Write a 2-paragraph summary describing WHAT the plan will implement (NOT the process):
   - **Status:** Draft
   - First paragraph: High-level overview of implementation approach and phases
   - Second paragraph: Key phases/components and major deliverables
   - Optional: 3-5 bullet points highlighting most important phases

2. **Push to GitHub**: Extract the issue number from the directory name and sync:
   ```bash
   ./.claude/skills/github-task-sync/push-file.sh {issue-number} PLAN {status-file} PLAN.md
   ./.claude/skills/github-task-sync/push.sh {issue-number} {task-directory}
   ```

This creates/updates the PLAN comment with status summary visible and full plan in collapsible section, plus syncs TEST_PLAN.md and COMMIT_MESSAGE.md.

### Separate Test Plan Requirements

Most plans you will be asked to make will involve some level of testing. You should create a separate TEST_PLAN.md file in the same directory as the spec file ($1). The TEST_PLAN.md file should contain a thorough plan for testing the specification, following any additional instructions outlined in the spec file.

If the plan genuinely does not call for any testing, do not create a TEST_PLAN.md file.

If you do create a TEST_PLAN.md file, refer to its existence in the main PLAN.md file, which should also contain a very high level summary of what the test plan calls for.

### Commit Message

You should create a commit message for the changeset you propose in the PLAN.md. You should save this in a file called COMMIT_MESSAGE.md in the same directory as the spec file ($1). The commit message should correspond in detail to the changeset you propose in the PLAN.md, but at most should run to about 5-6 paragraphs. It should usually be 2-3 paragraphs unless the changeset are enormous.

Commit message instructions:

- should start with a 1-sentence summary on its own line
- should briefly explain what we're doing any why
- should not just summarize the changeset
- should typically be 2-4 paragraphs long
- should be shorter than this if only a small amount of code is being changed (e.g. if less than ~300LOC changed, a paragraph or two should suffice)
- should call out any key architectural or API changes
- should call out any key dependencies or tools being added/removed
- should call out any key data model changes
- should call out any key environment variable changes
- do not attempt to assess the value of the changes, e.g. don't say things like "This change improves the information architecture by separating document management from the primary navigation flow while keeping career-focused features prominently displayed and easily accessible."

#### GitHub Issue Closing Syntax

If the task directory follows the pattern `tasks/{issue-number}-{task-name}/`, the commit message MUST include GitHub's issue closing syntax at the end:

- Extract the issue number from the directory name
- For bug fixes (check SPEC.md labels): Use `Fixes #{issue-number}`
- For features and other tasks: Use `Closes #{issue-number}`
- Add this as a separate line at the end of the commit message body

GitHub will automatically close the associated issue when the commit is merged.

**Example with closing syntax:**

```
fix: invalidate top projects cache when creating projects

When users create a project via the dashboard, the TopProjects component and NavProjects sidebar don't refresh to show the new project until they manually refresh the page. This occurs because useCreateProject() only invalidates the `/api/projects` SWR cache key, while TopProjects and NavProjects use the `/api/projects/top?limit=5` cache key.

This fix adds useTopProjects() to useCreateProject() and calls mutate() on both cache keys after successful creation, ensuring all components receive updated data immediately.

Closes #213
```

#### Example commit messages (without closing syntax for context)

In this paragraph:

```
This change restructures the main sidebar navigation by removing the Documents section and introducing a new "Careers" section that consolidates career-related features. The Careers section groups together existing features (Standup and "Reports") with two new coming-soon pages (Performance Review and Workstreams), creating a more intuitive organization for users focused on career advancement and documentation.
```

All was fine until the ", creating a more intuitive ..." stuff - just don't include value judgments like that, leave them out.

Similarly, here, the final sentence is completely unnecessary and should not be present in a commit message:

```
The Documents section has been completely removed from the navigation sidebar, though the `/documents` page and its associated functionality remain accessible via direct URL. This change improves the information architecture by separating document management from the primary navigation flow while keeping career-focused features prominently displayed and easily accessible.
```

That was fine until the "direct URL.", which is where it should have ended.

# Get started

Please start your plan and save it to PLAN.md
