---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [instructions]
description: Create an issue based on instructions, optionally creating a spec and plan
---

# Create an issue based on instructions

You're going to be given a variety of different possible instructions, but typically you're going to need to use the Github Task Sync skill to create an issue in the Github issues for this repository and potentially create a spec and a plan using the /agentic-create-spec and /agentic-create-plan commands. If the instructions don't specifically say don't do either one or both of those, then the default is that you should do so.

You are playing the role of orchestrator of these sub-agents, so it's important that you understand the issue yourself. However, you're going to delegate most of the work to the sub-agents to create spec and the plan. Then, you're going to report back afterwards as to what happened.

## Label Determination

Before creating the issue, analyze the title and description to determine appropriate GitHub labels:

**Available labels:**
- `UI` - User interface related (buttons, styling, layout, components, forms, mobile responsiveness, themes)
- `CLI` - Command-line interface related (commands, terminal, Git operations, flags, arguments)
- `bug` - Bug fixes and issue resolutions (fix, broken, crash, error, regression)
- `feature` - New features and enhancements (add, implement, support, new capability)

**Decision process:**
1. Scan the title and description for keyword patterns
2. Apply multiple labels if the issue touches multiple areas (e.g., `UI,bug` for styling bug)
3. Pass comma-separated labels to the `create-issue.sh` script via the 4th parameter
4. Never apply both `bug` and `feature` to the same issue
5. Tags are optional - only apply if context clearly matches

**Example label decisions:**
- "Fix login button styling on mobile" → `UI,bug` (UI styling + bug fix)
- "Add new extract command for filtering by date" → `CLI,feature` (CLI command + new feature)
- "Resolve authentication redirect loop" → `bug` (bug fix only)
- "Implement dark mode toggle in settings" → `UI,feature` (UI component + new feature)
