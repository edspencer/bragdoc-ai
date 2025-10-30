---
allowed-tools: Bash, Grep, Read
argument-hint: [spec-file]
description: Validate a specification document against spec-rules.md
---

# Check a specification document against rules

Your task is to validate a SPEC.md file ($1) against the requirements in spec-rules.md and provide structured feedback.

## Your Task

Read the specification document and validate it against `.claude/docs/processes/spec-rules.md`. This is a read-only validation task - do not modify the spec file.

### Validation Checklist

Check the following aspects:

**File Location and Naming:**
- [ ] File is in `./tasks/[task-name]/SPEC.md` format
- [ ] Task name is clear and descriptive

**Required Structure:**
- [ ] Has clear Task heading stating what needs to be done
- [ ] Includes Background section explaining context and problem
- [ ] Includes Current State section describing what exists
- [ ] Includes Requirements section with detailed, numbered list
- [ ] Includes Success Criteria section with testable criteria

**Content Quality:**
- [ ] Description is clear and comprehensive
- [ ] Has enough detail for plan-writer to create implementation plan
- [ ] Avoids large code snippets (except to illustrate patterns)
- [ ] New dependencies are clearly called out
- [ ] Includes relevant links to code, docs, or resources
- [ ] Uses proper markdown formatting

**Completeness:**
- [ ] All necessary context is provided
- [ ] Requirements are specific and actionable
- [ ] Success criteria are testable and clear
- [ ] No implementation details mixed with requirements

## Output Format

Provide a structured feedback report with two parts:

### Part 1: Content Summary (For GitHub Comments)

Create a file called `SPEC-STATUS.md` containing a 2-paragraph content overview that someone can read to understand what the specification covers. This should answer: "What requirements does this specification define? What is the scope and key goals?"

Format:
- **First paragraph:** High-level overview of what the spec calls for
- **Second paragraph:** Key requirements, scope, and important constraints
- **Optional bullet points:** 3-5 bullet points highlighting the most important requirements

Example:
```
This specification outlines requirements for implementing user account deletion functionality. The feature must allow users to permanently delete their accounts and associated data while maintaining system integrity and compliance with data protection regulations.

Key requirements include: database cleanup of all user records, notification of deletion to third-party services, verification steps to prevent accidental deletion, and audit logging of all deletions. The implementation must support gradual data removal to avoid performance impact on the production system.

- Permanent and irreversible account deletion with full data cleanup
- Compliance with GDPR and data protection requirements
- Deletion verification workflow to prevent accidents
- Audit trail for compliance and security
```

### Part 2: Validation Feedback Report

### Validation Summary
- Overall assessment (Pass / Pass with suggestions / Needs revision)
- Number of critical issues
- Number of suggestions

### Critical Issues
List any missing required sections or major problems that must be fixed.

### Suggestions
List improvements that would enhance the spec quality.

### Positive Observations
Note what the spec does well.

## Syncing Status to GitHub

After generating SPEC-STATUS.md and your validation feedback, sync the status to the GitHub issue:

1. **Determine issue number**: Extract from task directory name (format: `tasks/{issue-number}-{task-name}/`)
2. **Push status to GitHub**: Use the `github-task-sync/push-file.sh` script to update the SPEC comment with status summary
   ```bash
   /Users/ed/Code/brag-ai/.claude/skills/github-task-sync/push-file.sh <issue-number> SPEC SPEC-STATUS.md SPEC.md
   ```

This keeps the GitHub issue updated with the current spec validation status. The SPEC-STATUS.md file provides the 2-paragraph summary that appears at the top of the collapsible SPEC comment on GitHub.

## Next Steps

If there are critical issues, recommend revisions before proceeding to plan creation.
If the spec passes validation, confirm it's ready for the plan-writer agent.
