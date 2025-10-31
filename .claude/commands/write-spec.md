---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write(SPEC.md)
argument-hint: [topic]
description: Create a specification document for a task
---

# Create a specification document for a task

Your task is to create a SPEC.md file from the topic or requirements provided by the user.

## Data you have access to

### Topic (argument 1)

The topic argument ($1) provides the initial description of what needs to be specified. This may be:
- A brief task description
- User requirements or goals
- A problem statement that needs solving

## Your Task

Your task is to gather all necessary information (through questions if needed) and create a comprehensive SPEC.md document in `./tasks/[task-name]/SPEC.md` following the spec-rules.md guidelines.

### Spec Requirements

IMPORTANT: All SPEC.md documents must follow the strict requirements in `.claude/docs/processes/spec-rules.md`. Read that file very carefully and adhere to its guidance.

**Key Requirements:**
1. **File Location**: Always create in `./tasks/[task-name]/SPEC.md` where [task-name] is derived from the task
2. **Required Structure**:
   - Task heading with clear statement
   - Background section explaining context and problem
   - Current State section describing what exists today
   - Requirements section with detailed, numbered list
   - Success Criteria section with testable criteria
3. **Content Guidelines**:
   - Clear, comprehensive description with all relevant context
   - No large code snippets (except to illustrate patterns)
   - Enough detail for plan-writer to create implementation plan
   - Call out new dependencies clearly
   - Include links to relevant code, docs, or resources

### Gathering Requirements

If the initial topic ($1) lacks sufficient detail:
- Ask clarifying questions about the problem and goals
- Understand what currently exists
- Identify what needs to change or be added
- Determine success criteria
- Identify any constraints or dependencies

### Task Naming

Choose a clear, descriptive task name for the directory:
- Use lowercase with hyphens: `add-user-auth`, `fix-login-bug`, `refactor-api`
- Keep it concise but meaningful
- Ensure it matches the task heading

### GitHub Issue Creation

If the user explicitly requests that a GitHub issue be created, or if this is a significant feature requiring tracking:

1. **Ask the user** if a GitHub issue should be created for this task
2. **If yes**, use the github-task-sync skill's `create-issue.sh` script to create the issue and initialize the task directory:
   ```bash
   /Users/ed/Code/brag-ai/.claude/skills/github-task-sync/create-issue.sh "<task-title>" "<brief-description>"
   ```
3. **Directory naming**: The script automatically creates a directory named `{issue-number}-{task-slug}/`
4. **Work locally**: Create SPEC.md in the task directory as usual
5. **Sync to GitHub**: After creating SPEC.md, sync it with a status summary (see below)

**Note:** GitHub issues serve as the source of truth for task documentation. Local task files are a working cache that agents can edit easily.

### GitHub Sync After Spec Creation

After creating SPEC.md, if the task directory follows the pattern `tasks/{issue-number}-{task-name}/`:

1. **Create Status Summary**: Write a 2-paragraph summary describing WHAT the specification covers (NOT the process):
   - **Status:** Draft
   - First paragraph: High-level overview of what the spec calls for
   - Second paragraph: Key requirements, scope, and important constraints
   - Optional: 3-5 bullet points highlighting most important requirements

2. **Push to GitHub**: Extract the issue number from the directory name and sync:
   ```bash
   ./.claude/skills/github-task-sync/push-file.sh {issue-number} SPEC {status-file} SPEC.md
   ```

**Status Summary Format Example:**
```
**Status:** Draft

This specification outlines requirements for implementing user account deletion functionality. The feature must allow users to permanently delete their accounts and associated data while maintaining system integrity and compliance with data protection regulations.

Key requirements include: database cleanup of all user records, notification of deletion to third-party services, verification steps to prevent accidental deletion, and audit logging of all deletions. The implementation must support gradual data removal to avoid performance impact on the production system.

- Permanent and irreversible account deletion with full data cleanup
- Compliance with GDPR and data protection requirements
- Deletion verification workflow to prevent accidents
- Audit trail for compliance and security
```

This creates/updates the SPEC comment on GitHub with the status summary visible and full spec in a collapsible section.

# Get started

Please gather requirements and create the SPEC.md file.
