# Company Management Implementation Plan

## Phase 1: Database and API Layer

### 1.1 Database Setup and Testing
- [x] Company table schema (already exists)
- [x] Add database queries in `lib/db/queries.ts`:
  ```typescript
  - getCompaniesByUserId()
  - getCompanyById()
  - createCompany()
  - updateCompany()
  - deleteCompany()
  ```
- [x] Create test file `test/companies/queries.test.ts`:
  ```typescript
  describe('Company Queries', () => {
    // Test data setup
    - [x] Mock user data
    - [x] Sample company data
    - [x] Sample project data (for relations)

    // Individual query tests
    - [x] getCompaniesByUserId
      - [x] Returns empty array for new user
      - [x] Returns all companies for user
      - [x] Does not return other users' companies
      - [x] Correctly orders by start date

    - [x] getCompanyById
      - [x] Returns company for valid ID
      - [x] Returns null for invalid ID
      - [x] Only returns company if owned by user

    - [x] createCompany
      - [x] Creates with all required fields
      - [x] Creates with optional fields
      - [x] Validates required fields
      - [x] Associates with correct user

    - [x] updateCompany
      - [x] Updates all fields
      - [x] Updates partial fields
      - [x] Maintains unchanged fields
      - [x] Only updates if owned by user
      - [x] Validates required fields

    - [x] deleteCompany
      - [x] Removes company
      - [x] Only deletes if owned by user
      - [x] Handles related projects
      - [x] Returns error for non-existent company
  })
  ```

### 1.2 API Routes
- [x] Create `app/api/companies/route.ts`:
  - [x] GET handler for listing companies
  - [x] POST handler for creating companies
- [x] Create `app/api/companies/[id]/route.ts`:
  - [x] GET handler for single company
  - [x] PUT handler for updating
  - [x] DELETE handler for removing
- [x] Create API tests in `test/companies/api.test.ts`:
  - [x] Test authentication and authorization
  - [x] Test input validation
  - [x] Test success and error cases
  - [x] Test data persistence
  - [x] Fix database connection issues in tests
  - [x] Ensure proper test isolation
  - [x] Add proper error handling

### 1.3 Type Definitions
- [x] Add company-related types in `lib/db/types.ts`:
  ```typescript
  - type Company
  - type CreateCompanyInput
  - type UpdateCompanyInput
  ```

## Phase 2: Core UI Components

### 2.1 Form Components
- [x] Create `components/companies/company-form.tsx`:
  - [x] Form fields with validation
  - [x] Date picker integration
  - [x] Submit handling
- [x] Create `components/companies/company-dialog.tsx`:
  - [x] Modal wrapper
  - [x] Create/Edit modes
  - [x] Error handling

### 2.2 List Components
- [x] Create `components/companies/company-list.tsx`:
  - [x] Table/grid layout
  - [x] Sorting functionality
  - [x] Empty state
- [x] Create `components/companies/company-actions.tsx`:
  - [x] Edit button
  - [x] Delete button with confirmation
- [x] Create `components/companies/company-filters.tsx`:
  - [x] Active/Past filter
  - [x] Search input (optional)

## Phase 3: Settings Integration

### 3.1 Settings Page Updates
- [x] Update `app/settings/page.tsx`:
  - [x] Add Companies section
  - [x] Layout integration
  - [x] Navigation/tabs

### 3.2 State Management
- [x] Create data fetching hooks in `hooks/use-companies.ts`:
  ```typescript
  - useCompanies()
  - useCompany(id)
  - useCreateCompany()
  - useUpdateCompany()
  - useDeleteCompany()
  ```
- [x] Add loading states
- [x] Add error handling
- [x] Add success notifications

## Phase 4: Polish and Testing

### 4.1 UI Polish
- [ ] Add loading skeletons
- [ ] Add transitions/animations
- [ ] Ensure responsive design
- [ ] Dark mode support

### 4.2 Testing
- [ ] API Route Tests in `test/companies/api.test.ts`:
  ```typescript
  describe('Company API Routes', () => {
    // GET /api/companies
    - Returns companies for authenticated user
    - Handles pagination
    - Handles sorting
    - Returns 401 for unauthenticated requests

    // POST /api/companies
    - Creates company with valid data
    - Validates required fields
    - Handles validation errors
    - Returns 401 for unauthenticated requests

    // GET /api/companies/[id]
    - Returns company for valid ID
    - Returns 404 for invalid ID
    - Returns 401 for unauthenticated requests
    - Returns 403 for unauthorized access

    // PUT /api/companies/[id]
    - Updates company with valid data
    - Validates required fields
    - Handles validation errors
    - Returns 401 for unauthenticated requests
    - Returns 403 for unauthorized access

    // DELETE /api/companies/[id]
    - Deletes company
    - Returns 404 for invalid ID
    - Returns 401 for unauthenticated requests
    - Returns 403 for unauthorized access
  })
  ```
- [ ] Component Tests in `test/companies/components.test.tsx`:
  ```typescript
  // CompanyForm
  - Renders all fields
  - Handles required fields
  - Validates input
  - Submits valid data
  - Shows error messages
  - Handles loading state

  // CompanyDialog
  - Opens in create mode
  - Opens in edit mode
  - Handles form submission
  - Shows loading state
  - Shows error state

  // CompanyList
  - Renders companies
  - Shows empty state
  - Handles sorting
  - Shows loading state

  // CompanyActions
  - Shows edit button
  - Shows delete button
  - Handles edit click
  - Shows delete confirmation
  - Handles delete confirmation
  ```
