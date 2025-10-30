---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [spec-file]
description: Check a plan document against rules and suggest improvements
---

# Check a plan document against rules and suggest improvements

You have been given a plan document to check ($1). Your task is to fully read and understand the plan document, validate it against plan-rules.md, and suggest improvements if needed.

You may be given a spec document ($2) that the plan was based on, and you should compare the plan document against this spec document to ensure it is up to date and accurate.

## Output

You should provide two outputs:

### Output 1: Content Summary (For GitHub Comments)

Create a file called `PLAN-STATUS.md` containing a 2-paragraph content overview that someone can read to understand what the implementation plan covers. This should answer: "What will be done if we follow this plan? What are the important phases, approach, and scope?"

Format:
- **First paragraph:** High-level overview of the implementation approach (phases, methodology, overall strategy)
- **Second paragraph:** Key phases/components, timeline structure, and major deliverables
- **Optional bullet points:** 3-5 bullet points highlighting the most important implementation phases or deliverables

Example:
```
The implementation plan uses a phased approach to build the user account deletion feature over 6 weeks. It begins with infrastructure setup and verification workflows, progresses through database cleanup and notification systems, and concludes with testing and documentation.

Key phases include: (1) Creating the deletion request and verification system, (2) Implementing database cleanup with transaction safety, (3) Building notification to third parties, (4) Performance optimization and gradual deletion, and (5) Comprehensive testing and documentation. Each phase builds on previous work with clear dependencies and success criteria.

- Phased implementation over 6 weeks with clear dependencies
- Transaction-safe database cleanup with gradual removal
- Comprehensive testing (unit, integration, performance)
- Full audit logging and compliance documentation
- Backwards compatibility maintained throughout
```

### Output 2: Validation Feedback Report

Return a comprehensive list of issues found and suggested improvements. Propose a set of edits to the file, but do not actually make them without user approval.

## Instructions

- Read the plan document carefully before starting to check it
- Compare the plan document against the spec document if provided, extract any ways in which the plan deviates from the spec
- Compare the plan document against ./.claude/docs/processes/plan-rules.md, extract any ways in which the plan deviates from the plan requirements
- Check to see if the plan calls for the creation of any functions or features that don't seem to be used or called for and highlight them

## Syncing Status to GitHub

After generating PLAN-STATUS.md and your validation feedback, sync the status to the GitHub issue:

1. **Determine issue number**: Extract from task directory name (format: `tasks/{issue-number}-{task-name}/`)
2. **Push status to GitHub**: Use the `github-task-sync/push-file.sh` script to update the PLAN comment with status summary
   ```bash
   /Users/ed/Code/brag-ai/.claude/skills/github-task-sync/push-file.sh <issue-number> PLAN PLAN-STATUS.md PLAN.md
   ```

This keeps the GitHub issue updated with the current plan validation status. The PLAN-STATUS.md file provides the 2-paragraph summary that appears at the top of the collapsible PLAN comment on GitHub.
