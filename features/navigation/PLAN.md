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
- [x] Remove dropdown menu system
- [x] Create navigation links for main pages:
  - [x] Companies
  - [x] Projects
  - [x] Achievements (coming soon)
- [x] Add user avatar with fallbacks:
  - [x] OAuth profile picture
  - [x] Vercel avatar service
  - [x] User initials

### 2.2 Bottom Actions Row
- [x] Create horizontal layout for bottom actions
- [x] Add direct icon buttons:
  - [x] User avatar (links to settings)
  - [x] Theme toggle
  - [x] Settings
  - [x] Sign out
- [x] Add tooltips for all actions

## Phase 3: Directory Structure

### 3.1 App Directory Organization
- [x] Move chat directory to (app)
- [x] Move achievements to (app)
- [x] Update import paths to reflect new structure
- [x] Clean up old directories

## Phase 4: UI Consistency

### 4.1 Navigation Styling
- [ ] Test and refine hover states
- [ ] Verify spacing and alignment
- [ ] Ensure dark mode compatibility

### 4.2 Layout Consistency
- [ ] Test responsive behavior
- [ ] Verify navigation state persistence
- [ ] Check mobile layout

## Phase 5: Testing and Cleanup

### 5.1 Navigation Testing
- [ ] Test navigation flow between pages
- [ ] Verify all pages inherit correct layout
- [ ] Test responsive behavior
- [ ] Validate theme persistence

### 5.2 Final Cleanup
- [ ] Review and update documentation
- [ ] Clean up any unused imports
- [ ] Verify type definitions
- [ ] Final QA pass
