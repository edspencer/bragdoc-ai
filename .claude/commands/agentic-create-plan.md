---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [spec-file] [instructions]
description: Fully create a plan using sub agents, including comprehensive review and revision
---

## Task: Use sub agents to create an entire plan from start to finish

You will make extensive use of the following sub-agents:

@plan-writer - Use this agent to create the plan
@plan-checker - Use this agent to review and revise the plan

The sub-agents have specialized knowledge and abilities, but also, delegating to them allows you to use less of your LLM context on solving issues, as you are playing an orchestrator role. Try to delegate to these sub-agents as much as possible.

## Process

1. Read the entire SPEC.md file for the task at hand (unless you were just given a text description of the specification)
2. Ask the plan writer agent to create a plan for the task at hand.
3. Ask the plan checker agent to review and revise the plan.
4. If the plan checker agent asks you to make changes to the plan, make those changes
5. **Sync plan files to GitHub**: If working with a GitHub issue (task directory named `{issue-number}-{task-name}`), use the github-task-sync skill to push all plan files (PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md) to the GitHub issue

Once you are done, please report back with the status of the plan.

## Critical File Management Instructions

**IMPORTANT:** The plan creation process should produce THREE FILES: `PLAN.md`, `TEST_PLAN.md`, and `COMMIT_MESSAGE.md`

**When delegating to sub-agents, explicitly instruct them:**
- The plan-writer agent will create PLAN.md, TEST_PLAN.md, and COMMIT_MESSAGE.md as part of the planning phase
- Make all refinements directly within PLAN.md and TEST_PLAN.md rather than creating support documents
- Do NOT create additional files such as:
  - VALIDATION-REPORT.md
  - IMPLEMENTATION-NOTES.md
  - REVIEW-SUMMARY.md
  - QUICK-REFERENCE.md
  - IMPROVEMENTS-SUMMARY.md
  - Or any other support documents
- Include any validation findings, implementation notes, or review feedback directly in the appropriate sections of PLAN.md
- All architectural decisions and technical details belong in PLAN.md, not separate files

**Rationale:**
- Keeps task directories clean and focused on core deliverables
- Users expect PLAN.md, TEST_PLAN.md, and COMMIT_MESSAGE.md as standard outputs
- COMMIT_MESSAGE.md provides a draft commit message that can be verified/updated at completion
- Easier to version control and track changes
- Reduces cognitive load for developers following the plan
- Simplifies onboarding (fewer files to read)

## Instructions

- If, during investigation and creation of the plan, it becomes clear that the specification was not possible, immediately stop what you're doing and ask the user for how to proceed.

## GitHub Sync Instructions

When working with a GitHub issue:

1. **Detect GitHub Issue**: Check if the task directory follows the pattern `tasks/{issue-number}-{task-name}/` (e.g., `tasks/196-team-page/`)
2. **Extract Issue Number**: Parse the issue number from the directory name
3. **Create Status Summary**: After plan-checker validation is complete, create a 2-paragraph summary of what the implementation plan covers (NOT a summary of the process that created it)
4. **Push Plan to GitHub**: Use `push-file.sh` to sync with status summary:
   ```bash
   ./.claude/skills/github-task-sync/push-file.sh {issue-number} PLAN {status-file} PLAN.md
   ```
5. **Push Other Files**: Use `push.sh` to sync TEST_PLAN.md and COMMIT_MESSAGE.md:
   ```bash
   ./.claude/skills/github-task-sync/push.sh {issue-number} {task-directory}
   ```

**Status Summary Format:**

The status summary should be a 2-paragraph overview describing WHAT the plan will implement:

```markdown
**Status:** Complete

The implementation plan uses a phased approach to build [feature description] over [timeline]. It begins with [initial phases], progresses through [middle phases], and concludes with [final phases].

Key phases include: (1) [Phase 1 description], (2) [Phase 2 description], (3) [Phase 3 description], and (4) [Final phase]. Each phase builds on previous work with clear dependencies and success criteria.

- Key phase 1 (optional bullet points)
- Key phase 2
- Key phase 3
```

**Example:**
```bash
# After creating 2-paragraph status summary
./.claude/skills/github-task-sync/push-file.sh 196 PLAN plan-status.txt ./tasks/196-team-page/PLAN.md
./.claude/skills/github-task-sync/push.sh 196 ./tasks/196-team-page
```

This creates/updates the PLAN comment on GitHub with:
- Heading: "Implementation Plan:"
- Status summary visible at top
- Full plan content in collapsible `<details>` section
- TEST_PLAN.md and COMMIT_MESSAGE.md as separate collapsible comments

**Reference:** See `.claude/skills/github-task-sync/SKILL.md` for complete documentation.
