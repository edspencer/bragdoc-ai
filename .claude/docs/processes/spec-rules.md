# Spec rules

## File Location and Naming

- Spec files should always be created in the `./tasks/` directory, in a subdirectory named after the task, in a file named `SPEC.md`
- Example: `./tasks/add-feature-x/SPEC.md`

## Required Structure

Every SPEC.md must include:

- **Task heading**: Clear, concise statement of what needs to be done (e.g., "Task: Add user authentication")
- **Background section**: Context about why this task is needed, what problem it solves
- **Current State section**: What currently exists that's relevant to this task
- **Requirements section**: Detailed, numbered list of what must be implemented
- **Success Criteria section**: Clear, testable criteria for when the task is complete

## Content Guidelines

- Should contain clear description of the task, including all relevant context
- Should NOT contain large code snippets, except where useful to illustrate an example or pattern
- The PLAN.md file generated from this SPEC.md will contain the exact edits to exact files, so the spec should have enough detail to allow the planner agent to create that plan, but should not contain the actual code itself
- If new dependencies are called for, they should be clearly called out
- Include links to relevant existing code, documentation, or external resources
- Use markdown formatting for readability (headings, lists, code blocks)

## Examples

**Good spec**: Clear task statement, thorough background, specific requirements with acceptance criteria, organized with headings

**Poor spec**: Vague task description, missing context, requirements mixed with implementation details, no clear success criteria
