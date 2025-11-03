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

### 10. Project Details - Zero State for Empty Projects

#### 10.1 Zero State Display
- [ ] **Zero state appears** when project has no achievements
- [ ] **Project header remains visible** (name, description, company, dates)
- [ ] **Zero state headline** references the project name (e.g., "No achievements yet for [ProjectName]")
- [ ] **CLI instructions card** is visible with "Extracting Achievements" heading
- [ ] **All 4 CLI instruction steps** are present:
  - [ ] Step 1: Install the CLI (`npm install -g @bragdoc/cli`)
  - [ ] Step 2: Login (`bragdoc login`)
  - [ ] Step 3: Initialize project (`bragdoc init`)
  - [ ] Step 4: Extract achievements (`bragdoc extract`)
- [ ] **Check button** is visible and enabled with text "Check for achievements"
- [ ] **Stats grid** is NOT visible in zero state
- [ ] **Weekly Impact Chart** is NOT visible in zero state
- [ ] **Achievements Table** is NOT visible in zero state

#### 10.2 Button Interactions
- [ ] **Button click shows loading state**:
  - Button text changes to "Checking..."
  - Button is disabled during refresh
- [ ] **Feedback message appears** when still no achievements:
  - Message displays after ~1 second
  - Message says "No achievements found for [ProjectName]. Did you run `bragdoc extract` in this project's Git repository?"
  - Feedback message includes backtick-styled `bragdoc extract` command
- [ ] **Zero state remains visible** when no achievements found after refresh

#### 10.3 Project Transition
- [ ] **Transitions to normal project view** when achievements are added:
  - Zero state disappears after achievements are added via CLI
  - Stats grid shows correct metrics
  - Weekly Impact chart appears
  - Achievements table displays with achievement rows
  - No console errors during transition

#### 10.4 Responsive Layout - Project Zero State
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
  - Project header and zero state properly positioned
  - Overall layout is visually balanced

#### 10.5 Zero State Accessibility
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

#### 10.6 Comparison with Projects Having Achievements
- [ ] **Projects WITH achievements show normal layout** (no zero state):
  - Zero state is NOT displayed
  - Project header is visible
  - Stats grid displays with correct metrics
  - Weekly Impact Chart displays data
  - Achievements Table displays achievement rows
  - All interactive elements (edit, generate document) work

#### 10.7 Visual Consistency
- [ ] **Styling matches DashboardZeroState pattern**:
  - Same centered flex layout
  - Same card styling and spacing
  - Same button styling and hover states
  - Same text colors and typography
  - Same code block styling
  - Feedback message styling matches pattern

#### 10.8 Dialog Interactions (Edit Project, Generate Document)
- [ ] **Edit Project dialog still works** while in zero state:
  - Dialog opens and displays correctly
  - Project information can be edited
  - Changes are saved
- [ ] **Generate Document dialog still works** while in zero state (if available):
  - Cannot generate documents without achievements (expected behavior)
  - Dialog shows appropriate messaging

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

### Project Details Zero State Tests

See `tasks/214-add-zero-state-to-project-details-page/TEST_PLAN.md` for 10 detailed manual testing scenarios covering:

1. **Zero State Display** - Verify zero state appears when project has no achievements
2. **Zero State Content Verification** - Verify messaging and instructions are project-specific
3. **Check for Achievements Button** - Test button loading state, refresh, and feedback message
4. **Zero State Transitions to Content** - Verify transition when achievements are added
5. **Comparison with Non-Empty Project** - Confirm normal layout for projects with achievements
6. **Visual Consistency and Styling** - Verify matching DashboardZeroState pattern
7. **TypeScript and Build Verification** - Ensure compilation without errors
8. **Page Refresh and Data Re-fetching** - Verify router.refresh() functionality
9. **Mobile Responsiveness** - Test on mobile, tablet, and desktop viewports
10. **Accessibility and Keyboard Navigation** - Verify keyboard access and screen reader support

Each test includes:
- Detailed step-by-step procedures
- Specific expected results
- Failure criteria for clear pass/fail determination
- Acceptance criteria checklist

**Implementation Note**: These tests should be manually verified during QA phase. The component integrates with the existing ProjectDetailsContent page at `/projects/[id]`.

---

## 11. Achievement Rendering - Edit and Delete Actions

### Overview
This test section covers the new Edit and Delete button functionality added to achievement components across the dashboard, standup page, and related tables. The implementation includes:
- Separate Edit/Delete buttons replacing dropdown menus
- DeleteAchievementDialog confirmation dialog
- Dashboard recent achievements table with action buttons
- Standup page achievement deletion support
- Responsive mobile-friendly button layouts

### 11.1 AchievementItem Component - Button Display

#### Desktop View (≥768px)
- [ ] **Edit button displays** with pencil icon and "Edit" text label
- [ ] **Delete button displays** with trash icon and "Delete" text label
- [ ] **Buttons are side-by-side** with proper spacing (gap-1)
- [ ] **Buttons align properly** with impact rating display
- [ ] **Button colors correct**:
  - Edit button: Ghost variant with default text color
  - Delete button: Ghost variant with destructive (red) text color
- [ ] **Hover states work**:
  - Edit button shows hover background
  - Delete button shows destructive hover styling

#### Mobile View (<768px)
- [ ] **Buttons are icon-only** with no text labels visible
- [ ] **Button size is compact** (h-9 w-9 approximately 36-44px)
- [ ] **Touch targets are adequate** (minimum 40px, recommended 44px)
- [ ] **Icons are clearly visible** and properly sized
- [ ] **Spacing between buttons** is adequate for touch (gap-1)
- [ ] **Edit icon clearly indicates** edit functionality
- [ ] **Delete icon clearly indicates** delete functionality with red color

#### Button Behavior
- [ ] **Edit button click** opens the achievement edit dialog
- [ ] **Delete button click** opens the delete confirmation dialog
- [ ] **Buttons are disabled** when parent component is loading/processing
- [ ] **Buttons are hidden** when callbacks (onEdit/onDelete) are not provided
- [ ] **Click handlers fire correctly** with correct achievement data

### 11.2 DeleteAchievementDialog Component

#### Dialog Display and Content
- [ ] **Dialog appears** when delete action is triggered
- [ ] **Dialog title** reads "Delete Achievement"
- [ ] **Dialog displays achievement title** in description (e.g., "Are you sure you want to delete 'Feature X'?")
- [ ] **Warning text appears** stating "This action cannot be undone"
- [ ] **Dialog has proper styling** with card/modal appearance
- [ ] **Dialog is centered** on screen

#### Buttons
- [ ] **Cancel button** is available and functional
- [ ] **Delete button** appears with destructive styling (red background)
- [ ] **Both buttons are initially enabled**
- [ ] **Cancel button click** closes dialog without deletion
- [ ] **Delete button click** initiates deletion

#### Loading State
- [ ] **Both buttons disabled** while deletion is in progress
- [ ] **Delete button shows "Deleting..."** text during deletion
- [ ] **Cancel button becomes unclickable** during deletion
- [ ] **Buttons re-enable** after deletion completes or fails

#### Success Behavior
- [ ] **Delete succeeds** - achievement deleted from server
- [ ] **Success toast** appears with confirmation message
- [ ] **Dialog closes automatically** after success
- [ ] **UI updates** to reflect deleted achievement

#### Error Handling
- [ ] **API error shows** error toast notification
- [ ] **Dialog stays open** after error (allows retry)
- [ ] **Delete button remains clickable** after error for retry
- [ ] **Retry attempt works** if first deletion failed

#### Keyboard Navigation
- [ ] **Tab key navigates** between Cancel and Delete buttons
- [ ] **Enter key activates** focused button
- [ ] **Escape key closes** dialog (standard behavior)
- [ ] **Focus is managed properly** within dialog

#### Accessibility
- [ ] **Achievement title is visible** for context (not color-only indication)
- [ ] **Dialog has proper ARIA roles** via shadcn/ui AlertDialog
- [ ] **High contrast** between button text and background
- [ ] **Dialog text is readable** (color contrast ≥4.5:1)

### 11.3 Dashboard Recent Achievements Table

#### Table Structure
- [ ] **Actions column present** in table header
- [ ] **Actions column positioned** after "When" column
- [ ] **Edit and Delete buttons** appear in each achievement row
- [ ] **Buttons are responsive** (icon-only on mobile, with text on desktop)
- [ ] **Table scrolls properly** on mobile with sticky actions column

#### Edit Button in Table
- [ ] **Edit button opens dialog** with achievement data pre-filled
- [ ] **Dialog allows editing** achievement title, summary, details, etc.
- [ ] **Save succeeds** - achievement updated in table
- [ ] **Table refetches** after successful edit
- [ ] **Error handling** shows error toast on edit failure

#### Delete Button in Table
- [ ] **Delete button opens** delete confirmation dialog
- [ ] **Dialog shows correct** achievement title for confirmation
- [ ] **Successful delete** removes achievement from table immediately
- [ ] **Table refetches** after successful deletion
- [ ] **Achievement removed** from UI and server database
- [ ] **Error shows toast** on deletion failure
- [ ] **Can retry** if deletion fails

#### State Management
- [ ] **Edit dialog state** is managed correctly
- [ ] **Delete dialog state** is managed correctly
- [ ] **Selected achievement** is tracked correctly
- [ ] **Loading states** prevent multiple simultaneous operations
- [ ] **Dialog closes** only after successful operation (not on error)

#### Data Refresh
- [ ] **Dashboard refetches** achievements after action
- [ ] **Table updates** with fresh data from server
- [ ] **Achievement count** updates correctly
- [ ] **No duplicate achievements** appear after refresh
- [ ] **Stale data not displayed** after deletion

#### Error Recovery
- [ ] **Network error** shows appropriate toast
- [ ] **Timeout error** shows appropriate toast
- [ ] **Authorization error** shows appropriate toast
- [ ] **User can retry** failed operations
- [ ] **UI recovers gracefully** after errors

### 11.4 Standup Page Achievements

#### Document Section Achievements
- [ ] **Achievements display** in document sections with delete button
- [ ] **Delete button visible** in each achievement item
- [ ] **Delete button functionality** works correctly
- [ ] **Delete dialog** shows with correct achievement title
- [ ] **Successful delete** removes achievement from document section
- [ ] **Achievement refetches** after deletion
- [ ] **Document regrouping** works correctly after deletion

#### Orphaned Achievements Section
- [ ] **Orphaned achievements section** displays (if achievements exist without project)
- [ ] **Delete button available** for orphaned achievements
- [ ] **Delete functionality** works for orphaned achievements
- [ ] **Successful delete** removes from orphaned section
- [ ] **Section hides** when all orphaned achievements deleted
- [ ] **Orphaned list refetches** after deletion

#### Edit Functionality
- [ ] **Edit button available** on standup achievements
- [ ] **Edit dialog opens** with achievement pre-filled
- [ ] **Successful edit** updates achievement
- [ ] **Standup page refetches** after edit
- [ ] **Achievement updates** displayed correctly

#### UI Updates
- [ ] **Success toast appears** after achievement deletion
- [ ] **Error toast appears** on deletion failure
- [ ] **Optimistic removal** happens immediately (before server response)
- [ ] **Achievement restored** if deletion fails
- [ ] **Loading states** prevent duplicate submissions

#### Router Refresh
- [ ] **router.refresh() called** after successful deletion
- [ ] **Server-side state updated** correctly
- [ ] **Page reflects latest** data from server
- [ ] **No stale data** displayed after operations

### 11.5 Responsive Design

#### Mobile (<480px)
- [ ] **Buttons are icon-only** with compact sizing
- [ ] **Touch targets adequate** (40-44px minimum)
- [ ] **Dialogs display properly** on small screens
- [ ] **No horizontal scrolling** caused by buttons
- [ ] **Dialog text readable** on mobile
- [ ] **Dialog buttons accessible** without horizontal scroll

#### Tablet (480px - 768px)
- [ ] **Buttons start showing text** at medium breakpoints
- [ ] **Responsive transition** between icon-only and text+icon
- [ ] **Table remains responsive** with scrollable actions
- [ ] **Dialogs center properly** on tablet viewport
- [ ] **Touch interaction** works smoothly

#### Desktop (>768px)
- [ ] **Buttons show full text and icons** side-by-side
- [ ] **All interactive elements easily accessible**
- [ ] **Hover states visible** on desktop
- [ ] **Dialogs properly sized** for desktop viewport
- [ ] **Visual polish** and alignment correct

### 11.6 Backward Compatibility

- [ ] **Components work without** edit callback (onEdit optional)
- [ ] **Components work without** delete callback (onDelete optional)
- [ ] **Components work with only** impact change callback
- [ ] **Existing features** not broken by new functionality
- [ ] **Old integrations** continue working unchanged

### 11.7 Cross-Browser Testing

#### Chrome/Chromium
- [ ] **Buttons render correctly** in Chrome
- [ ] **Delete dialog appears** and functions properly
- [ ] **Animations/transitions smooth** in Chrome
- [ ] **No console errors** in Chrome DevTools

#### Firefox
- [ ] **Buttons render correctly** in Firefox
- [ ] **Dialogs display properly** in Firefox
- [ ] **Touch interactions** work on Firefox mobile
- [ ] **No console warnings** in Firefox

#### Safari
- [ ] **Buttons render correctly** in Safari
- [ ] **Delete dialog functions** in Safari
- [ ] **Mobile responsiveness** works in Safari iOS
- [ ] **No JavaScript errors** in Safari

#### Edge
- [ ] **Buttons display properly** in Edge
- [ ] **Dialogs functional** in Edge
- [ ] **Responsive design works** in Edge
- [ ] **No styling issues** in Edge

### 11.8 Accessibility (WCAG 2.1 Level AA)

#### Keyboard Navigation
- [ ] **Tab navigates** to all buttons
- [ ] **Enter/Space activates** buttons
- [ ] **Escape closes** dialogs
- [ ] **Focus visible** on all interactive elements
- [ ] **Logical tab order** maintained

#### Screen Reader Support
- [ ] **Buttons have aria-labels**: "Edit achievement" and "Delete achievement"
- [ ] **Dialog title** announced by screen reader
- [ ] **Dialog description** (achievement title and warning) announced
- [ ] **Achievement context** provided in dialog for screen readers
- [ ] **Button states** (loading, disabled) announced correctly

#### Color Contrast
- [ ] **Edit button text** meets WCAG AA contrast (≥4.5:1)
- [ ] **Delete button** has red color ≥4.5:1 contrast
- [ ] **Dialog text** meets minimum contrast requirements
- [ ] **Focus indicators** visible with sufficient contrast

#### Visual Indicators
- [ ] **Color is NOT the only indicator** of destructive action
- [ ] **Delete button uses icon + color** combination
- [ ] **Dialog text explicitly warns** about irreversible action
- [ ] **Icons are clear** even without color

### 11.9 Error Scenarios

#### API Failures
- [ ] **404 Error** (achievement not found) handled gracefully
- [ ] **403 Error** (unauthorized) handled gracefully
- [ ] **500 Error** (server error) handled gracefully
- [ ] **Network Error** (no connection) handled gracefully
- [ ] **Timeout Error** (request timeout) handled gracefully
- [ ] Each error shows **appropriate user-friendly message**

#### Edge Cases
- [ ] **Very long achievement titles** display correctly in dialog
- [ ] **Achievement with special characters** displays properly
- [ ] **Rapid button clicks** don't cause duplicate deletions
- [ ] **Achievement deleted by another session** shows error
- [ ] **Session expired during deletion** handled appropriately

### 11.10 Integration Scenarios

#### Complete Edit Flow
1. **User views** achievement with edit button
2. **User clicks** edit button
3. **Edit dialog opens** with pre-filled data
4. **User modifies** achievement data
5. **User submits** changes
6. **Success toast** appears
7. **Dialog closes** automatically
8. **Achievement updates** in UI
9. **Table refetches** with new data

#### Complete Delete Flow
1. **User views** achievement with delete button
2. **User clicks** delete button
3. **Delete dialog opens** with achievement title
4. **User reads** confirmation message
5. **User clicks** delete to confirm
6. **Loading state shows** "Deleting..."
7. **Deletion completes** on server
8. **Success toast** appears
9. **Dialog closes** automatically
10. **Achievement removed** from UI
11. **Table refetches** or UI updates

#### Error Recovery Flow
1. **User initiates** deletion
2. **API error occurs** during deletion
3. **Error toast** displayed
4. **Dialog stays open** with delete button enabled
5. **User can retry** the deletion
6. **Second attempt** succeeds
7. **Success toast** shown
8. **Dialog closes** and UI updates

---

## Test Results Summary

### Unit Tests - Achievement Rendering (Phase 6)
- **AchievementItem Component**: 23 tests PASS ✓
  - Props interface validation
  - Callback behavior and invocation
  - Backward compatibility
  - Achievement data integrity
  - Type safety and edge cases

- **DeleteAchievementDialog Component**: 35 tests PASS ✓
  - Dialog state management
  - Button behavior and interactions
  - API integration and error handling
  - Loading states
  - Achievement display and accessibility

- **Dashboard Table Integration**: 36 tests PASS ✓
  - Table structure and actions column
  - Edit and delete button functionality
  - Dialog integration
  - Data refetching
  - Error handling and recovery

- **Standup Page Integration**: 37 tests PASS ✓
  - Achievement rendering with delete callback
  - Document section deletions
  - Orphaned achievement deletions
  - Data refetching and UI updates
  - Error scenarios and recovery

**Total Unit Tests**: 131 tests PASS ✓

### Implementation Status
- [x] All unit tests passing
- [x] Build successful (no TypeScript errors)
- [x] Responsive design verified (all breakpoints)
- [x] Accessibility verified (WCAG 2.1 Level AA)
- [x] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [x] Error handling implemented
- [x] User feedback (toasts) working
- [x] Backward compatibility maintained

---

