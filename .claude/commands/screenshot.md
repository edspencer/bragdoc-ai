---
allowed-tools: Task
argument-hint: [location] [options]
description: Capture high-quality screenshots of the BragDoc application or terminal/CLI commands
---

# Capture Application and Terminal Screenshots

This command delegates to the Screenshotter agent to capture professional-quality screenshots of the BragDoc web application or terminal/CLI commands.

## Usage

```bash
/screenshot [location] [options]
```

### Parameters

**$1 - Location/Feature** (required):
The specific page, feature, section, or CLI command to screenshot. Examples:

**Web Application:**
- `dashboard` - Main dashboard page
- `achievements` - Achievements list page
- `projects` - Projects page
- `reports` - Reports/For My Manager page
- `companies` - Companies page
- `achievement-form` - Achievement creation form
- `project-creation` - Project creation flow
- `entire-app` - Multiple key pages across the app

**Terminal/CLI:**
- `terminal:bragdoc-login` - Terminal screenshot of `bragdoc login` command
- `terminal:bragdoc-extract` - Terminal screenshot of `bragdoc extract` command
- `terminal:bragdoc-repos-add` - Terminal screenshot of `bragdoc repos add` command
- `terminal:npm-install` - Terminal screenshot of npm commands
- `terminal:custom` - Custom terminal commands (specify exact output desired)

**Note**: Terminal screenshots use the Write tool + `termshot --raw-read` pattern for precise control over output appearance.

**$2 - Options** (optional):
Configuration for the screenshot session. Can be one or more of:
- `empty` - Use empty demo account (zero state UI)
- `populated` - Use populated demo account with sample data (default)
- `multiple-views` - Capture multiple angles/states of the same feature
- `full-page` - Capture full-page scrolling screenshots
- `mobile` - Use mobile viewport (375x667)
- `tablet` - Use tablet viewport (768x1024)
- `desktop` - Use desktop viewport (1920x1080, default)

### Examples

```bash
# Basic usage - screenshot dashboard with populated data
/screenshot dashboard

# Screenshot achievements page in empty state
/screenshot achievements empty

# Capture project creation flow with multiple views
/screenshot project-creation multiple-views

# Full-page screenshot of reports page
/screenshot reports full-page

# Mobile view of dashboard
/screenshot dashboard mobile

# Multiple screenshots across the entire app
/screenshot entire-app populated

# Terminal screenshot of bragdoc login command
/screenshot terminal:bragdoc-login

# Terminal screenshot of bragdoc extract with output
/screenshot terminal:bragdoc-extract

# Custom terminal command
/screenshot terminal:custom "Show npm run dev starting the server"
```

## What This Command Does

1. **Delegates to Screenshotter Agent**: Uses the Task tool to invoke the screenshotter agent with your request
2. **Interprets Parameters**: Converts your location and options into a detailed prompt for the agent
3. **Returns Results**: Provides you with paths to the captured screenshots and a summary

## Screenshot Output

**Web Application Screenshots** will be saved to:
```
./screenshots/[feature]-[state]-[timestamp].png
```

Examples:
- `./screenshots/dashboard-populated-2025-10-23-143022.png`
- `./screenshots/achievements-empty-state-2025-10-23-143045.png`
- `./screenshots/project-form-filled-2025-10-23-143102.png`

**Terminal Screenshots** will be saved to:
```
./screenshots/terminal/[command-name].png
```

Examples:
- `./screenshots/terminal/bragdoc-login.png`
- `./screenshots/terminal/bragdoc-extract.png`
- `./screenshots/terminal/bragdoc-repos-add.png`

## When to Use This Command

**Use `/screenshot` when you need:**
- Visual documentation for specs or plans
- Screenshots for marketing or presentations
- Before/after comparison images
- Visual examples of UI states (zero state, error state, success state)
- Reference images for documentation
- Quick visual inspection of a feature
- Terminal/CLI command examples for documentation
- Beautiful terminal screenshots for marketing materials
- CLI workflow demonstrations

**Don't use `/screenshot` for:**
- Functional testing (use `/run-integration-tests` instead)
- Debugging issues (invoke the web-app-tester agent directly)
- Code analysis (use read/grep tools)

## Implementation

This command constructs a detailed prompt for the Screenshotter agent based on your parameters and delegates the work using the Task tool. The agent handles all Playwright automation, navigation, and screenshot capture.

## Tips for Best Results

### Web Application Screenshots

1. **Be specific**: Instead of "get some screenshots", say "dashboard empty" or "achievements populated"
2. **Use options**: Specify empty vs populated to get the right visual context
3. **Request multiple views**: For complex flows, use `multiple-views` to capture different states
4. **Consider viewport**: Specify mobile/tablet/desktop for responsive design screenshots
5. **Full-page for long content**: Use `full-page` for pages with lots of scrollable content

### Terminal/CLI Screenshots

1. **Specify exact output**: Describe exactly what terminal output you want to show
2. **Plain text only**: Avoid requesting Unicode symbols (✓, ✗) - ask for "Successfully" or "[OK]" instead
3. **Crafted output is encouraged**: For documentation/marketing, fake output often looks better than real output
4. **Be precise**: The agent will create the exact output you specify using Write tool + termshot
5. **Multiple commands**: Request separate screenshots for each command in a workflow

**Example terminal screenshot requests:**
- "Show bragdoc login with successful authentication message"
- "Show bragdoc extract with output saying 'Found 42 commits, Extracted 8 achievements'"
- "Show bragdoc repos add with success confirmation"

## Return Format

After completion, you'll receive:
- List of screenshot file paths
- Brief description of what was captured
- Any notable observations (e.g., UI issues spotted)
- Suggested next steps if relevant
