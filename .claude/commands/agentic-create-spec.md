---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [instructions]
description: Fully create a spec using sub agents, including comprehensive review and revision
---

## Task: Use sub agents to create an entire spec from start to finish

You will make extensive use of the following sub-agents:

@spec-writer - Use this agent to create the spec
@spec-checker - Use this agent to review and revise the spec

The sub-agents have specialized knowledge and abilities, but also, delegating to them allows you to use less of your LLM context on solving issues, as you are playing an orchestrator role. Try to delegate to these sub-agents as much as possible.

## Process

1. Ask the spec writer agent to create a spec for the task at hand.
2. Ask the spec checker agent to review and revise the spec.
3. If the spec checker agent asks you to make changes to the spec, make those changes
4. **Sync SPEC.md to GitHub**: If working with a GitHub issue (task directory named `{issue-number}-{task-name}`), use the github-task-sync skill to push the completed SPEC.md to the GitHub issue as a collapsible comment
5. Once you are done, please report back with the status of the spec.

## Critical File Management Instructions

**IMPORTANT:** The spec creation process should produce ONLY ONE FILE: `SPEC.md`

**When delegating to sub-agents, explicitly instruct them:**
- Make all refinements directly within SPEC.md rather than creating new support documents
- Do NOT create additional files such as:
  - VALIDATION-REPORT.md
  - QUICK-REFERENCE.md
  - IMPROVEMENTS-SUMMARY.md
  - REVIEW-NOTES.md
  - Or any other support documents
- Include any review notes, validation findings, or improvement suggestions as inline comments or in a "Review Summary" section at the end of SPEC.md
- All feedback and refinements must be incorporated directly into the SPEC.md content

**Rationale:**
- Keeps task directories clean and focused on core deliverables
- Users expect only SPEC.md as the output
- Easier to version control and track changes
- Reduces cognitive load for developers reading the spec

## Instructions

- If, during investigation and creation of the spec, it becomes clear that the specification was not possible, immediately stop what you're doing and ask the user for how to proceed.

## GitHub Sync Instructions

When working with a GitHub issue:

1. **Detect GitHub Issue**: Check if the task directory follows the pattern `tasks/{issue-number}-{task-name}/` (e.g., `tasks/196-team-page/`)
2. **Extract Issue Number**: Parse the issue number from the directory name
3. **Create Status Summary**: After spec-checker validation is complete, create a 2-paragraph summary of what the specification covers (NOT a summary of the process that created it)
4. **Push to GitHub**: Use `push-file.sh` to sync with status summary:
   ```bash
   ./.claude/skills/github-task-sync/push-file.sh {issue-number} SPEC {status-file} SPEC.md
   ```

**Status Summary Format:**

The status summary should be a 2-paragraph overview describing WHAT the spec covers:

```markdown
**Status:** Complete

This specification outlines requirements for [high-level feature description]. [Explain the scope and what problem it solves].

Key requirements include: [list 3-5 most important requirements]. [Mention any important constraints, integrations, or technical considerations].

- Key requirement 1 (optional bullet points)
- Key requirement 2
- Key requirement 3
```

**Example:**
```bash
# After creating 2-paragraph status summary in a temp file or variable
./.claude/skills/github-task-sync/push-file.sh 196 SPEC spec-status.txt ./tasks/196-team-page/SPEC.md
```

This creates/updates the SPEC comment on GitHub with:
- Heading: "Specification:"
- Status summary visible at top
- Full spec content in collapsible `<details>` section

**Reference:** See `.claude/skills/github-task-sync/SKILL.md` for complete documentation.
