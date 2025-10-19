---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write(test/REPORT.md)
argument-hint: [optional-instructions]
description: Run Integration tests from the test plan via Playwright hitting the live UI
---

# Run Integration Tests

If not given specific instructions otherwise, run all tests listed in `./test/integration/TEST-PLAN.md` systematically, using their Comprehensive Tests section. If given a more specific set of instructions, follow them instead.

Execute the test plan using Playwright automation. Systematically work through all tests defined in `./test/integration/TEST-PLAN.md`, document pass/fail status for each test, and generate a detailed report.

## Execution Process

### 1. Session Initialization

ALWAYS begin by:

1. Navigate to http://ngrok.edspencer.net/demo
2. Click the button to create a demo account
3. Wait for successful authentication before proceeding
4. Take a screenshot of the authenticated dashboard

ALWAYS finish by:

1. Logging out of the application (just navigate to /logout) - this will clear the database of cruft demo data

### 2. Test Execution

Work through ALL test sections in `./test/integration/TEST-PLAN.md` systematically. For each test:

- Execute the test steps using Playwright MCP tools
- Record PASS or FAIL status
- Take screenshots as evidence
- Note any console errors or warnings
- Do NOT attempt to debug failures - just document them

### 3. Testing Guidelines

**DO:**

- Navigate by clicking links and UI elements (not direct URLs except /demo)
- Take screenshots at key points
- Check browser console regularly
- Test systematically through all items
- Record exact error messages when failures occur
- Note visual issues or unexpected behavior

**DO NOT:**

- Skip tests or categories
- Attempt to debug or fix issues found
- Make code changes
- Stop testing when failures are found - continue through all tests
- Navigate to URLs directly (except initial /demo)

### 4. Playwright MCP Usage

Use Playwright MCP tools extensively:

- `browser_navigate` - Navigate to pages
- `browser_snapshot` - Capture accessibility snapshots (preferred for testing)
- `browser_take_screenshot` - Take visual screenshots
- `browser_click` - Click elements
- `browser_type` - Fill forms
- `browser_console_messages` - Check for errors
- `browser_wait_for` - Wait for elements or text

### 5. Report Generation and file saving

**Important**: Playwright MCP saves screenshots to `.playwright-mcp/test/runs/...` by default. After testing is complete, you MUST move the screenshots to the correct location:

1. Create a new test run directory: `./test/integration/runs/YYYY-MM-DD-N/` (where N is an index for multiple runs on the same day)
2. Create a `screenshots/` subdirectory inside the run directory
3. Move all screenshots from `.playwright-mcp/test/runs/YYYY-MM-DD-N/screenshots/` to `./test/integration/runs/YYYY-MM-DD-N/screenshots/`
4. Generate a comprehensive report at `./test/integration/runs/YYYY-MM-DD-N/REPORT.md`
5. Create a standalone index.html in the run directory that is a nicely styled version of the .md file with screenshot images rendered inline

**Example commands:**

```bash
# After testing completes, move screenshots to the correct location
mkdir -p ./test/integration/runs/2025-10-17-1/screenshots/
mv .playwright-mcp/test/runs/2025-10-17-1/screenshots/* ./test/integration/runs/2025-10-17-1/screenshots/
```

The report should have the following structure:

```markdown
# UI Test Execution Report

**Date**: [Current date]
**Tested By**: Claude Code (UI Test Runner)
**Environment**: http://ngrok.edspencer.net
**Browser**: Playwright Chromium

---

## Executive Summary

- **Total Tests**: [number]
- **Passed**: [number] ([percentage]%)
- **Failed**: [number] ([percentage]%)
- **Skipped**: [number] (if any)
- **Overall Status**: PASS | FAIL | PARTIAL

**Critical Issues Found**: [number]
**Major Issues Found**: [number]
**Minor Issues Found**: [number]

---

## Test Results by Category

### 1. Navigation - Sidebar

**Status**: PASS | FAIL | PARTIAL
**Tests Passed**: X/Y

#### 1.1 Sidebar Structure

- [x] Test name - PASS
- [ ] Test name - FAIL: [brief reason]
- [x] Test name - PASS

[Continue for each test...]

#### Screenshots

- `screenshot-001-sidebar-overview.png` - Sidebar structure
- `screenshot-002-careers-section.png` - Careers section detail

---

### 2. Navigation - Careers Section

[Same format as above]

---

### 3. Coming Soon Pages

[Same format as above]

---

[Continue for all categories...]

---

## Issues Found

### Critical Issues

[None found] OR:

1. **Issue**: [Brief description]
   - **Location**: [Where it occurs]
   - **Steps to Reproduce**: [Exact steps]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Evidence**: [Screenshot references, console errors]

### Major Issues

[Format same as critical]

### Minor Issues

[Format same as critical]

---

## Console Errors

[List all console errors found during testing with page context]

---

## Test Coverage

**Categories Completed**: X/7
**Individual Tests Completed**: X/Y

**Not Tested** (if any):

- [List any tests that couldn't be executed with reasons]

---

## Screenshots

All screenshots saved to: `./test/integration/runs/YYYY-MM-DD-N/screenshots/`

[List key screenshots with descriptions]

---

## Recommendations

[High-level recommendations for addressing failures, but no specific debugging or code changes]

---

## Conclusion

[Summary paragraph of overall test execution]
```

## Important Constraints

- **DO NOT debug issues** - only document them
- **DO NOT examine code** unless needed to understand what to test
- **DO NOT propose fixes** - only report findings
- **DO continue testing** even after failures
- **DO be thorough** - test every checkbox in the test plan
- **DO capture evidence** - screenshots and error messages
- **ALWAYS create demo account** at start of session
- **MOVE screenshots** from `.playwright-mcp/` to `./test/integration/runs/YYYY-MM-DD-N/screenshots/` after testing
- **SAVE report to ./test/integration/runs/YYYY-MM-DD-N/REPORT.md** when complete

## Success Criteria

A successful test run means:

1. All tests in TEST-PLAN.md were attempted
2. Clear PASS/FAIL status recorded for each test
3. Screenshots captured showing key states
4. Screenshots moved from `.playwright-mcp/` to `./test/integration/runs/YYYY-MM-DD-N/screenshots/`
5. Console errors documented
6. Comprehensive report generated at `./test/integration/runs/YYYY-MM-DD-N/REPORT.md`
7. Standalone HTML version of report created at `./test/integration/runs/YYYY-MM-DD-N/index.html`

The tests themselves may pass or fail - your job is to execute them all and report accurately, not to achieve 100% pass rate.
