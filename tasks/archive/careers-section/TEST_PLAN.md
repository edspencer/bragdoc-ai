# Test Plan: Careers Section Navigation

## Overview

This test plan covers the verification of the new Careers section in the side navigation, the removal of the Documents section, and the creation of two new coming-soon pages.

## Test Environment Setup

### Prerequisites
- Development server running (`pnpm dev`)
- Authenticated user session
- Test user with existing achievements (for testing other navigation items)

### Test Data Requirements
- At least one authenticated user account
- User should have some achievements to verify existing functionality remains intact

---

## Test Categories

### 1. Visual/UI Testing

#### 1.1 Sidebar Structure
- [ ] **Verify Careers section appears** in the sidebar navigation
- [ ] **Verify Careers section label** displays "Careers" correctly
- [ ] **Verify section positioning**: Careers appears after Projects section and before Account Settings
- [ ] **Verify Documents section is removed** - no longer appears in sidebar
- [ ] **Verify all four items** appear in Careers section:
  - [ ] Standup (with IconUsers)
  - [ ] For my manager (with IconUserCheck)
  - [ ] Performance Review (with appropriate icon)
  - [ ] Workstreams (with appropriate icon)

#### 1.2 Icon Display
- [ ] **All icons render correctly** for each Careers menu item
- [ ] **Icons are appropriately sized** and aligned with text
- [ ] **Icons match the design** of other navigation items

#### 1.3 Text and Labels
- [ ] **Menu item labels are correct**:
  - "Standup" (not "standup" or "Stand up")
  - "For my manager" (not "For My Manager")
  - "Performance Review"
  - "Workstreams"
- [ ] **Text is readable** and properly styled
- [ ] **Section header "Careers"** is styled consistently with other section headers

#### 1.4 Responsive Behavior
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

### 2. Navigation Functionality Testing

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

### 3. Coming Soon Pages Testing

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

### 4. Regression Testing

#### 4.1 Existing Navigation Items
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

- None at this time

---

## Test Results

(Fill in after testing)

**Test Date**: ___________
**Tested By**: ___________
**Build/Commit**: ___________

**Overall Result**: ⬜ PASS | ⬜ FAIL | ⬜ PASS WITH ISSUES

**Notes**:
