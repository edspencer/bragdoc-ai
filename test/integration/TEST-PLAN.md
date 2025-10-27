# UI Test Plan

## Overview

This document contains the comprehensive UI test plan for the BragDoc application. It covers all user-facing features, navigation, visual elements, and user interactions.

## Test Environment Setup

### Prerequisites
- Development server running (`pnpm dev`)
- Authenticated user session
- Test user with existing data (achievements, projects, companies)
- Multiple browser environments for cross-browser testing

### Test Data Requirements
- At least one authenticated user account
- User should have some achievements (20+ for testing workstreams)
- At least one project
- At least one company
- Sample documents created

---

## Test Categories

### 1. Navigation - Sidebar

#### 1.1 Sidebar Structure
- [ ] **Careers section appears** in the sidebar navigation
- [ ] **Careers section label** displays "Careers" correctly
- [ ] **Section positioning**: Careers appears after Projects section and before Account Settings
- [ ] **Documents section is removed** - no longer appears in sidebar
- [ ] **All navigation sections render** in correct order:
  - Dashboard
  - Achievements
  - Companies
  - Projects (expandable)
  - Careers
  - Account Settings

#### 1.2 Careers Section Items
- [ ] **All four items appear** in Careers section:
  - [ ] Standup (with IconUsers)
  - [ ] For my manager (with IconUserCheck)
  - [ ] Performance Review (with appropriate icon)
  - [ ] Workstreams (with appropriate icon)

#### 1.3 Icon Display
- [ ] **All icons render correctly** for each menu item
- [ ] **Icons are appropriately sized** and aligned with text
- [ ] **Icons match the design** of other navigation items

#### 1.4 Text and Labels
- [ ] **Menu item labels are correct**:
  - "Standup" (not "standup" or "Stand up")
  - "For my manager" (not "For My Manager")
  - "Performance Review"
  - "Workstreams"
- [ ] **Text is readable** and properly styled
- [ ] **Section header "Careers"** is styled consistently with other section headers

#### 1.5 Responsive Behavior
- [ ] **Desktop view** (>768px width):
  - Sidebar is fully expanded by default
  - All text labels visible
  - Icons and text properly aligned
- [ ] **Tablet view** (768px width):
  - Sidebar behavior is consistent
  - Navigation items remain accessible
- [ ] **Mobile view** (<640px width):
  - Sidebar collapses to hamburger menu
  - Careers section accessible in mobile menu
  - All four items visible when menu is open
- [ ] **Collapsed sidebar** (if sidebar has collapse feature):
  - Icons still visible
  - Tooltips show on hover
  - Section expands when clicked

---

### 2. Navigation - Careers Section

#### 2.1 Link Navigation
- [ ] **Standup link** (`/standup`):
  - Clicking navigates to Standup page
  - Standup page renders correctly
  - Page title shows "Standup"
  - No console errors
- [ ] **For my manager link** (`/reports`):
  - Clicking navigates to Reports page
  - Reports page renders correctly
  - Page title shows appropriate title
  - No console errors
- [ ] **Performance Review link** (`/performance`):
  - Clicking navigates to Performance page
  - Coming soon message displays
  - Page content matches specification
  - No console errors
- [ ] **Workstreams link** (`/workstreams`):
  - Clicking navigates to Workstreams page
  - Coming soon message displays with detailed description
  - Page content matches specification
  - No console errors

#### 2.2 Active State Highlighting
- [ ] **Current page highlighted** when on Standup page
- [ ] **Current page highlighted** when on Reports page
- [ ] **Current page highlighted** when on Performance page
- [ ] **Current page highlighted** when on Workstreams page
- [ ] **Highlighting style** matches other navigation items (background color, text color)

#### 2.3 Browser Navigation
- [ ] **Back button works** after navigating to each Careers page
- [ ] **Forward button works** when navigating back
- [ ] **Direct URL access** works for all four pages:
  - Type `/standup` in address bar → loads correctly
  - Type `/reports` in address bar → loads correctly
  - Type `/performance` in address bar → loads correctly
  - Type `/workstreams` in address bar → loads correctly
- [ ] **Page refresh** maintains correct page state

---

### 3. Coming Soon Pages

#### 3.1 Performance Review Page
- [ ] **Page loads successfully** at `/performance`
- [ ] **Heading displays** "Performance Review"
- [ ] **Description is clear** about the coming soon status
- [ ] **Text content** explains what the feature will do
- [ ] **Layout is centered** and visually appealing
- [ ] **SiteHeader appears** at the top of the page
- [ ] **Page uses AppPage wrapper** for consistent layout
- [ ] **Authentication required** - redirects to login if not authenticated

#### 3.2 Workstreams Page
- [ ] **Page loads successfully** at `/workstreams`
- [ ] **Heading displays** "Workstreams"
- [ ] **Main description** explains the feature clearly
- [ ] **Detailed description** includes:
  - Explanation of automatic grouping
  - Example workstreams mentioned
  - Benefits listed (pattern recognition, time analysis, etc.)
  - Minimum achievement requirement (20 achievements) mentioned
- [ ] **Layout is centered** and visually appealing
- [ ] **Content is well-formatted** with proper spacing
- [ ] **List items render correctly** (bullet points for features)
- [ ] **SiteHeader appears** at the top of the page
- [ ] **Page uses AppPage wrapper** for consistent layout
- [ ] **Authentication required** - redirects to login if not authenticated

---

### 4. Dashboard - Zero State for New Users

#### 4.1 Zero State Display
- [ ] **Zero state appears** when user has no achievements
- [ ] **Welcome message** "Welcome to BragDoc!" is displayed
- [ ] **CLI instructions card** is visible with "Getting Started" heading
- [ ] **All 4 CLI instruction steps** are present:
  - [ ] Step 1: Install the CLI (`npm install -g @bragdoc/cli`)
  - [ ] Step 2: Login (`bragdoc login`)
  - [ ] Step 3: Initialize repository (`bragdoc init`)
  - [ ] Step 4: Extract achievements (`bragdoc extract`)
- [ ] **Check button** is visible and enabled with text "I've run the CLI - Check for achievements"
- [ ] **Stats cards** show 0 values for all metrics
- [ ] **Normal dashboard content** (charts, activity stream) is NOT visible in zero state

#### 4.2 Button Interactions
- [ ] **Button click shows loading state**:
  - Button text changes to "Checking..."
  - Button is disabled during refresh
- [ ] **Feedback message appears** when still no achievements:
  - Message displays after ~1 second
  - Message says "No achievements yet. Did you run `bragdoc extract`?"
  - Feedback message mentions `bragdoc extract` command
- [ ] **Zero state remains visible** when no achievements found after refresh

#### 4.3 Dashboard Transition
- [ ] **Transitions to normal dashboard** when achievements are added:
  - Zero state disappears after creating achievement
  - Normal dashboard content (charts, activity) appears
  - AchievementStats shows correct count (1+)
  - Weekly Impact chart is visible
  - Activity stream is visible
  - No console errors during transition

#### 4.4 Responsive Layout - Zero State
- [ ] **Mobile viewport** (375px width):
  - Zero state container is centered
  - CLI instructions card fits viewport
  - Code blocks don't overflow
  - Button is appropriately sized and clickable
  - Padding is appropriate for small screens
- [ ] **Tablet viewport** (768px width):
  - Zero state container is centered
  - Layout uses max-width constraint
  - Content is well-spaced and readable
  - Button is centered below instructions
- [ ] **Desktop viewport** (1920px width):
  - Zero state has max-width constraint (~672px for max-w-2xl)
  - Content is horizontally centered on large screens
  - Vertical positioning is appropriate (not stuck at top)
  - Stats cards display correctly above zero state
  - Overall layout is visually balanced

#### 4.5 Zero State Accessibility
- [ ] **Keyboard navigation works**:
  - Button is reachable via Tab key
  - Button has visible focus indicator
  - Enter key triggers button click
  - Space key triggers button click
  - Tab order is logical
- [ ] **No console errors** during zero state usage:
  - No JavaScript errors in console
  - No page errors (uncaught exceptions)
  - No React warnings (hydration mismatches)
  - No network errors (failed requests)

---

### 5. Existing Navigation Items (Regression)

#### 5.1 Main Navigation Links
- [ ] **Dashboard** link still works correctly
- [ ] **Achievements** link still works correctly
- [ ] **Companies** link still works correctly
- [ ] **Projects section** (expandable) still works correctly
- [ ] **Account Settings** link still works correctly
- [ ] **All existing icons** display correctly
- [ ] **User profile section** at bottom of sidebar still works

#### 5.2 Moved Items Still Function
- [ ] **Standup functionality** unchanged after moving to Careers section:
  - Standup page loads correctly
  - Standup creation/editing works
  - Standup data displays correctly
- [ ] **For my manager (Reports) functionality** unchanged after moving to Careers section:
  - Reports page loads correctly
  - Document listing displays
  - Document creation works
  - Document viewing/editing works

#### 5.3 Documents Page Still Works
- [ ] **Documents page** still accessible via direct URL (`/documents`)
- [ ] **Documents list** still displays correctly
- [ ] **Document creation** still works from Documents page
- [ ] **Document viewing/editing** still works
- [ ] **useDocuments hook** still functions correctly
- [ ] **API calls** to `/api/documents` still work

#### 5.4 Application Stability
- [ ] **No console errors** appear after changes
- [ ] **No console warnings** appear related to navigation
- [ ] **Application builds successfully** (`pnpm build`)
- [ ] **No TypeScript errors** in the build output
- [ ] **Hot reload** works during development
- [ ] **No broken imports** or missing dependencies

---

### 6. Authentication and Authorization

#### 6.1 Unauthenticated Users
- [ ] **Accessing /performance** when logged out → redirects to login
- [ ] **Accessing /workstreams** when logged out → redirects to login
- [ ] **Login redirect works** - after logging in, user can access the pages
- [ ] **Sidebar doesn't appear** when not logged in

#### 6.2 Authenticated Users
- [ ] **All Careers items visible** to authenticated users
- [ ] **All Careers pages accessible** to authenticated users
- [ ] **No permission errors** when accessing any page
- [ ] **User data loads correctly** on all pages

---

### 7. Cross-Browser Testing

Test the navigation changes in multiple browsers:

#### 7.1 Chrome/Edge (Chromium-based)
- [ ] **Sidebar renders correctly**
- [ ] **Navigation works**
- [ ] **No console errors**

#### 7.2 Firefox
- [ ] **Sidebar renders correctly**
- [ ] **Navigation works**
- [ ] **No console errors**

#### 7.3 Safari
- [ ] **Sidebar renders correctly**
- [ ] **Navigation works**
- [ ] **No console errors**

---

### 8. Accessibility Testing

#### 8.1 Keyboard Navigation
- [ ] **Tab key** navigates through Careers menu items in order
- [ ] **Enter key** activates navigation links
- [ ] **Focus indicators** are visible on keyboard navigation
- [ ] **Skip to main content** works (if implemented)

#### 8.2 Screen Reader Support
- [ ] **Section label "Careers"** is announced by screen reader
- [ ] **Each menu item** is announced with its correct name
- [ ] **Icons have appropriate alt text** or aria-labels if needed
- [ ] **Navigation landmarks** are properly structured

#### 8.3 Color Contrast
- [ ] **Text meets WCAG AA standards** for color contrast
- [ ] **Active state** has sufficient contrast
- [ ] **Icons are distinguishable** even without color

---

### 9. Generate Document Dialog

#### 9.1 Dialog Opening and Display
- [ ] **Dialog opens from Achievements page**:
  - Select achievements with checkboxes
  - Click "Generate Document" button
  - Dialog appears with correct achievement count
  - Dialog title is "Generate Document"
  - Dialog description shows count: "Generate a document from X selected achievements"
  - All 4 document types are displayed (Standup, Weekly Summary, Summary, Custom)
  - No console errors on dialog open
- [ ] **Dialog opens from Project Details page**:
  - Navigate to a project page
  - Select achievements from project
  - Click "Generate Document" button
  - Dialog behaves identically to Achievements page

#### 9.2 Document Type Selection
- [ ] **All document types displayed correctly**:
  - Standup card with icon and description
  - Weekly Summary card with icon and description
  - Summary card with icon and description
  - Custom card with icon and description
- [ ] **Type selection behavior**:
  - Clicking a type card selects it (blue ring appears)
  - Only one type can be selected at a time
  - Selected type can be changed before generation
  - Generate button is disabled until a type is selected
  - Generate button becomes enabled after type selection
  - Type cards show hover effect when not generating

#### 9.3 Prompt Editing
- [ ] **Default prompt appears** when type is selected
- [ ] **Prompt textarea is editable** before generation
- [ ] **Prompt content is appropriate** for selected document type
- [ ] **Prompt can be customized** and changes are saved
- [ ] **Standup prompt format** includes "What I Did" and "Impact" sections
- [ ] **Custom type** allows completely custom prompt

#### 9.4 Generation Process
- [ ] **Generate button behavior**:
  - Disabled when no type selected
  - Enabled when type selected
  - Shows loading state during generation (spinner icon)
  - Button text changes to "Generating..."
  - Button is disabled during generation
- [ ] **Loading state feedback**:
  - Dialog description updates to progress message
  - Progress message includes achievement count
  - Progress message includes time estimate (10-30 seconds)
  - Type selection cards show reduced opacity (50%)
  - Type cards become non-interactive during generation
  - Prompt textarea is disabled during generation
  - Cancel button is disabled during generation
- [ ] **Dialog interaction during generation**:
  - ESC key does not close dialog
  - Clicking outside dialog does not close it
  - Dialog remains open until generation completes
  - All controls return to normal after generation

#### 9.5 API Integration
- [ ] **Correct endpoint called**: `POST /api/documents/generate`
- [ ] **Request payload format correct**:
  - `achievementIds`: array of UUIDs
  - `type`: backend enum value (weekly_report, monthly_report, custom_report)
  - `title`: auto-generated title with date
  - `userInstructions`: prompt from textarea
- [ ] **Type mapping correct**:
  - Frontend "standup" → Backend "weekly_report"
  - Frontend "weekly" → Backend "weekly_report"
  - Frontend "summary" → Backend "monthly_report"
  - Frontend "custom" → Backend "custom_report"
- [ ] **Response handling**:
  - 200 response → success flow
  - Document object includes id, title, content, type, createdAt
  - Success toast appears with message
  - Dialog closes automatically after success

#### 9.6 Post-Generation Flow
- [ ] **Automatic redirect** to `/reports` page after success
- [ ] **New document appears** at top of reports list
- [ ] **Document title format correct**: "[Type] - [Month DD, YYYY]"
- [ ] **Document shows creation timestamp**
- [ ] **Document is immediately accessible/viewable**
- [ ] **Reports page loads without errors**

#### 9.7 Error Handling
- [ ] **Validation errors**:
  - Toast appears if no type selected
  - Toast message: "Please select a document type"
  - Toast appears if prompt is empty
  - Toast message: "Please provide a prompt"
- [ ] **Network errors** (test with offline mode):
  - Error toast appears
  - Error message is user-friendly
  - Dialog remains open for retry
  - Generate button re-enabled after error
- [ ] **Authentication errors** (401):
  - Error message: "You must be logged in to generate documents"
  - User prompted to log in
- [ ] **Server errors** (500):
  - Error message: "Failed to generate document"
  - Dialog remains open for retry

#### 9.8 Performance
- [ ] **Dialog opens quickly** (< 100ms)
- [ ] **Type selection is responsive** (< 50ms)
- [ ] **Generation completes within expected time** (10-30 seconds)
- [ ] **Redirect after generation is fast** (< 500ms)
- [ ] **Reports page loads quickly** after redirect (< 1 second)
- [ ] **No performance degradation** with many achievements selected

#### 9.9 Browser Console
- [ ] **No JavaScript errors** during dialog open
- [ ] **No React warnings** during type selection
- [ ] **No console errors** during generation
- [ ] **API call visible** in Network tab with correct payload
- [ ] **No memory leaks** after multiple generations

#### 9.10 Accessibility - Generate Dialog
- [ ] **Keyboard navigation works**:
  - Tab key moves between type cards
  - Enter key selects type
  - Tab reaches textarea for prompt editing
  - Tab reaches Cancel and Generate buttons
  - Enter on Generate button starts generation
  - All elements have visible focus indicators
- [ ] **Screen reader support**:
  - Dialog title announced
  - Achievement count announced
  - Type cards have descriptive labels
  - Loading state changes announced
  - Success/error messages announced

#### 9.11 Edge Cases
- [ ] **1 achievement selected** - Dialog handles singular correctly
- [ ] **Many achievements selected** (50+) - Generation works
- [ ] **Rapid clicking Generate button** - Prevented by disabled state
- [ ] **Changing type during generation** - Prevented (cards disabled)
- [ ] **Browser back button during generation** - Handled gracefully
- [ ] **Page refresh during generation** - No corruption

---

## Test Execution Checklist

### Before Testing
- [ ] Pull latest code changes
- [ ] Run `pnpm install` to ensure dependencies are up to date
- [ ] Start development server (`pnpm dev`)
- [ ] Clear browser cache
- [ ] Have test user account ready

### During Testing
- [ ] Document any bugs found with screenshots
- [ ] Note any unexpected behavior
- [ ] Record browser console errors
- [ ] Test in incognito/private mode to avoid cache issues

### After Testing
- [ ] Review all test results
- [ ] File bugs for any failures
- [ ] Verify critical path works end-to-end
- [ ] Sign off on successful test completion

---

## Success Criteria

All tests must pass for the feature to be considered complete and ready for deployment:

- ✅ All Visual/UI tests pass
- ✅ All Navigation functionality tests pass
- ✅ All Coming Soon pages tests pass
- ✅ All Regression tests pass
- ✅ All Authentication tests pass
- ✅ At least one browser from each category passes Cross-browser tests
- ✅ All critical Accessibility tests pass (keyboard navigation and screen reader)

---

## Known Issues / Limitations

(Document any known issues or limitations discovered during testing)

- Minor avatar 404 error for demo accounts (visual only, non-blocking)

---

## Test Results

### Latest Test Run: Generate Document Dialog

**Test Date**: 2025-10-27
**Tested By**: web-app-tester agent (Automated Playwright)
**Feature**: Generate Document Dialog Integration Fix
**Environment**: Local development (http://localhost:3000)
**Browser**: Chromium

**Overall Result**: ✅ PASS - ALL TESTS PASSED

**Summary**:
- ✅ All 10 test categories passed (see section 9 above)
- ✅ Correct API integration with `/api/documents/generate`
- ✅ Proper request payload format matching backend schema
- ✅ All document types selectable and functional
- ✅ Loading states provide clear user feedback
- ✅ Dialog interactions properly controlled during generation
- ✅ Successful redirect to reports page after generation
- ✅ No JavaScript errors or console warnings
- ✅ Performance within expected ranges (generation: 10-20 seconds)
- ✅ Works from both Achievements page and Project Details page

**Issues Found**: None - No blocking issues

**Details**: See `tasks/gen-document/TEST_RESULTS.md` for full test report with screenshots.

**Production Status**: ✅ APPROVED FOR PRODUCTION

---

### Previous Test Run: Careers Section Navigation

**Test Date**: 2025-10-17
**Tested By**: Claude Code (QA Testing Agent)
**Build/Commit**: e9db94b (Careers section implementation)
**Feature**: Careers Section Navigation

**Overall Result**: ✅ PASS

**Summary**:
- All critical tests passed
- Navigation works correctly for all 4 Careers items
- Coming soon pages display appropriate content
- No regressions found in existing functionality
- One minor non-blocking issue (avatar 404 for demo accounts)

**Details**: See `tasks/archive/careers-section/TEST_PLAN.md` for full test report.

---

## Future Test Areas

As new features are added, expand this test plan to include:

- Dashboard widgets and charts (normal state with achievements)
- Achievement creation, editing, and deletion workflows
- Project management functionality
- Company management functionality
- Standup creation and editing
- Performance review generation (when implemented)
- Workstreams discovery (when implemented)
- Settings and preferences
- Data import/export functionality
- Email notifications
- Stripe payment integration
- Document viewing and editing interface
- Document sharing and export features

---

## Playwright Automated Test Scenarios

Detailed Playwright test scenarios with TypeScript code examples are available in feature-specific test plans:

### Dashboard Zero State Tests

See `tasks/dashboard-zero-state/TEST_PLAN.md` for 8 detailed Playwright test scenarios covering:

1. **Zero State Display** (`dashboard-zero-state-displays`) - Verify zero state appears when user has no achievements
2. **Button Loading State** (`dashboard-zero-state-button-loading`) - Test button shows loading state and triggers refresh
3. **Feedback Message** (`dashboard-zero-state-feedback-message`) - Verify feedback message when still no achievements
4. **Dashboard Transition** (`dashboard-zero-state-transition`) - Test transition from zero state to normal dashboard
5. **Mobile Responsive** (`dashboard-zero-state-responsive-mobile`) - Verify mobile viewport layout (375px)
6. **Desktop Responsive** (`dashboard-zero-state-responsive-desktop`) - Verify desktop viewport with max-width constraint (1920px)
7. **Accessibility** (`dashboard-zero-state-accessibility`) - Test keyboard navigation and a11y compliance
8. **Console Errors** (`dashboard-zero-state-no-console-errors`) - Verify no errors during interactions

Each test includes:
- Full TypeScript test code with Playwright syntax
- Step-by-step test flow
- Expected results
- Prerequisites and setup requirements

**Implementation Note**: These tests should be integrated into `__tests__/e2e/dashboard-zero-state.spec.ts` with appropriate helper functions for login, auth token retrieval, and accessibility testing.
