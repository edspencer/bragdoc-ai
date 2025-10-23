---
allowed-tools: Task
argument-hint: [location] [options]
description: Capture high-quality screenshots of the BragDoc application
---

# Capture Application Screenshots

This command delegates to the Screenshotter agent to capture professional-quality screenshots of the BragDoc web application.

## Usage

```bash
/screenshot [location] [options]
```

### Parameters

**$1 - Location/Feature** (required):
The specific page, feature, or section to screenshot. Examples:
- `dashboard` - Main dashboard page
- `achievements` - Achievements list page
- `projects` - Projects page
- `reports` - Reports/For My Manager page
- `companies` - Companies page
- `achievement-form` - Achievement creation form
- `project-creation` - Project creation flow
- `entire-app` - Multiple key pages across the app

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
```

## What This Command Does

1. **Delegates to Screenshotter Agent**: Uses the Task tool to invoke the screenshotter agent with your request
2. **Interprets Parameters**: Converts your location and options into a detailed prompt for the agent
3. **Returns Results**: Provides you with paths to the captured screenshots and a summary

## Screenshot Output

Screenshots will be saved to:
```
./screenshots/[feature]-[state]-[timestamp].png
```

Examples:
- `./screenshots/dashboard-populated-2025-10-23-143022.png`
- `./screenshots/achievements-empty-state-2025-10-23-143045.png`
- `./screenshots/project-form-filled-2025-10-23-143102.png`

## When to Use This Command

**Use `/screenshot` when you need:**
- Visual documentation for specs or plans
- Screenshots for marketing or presentations
- Before/after comparison images
- Visual examples of UI states (zero state, error state, success state)
- Reference images for documentation
- Quick visual inspection of a feature

**Don't use `/screenshot` for:**
- Functional testing (use `/run-integration-tests` instead)
- Debugging issues (invoke the web-app-tester agent directly)
- Code analysis (use read/grep tools)

## Implementation

This command constructs a detailed prompt for the Screenshotter agent based on your parameters and delegates the work using the Task tool. The agent handles all Playwright automation, navigation, and screenshot capture.

## Tips for Best Results

1. **Be specific**: Instead of "get some screenshots", say "dashboard empty" or "achievements populated"
2. **Use options**: Specify empty vs populated to get the right visual context
3. **Request multiple views**: For complex flows, use `multiple-views` to capture different states
4. **Consider viewport**: Specify mobile/tablet/desktop for responsive design screenshots
5. **Full-page for long content**: Use `full-page` for pages with lots of scrollable content

## Return Format

After completion, you'll receive:
- List of screenshot file paths
- Brief description of what was captured
- Any notable observations (e.g., UI issues spotted)
- Suggested next steps if relevant
