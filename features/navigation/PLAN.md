# Navigation Restructure Implementation Plan

## Phase 1: Page Structure Setup 

### 1.1 Move Existing CRUD Pages 
- [x] Move Projects CRUD from settings/projects to (app)/projects
- [x] Move Companies CRUD from settings page to (app)/companies
- [x] Create skeleton for /achievements page (deferred)

### 1.2 Update Settings Page 
- [x] Remove Companies CRUD components
- [x] Remove Projects CRUD components if they exist
- [x] Consolidate user management features in settings

### 1.3 Layout Restructuring 
- [x] Create app-level layout in (app)/layout.tsx with navigation
- [x] Simplify settings layout to only include settings-specific navigation
- [x] Ensure all pages inherit the main app navigation

## Phase 2: Navigation Component

### 2.1 Create New Navigation Components
- [ ] Create bottom-nav component:
  ```typescript
  - Icon-based action buttons
  - Direct page navigation links
  - Theme toggle
  - Settings link
  - Sign out button
  ```

### 2.2 Update AppSidebar
- [ ] Remove dropdown menu system
- [ ] Add direct icon buttons for actions
- [ ] Add navigation links for new pages:
  - [ ] Companies
  - [ ] Projects
  - [ ] Achievements (coming soon)

## Phase 3: UI Consistency

### 3.1 Navigation Styling
- [ ] Implement consistent icon button styles
- [ ] Add hover and active states
- [ ] Ensure dark mode compatibility

### 3.2 Layout Consistency
- [ ] Verify padding and spacing across pages
- [ ] Check responsive behavior
- [ ] Test navigation state persistence

## Phase 4: Testing and Cleanup

### 4.1 Testing
- [ ] Test navigation flow between pages
- [ ] Verify all CRUD operations in new locations
- [ ] Test responsive behavior
- [ ] Validate theme persistence

### 4.2 Final Cleanup
- [ ] Remove any remaining old navigation code
- [ ] Update type definitions if needed
- [ ] Document new navigation structure
