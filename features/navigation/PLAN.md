# Navigation Restructure Implementation Plan

## Phase 1: Page Structure Setup

### 1.1 Create New Route Pages
- [ ] Create `/app/companies/page.tsx`:
  - [ ] Move Companies CRUD from settings
  - [ ] Implement layout matching existing CRUD patterns
  - [ ] Add proper page metadata
- [ ] Create `/app/projects/page.tsx`:
  - [ ] Move Projects CRUD from settings/projects
  - [ ] Update import paths and routes
  - [ ] Add proper page metadata
- [ ] Create `/app/achievements/page.tsx`:
  - [ ] Create skeleton layout
  - [ ] Add placeholder for future CRUD operations
  - [ ] Add proper page metadata

### 1.2 Update Settings Page
- [ ] Remove Companies CRUD components
- [ ] Remove Projects CRUD components if they exist
- [ ] Consolidate user management features:
  - [ ] Profile editing
  - [ ] Password management
  - [ ] Account settings

## Phase 2: Navigation Component

### 2.1 Create New Navigation Components
- [ ] Create `components/navigation/bottom-nav.tsx`:
  ```typescript
  - Icon-based action buttons
  - Page navigation links
  - Theme toggle
  - Settings link
  - Sign out button
  ```
- [ ] Create necessary subcomponents:
  - [ ] `nav-link.tsx` for consistent link styling
  - [ ] `nav-icon-button.tsx` for action buttons

### 2.2 Update Layout
- [ ] Modify `app/layout.tsx`:
  - [ ] Remove old dropdown navigation
  - [ ] Integrate new bottom-nav component
  - [ ] Update layout constraints if needed

## Phase 3: UI Consistency

### 3.1 Shared Components
- [ ] Create `components/shared/page-header.tsx`:
  ```typescript
  - Consistent page title styling
  - Action button placement
  - Breadcrumb navigation (if needed)
  ```
- [ ] Create `components/shared/content-layout.tsx`:
  ```typescript
  - Standard page padding
  - Content width constraints
  - Responsive layout rules
  ```

### 3.2 Apply Consistent Styling
- [ ] Update Companies page styling
- [ ] Update Projects page styling
- [ ] Apply styling to Achievements page
- [ ] Ensure dark mode compatibility

## Phase 4: Testing and Validation

### 4.1 Component Tests
- [ ] Create `test/components/navigation/bottom-nav.test.tsx`:
  ```typescript
  - Test link functionality
  - Test button actions
  - Test theme toggle
  - Test responsive behavior
  ```
- [ ] Test shared components:
  - [ ] Page header functionality
  - [ ] Content layout responsiveness

### 4.2 Integration Tests
- [ ] Test navigation flow between pages
- [ ] Verify CRUD operations in new locations
- [ ] Validate theme persistence
- [ ] Check responsive behavior across breakpoints

## Phase 5: Documentation and Cleanup

### 5.1 Documentation Updates
- [ ] Update component documentation
- [ ] Add usage examples for shared components
- [ ] Document new routing structure

### 5.2 Final Cleanup
- [ ] Remove deprecated navigation code
- [ ] Clean up unused imports
- [ ] Update type definitions
- [ ] Verify no broken links or routes
