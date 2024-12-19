# Navigation Restructure

## Overview
Restructure the top-level navigation to improve information architecture and user experience by moving key CRUD operations to dedicated pages and redesigning the bottom-left navigation component.

## Background
Currently, Companies and Projects CRUD operations are nested within the Settings page, making them less discoverable. The bottom-left navigation uses a dropdown menu for common actions, which adds unnecessary interaction complexity.

## Requirements

### Page Structure Changes
1. Create new top-level pages:
   - `/companies` - Move Companies CRUD from settings
   - `/projects` - Move Projects CRUD from /settings/projects
   - `/achievements` - New skeleton page for future Brag/Achievement management

### Settings Page Updates
1. Remove Companies and Projects CRUD
2. Retain core user management functionality:
   - Profile editing
   - Password management
   - Account settings

### Bottom-Left Navigation Redesign
1. Remove dropdown menu system
2. Add direct icon-based actions for:
   - Theme toggle (light/dark mode)
   - Settings
   - Sign out
3. Add new navigation links above the actions for:
   - Companies
   - Projects
   - Achievements

### UI Consistency
1. Implement consistent design patterns across new pages:
   - Heading styles
   - Component layouts
   - Navigation patterns
   - Action placements

## Technical Considerations
- Use existing Shadcn UI components for consistency
- Implement proper routing using Next.js
- Ensure dark mode compatibility is maintained
- Follow TypeScript best practices for any new components

## Success Criteria
1. All CRUD operations accessible from dedicated top-level pages
2. Bottom-left navigation provides direct access to all key actions
3. Consistent UI/UX across new pages
4. Dark mode functionality maintained
5. No regression in existing functionality

## Out of Scope
- Changes to the actual CRUD functionality
- Changes to authentication flow
- Changes to the main chat interface

## Dependencies
- Existing Shadcn UI components
- Current routing system
- Authentication system
