# Project Management Implementation Plan

## Phase 1: Database and API Layer

### 1.1 Database Setup and Testing
- [ ] Project table schema (create if not exists)
- [ ] Add database queries in `lib/db/queries.ts`:
  ```typescript
  - getProjectsByUserId()
  - getProjectById()
  - getProjectsByCompanyId()
  - createProject()
  - updateProject()
  - deleteProject()
  ```
- [ ] Create test file `test/projects/queries.test.ts`:
  ```typescript
  describe('Project Queries', () => {
    // Test data setup
    - [ ] Mock user data
    - [ ] Sample company data (for relations)
    - [ ] Sample project data

    // Individual query tests
    - [ ] getProjectsByUserId
      - [ ] Returns empty array for new user
      - [ ] Returns all projects for user
      - [ ] Does not return other users' projects
      - [ ] Correctly orders by start date
      - [ ] Correctly filters by status

    - [ ] getProjectById
      - [ ] Returns project for valid ID
      - [ ] Returns null for invalid ID
      - [ ] Only returns project if owned by user

    - [ ] getProjectsByCompanyId
      - [ ] Returns projects for valid company
      - [ ] Returns empty array for company with no projects
      - [ ] Only returns projects if company owned by user

    - [ ] createProject
      - [ ] Creates with all required fields
      - [ ] Creates with optional fields
      - [ ] Creates with company association
      - [ ] Validates required fields
      - [ ] Associates with correct user

    - [ ] updateProject
      - [ ] Updates all fields
      - [ ] Updates partial fields
      - [ ] Updates company association
      - [ ] Maintains unchanged fields
      - [ ] Only updates if owned by user
      - [ ] Validates required fields

    - [ ] deleteProject
      - [ ] Removes project
      - [ ] Only deletes if owned by user
      - [ ] Returns error for non-existent project
  })
  ```

### 1.2 API Routes
- [ ] Create `app/api/projects/route.ts`:
  - [ ] GET handler for listing projects
  - [ ] POST handler for creating projects
- [ ] Create `app/api/projects/[id]/route.ts`:
  - [ ] GET handler for single project
  - [ ] PUT handler for updating
  - [ ] DELETE handler for removing
- [ ] Create API tests in `test/projects/api.test.ts`:
  - [ ] Test authentication and authorization
  - [ ] Test input validation
  - [ ] Test success and error cases
  - [ ] Test data persistence
  - [ ] Test company associations
  - [ ] Ensure proper test isolation
  - [ ] Add proper error handling

### 1.3 Type Definitions
- [ ] Add project-related types in `lib/db/types.ts`:
  ```typescript
  - type Project
  - type CreateProjectInput
  - type UpdateProjectInput
  - type ProjectStatus
  ```

## Phase 2: Core UI Components

### 2.1 Form Components
- [ ] Create `components/projects/project-form.tsx`:
  - [ ] Form fields with validation
  - [ ] Company selector integration
  - [ ] Status selector
  - [ ] Date picker integration
  - [ ] Submit handling
- [ ] Create `components/projects/project-dialog.tsx`:
  - [ ] Modal wrapper
  - [ ] Create/Edit modes
  - [ ] Error handling

### 2.2 List Components
- [ ] Create `components/projects/project-list.tsx`:
  - [ ] Table/grid layout
  - [ ] Sorting functionality
  - [ ] Status indicators
  - [ ] Empty state
- [ ] Create `components/projects/project-actions.tsx`:
  - [ ] Edit button
  - [ ] Delete button with confirmation
  - [ ] Archive button
- [ ] Create `components/projects/project-filters.tsx`:
  - [ ] Status filter (active/completed/archived)
  - [ ] Company filter
  - [ ] Search input (optional)

## Phase 3: Settings Integration

### 3.1 Settings Page Updates
- [ ] Update `app/settings/page.tsx`:
  - [ ] Add Projects section
  - [ ] Layout integration
  - [ ] Navigation/tabs
  - [ ] Company context integration

### 3.2 State Management
- [ ] Create data fetching hooks in `hooks/use-projects.ts`:
  ```typescript
  - useProjects()
  - useProject(id)
  - useProjectsByCompany(companyId)
  - useCreateProject()
  - useUpdateProject()
  - useDeleteProject()
  ```
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications

## Phase 4: Polish and Testing

### 4.1 UI Polish
- [ ] Add loading skeletons
- [ ] Add transitions/animations
- [ ] Ensure responsive design
- [ ] Dark mode support
- [ ] Status color indicators

### 4.2 Testing
- [ ] API Route Tests in `test/projects/api.test.ts`:
  ```typescript
  describe('Project API Routes', () => {
    // GET /api/projects
    - Returns projects for authenticated user
    - Handles pagination
    - Handles sorting
    - Handles status filtering
    - Handles company filtering
    - Returns 401 for unauthenticated requests

    // POST /api/projects
    - Creates project with valid data
    - Creates project with company association
    - Validates required fields
    - Handles validation errors
    - Returns 401 for unauthenticated requests

    // GET /api/projects/[id]
    - Returns project for valid ID
    - Returns 404 for invalid ID
    - Returns 401 for unauthenticated requests
    - Returns 403 for unauthorized access

    // PUT /api/projects/[id]
    - Updates project with valid data
    - Updates company association
    - Validates required fields
    - Handles validation errors
    - Returns 401 for unauthenticated requests
    - Returns 403 for unauthorized access

    // DELETE /api/projects/[id]
    - Deletes project
    - Returns 404 for invalid ID
    - Returns 401 for unauthenticated requests
    - Returns 403 for unauthorized access
  })
  ```
- [ ] Component Tests in `test/projects/components.test.tsx`:
  ```typescript
  // ProjectForm
  - Renders all fields
  - Handles required fields
  - Validates input
  - Handles company selection
  - Handles status selection
  - Submits valid data
  - Shows error messages
  - Handles loading state

  // ProjectDialog
  - Opens in create mode
  - Opens in edit mode
  - Handles form submission
  - Shows loading state
  - Shows error state

  // ProjectList
  - Renders projects
  - Shows empty state
  - Handles sorting
  - Shows status indicators
  - Shows company associations
  - Shows loading state

  // ProjectActions
  - Shows edit button
  - Shows delete button
  - Shows archive button
  - Handles edit click
  - Shows delete confirmation
  - Handles delete confirmation
  - Handles archive action
  ```
