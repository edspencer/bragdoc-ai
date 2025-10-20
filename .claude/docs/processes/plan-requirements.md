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

Every plan should have a final "Documentation" section, which should contain tasks to update our own internal documentation of the app. This should include a potential update to docs/FEATURES.md (if warranted) and updates to any other documents found in the docs/ directory. If we're adding a significant new piece of UI then we should have some document in that directory that describes the capabilities of that UI. There is a high chance this does not exist, so you should create it if not.

Updates should also be considered for both the README.md and cli/README.md files. If it is clear that some or all of our planned changes should involve updates to either or both of these files, include specific tasks for this with specific the content to be added/removed/modified.

## Instructions section in the plan

The plan document should itself contain an instructions section, much like this one. In that section should be at least the following instructions to the programmer performing the implementation:

- Update the plan document as you go; each time you complete a task, mark it as done in the plan document using the checkbox

Add whatever other instructions you think are necessary, to help guide the programmer (which is almost certainly an LLM-based agent). Please thoroughly read the CLAUDE.md file in the root of the project to understand conventions, project structure, and so on, and use that in your own understanding as well as in the instructions you give to the programmer.

## CLAUDE.md updates section

Re-read the CLAUDE.md file in the root of the project to understand if it needs to be updated as a result of this import. If so, add a task or tasks to update the CLAUDE.md file itself. Be specific about what needs to be updated. It's ok if there are no useful or meaningful updates to make.
