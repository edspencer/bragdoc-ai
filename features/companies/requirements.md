# Company Management Feature Requirements

## Overview
Add CRUD interface for Company Management in the settings screen, allowing users to manage their work history and associate brags with specific companies.

## Database Schema
```typescript
company = pgTable('Company', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id),
  name: varchar('name', { length: 256 }).notNull(),
  domain: varchar('domain', { length: 256 }),
  role: varchar('role', { length: 256 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
});
```

## API Routes
- `GET /api/companies` - List all companies for current user
- `POST /api/companies` - Create a new company
- `GET /api/companies/[id]` - Get company details
- `PUT /api/companies/[id]` - Update company
- `DELETE /api/companies/[id]` - Delete company

## UI Components

### CompanyList
- Display companies in a table/grid with actions
- Sort by start date
- Filter active vs past companies
- Empty state for no companies

### CompanyForm
Form for creating/editing companies with fields:
- Name (required)
- Domain (optional)
- Role (required)
- Start Date (required)
- End Date (optional)

### CompanyActions
- Edit button - Opens edit form in modal
- Delete button - Shows confirmation dialog

### CompanyDialog
Modal component for create/edit forms with validation

## Settings Page Layout
```
Settings
├── GitHub Integration (existing)
├── Companies
│   ├── Add Company Button
│   └── Company List
│       ├── Company Row
│       │   ├── Company Info
│       │   └── Actions (Edit/Delete)
│       └── Empty State
└── Projects (future)
```

## Features
- Sort companies by start date (newest first)
- Filter between active and past companies
- Validate domain format (optional field)
- Confirmation dialog before deleting
- Show related projects for each company
- Responsive design for mobile/desktop

## Technical Requirements
- Use ShadCN UI components
- Implement proper form validation with error messages
- Add loading states for async operations
- Handle API errors gracefully
- Support dark/light mode
- Follow existing code style and structure

## Future Enhancements
- Company logo upload
- Import from LinkedIn
- Company size/industry fields
- Advanced filtering/search
- Bulk import/export
