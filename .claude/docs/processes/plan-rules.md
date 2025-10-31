# Plan requirements

The plan document should be a markdown file named PLAN.md in the same directory as the spec file. It will be read and acted upon by either a human or LLM programmer. Assume little to no prior knowledge of the codebase on the part of the programmer who will be following this plan.

- Non-trivial plans should be broken down into numbered phases, listed in implementation order
- Your output should start with a brief section summarizing what the plan aims to do
- Then there should be a high-level overview of the plan tasks
- If the plan has phases, these should be listed as a table of contents next
- Do not include any time estimates for any tasks
- Each task in each phase should be numbered and have checkbox brackets so we cam mark our progress
- The plan should have sufficient detail such that a junior programmer could be expected to follow it and successfully complete each task
- The plan should aim to reuse as much existing code as possible, so do a thorough scan of the codebase to understand what exists and where to find it
- The plan should assume the developer has never seen the codebase before, so should contain plentiful context about what exists and where to find it
- Specific files should be named, and important function signatures, interfaces and so on defined
- Clearly identify any existing code that we are able to reuse
- If a plan generated a TEST_PLAN.md file, there should be a task in the plan to run the "add-to-test-plan" SlashCommand, so that its UI tests are absorbed into the master test plan

## Documentation updates

Every plan should have a "Documentation" section, which should contain tasks to update our own internal documentation of the app. This section is MANDATORY.

### Technical Documentation (.claude/docs/tech/)

The .claude/docs/tech/ directory contains all the technical documentation meant for consumption and updating by the LLM agents. Plans that affect the codebase should usually result in updates to this directory. In particular, plans affecting the following technical documents should specify updates to them:

- **architecture.md** - Update for new architectural patterns, technology additions, or structural changes
- **database.md** - Update for new tables, schema changes, or query patterns
- **authentication.md** - Update for auth flow changes or new authentication methods
- **api-conventions.md** - Update for new API routes or pattern changes
- **ai-integration.md** - Update for new LLM providers, prompt changes, or AI features
- **cli-architecture.md** - Update for new CLI commands or configuration changes
- **frontend-patterns.md** - Update for new component patterns or UI conventions
- **deployment.md** - Update for deployment process or environment variable changes

**Documentation Style Guidelines:**

Technical documentation updates should be **concise and principle-focused**:
- **NO code examples** unless absolutely critical to understanding the pattern
- Focus on **design principles, architectural approaches, and reusable capabilities**
- Typically **1-3 paragraphs maximum** per pattern/topic
- Reference example files by path rather than including code blocks
- Emphasize **when to use** a pattern and **key concepts**, not implementation details

Example of good concise documentation:
> "Detail pages can display zero states when associated collections are empty. Unlike dashboard zero states, detail page zero states preserve the entity header and swap out only the content area. Use conditional rendering, place components in feature-specific subdirectories (`components/[feature]/[feature]-zero-state.tsx`), and maintain consistent styling. **Examples:** ProjectDetailsZeroState, DashboardZeroState."

Example of overly verbose documentation to **avoid**:
> Including 100+ lines of TypeScript code examples, full component implementations, or step-by-step tutorials. The actual code is in the repository - documentation should focus on concepts and patterns.

### Feature Documentation (docs/)

This should include a potential update to docs/FEATURES.md (if warranted) and updates to any other documents found in the docs/ directory. If we're adding a significant new piece of UI then we should have some document in that directory that describes the capabilities of that UI. There is a high chance this does not exist, so you should create it if not.

### README Updates

Updates should also be considered for both the README.md and cli/README.md files. If it is clear that some or all of our planned changes should involve updates to either or both of these files, include specific tasks for this with specific the content to be added/removed/modified.

## Instructions section in the plan

The plan document should itself contain an instructions section, much like this one. In that section should be at least the following instructions to the programmer performing the implementation:

- Update the plan document as you go; each time you complete a task, mark it as done in the plan document using the checkbox

Add whatever other instructions you think are necessary, to help guide the programmer (which is almost certainly an LLM-based agent). Please thoroughly read the CLAUDE.md file in the root of the project to understand conventions, project structure, and so on, and use that in your own understanding as well as in the instructions you give to the programmer.

## CLAUDE.md updates section

Re-read the CLAUDE.md file in the root of the project to understand if it needs to be updated as a result of this import. If so, add a task or tasks to update the CLAUDE.md file itself. Be specific about what needs to be updated. It's ok if there are no useful or meaningful updates to make.

## Commit Message File (COMMIT_MESSAGE.md)

**MANDATORY REQUIREMENT:** Every plan creation process via `/write-plan` MUST produce a `COMMIT_MESSAGE.md` file alongside `PLAN.md` and `TEST_PLAN.md`.

### Purpose of COMMIT_MESSAGE.md

The `COMMIT_MESSAGE.md` file serves as a **draft commit message** for the changes proposed in the plan. It is created during the planning phase and used as the basis for the actual git commit when the implementation is complete.

### When COMMIT_MESSAGE.md is Created

- **Creation:** During planning via the `/write-plan` SlashCommand
- **Location:** Same directory as SPEC.md, PLAN.md, and TEST_PLAN.md (the task directory)
- **Creator:** The plan-writer agent (which wraps `/write-plan`)

### Content Guidelines for COMMIT_MESSAGE.md

The commit message should:
- Start with a 1-sentence summary on its own line
- Briefly explain what we're doing and why
- Not just summarize the changeset
- Typically be 2-4 paragraphs long
- Be shorter if only a small amount of code is being changed (e.g., if less than ~300LOC changed, 1-2 paragraphs should suffice)
- Call out any key architectural or API changes
- Call out any key dependencies or tools being added/removed
- Call out any key data model changes
- Call out any key environment variable changes
- Avoid value judgments (e.g., don't say "improves" or "better")
- Keep it factual and not boastful

### GitHub Issue Closing Syntax

**MANDATORY FOR TASK-TRACKED ISSUES:** If the task directory follows the pattern `tasks/{issue-number}-{task-name}/`, the commit message MUST include GitHub's automatic issue closing syntax at the end:

1. **Extract the issue number** from the directory name (e.g., `tasks/213-project-list-refresh/` → issue #213)
2. **Choose the closing keyword** based on the issue type:
   - For bug fixes: Use `Fixes #{issue-number}` (check SPEC.md labels)
   - For features and other tasks: Use `Closes #{issue-number}`
3. **Add as a separate line** at the end of the commit message body

GitHub automatically closes the associated issue when the commit is merged to main.

**Example:**
```
fix: invalidate top projects cache when creating projects

When users create a project via the dashboard, TopProjects and NavProjects sidebar components don't refresh because they use `/api/projects/top?limit=5` cache key, separate from the general projects cache that gets invalidated.

This fix adds dual cache invalidation to useCreateProject(), ensuring both general and top projects caches are updated after creation.

Fixes #213
```

### How COMMIT_MESSAGE.md is Used During Implementation

1. **During Implementation:** The file exists as a reference for what the implementation aims to accomplish
2. **At Completion:** Implementation agents (via `/finish` or `/agentic-implement-plan` SlashCommands) will:
   - Read COMMIT_MESSAGE.md
   - Verify it still accurately reflects what was actually implemented
   - Verify the GitHub closing syntax is present (if applicable)
   - Update it if the implementation deviated significantly from the original plan
   - Use it as the basis for the actual git commit message

### Related SlashCommands

- **`/write-plan`** - Creates COMMIT_MESSAGE.md during planning (with closing syntax if applicable)
- **`/finish`** - Uses COMMIT_MESSAGE.md to create the final commit message
- **`/agentic-implement-plan`** - Uses COMMIT_MESSAGE.md to suggest the final commit message

This workflow ensures consistency between what was planned and what gets committed, while allowing flexibility to adjust the message if implementation details changed.

## GitHub Task Sync Integration

**CONTEXT:** All task files (SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md) are managed using the `github-task-sync` skill, which maintains bidirectional sync between local task directories and GitHub issues. GitHub issues are the source of truth for task documentation.

### GitHub Issue Creation

When creating a GitHub issue is explicitly requested:

- Use the `create-issue.sh` script from the github-task-sync skill
- The script creates a new GitHub issue and initializes a task directory named `{issue-number}-{task-name}/`
- Task files are automatically synced to GitHub as collapsible comments
- Each file type (SPEC, PLAN, TEST_PLAN, COMMIT_MESSAGE) has a unique marker for independent updates

### Working with GitHub Task Sync

**Before beginning work:**
- Pull latest task files from GitHub using `pull.sh` or `pull-file.sh`
- This ensures you're working with the current source of truth
- Local task files are a working cache; GitHub is authoritative

**During work:**
- Create and edit task files locally as usual
- Push updates to GitHub periodically using `push-file.sh` for individual files
- Include status summaries when pushing individual files (2-paragraph overview)

**After completing a phase or significant update:**
- Use `push.sh` to sync all task files to GitHub at once
- This keeps the GitHub issue updated as work progresses

**Reference:** See `.claude/skills/github-task-sync/SKILL.md` for complete documentation of all available scripts and workflows.

### Plans Must Reference GitHub Sync

Plans should include tasks in relevant phases to sync work to GitHub:

```markdown
#### Sync to GitHub
- [ ] Push updated task files to GitHub issue using `github-task-sync/push.sh`
```

This ensures task documentation stays synchronized throughout the implementation process, not just at completion.

## After-Action Report Phase

**MANDATORY REQUIREMENT:** Every plan MUST include a final phase for submitting an after-action report to the process-manager agent.

### After-Action Report Phase Structure

Add a final phase (or section if the plan is not broken into phases) titled "After-Action Report" with the following task:

```markdown
### Phase [N]: After-Action Report

**Purpose:** Submit report to process-manager agent to capture lessons learned and identify process improvements.

- [ ] Create after-action report using template in `.claude/docs/after-action-reports/README.md`
- [ ] Include:
  - Task summary and context
  - Process/workflow followed
  - Results and outcomes
  - Issues encountered (documentation gaps, workflow friction, unclear instructions)
  - Lessons learned and recommendations
- [ ] Submit report to process-manager agent for analysis
- [ ] Save report to `.claude/docs/after-action-reports/[YYYY-MM-DD]-[agent-name]-[brief-description].md`
```

### Why After-Action Reports Are Required

After-action reports enable continuous improvement of:

- Process documentation (`.claude/docs/processes/`)
- SlashCommand definitions (`.claude/commands/`)
- Agent coordination patterns (`.claude/docs/team.md`)
- Technical documentation (`.claude/docs/tech/`)

The process-manager agent analyzes these reports to identify patterns, workflow issues, and opportunities for systemic improvements. Without after-action reports, the team cannot learn from experience or evolve its processes.
