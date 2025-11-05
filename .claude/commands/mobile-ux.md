---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [optional instructions]
description: Uses a mobile-sized viewport to test the app for mobile UX
---

# Mobile UX Testing

Test the BragDoc app on mobile viewports to identify UX issues, responsive design problems, and touch interaction concerns. Tests either the web app (http://ngrok.edspencer.net) or the marketing app (http://localhost:3101), depending on which you've been instructed. If no instruction is given, test the web app.

## Execution Process

### 1. Session Initialization

ALWAYS begin by:

1. Navigate to http://ngrok.edspencer.net/demo
2. Click the button to create a demo account
3. Wait for successful authentication before proceeding
4. Take a screenshot of the authenticated dashboard
5. Verify the mobile viewport is properly configured

### 2. Device Emulation

Test on multiple mobile devices to ensure broad compatibility. Playwright supports device emulation via the `browser_resize` command. Test on at least 2-3 of these target devices:

**Recommended Test Devices:**

- **iPhone 15 Pro** (393x852) - Latest iOS flagship
- **iPhone SE** (375x667) - Smaller iOS device
- **Samsung Galaxy S23** (360x800) - Android flagship
- **iPad Mini** (768x1024) - Tablet viewport
- **Pixel 7** (412x915) - Google Android device

To emulate a device, use:

```
browser_resize(width: 393, height: 852)  // iPhone 15 Pro
browser_resize(width: 375, height: 667)  // iPhone SE
browser_resize(width: 360, height: 800)  // Galaxy S23
```

### 3. Testing Guidelines

**Areas to Test:**

1. **Navigation & Menu**

   - Hamburger menu functionality
   - Mobile sidebar behavior
   - Bottom navigation (if present)
   - Touch target sizes (minimum 44x44px)

2. **Layout & Responsive Design**

   - Content reflow at different widths
   - Text readability and sizing
   - Image scaling and aspect ratios
   - Table/data grid responsiveness
   - Form layouts

3. **Touch Interactions**

   - Button tap areas
   - Swipe gestures (if applicable)
   - Form input focus behavior
   - Dropdown/select menus
   - Modal dialogs

4. **Typography & Readability**

   - Font sizes (minimum 16px for body text)
   - Line heights and spacing
   - Text contrast ratios
   - Long text wrapping

5. **Performance Indicators**
   - Page load time
   - Scroll performance
   - Animation smoothness
   - Console warnings/errors

**DO:**

- Test portrait and landscape orientations (where applicable)
- Navigate by tapping UI elements naturally
- Take screenshots showing issues clearly
- Check browser console for mobile-specific errors
- Test core user flows (login, create achievement, view reports, etc.)
- Verify touch targets are adequately sized
- Check for horizontal scrolling issues
- Take a screenshot and just look to see if it looks beautiful or if it's ugly and needs some work. Are buttons falling off the edge of their containers? Are text strings looking stupid/malformed? Does it look like the information layout is been rendered wrong?

**DO NOT:**

- Skip devices (unless specifically directed) - test at least 2 different viewport sizes
- Attempt to debug or fix issues found
- Make code changes
- Stop testing when issues are found - document and continue

### 4. Playwright MCP Usage

Use these Playwright MCP tools for mobile testing:

**Essential Commands:**

- `browser_navigate` - Navigate to pages
- `browser_resize` - Set mobile viewport dimensions
- `browser_snapshot` - Capture accessibility snapshots (shows layout structure)
- `browser_take_screenshot` - Take visual screenshots of issues
- `browser_click` - Tap elements (test touch targets)
- `browser_type` - Fill forms (test mobile keyboard interaction)
- `browser_console_messages` - Check for mobile-specific errors
- `browser_wait_for` - Wait for elements to load
- `browser_scroll` - Test scroll behavior (if available)

**Testing Pattern:**

```
1. browser_resize(width, height)  // Set device viewport
2. browser_navigate(url)           // Go to page
3. browser_snapshot()              // Check layout
4. browser_click(element)          // Test interactions
5. browser_take_screenshot()       // Capture issues
6. browser_console_messages()      // Check for errors
```

### 5. Report Generation

Document all findings in a clear, structured format:

**Important**: Playwright MCP saves screenshots to `.playwright-mcp/test/mobile/...` by default. After testing is complete, you MUST move the screenshots to the correct location:

1. Create a new test run directory: `./test/mobile/YYYY-MM-DD-N/` (where N is an index for multiple runs on the same day)
2. Create a `screenshots/` subdirectory inside the run directory
3. Move all screenshots from `.playwright-mcp/test/mobile/YYYY-MM-DD-N/screenshots/` to `./test/mobile/YYYY-MM-DD-N/screenshots/`
4. Save the REPORT.md in the run directory (`./test/mobile/YYYY-MM-DD-N/REPORT.md`)
5. Create a standalone index.html in the run directory that is a nicely styled version of the .md file with screenshot images rendered inline

**Example commands:**
```bash
# After testing completes, move screenshots to the correct location
mkdir -p ./test/mobile/2025-10-17-1/screenshots/
mv .playwright-mcp/test/mobile/2025-10-17-1/screenshots/* ./test/mobile/2025-10-17-1/screenshots/
```

```markdown
# Mobile UX Test Report

**Date**: [Current date]
**Tested By**: Claude Code (Mobile UX Tester)
**Environment**: http://ngrok.edspencer.net
**Devices Tested**: [List viewport sizes/devices]

---

## Executive Summary

- **Critical Issues**: [number]
- **Major Issues**: [number]
- **Minor Issues**: [number]
- **Overall Mobile UX**: GOOD | FAIR | POOR

---

## Issues Found

### Critical Issues

[Issues that break core functionality on mobile]

1. **Issue**: [Brief description]
   - **Device**: [Device/viewport where found]
   - **Location**: [Page/component]
   - **Steps to Reproduce**:
     1. [Step 1]
     2. [Step 2]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Screenshot**: [Reference]
   - **Impact**: [How this affects users]

### Major Issues

[Issues that significantly degrade UX]

[Same format as critical]

### Minor Issues

[Polish and enhancement opportunities]

[Same format as critical]

---

## Positive Findings

[List aspects of mobile UX that work well]

---

## Device-Specific Notes

### iPhone 15 Pro (393x852)

[Observations specific to this viewport]

### iPhone SE (375x667)

[Observations specific to this viewport]

### [Other devices tested]

[Observations]

---

## Console Errors/Warnings

[List any mobile-specific console messages]

---

## Screenshots

All screenshots saved to: `./test/mobile/YYYY-MM-DD-N/screenshots/`

1. `screenshot-001-[description].png` - [What it shows]
2. `screenshot-002-[description].png` - [What it shows]

---

## Recommendations

[High-level suggestions for improving mobile UX, prioritized by impact]

1. **High Priority**: [Recommendation]
2. **Medium Priority**: [Recommendation]
3. **Low Priority**: [Recommendation]

---

## Conclusion

[Summary of mobile UX state and key takeaways]
```

## Important Constraints

- **DO NOT debug issues** - only document them
- **DO NOT examine code** unless needed to understand behavior
- **DO NOT propose specific code fixes** - only high-level recommendations
- **DO test multiple viewport sizes** - at least 2-3 different devices
- **DO capture evidence** - screenshots showing the issue clearly
- **ALWAYS create demo account** at start of session
- **DO test core user flows** - not just individual pages

## Success Criteria

A successful mobile UX test means:

1. Tested on at least 2-3 different mobile viewport sizes
2. Core user flows tested (navigation, forms, data display)
3. Clear documentation of all issues found with screenshots
4. Console errors checked and documented
5. Both critical issues and positive findings noted
6. Recommendations provided for improvements

## Output
