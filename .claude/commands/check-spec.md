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

Provide a structured feedback report:

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

## Next Steps

If there are critical issues, recommend revisions before proceeding to plan creation.
If the spec passes validation, confirm it's ready for the plan-writer agent.
