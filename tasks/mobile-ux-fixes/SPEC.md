# Task: Fix Mobile UX Issues

## Overview

Fix two major mobile UX issues discovered during comprehensive mobile testing on October 17, 2025. These issues significantly impact the mobile user experience and prevent users from accessing important functionality.

## Background

During systematic mobile UX testing using iPhone 15 Pro viewport (393x852), two major issues were identified that affect core functionality on mobile devices:

1. **Button overflow on the Reports page** prevents users from accessing Monthly and Custom report creation options
2. **Text truncation in achievement cards** makes it difficult to scan and identify achievements

These issues were documented in the mobile test report at `/Users/ed/Code/brag-ai/test/mobile/2025-10-17-1/REPORT.md` with supporting screenshots in `/Users/ed/Code/brag-ai/test/mobile/2025-10-17-1/screenshots/`.

The overall mobile experience was rated as "GOOD" with no critical issues, but these two major issues need to be addressed to improve polish and usability.

### Background Reading

- **Test Report**: `/Users/ed/Code/brag-ai/test/mobile/2025-10-17-1/REPORT.md`
- **Screenshots**: `/Users/ed/Code/brag-ai/test/mobile/2025-10-17-1/screenshots/`
  - `007-reports-page.png` - Shows button overflow issue
  - `006-achievements-table-scrolled.png` - Shows text truncation issue
- **Reports Page Component**: `/Users/ed/Code/brag-ai/apps/web/app/(app)/reports/page.tsx`
- **Achievements Components**: `/Users/ed/Code/brag-ai/apps/web/components/achievements/`

## Specific Requirements

### 1. Fix Button Overflow on Reports Page

**Location**: `/apps/web/app/(app)/reports/page.tsx`

**Current Behavior**:
- On mobile (393px width), the button group containing "New Document", "Weekly", "Monthly", and "Custom" buttons overflows horizontally
- Only "New Document" and part of "Weekly" are visible
- "Monthly" and "Custom" buttons are cut off
- Users cannot access these options without horizontal scrolling (which may not be obvious)

**Expected Behavior**:
- All action buttons should be visible and accessible on mobile viewports
- No horizontal scrolling required
- Buttons should maintain adequate touch target sizes (minimum 44x44px)

**Suggested Solutions** (choose the most appropriate):
1. **Wrap buttons to multiple rows** on mobile using Tailwind's flex-wrap
2. **Stack buttons vertically** on mobile using responsive flex-direction
3. **Use a dropdown menu** for action buttons on mobile (Button + DropdownMenu pattern)
4. **Reduce button sizes/padding** while maintaining touch targets
5. **Use compact button labels** on mobile (e.g., icons with labels or abbreviated text)

**Acceptance Criteria**:
- All four buttons ("New Document", "Weekly", "Monthly", "Custom") are fully visible on iPhone 15 Pro viewport (393x852)
- No horizontal scrolling required to access any button
- Touch targets remain at least 44x44px for accessibility
- Layout works gracefully from 320px (iPhone SE) to 768px (tablet) viewports
- Desktop layout remains unchanged
- Visual hierarchy remains clear (primary vs secondary actions)

### 2. Fix Text Truncation in Achievement Cards

**Location**: `/apps/web/components/achievements/` (achievement card/table components)

**Current Behavior**:
- Long achievement titles are truncated with ellipsis on mobile
- Examples from test:
  - "Removed Document Versioning to Sim..."
  - "Integrated Canvas Editing UX from Ve..."
- Makes it difficult to scan and identify achievements without clicking through

**Expected Behavior**:
- Achievement titles should be readable enough to identify the achievement
- Titles should wrap to 2-3 lines before truncating (if needed)
- Users should be able to scan their achievements list without clicking into each one

**Suggested Solutions** (choose the most appropriate):
1. **Allow title wrapping** to 2-3 lines using `line-clamp-2` or `line-clamp-3`
2. **Increase card height** on mobile to accommodate longer titles
3. **Use a tooltip** on hover/tap to show full title
4. **Add expandable cards** with a "Show More" button for truncated content
5. **Adjust typography** (font-size, line-height) for better space utilization

**Acceptance Criteria**:
- Achievement titles wrap to at least 2 lines before truncating
- Card layout remains clean and scannable
- No significant increase in vertical scroll length (shouldn't add more than 20% to page height)
- Works gracefully across mobile viewports (320px to 768px)
- Desktop layout remains unchanged or improved
- Performance is not impacted (no layout shift issues)

## Technical Context

### Reports Page Structure
The Reports page likely has a button group in the header/toolbar area. Based on BragDoc patterns:
- Uses shadcn/ui Button components
- Tailwind CSS for responsive layouts
- May use Flex or Grid for button layout
- Should follow mobile-first responsive design

### Achievement Cards Structure
Achievement cards are part of the responsive table pattern:
- Desktop: Table view with columns
- Mobile: Card-based layout (as mentioned in test report: "The achievements table intelligently switches to a card-based layout on mobile")
- Uses Tailwind utilities for text truncation (`truncate`, `line-clamp-*`)
- Likely in a map/loop rendering multiple cards

### Responsive Patterns in BragDoc
According to CLAUDE.md:
- Mobile-first design with Tailwind breakpoints
- Use `cn()` helper for conditional classes
- Tailwind spacing scale (p-4, mt-2, etc.)
- Component composition over prop drilling

### Relevant Tailwind Classes
- `flex-wrap` - Allow flex items to wrap
- `flex-col sm:flex-row` - Vertical on mobile, horizontal on larger screens
- `line-clamp-2`, `line-clamp-3` - Limit text to 2-3 lines with ellipsis
- `space-y-2` - Vertical spacing between stacked items
- `min-h-[44px]` - Ensure minimum touch target sizes

## Testing Requirements

After implementing fixes:

1. **Visual Testing**:
   - Test on iPhone 15 Pro viewport (393x852)
   - Test on iPhone SE viewport (320x568) - smallest common mobile size
   - Test on iPad Mini viewport (768x1024)
   - Verify desktop layouts remain unchanged

2. **Functional Testing**:
   - All buttons on Reports page are clickable on mobile
   - Achievement titles are readable and identifiable
   - No horizontal scrolling required
   - Touch targets meet 44x44px minimum
   - No layout shifts or performance degradation

3. **Accessibility**:
   - Touch targets meet WCAG guidelines (44x44px minimum)
   - Text contrast remains acceptable
   - Screen readers can access all buttons
   - Focus states are visible

4. **Cross-Browser**:
   - Test in Safari iOS (primary mobile browser)
   - Test in Chrome Android
   - Verify responsive behavior works consistently

## Success Metrics

- All buttons visible on Reports page without scrolling (mobile viewports 320px+)
- Achievement titles display at least 2 lines of text before truncating
- No user complaints about hidden functionality or unreadable titles
- Mobile UX test rating improves from "GOOD" to "EXCELLENT"

## Out of Scope

The following minor issues from the test report are NOT part of this task:
- Missing avatar image (404 error)
- "No projects found" flash on Projects page
- Demo mode banner compactness

These can be addressed in separate tasks if needed.

## References

- Mobile Test Report: `/Users/ed/Code/brag-ai/test/mobile/2025-10-17-1/REPORT.md`
- Screenshot Evidence: `/Users/ed/Code/brag-ai/test/mobile/2025-10-17-1/screenshots/`
- BragDoc Styling Guide: CLAUDE.md (Styling section)
- Component Patterns: CLAUDE.md (Component Patterns section)
