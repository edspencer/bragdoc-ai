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

### 4. Existing Navigation Items (Regression)

#### 4.1 Main Navigation Links
- [ ] **Dashboard** link still works correctly
- [ ] **Achievements** link still works correctly
- [ ] **Companies** link still works correctly
- [ ] **Projects section** (expandable) still works correctly
- [ ] **Account Settings** link still works correctly
- [ ] **All existing icons** display correctly
- [ ] **User profile section** at bottom of sidebar still works

#### 4.2 Moved Items Still Function
- [ ] **Standup functionality** unchanged after moving to Careers section:
  - Standup page loads correctly
  - Standup creation/editing works
  - Standup data displays correctly
- [ ] **For my manager (Reports) functionality** unchanged after moving to Careers section:
  - Reports page loads correctly
  - Document listing displays
  - Document creation works
  - Document viewing/editing works

#### 4.3 Documents Page Still Works
- [ ] **Documents page** still accessible via direct URL (`/documents`)
- [ ] **Documents list** still displays correctly
- [ ] **Document creation** still works from Documents page
- [ ] **Document viewing/editing** still works
- [ ] **useDocuments hook** still functions correctly
- [ ] **API calls** to `/api/documents` still work

#### 4.4 Application Stability
- [ ] **No console errors** appear after changes
- [ ] **No console warnings** appear related to navigation
- [ ] **Application builds successfully** (`pnpm build`)
- [ ] **No TypeScript errors** in the build output
- [ ] **Hot reload** works during development
- [ ] **No broken imports** or missing dependencies

---

### 5. Authentication and Authorization

#### 5.1 Unauthenticated Users
- [ ] **Accessing /performance** when logged out → redirects to login
- [ ] **Accessing /workstreams** when logged out → redirects to login
- [ ] **Login redirect works** - after logging in, user can access the pages
- [ ] **Sidebar doesn't appear** when not logged in

#### 5.2 Authenticated Users
- [ ] **All Careers items visible** to authenticated users
- [ ] **All Careers pages accessible** to authenticated users
- [ ] **No permission errors** when accessing any page
- [ ] **User data loads correctly** on all pages

---

### 6. Cross-Browser Testing

Test the navigation changes in multiple browsers:

#### 6.1 Chrome/Edge (Chromium-based)
- [ ] **Sidebar renders correctly**
- [ ] **Navigation works**
- [ ] **No console errors**

#### 6.2 Firefox
- [ ] **Sidebar renders correctly**
- [ ] **Navigation works**
- [ ] **No console errors**

#### 6.3 Safari
- [ ] **Sidebar renders correctly**
- [ ] **Navigation works**
- [ ] **No console errors**

---

### 7. Accessibility Testing

#### 7.1 Keyboard Navigation
- [ ] **Tab key** navigates through Careers menu items in order
- [ ] **Enter key** activates navigation links
- [ ] **Focus indicators** are visible on keyboard navigation
- [ ] **Skip to main content** works (if implemented)

#### 7.2 Screen Reader Support
- [ ] **Section label "Careers"** is announced by screen reader
- [ ] **Each menu item** is announced with its correct name
- [ ] **Icons have appropriate alt text** or aria-labels if needed
- [ ] **Navigation landmarks** are properly structured

#### 7.3 Color Contrast
- [ ] **Text meets WCAG AA standards** for color contrast
- [ ] **Active state** has sufficient contrast
- [ ] **Icons are distinguishable** even without color

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

### Latest Test Run

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

- Dashboard widgets and charts
- Achievement creation, editing, and deletion workflows
- Project management functionality
- Company management functionality
- Document generation with AI
- Standup creation and editing
- Performance review generation (when implemented)
- Workstreams discovery (when implemented)
- Settings and preferences
- Data import/export functionality
- Email notifications
- Stripe payment integration
