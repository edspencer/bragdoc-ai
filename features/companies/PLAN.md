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
- [ ] Add company-related types in `lib/db/types.ts`:
  ```typescript
  - type Company
  - type CreateCompanyInput
  - type UpdateCompanyInput
  ```

## Phase 2: Core UI Components

### 2.1 Form Components
- [ ] Create `components/companies/company-form.tsx`:
  - Form fields with validation
  - Date picker integration
  - Submit handling
- [ ] Create `components/companies/company-dialog.tsx`:
  - Modal wrapper
  - Create/Edit modes
  - Error handling

### 2.2 List Components
- [ ] Create `components/companies/company-list.tsx`:
  - Table/grid layout
  - Sorting functionality
  - Empty state
- [ ] Create `components/companies/company-actions.tsx`:
  - Edit button
  - Delete button with confirmation
- [ ] Create `components/companies/company-filters.tsx`:
  - Active/Past filter
  - Search input (optional)

## Phase 3: Settings Integration

### 3.1 Settings Page Updates
- [ ] Update `app/settings/page.tsx`:
  - Add Companies section
  - Layout integration
  - Navigation/tabs

### 3.2 State Management
- [ ] Create data fetching hooks in `hooks/use-companies.ts`:
  ```typescript
  - useCompanies()
  - useCompany(id)
  - useCreateCompany()
  - useUpdateCompany()
  - useDeleteCompany()
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
    - Returns 403 for unauthorized access
    - Returns 401 for unauthenticated requests

    // PUT /api/companies/[id]
    - Updates company with valid data
    - Validates required fields
    - Returns 404 for invalid ID
    - Returns 403 for unauthorized access
    - Returns 401 for unauthenticated requests

    // DELETE /api/companies/[id]
    - Deletes company
    - Returns 404 for invalid ID
    - Returns 403 for unauthorized access
    - Returns 401 for unauthenticated requests
  })
  ```

- [ ] Component Tests in `test/companies/components.test.tsx`:
  ```typescript
  // CompanyForm
  - Renders all fields
  - Handles required fields
  - Validates input
  - Submits form data
  - Shows error messages

  // CompanyList
  - Renders companies
  - Shows empty state
  - Handles sorting
  - Handles filtering

  // CompanyActions
  - Shows edit/delete buttons
  - Confirms delete action
  - Handles loading states
  ```

- [ ] E2E Tests in `test/e2e/companies.test.ts`:
  ```typescript
  - Complete company creation flow
  - Edit company flow
  - Delete company flow
  - List view interactions
  - Error handling scenarios
  ```

### 4.3 Documentation
- [ ] Update API documentation
- [ ] Add component documentation
- [ ] Update README

## Phase 5: Future Enhancements
For consideration after initial release:

- Company logo upload
- LinkedIn import
- Company size/industry fields
- Advanced filtering
- Bulk operations

## Dependencies
- ShadCN UI components
- React Hook Form
- Zod validation
- date-fns for date handling
- Sonner for notifications

## Implementation Notes

### Code Organization
```
app/
  ├── api/
  │   └── companies/
  │       ├── route.ts
  │       └── [id]/
  │           └── route.ts
  └── settings/
      └── page.tsx

components/
  └── companies/
      ├── company-form.tsx
      ├── company-dialog.tsx
      ├── company-list.tsx
      ├── company-actions.tsx
      └── company-filters.tsx

lib/
  └── db/
      ├── queries.ts
      └── types.ts

hooks/
  └── use-companies.ts
```

### Implementation Strategy
1. Start with database layer and API routes
2. Build core UI components without state
3. Add state management and data fetching
4. Integrate into settings page
5. Polish and test

### Testing Strategy
- Unit tests for database queries
- Integration tests for API routes
- Component tests for UI
- E2E tests for critical flows:
  - Creating a company
  - Editing a company
  - Deleting a company
  - Listing companies

### Rollout Plan
1. Deploy to staging
2. Internal testing
3. Beta testing with select users
4. Full production rollout
