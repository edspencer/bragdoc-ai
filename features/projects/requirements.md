# Project Management Feature Requirements

## Overview
Add CRUD interface for Project Management in the settings screen, allowing users to manage their projects and associate brags with specific projects. Projects can optionally be linked to companies.

## Database Schema
```typescript
project = pgTable('Project', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id),
  companyId: uuid('company_id').references(() => company.id),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 32 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
});
```

## API Routes
- `GET /api/projects` - List all projects for current user
- `POST /api/projects` - Create a new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

## UI Components

### ProjectList
- Display projects in a table/grid with actions
- Sort by start date and status
- Filter by status (active/completed/archived)
- Filter by company (if linked)
- Empty state for no projects

### ProjectForm
Form for creating/editing projects with fields:
- Name (required)
- Description (optional)
- Company (optional, select from user's companies)
- Status (required: active/completed/archived)
- Start Date (required)
- End Date (optional)

### ProjectActions
- Edit button - Opens edit form in modal
- Delete button - Shows confirmation dialog
- Archive button - Quick status change

### ProjectDialog
Modal component for create/edit forms with validation

## Settings Page Layout
```
Settings
├── GitHub Integration
├── Companies
└── Projects
    ├── Add Project Button
    └── Project List
        ├── Project Row
        │   ├── Project Info
        │   │   ├── Name
        │   │   ├── Company (if linked)
        │   │   ├── Status
        │   │   └── Dates
        │   └── Actions (Edit/Delete/Archive)
        └── Empty State
```

## Features
- Sort projects by start date or status
- Filter by status (active/completed/archived)
- Filter by associated company
- Link projects to companies (optional)
- Confirmation dialog before deleting
- Show related brags for each project
- Responsive design for mobile/desktop

## Technical Requirements
- Use ShadCN UI components
- Implement proper form validation with error messages
- Add loading states for async operations
- Handle API errors gracefully
- Support dark/light mode
- Follow existing code style and structure
- Maintain referential integrity with companies table

## Future Enhancements
- Project tags/categories
- Project templates
- Import from GitHub/JIRA
- Project metrics/KPIs
- Team member assignments
- Project dependencies
- Bulk import/export
- Project timeline visualization
