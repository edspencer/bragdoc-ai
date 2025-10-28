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

# Get started

Please gather requirements and create the SPEC.md file.
